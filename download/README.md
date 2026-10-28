# Готовые архивы

Собираются командами `npm run build:static` и `npm run package:release`.

| Файл | Для чего |
| --- | --- |
| `astra-pearl-static.zip` | **Статическая версия**: только HTML/CSS/JS. Заливается по FTP в корень сайта, Node.js не нужен. |
| `astra-pearl-hosting.zip` | Серверная версия (Next.js standalone): кабинет, заявки в базе, уведомления. Нужен Node.js 22.5+. |
| `astra-pearl-hosting.tar.gz` | То же для Linux-серверов. |

## Статическая версия (FTP)

```bash
unzip astra-pearl-static.zip -d site
# залить содержимое site/ по FTP в public_html (или www, htdocs)
```

Затем отредактируйте на хостинге `config.js`: `siteUrl`, `contacts.telegram`, `contacts.email`,
данные специалиста. Инструкция — `README.txt` внутри архива.

Работает: расчёты натальной карты и Матрицы судьбы в браузере, бесплатная расшифровка,
формирование заявки как сообщения в Telegram/почту.
Не работает: кабинет специалиста, хранение заявок в базе, автоматические уведомления.

## Серверная версия

```bash
unzip astra-pearl-hosting.zip -d /srv
cd /srv/astra-pearl
cp .env.example .env
node tools/create-specialist.mjs --email you@example.com --name "Имя" --password 'длинный-пароль'
./start.sh
```
