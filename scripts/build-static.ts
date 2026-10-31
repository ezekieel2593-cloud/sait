/**
 * Сборка статической (FTP) версии сайта.
 *
 *   npm run build:static
 *
 * Результат — каталог release/static (и архив release/astra-pearl-static.zip),
 * который можно залить на любой хостинг по FTP: PHP-хостинг, shared, GitHub Pages.
 * Расчёты выполняются в браузере, кабинет и заявки в базе в этой версии недоступны.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

import { DEFAULT_CONFIG } from "../src-static/config.ts";

const root = process.cwd();
const releaseDir = path.join(root, "release");
const outName = (process.env.STATIC_OUT || "static").replace(/[^a-z0-9-]/gi, "");
const out = path.join(releaseDir, outName);
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version as string;
const log = (message: string) => console.log(`· ${message}`);

/**
 * STATIC_API_ENABLED=1 — пакет для PHP-хостинга (SpaceWeb и аналоги): форма шлёт POST
 * на api/lead.php, заявки попадают в кабинет. По умолчанию версия без сервера.
 */
const apiEnabled = process.env.STATIC_API_ENABLED === "1";
const apiBase = (process.env.STATIC_API_BASE || "api").replace(/\/$/, "");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

/* ------------------------------- JS-бандл ------------------------------- */

log("сборка JS (esbuild)");

const aliasShim: esbuild.Plugin = {
  name: "browser-shims",
  setup(build) {
    // В браузере нет node:sqlite — подменяем слой БД и чтение базы знаний.
    const rules: { filter: RegExp; shim: string }[] = [
      { filter: /knowledge[\\/]queries(\.ts)?$/, shim: "src-static/shims/knowledge.ts" },
      { filter: /(^|\/)lib[\\/]db(\.ts)?$/, shim: "src-static/shims/db.ts" },
      { filter: /^(\.\.?\/)+db(\.ts)?$/, shim: "src-static/shims/db.ts" },
    ];

    build.onResolve({ filter: /.*/ }, (args) => {
      for (const rule of rules) {
        if (rule.filter.test(args.path)) return { path: path.join(root, rule.shim) };
      }
      return null;
    });

  },
};

await esbuild.build({
  entryPoints: [path.join(root, "src-static", "main.tsx")],
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ["es2022"],
  format: "iife",
  jsx: "automatic",
  outfile: path.join(out, "app.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [aliasShim],
  loader: { ".woff2": "file", ".woff": "file" },
  alias: { "@": path.join(root, "src") },
  logLevel: "warning",
});

const bundleSize = (fs.statSync(path.join(out, "app.js")).size / 1024).toFixed(0);
log(`app.js: ${bundleSize} КБ`);

/* --------------------------------- CSS --------------------------------- */

log("сборка CSS (tailwind)");
execFileSync(
  "npx",
  ["@tailwindcss/cli", "-i", "src-static/static.css", "-o", path.join(out, "styles.css"), "--minify"],
  { cwd: root, stdio: "inherit" }
);

/* -------------------------------- Шрифты -------------------------------- */

log("шрифты и изображения");
const fontDir = path.join(out, "fonts");
fs.mkdirSync(fontDir, { recursive: true });

const fontSources: [string, string][] = [
  ["node_modules/@fontsource-variable/manrope/files/manrope-cyrillic-wght-normal.woff2", "manrope-cyrillic.woff2"],
  ["node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2", "manrope-latin.woff2"],
  ...[400, 500, 600].flatMap<[string, string]>((weight) => [
    [
      `node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-cyrillic-${weight}-normal.woff2`,
      `cormorant-cyrillic-${weight}.woff2`,
    ],
    [
      `node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-${weight}-normal.woff2`,
      `cormorant-latin-${weight}.woff2`,
    ],
  ]),
  [
    "node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-cyrillic-400-italic.woff2",
    "cormorant-cyrillic-400-italic.woff2",
  ],
];

for (const [from, to] of fontSources) {
  const source = path.join(root, from);
  if (!fs.existsSync(source)) {
    console.warn(`  ! нет файла шрифта: ${from}`);
    continue;
  }
  fs.copyFileSync(source, path.join(fontDir, to));
}

/**
 * Шрифт для PDF-гайда: подмножество DejaVu Sans с кириллицей (~32 КБ).
 * Лежит отдельным файлом и подгружается только в момент сборки PDF,
 * поэтому вес основного бандла не растёт.
 */
const guideFontSource = path.join(root, "assets", "fonts", "guide-sans.ttf");
const guideFontLicense = path.join(root, "assets", "fonts", "LICENSE-DejaVu.txt");
if (fs.existsSync(guideFontSource)) {
  fs.copyFileSync(guideFontSource, path.join(fontDir, "guide-sans.ttf"));
  if (fs.existsSync(guideFontLicense)) {
    fs.copyFileSync(guideFontLicense, path.join(fontDir, "LICENSE-DejaVu.txt"));
  }
} else {
  console.warn("  ! нет assets/fonts/guide-sans.ttf — PDF-гайд не соберётся");
}

const imageDir = path.join(out, "images");
fs.mkdirSync(imageDir, { recursive: true });
// Копируем все картинки из public/images: фон сайта, обложку, иконку, плейсхолдер.
const imageSource = path.join(root, "public", "images");
for (const file of fs.readdirSync(imageSource)) {
  if (!/\.(svg|png|jpe?g|webp|avif|ico)$/i.test(file)) continue;
  fs.copyFileSync(path.join(imageSource, file), path.join(imageDir, file));
}

/** Короткий отпечаток файла: меняется вместе с картинкой. */
const fileHash = (file: string) =>
  crypto.createHash("md5").update(fs.readFileSync(path.join(imageSource, file))).digest("hex").slice(0, 8);

/**
 * Фон сайта отдаём со «штампом версии» в адресе: images/pearl-background.jpg?v=abc123.
 * Файл при этом лежит под своим именем (его удобно заменить), а браузер видит
 * новый адрес и не показывает старую картинку из кэша.
 */
const versioned = (file: string, fallback: string) => {
  const full = path.join(imageSource, file);
  return fs.existsSync(full) ? `images/${file}?v=${fileHash(file)}` : fallback;
};
const backgroundUrl = versioned("pearl-background.jpg", "images/pearl-background.jpg");
const backgroundMobileUrl = versioned("pearl-background-mobile.jpg", backgroundUrl);

/**
 * Версия сборки — попадает в адреса styles.css, app.js и config.js.
 * Браузер видит новый адрес и забирает свежие файлы: в .htaccess у них
 * стоит кэш «7 дней», без этой метки правки выглядели бы «не применились».
 */
const BUILD_ID = crypto
  .createHash("md5")
  .update(fs.readFileSync(path.join(out, "app.js")))
  .update(fs.readFileSync(path.join(out, "styles.css")))
  .digest("hex")
  .slice(0, 8);

/* ------------------------------- HTML-страницы ------------------------------- */

log("страницы");

interface PageMeta {
  file: string;
  page: string;
  title: string;
  description: string;
  h1?: string;
  indexable: boolean;
}

const pages: PageMeta[] = [
  {
    file: "index.html",
    page: "home",
    title: `${DEFAULT_CONFIG.siteName} — ${DEFAULT_CONFIG.tagline}`,
    description: DEFAULT_CONFIG.description,
    indexable: true,
  },
  {
    file: "astrology.html",
    page: "astrology",
    title: "Натальная карта: расчёт по дате, времени и месту рождения",
    description:
      "Расчёт натальной карты: планеты, знаки, асцендент, дома и аспекты по эфемеридам с учётом исторических часовых поясов. Расшифровка сразу, без регистрации.",
    indexable: true,
  },
  {
    file: "matrix.html",
    page: "matrix",
    title: "Матрица судьбы по 22 энергиям: расчёт по дате рождения",
    description:
      "Матрица судьбы: личный и родовой квадрат, каналы денег и отношений, энергия года. Арифметический расчёт по 22 энергиям, без случайных чисел.",
    indexable: true,
  },
  {
    file: "guide.html",
    page: "guide",
    title: "Гайд по 22 энергиям: спорт, таланты, задача души и работа",
    description:
      "Гайд по всем 22 энергиям Матрицы судьбы простыми словами: каким тебя видят другие, таланты, кармическая задача, спорт, утро, ресурс, расслабление, работа, деньги и отношения.",
    indexable: true,
  },
  {
    file: "full-reading.html",
    page: "full-reading",
    title: "Полный разбор: что входит и как проходит работа",
    description:
      "Полный разбор натальной карты или Матрицы судьбы: все разделы, ответы на вопросы и разбор ситуации со специалистом.",
    indexable: true,
  },
  {
    file: "privacy.html",
    page: "privacy",
    title: "Политика конфиденциальности",
    description: "Какие данные обрабатывает сайт, где выполняются расчёты и как удалить свои данные.",
    indexable: true,
  },
  {
    file: "terms.html",
    page: "terms",
    title: "Условия использования",
    description: "Характер материалов, точность расчётов, условия полного разбора и ограничение ответственности.",
    indexable: true,
  },
];

const template = (meta: PageMeta) => {
  const canonical = DEFAULT_CONFIG.siteUrl
    ? `<link rel="canonical" href="${DEFAULT_CONFIG.siteUrl.replace(/\/$/, "")}/${meta.file === "index.html" ? "" : meta.file}">`
    : "";
  const robots = meta.indexable ? "index, follow" : "noindex, nofollow";
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#f6f0ec">
${canonical}
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="${DEFAULT_CONFIG.siteName}">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:image" content="images/og-cover.svg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="images/favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/manrope-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/cormorant-cyrillic-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css?v=${BUILD_ID}">
</head>
<body data-page="${meta.page}" data-title="${meta.title}">
<div id="root"></div>
<noscript>
  <div style="max-width:40rem;margin:3rem auto;padding:0 1.25rem;font-family:system-ui,sans-serif;color:#253d4b">
    <h1>${meta.title}</h1>
    <p>${meta.description}</p>
    <p>Для расчёта натальной карты и Матрицы судьбы нужен JavaScript: вычисления выполняются прямо в браузере.
      Включите его и обновите страницу.</p>
  </div>
</noscript>
<script src="config.js?v=${BUILD_ID}"></script>
<script src="app.js?v=${BUILD_ID}" defer></script>
</body>
</html>
`;
};

for (const meta of pages) {
  fs.writeFileSync(path.join(out, meta.file), template(meta), "utf8");
}

// Страница 404 (используется и .htaccess на Apache, и GitHub Pages автоматически)
fs.writeFileSync(
  path.join(out, "404.html"),
  `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Страница не найдена — ${DEFAULT_CONFIG.siteName}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="images/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="styles.css?v=${BUILD_ID}">
</head>
<body>
<div class="container container--measure" style="padding:5rem 0;text-align:center">
  <p style="font-family:'Cormorant Garamond',serif;font-size:clamp(4rem,14vw,7rem);line-height:1;color:#253d4b;margin:0">404</p>
  <h1 style="font-family:'Cormorant Garamond',serif;color:#253d4b;margin-top:0.75rem">Страница не найдена</h1>
  <p style="color:#665c60">Возможно, ссылка устарела. Начните заново — это займёт меньше минуты.</p>
  <div style="margin-top:1.5rem;display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
    <a class="btn btn--primary btn--sm" href="index.html">На главную</a>
    <a class="btn btn--secondary btn--sm" href="astrology.html">Рассчитать карту</a>
    <a class="btn btn--secondary btn--sm" href="matrix.html">Открыть матрицу</a>
  </div>
</div>
</body>
</html>
`,
  "utf8"
);

/* ------------------------------- config.js ------------------------------- */

log("config.js (настройки сайта)");
const configSource = `/**
 * НАСТРОЙКИ САЙТА — редактируются прямо на хостинге, без сборки.
 *
 * После правки сохраните файл и обновите страницу в браузере (Ctrl+F5).
 * Пустое значение ("" или []) означает «не показывать».
 */
window.ASTRA_CONFIG = {
  // Название и описание
  siteName: ${JSON.stringify(DEFAULT_CONFIG.siteName)},
  logoText: ${JSON.stringify(DEFAULT_CONFIG.logoText)},
  brandTagline: ${JSON.stringify(DEFAULT_CONFIG.brandTagline)},
  // Полное название — крупный заголовок на главной и подпись в подвале
  brandTitle: ${JSON.stringify(DEFAULT_CONFIG.brandTitle)},

  // Манифест на главной: правьте тексты, не меняя код
  manifesto: {
    lead: ${JSON.stringify(DEFAULT_CONFIG.manifesto.lead)},
    paragraphs: ${JSON.stringify(DEFAULT_CONFIG.manifesto.paragraphs, null, 2).replace(/\n/g, "\n  ")},
    accent: ${JSON.stringify(DEFAULT_CONFIG.manifesto.accent)},
    closing: ${JSON.stringify(DEFAULT_CONFIG.manifesto.closing)},
  },
  tagline: ${JSON.stringify(DEFAULT_CONFIG.tagline)},
  description: ${JSON.stringify(DEFAULT_CONFIG.description)},

  // Адрес сайта без слэша в конце — нужен для canonical и карты сайта, например:
  // siteUrl: "https://example.com",
  siteUrl: "",

  // Специалист: фото положите в папку images и укажите путь
  specialist: {
    name: ${JSON.stringify(DEFAULT_CONFIG.specialist.name)},
    title: ${JSON.stringify(DEFAULT_CONFIG.specialist.title)},
    bio: ${JSON.stringify(DEFAULT_CONFIG.specialist.bio)},
    photoUrl: "images/specialist-placeholder.svg",
    note: ${JSON.stringify(DEFAULT_CONFIG.specialist.note)},
  },

  // Контакты: telegram — ник или ссылка (t.me/ник). Пока пусто, кнопок отправки не будет.
  contacts: {
    telegram: "",
    max: "",
    email: "",
    phone: "",
    location: "",
  },

  // Услуги и цены (свободный текст; пусто — на сайте будет корректная пометка)
  services: {
    priceNote: "",
    turnaround: "",
  },

  // Сколько разделов открыто бесплатно
  freeResult: {
    astrologyCardCount: ${DEFAULT_CONFIG.freeResult.astrologyCardCount},
    matrixPointCount: ${DEFAULT_CONFIG.freeResult.matrixPointCount},
    // Сколько гайдов по энергиям открыто без заявки (остальные — после запроса)
    matrixGuideCount: ${DEFAULT_CONFIG.freeResult.matrixGuideCount ?? 2},
  },

  legal: {
    privacyUpdatedAt: ${JSON.stringify(DEFAULT_CONFIG.legal.privacyUpdatedAt)},
    dataRetentionDays: ${JSON.stringify(DEFAULT_CONFIG.legal.dataRetentionDays)},
    responsiblePerson: ${JSON.stringify(DEFAULT_CONFIG.legal.responsiblePerson)},
  },

  // Приём заявок на сервере (PHP). true — форма отправляет запрос на api/lead.php,
  // заявка сохраняется в кабинете. false — форма формирует сообщение, которое вы отправляете сами.
  api: {
    enabled: ${apiEnabled},
    base: ${JSON.stringify(apiBase)},
  },

  // Фон сайта (пути с отпечатком файла — чтобы браузер не показывал старую картинку)
  assets: {
    background: ${JSON.stringify(backgroundUrl)},
    backgroundMobile: ${JSON.stringify(backgroundMobileUrl)},
  },

  // Всплывающее приглашение с вопросом и формой.
  // delayMs — через сколько миллисекунд показывать и как часто повторять
  // (180000 = 3 минуты). enabled: false — не показывать совсем.
  invite: {
    enabled: ${DEFAULT_CONFIG.invite.enabled},
    delayMs: ${DEFAULT_CONFIG.invite.delayMs},
  },

  // Отзывы: добавляйте только настоящие. Пустой список — блок не показывается.
  reviews: [],
};
`;
fs.writeFileSync(path.join(out, "config.js"), configSource, "utf8");

/* --------------------------- robots, sitemap, .htaccess --------------------------- */

// Адрес сайта для карты: STATIC_SITE_URL=https://example.com npm run build:static
const siteUrl = (process.env.STATIC_SITE_URL || DEFAULT_CONFIG.siteUrl || "https://example.com").replace(/\/$/, "");

fs.writeFileSync(
  path.join(out, "robots.txt"),
  `User-Agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
  "utf8"
);

const sitemapUrls = pages
  .filter((meta) => meta.indexable)
  .map((meta) => `  <url><loc>${siteUrl}/${meta.file === "index.html" ? "" : meta.file}</loc></url>`)
  .join("\n");
fs.writeFileSync(
  path.join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`,
  "utf8"
);

fs.writeFileSync(
  path.join(out, ".htaccess"),
  `# Apache: страница 404 и кэширование статики
ErrorDocument 404 /404.html

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 7 days"
  ExpiresByType application/javascript "access plus 7 days"
  ExpiresByType font/woff2 "access plus 30 days"
  ExpiresByType image/svg+xml "access plus 30 days"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

AddDefaultCharset UTF-8
`,
  "utf8"
);

/* ------------------------------ Инструкция ------------------------------ */

fs.writeFileSync(
  path.join(out, "README.txt"),
  `ЖЕМЧУЖИНА — статическая версия (${version})

КАК ЗАЛИТЬ
1. Загрузите ВСЁ содержимое этой папки в корень сайта на хостинге по FTP
   (обычно public_html, www или htdocs). Структуру папок сохраняйте.
2. Откройте файл config.js и заполните:
   - siteUrl — адрес сайта, например "https://example.com"
   - contacts.telegram — ник в Telegram, например "my_nick" (или ссылка t.me/my_nick)
   - contacts.email — почта для заявок
   - brandTitle — полное название, brandTagline — короткий девиз в подвале
   - manifesto — тексты блока «Драгоценная жемчужина души» на главной
   - фон сайта: положите свою картинку в images/pearl-background.jpg (и
     images/pearl-background-mobile.jpg для телефона) с тем же именем
   - invite.delayMs — как часто показывать окно с формой (180000 = каждые 3 минуты)
   - services.priceNote — стоимость, если хотите её показать
3. Обновите страницу в браузере с очисткой кэша (Ctrl+F5).
4. Замените домен в sitemap.xml и robots.txt (по умолчанию там example.com):
   - откройте sitemap.xml и robots.txt в любом редакторе и подставьте свой адрес,
   - либо при сборке: STATIC_SITE_URL=https://ваш-домен npm run build:static

ЧТО ЕСТЬ В ЭТОЙ ВЕРСИИ
- Натальная карта и Матрица судьбы: полный расчёт в браузере (astro-v1, matrix-22-v1).
- Расшифровка ключевых разделов сразу и честно обозначенная платная часть.
- Форма заявки: собирает текст сообщения, который вы отправляете сами —
  в Telegram (кнопка) или письмом. Данные никуда не уходят, пока вы не отправите.

ЧЕГО НЕТ (нужен сервер на Node.js)
- Кабинет специалиста и хранение заявок в базе.
- Автоматические уведомления в Telegram/MAX/SMTP и журнал доставки.
- Правка базы знаний и настроек из кабинета.
Серверная версия собирается командой npm run package:release.

ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ
- Только статические файлы. PHP, MySQL и Node.js не нужны.
- Работает на любом хостинге, включая GitHub Pages, Netlify, Vercel (static) и shared-хостинг.
- Для красивого 404 на Apache уже добавлен .htaccess; на nginx настройте error_page 404 /404.html.

ПРОВЕРКА ПОСЛЕ ЗАГРУЗКИ
1. Откройте главную — должна загрузиться с оформлением (шрифты и стили).
2. Рассчитайте матрицу на тестовой дате 23.06.1992: центр должен быть 10 (Колесо Фортуны).
3. Рассчитайте натальную карту: Лондон, 01.01.2000, 12:00 — Солнце 10°22′ Козерога.
4. Отправьте тестовую заявку — проверьте, что кнопка «Открыть Telegram» ведёт в ваш диалог.
`,
  "utf8"
);

/* -------------------------------- Архив -------------------------------- */

if (process.env.STATIC_NO_ZIP === "1") {
  log(`готово: release/${outName} (архив не создаётся)`);
} else {
  const zipPath = path.join(releaseDir, `astra-pearl-${outName}.zip`);
  fs.rmSync(zipPath, { force: true });
  execFileSync("zip", ["-qr", zipPath, "."], { cwd: out });

  const sizeMb = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
  log(`готово: release/astra-pearl-${outName}.zip (${sizeMb} МБ, разворачивать содержимое в корень сайта)`);
}
