/**
 * Сборка пакета для shared-хостинга с PHP (Cloud4box/ISPmanager, SpaceWeb и аналоги).
 *
 *   npm run build:php
 *
 * Что делает:
 *  1. собирает статические страницы в режиме «заявки идут на сервер»
 *     (config.js → api.enabled = true, форма шлёт POST на /api/lead.php);
 *  2. копирует PHP-часть из php/ (api, cabinet, inc, setup.php);
 *  3. НЕ включает config.php: он создаётся на хостинге через setup.php,
 *     поэтому обновление сайта не сбрасывает пароль и настройки владельца;
 *  4. кладёт корневой .htaccess (https, запрет доступа к data/, inc/, config.php);
 *  5. пакует всё в release/astra-pearl-php.zip и копирует архив в download/.
 *
 * Node.js, Composer и MySQL на хостинге не нужны.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const releaseDir = path.join(root, "release");
const out = path.join(releaseDir, "php");
const phpSrc = path.join(root, "php");
const log = (message: string) => console.log(`· ${message}`);

if (!fs.existsSync(path.join(phpSrc, "inc", "bootstrap.php"))) {
  throw new Error("не найден каталог php/ — сборка невозможна");
}

/* ------------------------ 1. Статические страницы ------------------------ */

log("страницы и бандл (режим «заявки на сервере»)");
fs.rmSync(out, { recursive: true, force: true });
execFileSync("npx", ["tsx", "scripts/build-static.ts"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, STATIC_API_ENABLED: "1", STATIC_OUT: "php", STATIC_NO_ZIP: "1" },
});

/* ------------------------------ 2. PHP-часть ----------------------------- */

log("PHP: api, cabinet, inc");
for (const dir of ["api", "cabinet", "inc"]) {
  fs.cpSync(path.join(phpSrc, dir), path.join(out, dir), { recursive: true });
}
fs.copyFileSync(path.join(phpSrc, "setup.php"), path.join(out, "setup.php"));
fs.copyFileSync(path.join(phpSrc, "check.php"), path.join(out, "check.php"));
fs.copyFileSync(path.join(phpSrc, "inc", "config.example.php"), path.join(out, "config.example.php"));

// Каталог данных создаётся PHP при первой заявке; .htaccess защищает его сразу.
fs.mkdirSync(path.join(out, "data"), { recursive: true });
fs.writeFileSync(
  path.join(out, "data", ".htaccess"),
  `# Заявки и счётчики лимитов — только для PHP, не для браузера.
<IfModule mod_authz_core.c>
  Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
  Order allow,deny
  Deny from all
</IfModule>
`
);

// Кабинет: адрес /cabinet/ должен открывать вход, а не отдавать 403.
fs.writeFileSync(
  path.join(out, "cabinet", ".htaccess"),
  `# Кабинет: /cabinet/ открывает вход, а не список файлов.
DirectoryIndex index.php

# Страницы кабинета не индексируются и не кэшируются браузером.
<IfModule mod_headers.c>
  Header always set X-Robots-Tag "noindex, nofollow, noarchive"
  Header always set Cache-Control "no-store, max-age=0"
</IfModule>
`
);

/* ------------------- 3. config.php НЕ входит в архив --------------------- */

log("config.php не включается: создаётся на хостинге через setup.php");
// В архиве лежит только config.example.php. Так обновление сайта не сбрасывает
// пароль кабинета и настройки владельца: его config.php никто не перезаписывает.
fs.rmSync(path.join(out, "config.php"), { force: true });

/* ------------------------------- 4. .htaccess ---------------------------- */

fs.writeFileSync(
  path.join(out, ".htaccess"),
  `# Настройки сайта для Apache (Cloud4box/ISPmanager, SpaceWeb и аналоги).
#
# ВАЖНО: папку public_html перед загрузкой очистите — удалите
# стандартные index.html и .htaccess, иначе сайт покажет заглушку хостинга.
#
# РЕДИРЕКТ НА HTTPS ВЫКЛЮЧЕН, чтобы сайт сразу открывался после загрузки.
# Когда в панели хостинга будет выпущен SSL-сертификат — раскомментируйте
# четыре строки ниже (уберите символы # в начале строк).
#
# <IfModule mod_rewrite.c>
#   RewriteEngine On
#   RewriteCond %{HTTPS} !=on
#   RewriteCond %{HTTP:X-Forwarded-Proto} !https
#   RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
# </IfModule>

Options -Indexes
# index.html — публичные страницы, index.php — кабинет (папка cabinet/)
DirectoryIndex index.html index.php

ErrorDocument 404 /404.html
# При фатальной ошибке PHP (например, на хостинге включён PHP 7.x) покажем
# страницу диагностики вместо пустого экрана. Файл check.php работает на любом PHP.
ErrorDocument 500 /check.php

# Закрываем то, что не должно отдаваться браузеру.
<FilesMatch "^(config\\.php|config\\.example\\.php|.*\\.(lock|log|tmp|md))$">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml application/json
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType font/woff2 "access plus 30 days"
  ExpiresByType image/svg+xml "access plus 30 days"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
`
);

/* --------------------------------- 5. README ------------------------------ */

fs.writeFileSync(
  path.join(out, "README.txt"),
  `САЙТ НА PHP-ХОСТИНГЕ (Cloud4box, ISPmanager) — сборка ${new Date().toISOString().slice(0, 10)}

Нужен только PHP 8.0+ и Apache. Node.js, Composer и MySQL не требуются.
Подробная инструкция: docs/UPLOAD-HOSTING.md в репозитории.
Автодеплой по FTP (по желанию): docs/AUTODEPLOY-FTP.md.

ШАГ 0. ВКЛЮЧИТЬ PHP 8.x — СДЕЛАЙТЕ ЭТО ПЕРВЫМ

По умолчанию хостинг может отдавать старую версию PHP, тогда сайт покажет ошибку 500.

1. Войдите в панель Cloud4box (ISPmanager) по логину и паролю из письма.
2. Раздел «WWW-домены» → ваш домен → «Изменить».
3. В поле «PHP» выберите 8.2 или 8.3 → «ОК».
4. Подождите 1–2 минуты, пока конфигурация применится.

Если пропустить этот шаг, вместо белого экрана откроется check.php
с подсказкой «НУЖНА 8.0 или новее».

ШАГ 1. ОЧИСТИТЬ public_html
1. Раздел «Файловый менеджер» → папка public_html.
2. Удалите стандартные index.html и .htaccess, если они есть.
3. Папку cgi-bin, если она есть, не трогайте.
4. Если .htaccess не видно — включите показ скрытых файлов.

ШАГ 2. ЗАГРУЗИТЬ САЙТ
1. Не выходя из public_html нажмите «Загрузить» → выберите этот zip.
2. Выделите загруженный архив → «Распаковать» → в текущую папку.
3. Удалите сам zip из public_html.
4. ОБЯЗАТЕЛЬНО проверьте структуру: index.html должен лежать ПРЯМО в public_html,
   а не в public_html/astra-pearl-php/. Если попал во вложенную папку —
   выделите содержимое и переместите в public_html, пустую папку удалите.
По FTP: залейте содержимое архива прямо в public_html (папка public_html на
Cloud4box — это и есть корень сайта).

ШАГ 3. ПРАВА НА ПАПКУ data
Правый клик по папке data → «Права» → 775 (или 755) → применить.
Без этого заявки не сохраняются; кабинет будет показывать предупреждение.

ШАГ 4. УСТАНОВКА: КОНФИГ И ПАРОЛЬ
Откройте https://ваш-домен/setup.php — там два шага, оба в браузере:
1. «Создать config.php» — файл появится сам, со случайными секретами. Копировать ничего не нужно.
2. СРАЗУ смените пароль по умолчанию: пока действует astrolog, setup.php открыт
   без токена и показывает красное предупреждение. Введите свой пароль
   (минимум 8 символов, дважды) → «Задать пароль».
   (Если хостинг запретил запись, страница покажет хеш — тогда вставьте его
   в config.php в поле 'passwordHash' вручную одной строкой.)
3. УДАЛИТЕ setup.php с хостинга.
4. Войдите в кабинет: кнопка «Войти» в шапке сайта (рядом с «Рассчитать карту»)
   или адрес https://ваш-домен/cabinet/index.php
   Логин — Adelina, пароль — astrolog (пока не задали свой на шаге 2).
   Подойдёт и почта owner.email. Вход работает даже без config.php.

ШАГ 5. НАСТРОЙКИ (config.php)
- siteName, siteUrl — название сайта и адрес с https.
- owner.login — логин в кабинете (сейчас Adelina); owner.email — ваша почта, тоже подходит для входа.
- telegram.botToken / telegram.chatId — уведомления о заявках:
  1) @BotFather → /newbot → получите токен;
  2) откройте своего бота и нажмите «Запустить»;
  3) https://api.telegram.org/bot<ТОКЕН>/getUpdates → найдите "chat":{"id":ЧИСЛО}
  4) впишите токен и число в config.php.
- mail.adminEmail / mail.from — ящик на вашем домене (панель → «Почта»).
- retentionDays — сколько дней хранить заявки (365 по умолчанию).
- timezoneOffsetHours — часовой пояс кабинета (3 = Москва).

ШАГ 6. ТЕКСТЫ И ЦЕНЫ
Внешний вид, контакты, услуги — файл config.js рядом с index.html, правится без сборки.
Пока контакты и цены пустые, сайт показывает корректные пометки, а не выдуманные данные.

ШАГ 7. ВКЛЮЧИТЬ РЕДИРЕКТ НА HTTPS
Только после того, как SSL-сертификат активен и сайт открывается по https без предупреждений:
в файле .htaccess раскомментируйте блок из шести строк (уберите «# » в начале каждой строки):
  # <IfModule mod_rewrite.c>
  #   RewriteEngine On
  #   RewriteCond %{HTTPS} !=on
  #   RewriteCond %{HTTP:X-Forwarded-Proto} !https
  #   RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
  # </IfModule>
Если после правки появилась ошибка 500 — верните «#» обратно, сохранитесь и проверьте ещё раз.

ЧТО РАБОТАЕТ
- Натальная карта и Матрица судьбы: полный расчёт в браузере (astro-v1, matrix-22-v1).
- Заявка сохраняется на сервере (data/leads.php) и появляется в кабинете.
- Уведомления владельцу: Telegram и e-mail (если настроены в config.php).
- Кабинет: список, поиск, фильтры, статусы с комментариями, заметки, обезличивание,
  повторное уведомление, журнал доставки.
- Антиспам: скрытое поле, лимит 5 заявок за 15 минут с одного адреса, проверка источника.

ЧЕГО НЕТ
- Оплаты онлайн и MySQL: заявки хранятся в файле, закрытом от прямого чтения.
- Автоматических ответов клиенту: отвечаете вы вручную из своего мессенджера.
  Кнопка «Повторное уведомление» — напоминание себе, а не письмо клиенту.

ЧАСТЫЕ ПРОБЛЕМЫ
- Сайт открывается, но видна заглушка хостинга — в public_html остался чужой index.html.
- Вместо сайта список файлов — не загрузились index.html или .htaccess.
- Заявки не сохраняются — у папки data нет прав на запись (ШАГ 3).
- Ошибка 500 сразу после загрузки — почти всегда включён старый PHP.
  Откройте /check.php: если версия ниже 8.0, выполните ШАГ 0.
`,
  "utf8"
);

/* --------------------------------- 6. Архив ------------------------------- */

const zipPath = path.join(releaseDir, "astra-pearl-php.zip");
fs.rmSync(zipPath, { force: true });
execFileSync("zip", ["-qr", zipPath, "."], { cwd: out });

const sizeMb = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
log(`готово: release/astra-pearl-php.zip (${sizeMb} МБ)`);

const downloadDir = path.join(root, "download");
if (fs.existsSync(downloadDir)) {
  fs.copyFileSync(zipPath, path.join(downloadDir, "astra-pearl-php.zip"));
  log("архив скопирован в download/astra-pearl-php.zip");
}

