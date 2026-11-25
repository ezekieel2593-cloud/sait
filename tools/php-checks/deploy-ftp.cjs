/**
 * Проверка `scripts/deploy-ftp.ts` на локальном FTP-сервере (ftp-srv).
 *
 *   node tools/php-checks/deploy-ftp.cjs
 *
 * Что проверяем:
 *   1. файлы сборки попадают в каталог сайта;
 *   2. config.php, data/ и уже существующий setup.php на сервере не меняются
 *      и не удаляются даже с --prune;
 *   3. повторный запуск ничего не загружает (сравнение по размеру);
 *   4. удалённый файл сборки убирается только с --prune.
 *
 * Сеть наружу не нужна: сервер поднимается на 127.0.0.1.
 */
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");
const { FtpSrv } = require(path.join(repoRoot, "node_modules/ftp-srv"));

const run_node = promisify(execFile);

const PORT = 2121;
const HOST = "127.0.0.1";
const USER = "site";
const PASS = "secret";

let pass = 0;
let fail = 0;
function check(name, ok, extra = "") {
  if (ok) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${name}${extra ? " :: " + extra : ""}`);
  }
}

(async () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-ftp-"));
  const serverRoot = path.join(sandbox, "server");
  const siteDir = path.join(serverRoot, "public_html");
  fs.mkdirSync(siteDir, { recursive: true });
  // Уже настроенный сервер: конфиг, заявки и установка уже удалены/созданы.
  fs.writeFileSync(path.join(siteDir, "config.php"), "<?php return ['owner' => ['login' => 'Adelina']];\n");
  fs.mkdirSync(path.join(siteDir, "data"), { recursive: true });
  fs.writeFileSync(path.join(siteDir, "data", "leads.php"), "<?php return [];\n");
  fs.writeFileSync(path.join(siteDir, "setup.php"), "<?php // установка уже пройдена\n");
  fs.writeFileSync(path.join(siteDir, "old-page.html"), "<!doctype html><title>старое</title>\n");

  const server = new FtpSrv({
    url: `ftp://${HOST}:${PORT}`,
    pasv_url: HOST,
    pasv_min: 3000,
    pasv_max: 3010,
    anonymous: false,
  });
  server.on("login", ({ username, password }, resolve, reject) => {
    if (username === USER && password === PASS) return resolve({ root: serverRoot });
    reject(new Error("неверный пароль"));
  });
  await server.listen();
  console.log(`FTP-сервер поднят на ${HOST}:${PORT}\n`);

  const env = {
    ...process.env,
    FTP_HOST: HOST,
    FTP_PORT: String(PORT),
    FTP_USER: USER,
    FTP_PASSWORD: PASS,
    FTP_DIR: "public_html",
    FTP_SECURE: "0",
  };
  /* execFile (а не execFileSync): сервер живёт в этом же процессе и должен
     отвечать, пока дочерний процесс загружает файлы. */
  const run = async (extra = []) => {
    const { stdout } = await run_node("npx", ["tsx", "scripts/deploy-ftp.ts", "--no-build", ...extra], {
      cwd: repoRoot,
      env,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout;
  };

  /* ------------------------------ 1. Проверка ----------------------------- */
  console.log("1. Режим проверки");
  const { stdout: dry } = await run_node("npx", ["tsx", "scripts/deploy-ftp.ts", "--no-build", "--dry-run"], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  check("dry-run ничего не пишет на сервер", !fs.existsSync(path.join(siteDir, "index.html")));
  check("dry-run показывает защищённые файлы", /config\.php \(не трогаем\)/.test(dry));
  check("dry-run показывает папку сайта", /каталог: public_html/.test(dry));

  /* --------------------- 1б. Совместимость имён переменных ----------------- */
  console.log("\n1б. Имена настроек");
  const legacyEnv = { ...process.env };
  delete legacyEnv.FTP_DIR;
  const { stdout: oldNames } = await run_node("npx", ["tsx", "scripts/deploy-ftp.ts", "--no-build", "--dry-run"], {
    cwd: repoRoot,
    env: {
      ...legacyEnv,
      FTP_HOST: "example.test",
      FTP_USERNAME: "site",
      FTP_PASS: "secret",
      FTP_REMOTE: "www/example.test",
    },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  check("старое имя FTP_REMOTE работает как FTP_DIR", /каталог: www\/example\.test/.test(oldNames));
  check("FTP_SECURE не требуется", /порт: 21(\s|$|,)/.test(oldNames));
  check("обычный FTP по умолчанию", !/FTPS/.test(oldNames));

  /* ------------------------------ 2. Загрузка ----------------------------- */
  console.log("\n2. Загрузка");
  const first = await run();
  check("index.html загружен", fs.existsSync(path.join(siteDir, "index.html")));
  check("каталог api загружен", fs.existsSync(path.join(siteDir, "api")));
  check("config.php не перезаписан", fs.readFileSync(path.join(siteDir, "config.php"), "utf8").includes("Adelina"));
  check("заявки не тронуты", fs.existsSync(path.join(siteDir, "data", "leads.php")));
  check("setup.php не перезаписан", fs.readFileSync(path.join(siteDir, "setup.php"), "utf8").includes("пройдена"));
  check("отчёт содержит количество файлов", /загружено: \d+/.test(first));

  /* --------------------------- 3. Повторный запуск ------------------------ */
  console.log("\n3. Повторный запуск");
  const second = await run();
  check("повторно принудительно обновляются HTML и главный JS", /↑ index\.html/.test(second) && /↑ app\.js/.test(second));
  check("прочие файлы без изменений пропущены", /без изменений: [1-9]/.test(second));

  /* ------------------------------ 4. Удаление ----------------------------- */
  console.log("\n4. Чистка лишних файлов");
  const third = await run(["--prune"]);
  check("лишний файл удалён", !fs.existsSync(path.join(siteDir, "old-page.html")));
  check("config.php после чистки на месте", fs.existsSync(path.join(siteDir, "config.php")));
  check("data/ после чистки на месте", fs.existsSync(path.join(siteDir, "data", "leads.php")));
  check("setup.php после чистки на месте", fs.existsSync(path.join(siteDir, "setup.php")));
  check("отчёт по чистке не пустой", /удалено: 1/.test(third), third.split("\n").pop());

  server.close();
  fs.rmSync(sandbox, { recursive: true, force: true });

  console.log(`\nИтого: ${pass} ok, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
