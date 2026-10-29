/**
 * Сборка пакета для shared-хостинга с PHP (SpaceWeb, Beget, Timeweb и аналоги).
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
  `# Настройки сайта для Apache (SpaceWeb, Beget, Timeweb и аналоги).
#
# ВАЖНО: на SpaceWeb папку public_html перед загрузкой очистите — удалите
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
  `САЙТ НА SPACEWEB (PHP-хостинг) — сборка ${new Date().toISOString().slice(0, 10)}

Нужен только PHP 8.0+ и Apache. Node.js, Composer и MySQL не требуются.
Подробная инструкция с картинками шагов: docs/UPLOAD-SPACEWEB.md в репозитории.
Ниже — короткая памятка.

ШАГ 0. ПЕРЕКЛЮЧИТЬ PHP НА 8.x — СДЕЛАЙТЕ ЭТО ПЕРВЫМ

По умолчанию хостинг может отдавать устаревшую связку «Apache 2.2 + PHP 7.1».
Нашему сайту нужен PHP 8.0 или новее, иначе вместо сайта будет ошибка 500.

1. Панель SpaceWeb: https://cp.sweb.ru — войдите по логину и паролю из письма.
2. Раздел «Сайты» → ваш сайт. В графе «Конфигурация» увидите, например:
   «Apache 2.2 + PHP 7.1». Это и надо поменять.
3. Рядом — ссылка/кнопка «Настройки». Нажмите её.
4. Поле «Версия PHP» → выберите 8.3 (подойдёт любая с 8.0 по 8.5) → «Сохранить».
5. Подождите 1–2 минуты: конфигурация станет «Apache 2.4 + PHP 8.3».
   Заодно сменится Apache 2.2 → 2.4; наш .htaccess написан так, что работает на обоих.

Проверить результат можно страницей /check.php после загрузки файлов (шаг 2).

ЕСЛИ ПРОПУСТИТЬ ЭТОТ ШАГ: сайт откроется с ошибкой 500, но не пугайтесь —
вместо белого экрана вы увидите страницу диагностики check.php с подсказкой
«НУЖНА 8.0 или новее». Переключите версию и обновите страницу.

ПОДГОТОВКА (5–10 минут)
1. Раздел «SSL-сертификаты» → ваш домен → Выпустить → Let's Encrypt (бесплатно).
   Пока он выпускается, можно продолжать: редирект на https в .htaccess ВЫКЛЮЧЕН,
   поэтому сайт откроется сразу после загрузки. Включим его в конце (шаг 7).
2. Домен вашего сайта виден в разделе «Сайты» (на бесплатном тарифе — вида имя.temp.swtest.ru).

ШАГ 1. ОЧИСТИТЬ public_html
1. Файловый менеджер: https://cp.sweb.ru/hosting/file_manager → папка public_html.
2. Удалите стандартные файлы хостинга: index.html и .htaccess (если есть).
   Папку cgi-bin, если она есть, не трогайте.
3. Если .htaccess не видно — включите показ скрытых файлов в менеджере.

ШАГ 2. ЗАГРУЗИТЬ АРХИВ
1. Не выходя из public_html нажмите «Загрузить» → выберите этот zip.
2. Выделите загруженный архив → «Распаковать» → в текущую папку.
3. Удалите сам zip из public_html.
4. ОБЯЗАТЕЛЬНО проверьте структуру: index.html должен лежать ПРЯМО в public_html,
   а не в public_html/astra-pearl-php/. Если попал во вложенную папку —
   выделите содержимое и переместите в public_html, пустую папку удалите.

ШАГ 3. ПРАВА НА ПАПКУ data
Правый клик по папке data → «Права» → 775 (или 755) → применить.
Без этого заявки не сохраняются; кабинет будет показывать предупреждение.

ШАГ 4. УСТАНОВКА: КОНФИГ И ПАРОЛЬ
Откройте https://ваш-домен/setup.php — там два шага, оба в браузере:
1. «Создать config.php» — файл появится сам, со случайными секретами. Копировать ничего не нужно.
2. СРАЗУ смените пароль по умолчанию: пока действует astrolog, setup.php открыт
   без токена и показывает красное предупреждение. Введите свой пароль
   (минимум 8 символов, дважды) → «Задать пароль».
   Хеш запишется в config.php автоматически.
   (Если хостинг запретил запись, страница покажет хеш — тогда вставьте его
   в config.php в поле 'passwordHash' вручную одной строкой.)
3. УДАЛИТЕ setup.php с хостинга.
4. Войдите в кабинет: https://ваш-домен/cabinet/
   Логин — Adelina (значение owner.login в config.php; подойдёт и почта owner.email),
   пароль — тот, что вы задали на шаге 2.

ШАГ 5. НАСТРОЙКИ (config.php)
- siteName, siteUrl — название сайта и адрес с https.
- owner.login — логин в кабинете (сейчас Adelina); owner.email — ваша почта, тоже подходит для входа.
- telegram.botToken / telegram.chatId — уведомления о заявках:
  1) @BotFather → /newbot → получите токен;
  2) откройте своего бота и нажмите «Запустить» (без этого бот не пишет вам);
  3) https://api.telegram.org/bot<ТОКЕН>/getUpdates → найдите "chat":{"id":ЧИСЛО}
  4) впишите токен и число в config.php.
- mail.adminEmail / mail.from — ящик на вашем домене (Панель → Почта).
  На БЕСПЛАТНОМ тарифе почтовых ящиков нет: оставьте эти поля пустыми,
  письма не будут отправляться, но заявки сохранятся и придут в Telegram.
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
Если после правки появилась ошибка 500 — верните «#» обратно (значит, опечатка),
сохранитесь и проверьте ещё раз.

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

ПРОВЕРКА ПОСЛЕ УСТАНОВКИ
0. https://ваш-домен/check.php — все строки «ок», вверху версия PHP 8.x.
   После проверки УДАЛИТЕ check.php (или оставьте: секретов он не показывает).
1. Главная открывается с оформлением (шрифты Cormorant Garamond и Manrope).
2. Матрица на дату 23.06.1992: центр — 10 (Колесо Фортуны).
3. Натальная карта: Лондон, 01.01.2000, 12:00 — Солнце около 10° Козерога.
4. Тестовая заявка: появляется номер вида AP-2026-001, заявка видна в кабинете.
5. https://ваш-домен/data/leads.php открывается ПУСТОЙ страницей — это норма.
6. https://ваш-домен/config.php отдаёт 403 — секреты закрыты.
7. https://ваш-домен/setup.php не открывается (файл удалён).

ОБНОВЛЕНИЕ САЙТА (теперь безопасно)
В архиве НЕТ файла config.php, поэтому распаковка нового архива с заменой файлов
НЕ трогает ваши настройки и пароль. Папка data/ с заявками тоже не перезаписывается.
Порядок: загрузить новый zip в public_html → «Распаковать» с заменой → удалить zip →
открыть /check.php и убедиться, что ошибок нет.
Копию config.php всё равно полезно держать у себя: скачайте файл на компьютер
после настройки Telegram. Если что-то пошло не так — верните файл обратно.

ЕСЛИ ЧТО-ТО НЕ ТАК
- Заглушка хостинга — не удалён index.html или файлы во вложенной папке (шаги 1 и 2).
- 500 на api/lead.php — версия PHP ниже 8.0 либо нет прав на data/ (775).
- «Заявка принята», но в кабинете пусто — нет прав на data/; в кабинете появится
  предупреждение «заявки сейчас не сохраняются».
- Письма не приходят — на бесплатном тарифе нет почты; Telegram работает независимо.
- Не пускает в кабинет — логин не Adelina/owner.login и не owner.email, либо хеш вставлен с переносом строки.
- Ошибка сертификата на https — сертификат ещё не выпущен (подготовка, пункт 3).
- Сайт перекидывает на https с ошибкой — редирект включён до выпуска сертификата:
  верните «#» в .htaccess.
- Ошибка 500 сразу после загрузки — почти всегда включён PHP 7.x.
  Откройте /check.php: если первая строка «Версия PHP 7.1», выполните ШАГ 0.
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

