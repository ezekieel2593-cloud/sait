/**
 * Автодеплой сайта на shared-хостинг по FTP/SFTP-less протоколу (FTP и FTPS).
 *
 *   npm run deploy:ftp              сборка release/php + загрузка
 *   npm run deploy:ftp -- --dry-run  показать, что будет загружено, без записи
 *   npm run deploy:ftp -- --no-build загрузить уже собранное
 *   npm run deploy:ftp -- --prune    удалить на сервере файлы, которых больше нет в сборке
 *
 * Рассчитан на shared-хостинги с ISPmanager (Cloud4box) и на панели вроде SpaceWeb.
 *
 * Обязательных настроек всего четыре — ровно те поля, что есть в панели хостинга:
 *   FTP_HOST      хост FTP: домен сайта или IP сервера
 *   FTP_USER      логин FTP
 *   FTP_PASSWORD  пароль FTP
 *   FTP_DIR       каталог сайта на сервере (он же «директория» в панели),
 *                 по умолчанию public_html
 *
 * Необязательные — нужны только если хостинг их требует:
 *   FTP_PORT      21 по умолчанию
 *   FTP_SECURE    1 — включить FTPS (шифрование). По умолчанию выключено,
 *                 обычный FTP из панели работает без этой настройки.
 *
 * Старые имена переменных тоже понимаются: FTP_REMOTE = FTP_DIR,
 * FTP_USERNAME = FTP_USER, FTP_PASS = FTP_PASSWORD.
 *
 * Никогда не загружаются и не удаляются:
 *   config.php  — пароль владельца и настройки живут только на сервере;
 *   data/       — заявки, счётчики лимитов, сессии;
 *   setup.php   — только если он уже есть на сервере (после установки его удаляют,
 *                 и деплой не должен возвращать открытую установку обратно).
 *
 * Деплой идемпотентен: неизменившиеся файлы обычно пропускаются по размеру.
 * HTML и главные bundles загружаются принудительно, даже если размер совпадает:
 * FTP LIST не даёт надёжной контрольной суммы, а старый JS-кэш — критичен.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { Client } from "basic-ftp";

const root = process.cwd();
/**
 * Что загружаем: каталог сборки. По умолчанию release/php;
 * при деплое без сборки с сервера GitHub берётся распакованный архив (см. workflow).
 */
const releaseDir =
  process.env.DEPLOY_SOURCE || path.join(root, "release", "php");
const log = (message: string) => console.log(`· ${message}`);
const warn = (message: string) => console.warn(`! ${message}`);

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipBuild = args.has("--no-build");
const prune = args.has("--prune");

/* --------------------------- 0. Переменные окружения --------------------- */

/** Простой парсер .env.deploy: KEY=VALUE, строки с # — комментарии. */
function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, ".env.deploy"));

/** Первое непустое значение из списка имён — чтобы работали и старые, и новые имена. */
function env(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

const host = env("FTP_HOST", "FTP_SERVER", "FTP_ADDRESS");
const user = env("FTP_USER", "FTP_USERNAME", "FTP_LOGIN");
const password = process.env.FTP_PASSWORD ?? process.env.FTP_PASS ?? "";
/** «Директория» из панели: public_html или www/домен. */
const configuredRemoteRoot =
  env("FTP_DIR", "FTP_DIRECTORY", "FTP_REMOTE", "FTP_PATH") || "public_html";
// Keep a leading slash: ISPmanager document roots are often absolute FTP paths
// (for example /www/example.test). Removing it silently changes the target to
// a path relative to the FTP account's login directory.
const remoteRoot = configuredRemoteRoot.replace(/\/+$/g, "");
/**
 * Веб-серверы ISPmanager (Cloud4box) и Apache на shared-хостингах не любят,
 * когда у каталога нет прав на запись для PHP. Права выставляем после загрузки;
 * если FTP не разрешает SITE CHMOD — просто предупреждаем.
 */
const setPermissions = process.env.FTP_CHMOD !== "0";
/** FTPS включается только явно: «1», «true», «yes». По умолчанию — обычный FTP. */
const secure = ["1", "true", "yes", "on"].includes(
  (process.env.FTP_SECURE ?? "").trim().toLowerCase(),
);
const port = Number(env("FTP_PORT") || 21);

if (!dryRun && (!host || !user || !password)) {
  const missing = [
    !host ? "FTP_HOST (хост)" : null,
    !user ? "FTP_USER (логин)" : null,
    !password ? "FTP_PASSWORD (пароль)" : null,
  ].filter(Boolean);
  throw new Error(
    `не заданы: ${missing.join(", ")} — скопируйте .env.deploy.example в .env.deploy и заполните, либо добавьте секреты в GitHub`,
  );
}

/* ------------------------------- 1. Сборка ------------------------------- */

if (skipBuild) {
  log("сборка пропущена (--no-build)");
} else {
  log("собираю пакет для хостинга: npm run build:php");
  execFileSync("npm", ["run", "build:php"], { cwd: root, stdio: "inherit" });
}

if (!fs.existsSync(path.join(releaseDir, "index.html"))) {
  throw new Error("в release/php нет index.html — сборка не удалась");
}

/* ---------------------- 2. Что можно трогать на сервере ------------------ */

/** Файлы, которые принадлежат серверу, а не сборке. */
const PROTECTED_FILES = new Set(["config.php"]);
/** Каталоги, которые деплой не трогает вовсе. */
const PROTECTED_DIRS = ["data"];
/**
 * Файлы, которые обновляются только если их ещё нет на сервере:
 * возвращать удалённый setup.php нельзя — это открытая установка.
 */
const CREATE_ONLY = new Set(["setup.php"]);

function toRemote(relative: string) {
  return [remoteRoot, relative].filter(Boolean).join("/");
}

/** Все файлы сборки как пути относительно release/php. */
function listLocalFiles(dir = releaseDir, prefix = ""): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      result.push(...listLocalFiles(path.join(dir, entry.name), relative));
    } else {
      result.push(relative);
    }
  }
  return result;
}

function isProtected(relative: string) {
  if (PROTECTED_FILES.has(relative)) return true;
  return PROTECTED_DIRS.some(
    (dir) => relative === dir || relative.startsWith(`${dir}/`),
  );
}

const localFiles = listLocalFiles();
const guarded = localFiles.filter(isProtected);
const uploadable = localFiles.filter((file) => !isProtected(file));

/* ------------------------------- 3. Загрузка ----------------------------- */

const uploaded: string[] = [];
const skipped: string[] = [];
const removed: string[] = [];

async function main() {
  const client = new Client(60_000);
  client.ftp.verbose = false;

  if (dryRun) {
    log(`режим проверки (--dry-run): ни файл не будет записан`);
    log(
      `хост: ${host || "(не задан)"}, каталог: ${remoteRoot}, порт: ${port}${secure ? ", FTPS" : ""}`,
    );
    log(
      `к загрузке: ${uploadable.length} файлов, под защитой: ${guarded.length}`,
    );
    for (const file of uploadable.slice(0, 30)) console.log(`  + ${file}`);
    if (uploadable.length > 30)
      console.log(`  … и ещё ${uploadable.length - 30}`);
    for (const file of guarded) console.log(`  ~ ${file} (не трогаем)`);
    // Часть защищённых файлов в сборку не входит вовсе — о них сообщаем отдельно.
    for (const name of PROTECTED_FILES) console.log(`  ~ ${name} (не трогаем)`);
    for (const dir of PROTECTED_DIRS) console.log(`  ~ ${dir}/ (не трогаем)`);
    return;
  }

  log(`подключение к ${host}:${port}${secure ? " (FTPS)" : ""}`);
  await client.access({
    host,
    user,
    password,
    port,
    secure: secure ? "implicit" : false,
  });
  const base = await client.pwd();
  log(`каталог сайта: ${remoteRoot}`);

  await client.ensureDir(remoteRoot);
  await client.cd(base);

  /* Создаём каталоги сборки заранее — так меньше переключений. */
  const dirs = [
    ...new Set(
      uploadable
        .map((file) => path.posix.dirname(file))
        .filter((dir) => dir !== "."),
    ),
  ];
  for (const dir of dirs) {
    await client.ensureDir(toRemote(dir));
    await client.cd(base);
  }

  const existing = new Map<string, { size: number }>();
  const walkRemote = async (relative: string) => {
    const remote = toRemote(relative);
    let entries;
    try {
      entries = await client.list(remote);
    } catch {
      return;
    }
    for (const entry of entries) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory) {
        if (PROTECTED_DIRS.includes(child)) continue;
        await walkRemote(child);
      } else {
        existing.set(child, { size: entry.size });
      }
    }
  };
  await walkRemote("");

  const remoteSizes = new Map<string, number>();
  for (const [file, item] of existing) remoteSizes.set(file, item.size);

  for (const file of uploadable) {
    const remotePath = toRemote(file);
    if (CREATE_ONLY.has(file) && existing.has(file)) {
      skipped.push(file);
      continue;
    }
    const localSize = fs.statSync(path.join(releaseDir, file)).size;
    const forceRefresh =
      file.endsWith(".html") ||
      ["app.js", "styles.css", "config.js"].includes(file);
    if (remoteSizes.get(file) === localSize && !forceRefresh) {
      skipped.push(file);
      continue;
    }
    await client.uploadFrom(path.join(releaseDir, file), remotePath);
    uploaded.push(file);
  }

  /* Права: каталоги 755, файлы 644, data/ — 775, чтобы PHP мог писать заявки. */
  if (setPermissions) {
    const chmodWarned = { value: false };
    const chmod = async (remotePath: string, mode: string) => {
      try {
        await client.send(`SITE CHMOD ${mode} ${remotePath}`);
      } catch (error) {
        if (!chmodWarned.value) {
          warn(
            "хостинг не разрешил менять права по FTP (SITE CHMOD) — выставьте их в панели: папки 755, файлы 644",
          );
          chmodWarned.value = true;
        }
      }
    };
    for (const dir of dirs) await chmod(toRemote(dir), "755");
    await chmod(toRemote(""), "755");
    // data/ создаёт PHP при первой заявке; если каталог уже есть — даём запись.
    await chmod(toRemote("data"), "775");
  }

  const localSet = new Set(uploadable);
  if (prune) {
    for (const file of existing.keys()) {
      if (localSet.has(file) || isProtected(file)) continue;
      await client.remove(toRemote(file));
      removed.push(file);
    }
  } else {
    const orphans = [...existing.keys()].filter(
      (file) => !isProtected(file) && !localSet.has(file),
    );
    if (orphans.length > 0) {
      warn(
        `на сервере ${orphans.length} файлов, которых нет в сборке (удалить можно с --prune):`,
      );
      for (const file of orphans.slice(0, 10)) console.log(`    ? ${file}`);
    }
  }

  client.close();
}

await main();

log(
  `загружено: ${uploaded.length}, без изменений: ${skipped.length}, удалено: ${removed.length}`,
);
if (uploaded.length > 0 && uploaded.length <= 40) {
  for (const file of uploaded) console.log(`  ↑ ${file}`);
}
if (guarded.length > 0) {
  log(`не тронуты файлы сервера: ${guarded.join(", ")}`);
}
log("готово: откройте сайт и проверьте страницы и вход в кабинет");
