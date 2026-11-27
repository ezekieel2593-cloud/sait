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
 *
 * Ещё две вещи, которые делает скрипт:
 *   • кладёт рядом файл-зонд deploy-probe-<коммит>.txt — workflow после загрузки
 *     открывает его по HTTP и так убеждается, что файлы попали именно в корень
 *     домена (а не в соседний каталог панели);
 *   • удаляет с сервера хешированные бандлы прошлых сборок (app-<старый>.js)
 *     и зонды прежних запусков — они больше нигде не используются.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { Writable } from "node:stream";
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

/** Файл-зонд: по нему workflow проверяет, что загрузка видна на домене. */
const commitSha = (process.env.GITHUB_SHA ?? "").trim();
const probeName = commitSha
  ? `deploy-probe-${commitSha}.txt`
  : "deploy-probe.txt";
/**
 * Второй зонд — в домашний каталог FTP. Панель хостинга может показывать
 * один каталог сайта, а веб-сервер фактически отдавать домашний каталог
 * FTP-аккаунта; этот зонд различает случаи и подсказывает верный FTP_DIR.
 */
const homeProbeName = commitSha
  ? `deploy-probe-home-${commitSha}.txt`
  : "deploy-probe-home.txt";
/** Хешированные бандлы (app-0a1b2c3d.js) и зонды прошлых запусков. */
const HASHED_BUNDLE = /^(?:app|styles)-[0-9a-f]{8}\.(?:js|css)$/;
const PROBE_FILE = /^deploy-probe-.+\.txt$/;

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
/** Каталоги, которые деплой не трогают вовсе. */
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
  // Зонды защищены от --prune: по ним проверяется публикация.
  if (relative === probeName) return true;
  if (relative === homeProbeName) return true;
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
const cleaned: string[] = [];

async function main() {
  const client = new Client(60_000);
  client.ftp.verbose = false;

  if (dryRun) {
    log(`режим проверки (--dry-run): ни файл не будет записан`);
    log(
      `хост: ${host || "(не задан)"}, каталог: ${remoteRoot || "(домашний каталог FTP)"}, порт: ${port}${secure ? ", FTPS" : ""}`,
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
  log(`каталог сайта: ${remoteRoot || `${base} (домашний каталог FTP)`}`);

  if (remoteRoot) {
    await client.ensureDir(remoteRoot);
  }
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

  /* Каталог данных нужен PHP сразу: заявки и сессии пишутся в data/.
     При чистой установке его нет — создаём пустым; содержимое (заявки,
     sessions) никогда не трогаем и не удаляем. */
  await client.ensureDir(toRemote("data"));
  await client.cd(base);

  const existing = new Map<string, { size: number }>();
  const walkRemote = async (relative: string) => {
    const remote = toRemote(relative) || base;
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
    // Заливаем всегда, без пропуска «совпадающих по размеру»: если
    // синхронизация хостинга исказила файл (размер при этом сохранила),
    // пропуск навсегда оставил бы битую копию на сервере.
    await client.uploadFrom(path.join(releaseDir, file), remotePath);
    uploaded.push(file);
  }

  /* Защитный .htaccess для data/: закрывает заявки от браузера. Кладём только
     если его ещё нет — правила сервера деплой не перезаписывает. */
  const dataHtaccess = "data/.htaccess";
  if (
    !existing.has(dataHtaccess) &&
    fs.existsSync(path.join(releaseDir, dataHtaccess))
  ) {
    await client.uploadFrom(
      path.join(releaseDir, dataHtaccess),
      toRemote(dataHtaccess),
    );
    uploaded.push(dataHtaccess);
  }

  /* Контроль целостности PHP: скачиваем загруженные файлы обратно и
     сверяем байт-в-байт. Известная проблема хостинга — часть «синхронизаций»
     искажает свежезагруженные файлы, сайт тогда молча получает битый PHP
     (HTTP 500). Здесь это станет ошибкой деплоя, а не сюрпризом. */
  const phpFiles = uploaded.filter((file) => file.endsWith(".php"));
  if (phpFiles.length) {
    const verifyOnce = async (file: string): Promise<boolean> => {
      const chunks: Buffer[] = [];
      const sink = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        },
      });
      await client.downloadTo(sink, toRemote(file));
      return Buffer.concat(chunks).equals(
        fs.readFileSync(path.join(releaseDir, file)),
      );
    };
    let broken: string[] = [];
    for (const file of phpFiles) {
      if (!(await verifyOnce(file))) broken.push(file);
    }
    if (broken.length) {
      console.log(`  ! искажены при загрузке, перезаливаю: ${broken.join(", ")}`);
      for (const file of broken) {
        await client.uploadFrom(path.join(releaseDir, file), toRemote(file));
      }
      const stillBroken: string[] = [];
      for (const file of broken) {
        if (!(await verifyOnce(file))) stillBroken.push(file);
      }
      if (stillBroken.length) {
        throw new Error(
          `Файлы искажаются на стороне хостинга (${stillBroken.join(", ")}): нужен тикет в поддержку, деплой не может гарантировать целостность.`,
        );
      }
    }
    console.log(
      `  · целостность PHP подтверждена (${phpFiles.length} файлов, байт-в-байт)`,
    );
  }

  /* Зонд: маленький файл с номером коммита. Workflow после загрузки открывает
     его по HTTP — так мы узнаём, что файлы попали в корень домена, а не в
     соседний каталог панели. */
  const probePath = path.join(releaseDir, probeName);
  fs.writeFileSync(
    probePath,
    `${commitSha || "local"}\n${new Date().toISOString()}\n`,
    "utf8",
  );
  await client.uploadFrom(probePath, toRemote(probeName));

  /* Второй зонд — в домашний каталог FTP: если домен обслуживает домашний
     каталог, а не каталог из панели, это станет видно сразу. */
  await client.uploadFrom(probePath, homeProbeName);
  fs.rmSync(probePath, { force: true });

  /* Зонды прежних запусков в домашнем каталоге больше не нужны. */
  try {
    for (const entry of await client.list(base)) {
      if (entry.isDirectory || !entry.name.startsWith("deploy-probe-")) continue;
      if (entry.name === probeName || entry.name === homeProbeName) continue;
      try {
        await client.remove(`${base}/${entry.name}`.replace(/\/+/g, "/"));
        cleaned.push(entry.name);
      } catch {
        /* не критично: старый зонд останется до следующего запуска */
      }
    }
  } catch {
    /* список домашнего каталога недоступен — пропускаем чистку */
  }

  /* Файлы прошлых сборок с другим отпечатком больше нигде не используются:
     страница ссылается только на текущие имена. Убираем их и зонды прежних
     запусков, чтобы на сервере не копились app-<старый>.js. */
  const currentBundles = new Set(
    localFiles.filter((file) => HASHED_BUNDLE.test(file)),
  );
  for (const file of existing.keys()) {
    const staleBundle = HASHED_BUNDLE.test(file) && !currentBundles.has(file);
    const staleProbe = PROBE_FILE.test(file) && file !== probeName;
    if ((!staleBundle && !staleProbe) || isProtected(file)) continue;
    try {
      await client.remove(toRemote(file));
      cleaned.push(file);
    } catch {
      warn(`не удалось убрать файл прошлой сборки: ${file}`);
    }
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
    await chmod(toRemote("") || base, "755");
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
if (cleaned.length > 0) {
  log(`убраны файлы прошлых сборок: ${cleaned.length}`);
  for (const file of cleaned.slice(0, 10)) console.log(`  × ${file}`);
}
if (uploaded.length > 0 && uploaded.length <= 40) {
  for (const file of uploaded) console.log(`  ↑ ${file}`);
} else if (uploaded.length > 40) {
  // Полный список длинный: показываем PHP-файлы (их целостность важнее
  // всего) и итоговое число.
  const phpList = uploaded.filter((file) => file.endsWith(".php"));
  for (const file of phpList) console.log(`  ↑ ${file}`);
  console.log(`  … и ещё ${uploaded.length - phpList.length} не-PHP файлов`);
}
if (guarded.length > 0) {
  log(`не тронуты файлы сервера: ${guarded.join(", ")}`);
}
log("готово: откройте сайт и проверьте страницы и вход в кабинет");
