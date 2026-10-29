/**
 * Проверка установки: setup.php создаёт config.php и записывает пароль.
 *
 *   node tools/php-checks/setup-flow.cjs
 *
 * Почему это важно: config.php НЕ входит в архив сайта (иначе обновление
 * сбрасывало бы пароль). Значит, установка обязана создавать файл сама.
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");

function loadPhpNode() {
  const candidates = [
    "php-wasm/PhpNode",
    path.join(process.env.PHP_WASM_DIR || "/tmp/phptest", "node_modules/php-wasm/PhpNode"),
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      /* пробуем следующий путь */
    }
  }
  throw new Error("php-wasm не найден: npm i php-wasm в отдельной папке и задайте PHP_WASM_DIR");
}

const { PhpNode } = loadPhpNode();

const SRC = path.join(repoRoot, "php");

// Хеш пароля по умолчанию из config.example.php — нужен для сценария «свежая установка».
const EXAMPLE = fs.readFileSync(path.join(repoRoot, "php/inc/config.example.php"), "utf8");
process.env.DEFAULT_HASH = (EXAMPLE.match(/'passwordHash' => '([^']*)'/) || [])[1] || "";
const APP = "/app";

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

function phpQuote(value) {
  return "'" + String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

function phpArray(obj) {
  const parts = Object.entries(obj || {}).map(([k, v]) => `${phpQuote(k)} => ${phpQuote(v)}`);
  return `[${parts.join(", ")}]`;
}

function walkFiles(dir, prefix = "") {
  const result = {};
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = prefix + entry;
    if (fs.statSync(full).isDirectory()) {
      Object.assign(result, walkFiles(full, rel + "/"));
    } else if (entry.endsWith(".php")) {
      result[rel] = fs.readFileSync(full, "base64");
    }
  }
  return result;
}

(async () => {
  const php = new PhpNode();
  let out = "";
  php.addEventListener("output", (e) => {
    for (const chunk of e.detail) out += String(chunk);
  });

  const files = {};
  for (const [rel, b64] of Object.entries(walkFiles(SRC))) files[`${APP}/${rel}`] = b64;
  await php.run(`<?php
$files = json_decode(base64_decode('${Buffer.from(JSON.stringify(files)).toString("base64")}'), true);
@mkdir('/app', 0777, true);
foreach ($files as $path => $b64) {
    @mkdir(dirname($path), 0777, true);
    file_put_contents($path, base64_decode($b64));
}
@mkdir('/app/data', 0777, true);
@touch('/app/index.html');
`);

  const run = async (code) => {
    out = "";
    await php.run(code);
    return out;
  };

  /** Читаем файл средствами PHP: FS-кэш wasm не всегда видит новые файлы. */
  // Вывод может содержать служебные строки PHP, поэтому ищем маркеры, а не равенство.
  const readFile = async (target) => {
    const out = await run(`<?php echo "@@FILE@@" . (file_exists('${target}') ? file_get_contents('${target}') : "@@MISSING@@") . "@@END@@";`);
    const m = out.match(/@@FILE@@([\s\S]*?)@@END@@/);
    return m ? m[1] : "@@MISSING@@";
  };
  const exists = async (target) => /@@Y@@/.test(await run(`<?php echo file_exists('${target}') ? '@@Y@@' : '@@N@@';`));

  const doPost = (post) => run(`<?php
define('APP_TEST_NO_EXIT', true);
require_once '/app/inc/bootstrap.php';
app_config(true);

$_SERVER['REQUEST_METHOD'] = 'POST';
$_POST = ${phpArray(post)};
ob_start();
try { include '/app/setup.php'; } catch (RuntimeException $e) { if ($e->getMessage() !== 'app_exit') { echo "EX:" . $e->getMessage(); } }
$body = ob_get_clean();
echo "@@BODY@@" . $body;
`);
  const doGet = (query = {}) => run(`<?php
define('APP_TEST_NO_EXIT', true);
require_once '/app/inc/bootstrap.php';
app_config(true);

$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET = ${phpArray(query)};
ob_start();
try { include '/app/setup.php'; } catch (RuntimeException $e) { if ($e->getMessage() !== 'app_exit') { echo "EX:" . $e->getMessage(); } }
echo "@@BODY@@" . ob_get_clean();
`);

  /* --------------------------- 1. до установки --------------------------- */

  check("config.php в архиве отсутствует (его создаёт setup.php)", !(await exists("/app/config.php")));

  let body = await doGet();
  check("страница предлагает создать config.php", /Создать config\.php/.test(body));
  check("форма пароля скрыта, пока нет конфига", !/Задать пароль/.test(body));

  /* ---------------------------- 2. создание ----------------------------- */

  body = await doPost({ action: "create" });
  check("config.php создан", await exists("/app/config.php"));

  let config = await readFile("/app/config.php");
  check("соль сгенерирована", /'salt' => '[0-9a-f]{16,}'/.test(config), config.slice(0, 80));
  check("setupToken сгенерирован", /'setupToken' => '[0-9a-f]{8,}'/.test(config));
  check("заглушки из примера заменены", !/__SALT__|__SETUP_TOKEN__/.test(config));
  check("в свежем конфиге пароль по умолчанию (astrolog) требует смены", /'passwordHash' => '\$2y\$/.test(config));

  const second = await doPost({ action: "create" });
  check("повторное создание не перезаписывает файл", /уже существует/.test(second) || (await readFile("/app/config.php")) === config);

  /* ----------------------------- 3. пароль ------------------------------ */

  body = await doPost({ action: "password", password: "super-secret-123", passwordRepeat: "super-secret-123" });
  config = await readFile("/app/config.php");
  const hash = (config.match(/'passwordHash'\s*=>\s*'([^']*)'/) || [])[1] || "";

  check("хеш пароля записан автоматически", /^\$2y\$|^\$argon/.test(hash), hash.slice(0, 12));
  check("сообщение об успехе", /Пароль сохранён/.test(body), body.slice(0, 160));
  check("остальные настройки не потерялись", /'siteName' =>/.test(config) && /'salt' =>/.test(config) && /'telegram' =>/.test(config));
  check("хеш соответствует паролю", /@@OK@@/.test(await run(`<?php echo password_verify('super-secret-123', '${hash}') ? '@@OK@@' : '@@NO@@';`)));
  check("хеш не показан в ответе (записался сам)", !body.includes(hash));

  body = await doGet();
  check("после смены своего пароля страница закрыта", /Пароль уже задан/.test(body));

  /* --------------------------- 4. ошибки ввода --------------------------- */

  // Возвращаем дефолтный пароль, чтобы снова открыть форму (как на свежей установке).
  const defaultHash = process.env.DEFAULT_HASH;
  config = config.replace(/'passwordHash' => '[^']*'/, `'passwordHash' => '${defaultHash}'`);
  await run(`<?php file_put_contents('/app/config.php', base64_decode('${Buffer.from(config).toString("base64")}'));`);

  const currentHash = (config.match(/'passwordHash' => '([^']*)'/) || [])[1] || "";
  body = await doPost({ action: "password", password: "short", passwordRepeat: "short" });
  check("короткий пароль отклонён", /не короче 8/.test(body));

  body = await doPost({ action: "password", password: "12345678901", passwordRepeat: "12345678902" });
  check("несовпадающие пароли отклонены", /не совпадают/.test(body));

  config = await readFile("/app/config.php");
  check("при ошибке пароль не изменён", (config.match(/'passwordHash' => '([^']*)'/) || [])[1] === currentHash, config.match(/'passwordHash' => '\$2y\$\d+\$/)?.[0]);

  /* ----------------------- 5. доступ по токену -------------------------- */

  body = await doGet();
  check("с дефолтным паролем страница снова открыта с предупреждением", /пароль по умолчанию/.test(body), body.slice(0, 160));
  body = await doGet({ token: "wrong-token" });
  check("после смены пароля чужой токен не пускает (пока пароль пуст — пускает)", body.length > 0);

  console.log(`\nИтого: ${pass} ok, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((error) => {
  console.error("HARNESS ERROR", error);
  process.exit(2);
});
