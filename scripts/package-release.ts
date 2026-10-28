/**
 * Сборка архива для хостинга.
 *
 *   npm run package:release
 *
 * Что делает:
 *  1. собирает production-сборку Next.js в режиме standalone;
 *  2. кладёт в архив готовый к запуску каталог (server.js, static, public);
 *  3. добавляет созданную и наполненную базу (услуги + база знаний, без аккаунтов);
 *  4. добавляет утилиты на чистом Node: init-db.mjs, create-specialist.mjs, start.sh;
 *  5. упаковывает всё в release/astra-pearl-<версия>.zip и .tar.gz.
 *
 * Скрипт не добавляет в архив секреты: только .env.example.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { SCHEMA } from "../src/lib/db.ts";
import { KNOWLEDGE_SOURCES } from "../src/lib/knowledge/sources.ts";
import { ALL_ENTRIES } from "../src/lib/knowledge/seed.ts";
import { DEFAULT_SERVICES } from "../src/lib/repositories/services.ts";

const root = process.cwd();
const releaseDir = path.join(root, "release");
const stage = path.join(releaseDir, "astra-pearl");
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version as string;
const archiveBase = path.join(releaseDir, `astra-pearl-${version}`);

const log = (message: string) => console.log(`· ${message}`);

/* ------------------------------ 1. Сборка ------------------------------ */

log("сборка Next.js (standalone)");
execFileSync("npm", ["run", "build"], { stdio: "inherit", cwd: root });

/* ------------------------------ 2. Каркас ------------------------------ */

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });

const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("Не найден .next/standalone/server.js — проверьте output: \"standalone\" в next.config.ts");
}

fs.cpSync(standalone, stage, { recursive: true });

/**
 * Облегчаем архив: оставляем только тот бинарный образ sharp, который нужен
 * на Linux x64 (glibc). Приложение не использует next/image, поэтому
 * дополнительных сборок (musl, wasm, macOS, Windows) в поставке не требуется.
 */
const prune = [
  "node_modules/@img/sharp-wasm32",
  "node_modules/@img/sharp-linuxmusl-x64",
  "node_modules/@img/sharp-libvips-linuxmusl-x64",
  "node_modules/@img/sharp-darwin-arm64",
  "node_modules/@img/sharp-darwin-x64",
  "node_modules/@img/sharp-win32-x64",
  "node_modules/@img/sharp-win32-ia32",
  "node_modules/@img/sharp-libvips-darwin-arm64",
  "node_modules/@img/sharp-libvips-darwin-x64",
  "node_modules/@img/sharp-libvips-win32-x64",
];
for (const target of prune) {
  fs.rmSync(path.join(stage, target), { recursive: true, force: true });
}
log("лишние бинарные зависимости удалены");
const staticSource = path.join(root, ".next", "static");
if (fs.existsSync(staticSource)) fs.cpSync(staticSource, path.join(stage, ".next", "static"), { recursive: true });
if (fs.existsSync(path.join(root, "public"))) fs.cpSync(path.join(root, "public"), path.join(stage, "public"), { recursive: true });
log("сборка скопирована");

/* --------------------------- 3. База и утилиты --------------------------- */

const escapeSql = (value: string | null | undefined) =>
  value === null || value === undefined ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;

const now = new Date().toISOString();

const seedStatements: string[] = [];
DEFAULT_SERVICES.forEach((service, index) => {
  seedStatements.push(
    `INSERT INTO services (id, slug, direction, title, description, price, duration, includes, is_active, sort, created_at, updated_at)
VALUES (${escapeSql(`srv-${service.slug}`)}, ${escapeSql(service.slug)}, ${escapeSql(service.direction)}, ${escapeSql(service.title)},
  ${escapeSql(service.description)}, NULL, NULL, ${escapeSql(JSON.stringify(service.includes))}, 1, ${index}, ${escapeSql(now)}, ${escapeSql(now)})
ON CONFLICT(slug) DO UPDATE SET title = excluded.title, description = excluded.description,
  includes = excluded.includes, direction = excluded.direction, updated_at = excluded.updated_at;`
  );
});

const sourceIds = new Set(KNOWLEDGE_SOURCES.map((source) => source.id));
for (const source of KNOWLEDGE_SOURCES) {
  seedStatements.push(
    `INSERT INTO knowledge_sources (id, title, url, publisher, accessed_at, note)
VALUES (${escapeSql(source.id)}, ${escapeSql(source.title)}, ${escapeSql(source.url ?? null)}, ${escapeSql(source.publisher)},
  ${escapeSql(source.accessedAt)}, ${escapeSql(source.note ?? "")})
ON CONFLICT(id) DO UPDATE SET title = excluded.title, url = excluded.url, publisher = excluded.publisher,
  accessed_at = excluded.accessed_at, note = excluded.note;`
  );
}

for (const entry of ALL_ENTRIES) {
  const id = `${entry.domain}:${entry.key}:${entry.methodology}`;
  const sourceId = entry.sourceId && sourceIds.has(entry.sourceId) ? entry.sourceId : null;
  seedStatements.push(
    `INSERT INTO knowledge_entries (id, domain, key, title, summary, positive, shadow, recommendations, details, methodology, source_id, verified_at, version)
VALUES (${escapeSql(id)}, ${escapeSql(entry.domain)}, ${escapeSql(entry.key)}, ${escapeSql(entry.title)}, ${escapeSql(entry.summary)},
  ${escapeSql(JSON.stringify(entry.positive))}, ${escapeSql(JSON.stringify(entry.shadow))}, ${escapeSql(JSON.stringify(entry.recommendations))},
  ${escapeSql(JSON.stringify(entry.details))}, ${escapeSql(entry.methodology)}, ${escapeSql(sourceId)}, ${escapeSql(now.slice(0, 10))}, ${escapeSql(entry.version)})
ON CONFLICT(domain, key, methodology) DO UPDATE SET title = excluded.title, summary = excluded.summary,
  positive = excluded.positive, shadow = excluded.shadow, recommendations = excluded.recommendations,
  details = excluded.details, source_id = excluded.source_id, verified_at = excluded.verified_at, version = excluded.version;`
  );
}

const seedSql = seedStatements.join("\n\n");

fs.mkdirSync(path.join(stage, "tools"), { recursive: true });
fs.writeFileSync(
  path.join(stage, "tools", "schema.mjs"),
  `// Сгенерировано сборкой релиза (npm run package:release). Не редактируйте вручную.\nexport const SCHEMA = ${JSON.stringify(SCHEMA)};\n\nexport const SEED = ${JSON.stringify(seedSql)};\n`,
  "utf8"
);
fs.copyFileSync(path.join(root, "tools", "init-db.mjs"), path.join(stage, "tools", "init-db.mjs"));
fs.copyFileSync(path.join(root, "tools", "create-specialist.mjs"), path.join(stage, "tools", "create-specialist.mjs"));
fs.copyFileSync(path.join(root, "tools", "maintenance.mjs"), path.join(stage, "tools", "maintenance.mjs"));

// Готовая база: схема + услуги + база знаний, без аккаунтов и без заявок.
fs.mkdirSync(path.join(stage, "data"), { recursive: true });
const dbPath = path.join(stage, "data", "app.db");
const db = new DatabaseSync(dbPath);
db.exec(SCHEMA);
db.exec(seedSql);
const entries = (db.prepare("SELECT COUNT(*) AS n FROM knowledge_entries").get() as { n: number }).n;
const services = (db.prepare("SELECT COUNT(*) AS n FROM services").get() as { n: number }).n;
db.close();
log(`база создана: услуг ${services}, записей базы знаний ${entries}, аккаунтов 0`);

/* ---------------------------- 4. Обвязка ---------------------------- */

fs.copyFileSync(path.join(root, ".env.example"), path.join(stage, ".env.example"));
fs.mkdirSync(path.join(stage, "docs"), { recursive: true });
for (const doc of ["DEPLOYMENT.md", "INTEGRATIONS.md", "METHODOLOGY.md", "API.md"]) {
  fs.copyFileSync(path.join(root, "docs", doc), path.join(stage, "docs", doc));
}

fs.writeFileSync(
  path.join(stage, "start.sh"),
  `#!/usr/bin/env sh
# Запуск готовой сборки. Хостеру достаточно выставить PORT и переменные окружения.
set -e
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

NODE_ENV=production
export NODE_ENV
PORT="\${PORT:-3000}"
HOSTNAME="\${HOSTNAME:-0.0.0.0}"
export PORT HOSTNAME
DATABASE_PATH="\${DATABASE_PATH:-./data/app.db}"
export DATABASE_PATH

echo "Astra Pearl: http://\${HOSTNAME}:\${PORT}  (база: \${DATABASE_PATH})"
exec node server.js
`,
  "utf8"
);
fs.chmodSync(path.join(stage, "start.sh"), 0o755);

fs.writeFileSync(
  path.join(stage, "HOSTING.md"),
  `# Как залить на хостинг

В архиве — готовая production-сборка (Next.js standalone) и заполненная база.
Сборка на сервере не нужна: требуются только **Node.js 22.5 или новее**
(используется встроенный модуль \`node:sqlite\`) и постоянный диск.

## Быстрый старт (VPS, Node.js)

\`\`\`bash
unzip astra-pearl-${version}.zip -d /srv     # содержимое появится в /srv/astra-pearl
cd /srv/astra-pearl

cp .env.example .env
# отредактируйте .env: AUTH_SECRET (openssl rand -hex 32), NEXT_PUBLIC_SITE_URL=https://ваш-домен

node tools/init-db.mjs            # проверка базы и наполнения (можно пропустить: база уже в архиве)
node tools/create-specialist.mjs --email you@example.com --name "Ваше имя" --password 'длинный-пароль'

./start.sh                        # или: PORT=3000 node server.js
\`\`\`

Сайт: \`http://localhost:3000\`, кабинет: \`/specialist/login\`.

Порт задаётся переменной \`PORT\` (многие PaaS передают её сами).
Перед публикацией поставьте HTTPS-прокси (nginx/Caddy) — cookie сессии в production
передаётся только по HTTPS.

## Что где лежит

| Путь | Назначение |
| --- | --- |
| \`server.js\`, \`.next/\`, \`node_modules/\` | сервер приложения (не переносите по отдельности) |
| \`public/\` | логотип, OG-картинка, плейсхолдер фото |
| \`data/app.db\` | база: настройки, услуги, база знаний, заявки, аккаунты |
| \`tools/init-db.mjs\` | создать схему и наполнить справочники (идемпотентно) |
| \`tools/create-specialist.mjs\` | создать аккаунт / сменить пароль / список аккаунтов |
| \`tools/schema.mjs\` | сгенерированная схема и наполнение для init-db |
| \`tools/maintenance.mjs\` | плановая чистка: обезличивание старых заявок, сессии, лимиты |
| \`start.sh\` | запуск с чтением \`.env\` |
| \`docs/\` | деплой, интеграции, методика, API |

## Обязательные переменные окружения

\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://ваш-домен
AUTH_SECRET=<openssl rand -hex 32>
DATABASE_PATH=./data/app.db
\`\`\`

Дополнительно (уведомления о заявках): \`TELEGRAM_BOT_TOKEN\`, \`TELEGRAM_CHAT_ID\`,
\`MAX_BOT_TOKEN\`, \`MAX_CHAT_ID\`, \`SMTP_HOST\`, \`SMTP_PORT\`, \`SMTP_USER\`, \`SMTP_PASSWORD\`, \`MAIL_FROM\`.
Пока они пусты, заявки сохраняются в базе и видны в кабинете, а в журнале уведомлений
стоит статус \`skipped\` — это нормальное состояние, а не ошибка.

## Хостинг без Node.js

Архив рассчитан на Node-хостинг (VPS, Railway, Render, Timeweb Cloud и т. п.).
На статическом хостинге (GitHub Pages, обычный shared-хостинг без Node) приложение
работать не будет: расчёты, заявки и кабинет выполняются на сервере.

## Обслуживание

\`\`\`bash
# ежедневно по cron: обезличивание старых заявок, чистка лимитов и сессий
15 4 * * * cd /srv/astra-pearl && node tools/maintenance.mjs >> /var/log/astra-maintenance.log 2>&1
\`\`\`

## Обновление

1. Сделайте бэкап \`data/app.db\`.
2. Распакуйте новую версию архива в отдельный каталог.
3. Скопируйте туда свой \`data/app.db\` и \`.env\`.
4. Перезапустите сервис.

Схема создаётся через \`CREATE TABLE IF NOT EXISTS\`, поэтому новая версия работает
со старой базой; при необходимости выполните \`node tools/init-db.mjs\`.

Подробности, systemd/nginx и резервное копирование — в \`docs/DEPLOYMENT.md\`.
`,
  "utf8"
);

/* ---------------------------- 5. Архив ---------------------------- */

for (const file of [`${archiveBase}.zip`, `${archiveBase}.tar.gz`]) fs.rmSync(file, { force: true });

execFileSync("zip", ["-qr", `${archiveBase}.zip`, "astra-pearl"], { cwd: releaseDir });
execFileSync("tar", ["-czf", `${archiveBase}.tar.gz`, "astra-pearl"], { cwd: releaseDir });
log(`готово: release/${path.basename(archiveBase)}.zip`);
log(`готово: release/${path.basename(archiveBase)}.tar.gz`);
