# Готовые архивы

> **Если вы пришли с GitHub.** Нажимать «Download ZIP» на странице репозитория и заливать
> этот архив на хостинг — не нужно: там исходный код (`src`, `tests`, `scripts`, `package.json`).
> Для сайта на SpaceWeb нужен **один файл из этой папки — `astra-pearl-php.zip`**.
> Краткая памятка: [START-HERE.txt](START-HERE.txt).
> Подробная инструкция по заливке: [../docs/UPLOAD-SPACEWEB.md](../docs/UPLOAD-SPACEWEB.md).

Собираются командами `npm run build:static`, `npm run build:php` и `npm run package:release`.

| Файл | Для чего |
| --- | --- |
| `astra-pearl-static.zip` | **Статическая версия**: только HTML/CSS/JS. Заливается по FTP в корень сайта, Node.js не нужен. |
| `astra-pearl-php.zip` | **PHP-хостинг (SpaceWeb и аналоги)**: статические страницы + PHP-приём заявок и кабинет. Нужен PHP 8.x, без Node.js и MySQL. Инструкция — `README.txt` в архиве и `docs/HOSTING-PHP.md`. |
| `astra-pearl-hosting.zip` | Серверная версия (Next.js standalone): кабинет, заявки в базе, уведомления. Нужен Node.js 22.5+. |
| `astra-pearl-hosting.tar.gz` | То же для Linux-серверов. |

## Версия для PHP-хостинга (SpaceWeb)

```bash
unzip astra-pearl-php.zip -d public_html     # index.html должен оказаться в корне
# затем: /setup.php → задать пароль → вставить хеш в config.php → удалить setup.php
```

Работает: расчёты в браузере, сохранение заявок на сервере, уведомления в Telegram
и на почту, кабинет со статусами, заметками и обезличиванием.
Не работает (и не заявляется): оплата онлайн, автоматические ответы клиенту.

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
