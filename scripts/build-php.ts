/**
 * Сборка пакета для shared-хостинга с PHP (SpaceWeb, Beget, Timeweb и аналоги).
 *
 *   npm run build:php
 *
 * Что делает:
 *  1. собирает статические страницы в режиме «заявки идут на сервер»
 *     (config.js → api.enabled = true, форма шлёт POST на /api/lead.php);
 *  2. копирует PHP-часть из php/ (api, cabinet, inc, setup.php);
 *  3. создаёт config.php с готовым случайным salt и подсказками;
 *  4. кладёт корневой .htaccess (https, запрет доступа к data/, inc/, config.php);
 *  5. пакует всё в release/astra-pearl-php.zip и копирует архив в download/.
 *
 * Node.js, Composer и MySQL на хостинге не нужны.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
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

/* ------------------------- 3. config.php (готовый) ------------------------ */

log("config.php с новым salt");
const example = fs.readFileSync(path.join(phpSrc, "inc", "config.example.php"), "utf8");
const salt = crypto.randomBytes(24).toString("hex");
const setupToken = crypto.randomBytes(12).toString("hex");
fs.writeFileSync(
  path.join(out, "config.php"),
  example.replace("__SALT__", salt).replace("__SETUP_TOKEN__", setupToken),
  "utf8"
);

/* ------------------------------- 4. .htaccess ---------------------------- */

fs.writeFileSync(
  path.join(out, ".htaccess"),
  `# Настройки сайта для Apache (SpaceWeb, Beget, Timeweb и аналоги).
# На SpaceWeb папку public_html перед загрузкой очистите: удалите стандартные
# index.html и .htaccess, иначе этот файл перезапишет их.
Options -Indexes
DirectoryIndex index.html

# Только https. Включайте после подключения SSL-сертификата в панели хостинга,
# иначе сайт на время станет недоступен по http.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !https
  RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
</IfModule>

ErrorDocument 404 /404.html

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
  `САЙТ НА SPACEWEB (PHP-хостинг) — сборка ${new Date().toISOString().slice(0, 10)}

Нужен только PHP 8.0+ и Apache. Node.js, Composer и MySQL не требуются.
Инструкция подходит и другим shared-хостингам с PHP (Beget, Timeweb, reg.ru).

ШАГ 1. ЗАГРУЗКА
1. Панель SpaceWeb → Файловый менеджер (или FTP) → папка public_html.
2. Удалите из public_html стандартные файлы index.html и .htaccess —
   иначе они перекроют файлы сайта.
3. Загрузите СОДЕРЖИМОЕ этого архива в public_html
   (в архиве нет вложенной папки: index.html должен лежать прямо в public_html).
   Удобнее загрузить zip целиком и распаковать его в public_html.
4. Проверьте версию PHP: панель → Сайты → ваш сайт → PHP.
   Выберите 8.1, 8.2 или 8.3 — код проверен на 8.x.
5. Права: папка data/ должна быть доступна PHP на запись (обычно 755).
   Если заявки не сохраняются — поставьте на data/ права 775.

ШАГ 2. ПАРОЛЬ В КАБИНЕТ
1. Откройте https://ваш-домен/setup.php
2. Введите пароль (минимум 10 символов), скопируйте полученный хеш.
3. Откройте config.php, вставьте хеш в 'passwordHash' => ''.
4. УДАЛИТЕ setup.php с хостинга — он больше не нужен.
5. Войдите в кабинет: https://ваш-домен/cabinet/
   Логин — почта из config.php (owner.email), пароль — тот, что вы задали.

ШАГ 3. НАСТРОЙКА (config.php)
- siteName, siteUrl — название сайта и адрес с https.
- owner.email — ваша почта; она же логин в кабинете.
- telegram.botToken / telegram.chatId — уведомления о заявках в Telegram:
  создайте бота у @BotFather, отправьте ему /start, узнайте chat_id
  (https://api.telegram.org/bot<токен>/getUpdates).
- mail.adminEmail — куда дублировать письма; mail.from — ящик на вашем домене.
  Если на тарифе нет почтового ящика, оставьте поля пустыми:
  заявки всё равно сохраняются, а уведомления придут в Telegram.
- retentionDays — сколько дней хранить заявки (по умолчанию 365).
- timezoneOffsetHours — часовой пояс для времени в кабинете (по умолчанию 3).

ШАГ 4. ТЕКСТЫ И ЦЕНЫ
- Внешний вид и контакты — config.js рядом с index.html, правится без сборки.
  Пока контакты и цены пустые, сайт показывает корректные пометки,
  а не выдуманные данные.

ШАГ 5. ДОМЕН И SSL
1. Домен добавляется в панели SpaceWeb; на бесплатном тарифе доступен
   тестовый домен вида имя.swtest.ru.
2. SSL-сертификат Let's Encrypt подключается в панели (бесплатно),
   после выпуска редирект на https уже включён в .htaccess.

ЧТО РАБОТАЕТ
- Натальная карта и Матрица судьбы — полный расчёт в браузере (astro-v1, matrix-22-v1).
- Заявка сохраняется на сервере (data/leads.php) и появляется в кабинете.
- Уведомления владельцу: Telegram и e-mail (если указаны в config.php).
- Кабинет: список, поиск, фильтры, статусы с комментариями, заметки,
  обезличивание, повторное уведомление, журнал доставки.
- Антиспам: скрытое поле, лимит заявок с одного адреса, проверка источника запроса.

ЧЕГО НЕТ
- Оплаты онлайн и базы данных MySQL: заявки хранятся в файле,
  закрытом от прямого чтения (первая строка файла — <?php exit; ?>).
- Автоматических ответов клиенту: ответ отправляете вы вручную из кабинета.
  Кнопка «Повторное уведомление» — это напоминание себе, а не письмо клиенту.

ПРОВЕРКА ПОСЛЕ УСТАНОВКИ
1. Главная открывается с оформлением (шрифты Cormorant Garamond и Manrope).
2. Матрица на дату 23.06.1992: центр — 10 (Колесо Фортуны).
3. Натальная карта: Лондон, 01.01.2000, 12:00 — Солнце около 10° Козерога.
4. Отправьте тестовую заявку: должен появиться номер вида AP-2026-001,
   а сама заявка — в кабинете.
5. https://ваш-домен/data/leads.php должен открываться пустым — это норма.
6. https://ваш-домен/config.php должен отдавать 403.

ЕСЛИ ЧТО-ТО НЕ ТАК
- 500 на api/lead.php — проверьте версию PHP (8.1+) и права на data/ (775).
- Письма не приходят — на shared-тарифах mail() работает только с ящиком
  на вашем домене; укажите его в mail.from. Telegram-уведомления продолжат работать.
- Кабинет не пускает — хеш пароля из setup.php должен быть вставлен полностью,
  в одинарных кавычках, одной строкой; логин — owner.email.
- Сайт открывается как «страница-заглушка хостинга» — значит файлы попали
  во вложенную папку или не удалён стандартный index.html.
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

log(`setupToken этой сборки: ${setupToken} (не нужен, пока passwordHash пуст)`);
