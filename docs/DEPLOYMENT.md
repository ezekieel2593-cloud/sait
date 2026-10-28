# Развёртывание

## Требования

- Node.js **22.5+** (используется встроенный `node:sqlite`).
- Постоянный диск для файла базы данных (по умолчанию `./data/app.db`).
- HTTPS в production (обязательно: cookie сессии ставится с `Secure`).
- Обратный прокси (nginx, Caddy, Cloudflare) или платформа с автоматическим TLS.

## Вариант А. Готовый архив (без сборки на сервере)

```bash
npm run package:release      # на машине разработчика
# получаем release/astra-pearl-<версия>.zip
```

На сервере (Node.js 22.5+):

```bash
unzip astra-pearl-<версия>.zip -d /srv      # распакуется в /srv/astra-pearl
cd /srv/astra-pearl
cp .env.example .env         # AUTH_SECRET, NEXT_PUBLIC_SITE_URL, DATABASE_PATH
node tools/create-specialist.mjs --email owner@example.com --name "Имя" --password 'длинный-пароль'
./start.sh                   # PORT по умолчанию 3000
```

В архиве уже есть собранное приложение, заполненная база (услуги и база знаний),
утилиты `init-db.mjs`, `create-specialist.mjs`, `maintenance.mjs` и `start.sh`.
Дальше — разделы 4–9 (обслуживание, бэкапы, прокси, проверка, безопасность).

## Вариант Б. Сборка из исходников

## 1. Подготовка окружения

```bash
git clone <repo> && cd sait
npm ci
cp .env.example .env.local
```

Обязательный минимум в `.env.local` (или в переменных окружения платформы):

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.example
AUTH_SECRET=<openssl rand -hex 32>
DATABASE_PATH=/var/lib/astra/app.db
```

`AUTH_SECRET` используется для хеширования IP в журналах и ограничителе частоты.
Не публикуйте его и не меняйте без необходимости — иначе сбросятся лимиты по IP.

Уведомления (по желанию) — см. [INTEGRATIONS.md](INTEGRATIONS.md):

```env
TELEGRAM_BOT_TOKEN=…        TELEGRAM_CHAT_ID=…
MAX_BOT_TOKEN=…             MAX_CHAT_ID=…        MAX_API_BASE=https://platform-api.max.ru
SMTP_HOST=…                 SMTP_PORT=587        SMTP_USER=…      SMTP_PASSWORD=…      MAIL_FROM=…
```

## 2. База и первый аккаунт

```bash
npm run db:migrate
npm run db:seed
npm run create-specialist -- --email owner@example.com --name "Имя" --password 'длинный-пароль'
```

Пароль должен быть не короче 10 символов. Хранится только scrypt-хеш.
Публичной регистрации нет: новые аккаунты создаются этой же командой.

## 3. Сборка и запуск

```bash
npm run build
npm start            # next start -p 3000
```

Пример systemd-юнита:

```ini
[Unit]
Description=Astra Pearl
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/sait
EnvironmentFile=/srv/sait/.env.local
ExecStart=/usr/bin/npm start
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

Пример nginx:

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.example;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name your-domain.example;
  return 301 https://$host$request_uri;
}
```

Важно: заголовок `Host` должен доходить до приложения без изменений — на нём основана
проверка same-origin для мутирующих запросов.

## 4. Обслуживание

Ежедневно (cron или таймер):

```cron
15 4 * * * cd /srv/sait && /usr/bin/npm run maintenance >> /var/log/astra-maintenance.log 2>&1
```

`npm run maintenance`:

1. обезличивает заявки старше срока хранения из настроек (`legal.dataRetentionDays`,
   по умолчанию 365 дней);
2. удаляет старые записи ограничителя частоты;
3. удаляет истёкшие сессии и просроченные токены сброса пароля.

## 5. Резервное копирование

SQLite-файл копируется целиком при остановленном приложении или через `sqlite3 .backup`:

```bash
sqlite3 /var/lib/astra/app.db ".backup '/backups/app-$(date +%F).db'"
```

Храните копии не менее 30 дней. Секреты (`.env.local`) храните отдельно от базы.

## 6. Проверка после развёртывания

1. `curl -I https://your-domain.example/` → 200, заголовки безопасности (`X-Frame-Options`,
   `X-Content-Type-Options`, `Referrer-Policy`) присутствуют.
2. `https://your-domain.example/robots.txt` — `/specialist` и `/api/` закрыты.
3. `/specialist` без входа → редирект на `/specialist/login` (307), страница не индексируется
   (`X-Robots-Tag: noindex`).
4. Расчёт натальной карты и Матрицы выдаёт результат и сохраняется в кабинете.
5. Тестовая заявка появляется в кабинете, номер `AP-ГГГГ-NNN` совпадает с показанным клиенту.
6. Отправка уведомлений: статус канала в карточке заявки `sent` (или `skipped`, если канал
   намеренно не настроен).
7. `npm test` — зелёный.

## 7. Безопасность

- Кабинет защищён на уровне приложения и `src/middleware.ts` (нет cookie — редирект),
  каждая страница кабинета повторно проверяет сессию на сервере.
- Сессии: случайный токен в httpOnly/SameSite=Lax cookie, в базе — только SHA-256;
  срок 12 часов, при смене пароля все сессии завершаются.
- Вход: scrypt (N=16384, r=8, p=1, 64 байта, индивидуальная соль), лимит попыток, блокировка на 15 минут.
- Мутирующие API проверяют `Origin`; публичные лимитированы по IP.
- Персональные данные не попадают в публичный API; в журналах хранится только хеш IP.

## 8. Обновление версии

```bash
git pull
npm ci
npm run db:migrate     # идемпотентно, добавляет новые таблицы/индексы
npm run build
systemctl restart astra-pearl
```

Перед обновлением сделайте бэкап базы. Версии алгоритмов в сохранённых результатах
не меняются, поэтому старые расчёты продолжают отображаться корректно.

## 9. Переход на PostgreSQL

Доступ к данным изолирован: `src/lib/db.ts` (схема и хелперы) и `src/lib/repositories/*`.
Для перехода нужно заменить реализацию этих двух слоёв на клиент PostgreSQL и перенести
схему; остальной код (движки расчётов, интерпретации, сервисы, страницы) не меняется.
