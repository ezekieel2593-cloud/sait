/**
 * Прогон PHP-части в php-wasm: API заявок, лимиты, вход в кабинет,
 * смена статуса, заметки, обезличивание, защита файлов данных.
 *
 *   cd tools/php-checks && node api-cabinet.cjs
 *
 * Требуется php-wasm (см. README.md в этой папке). PHP на машине не нужен.
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");

/** php-wasm ставится отдельно (см. README в этой папке). */
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

function collect(php) {
  php._out = "";
  if (php._bound) return;
  php.addEventListener("output", (e) => {
    for (const chunk of e.detail) php._out += String(chunk);
  });
  php._bound = true;
}

async function run(php, code) {
  collect(php);
  php._out = "";
  await php.run(code);
  return php._out;
}

function phpQuote(value) {
  return "'" + String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

/** PHP-литерал массива: JSON-объект в PHP не годится. */
function phpArray(obj) {
  const parts = Object.entries(obj || {}).map(([k, v]) => `${phpQuote(k)} => ${phpQuote(v)}`);
  return `[${parts.join(", ")}]`;
}

/** Собирает $_SERVER и подключает скрипт; результат забираем из файла в ФС wasm. */
async function request(php, { script, method = "GET", server = {}, body = null, post = null, cookie = null, get = null, owner = null }) {
  const mod = await php.binary;
  const base = {
    HTTP_HOST: "astra-test.ru",
    HTTPS: "on",
    REQUEST_METHOD: method,
    REMOTE_ADDR: "203.0.113.7",
    REQUEST_URI: script,
    HTTP_USER_AGENT: "php-wasm-test",
  };
  const merged = { ...base, ...server };
  const parts = [
    "<?php",
    "if (!defined('APP_TEST_NO_EXIT')) { define('APP_TEST_NO_EXIT', true); }",
    "http_response_code(200);",
    "header_remove();",
    "if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); }",
    "$_SESSION = [];",
  ];
  // php-wasm не сохраняет данные сессии между запусками, поэтому для проверок
  // кабинета сессия владельца наполняется заранее известными значениями.
  if (owner) {
    parts.push("session_name('astra_cabinet');");
    parts.push("session_id('testsession000000000000000001');");
    parts.push("session_start();");
    parts.push(`$_SESSION['owner'] = 'owner@astra-test.ru';`);
    parts.push(`$_SESSION['expires'] = time() + 7200;`);
    parts.push(`$_SESSION['csrf'] = ${phpQuote(owner.csrf)};`);
  }
  parts.push("ob_start();");
  parts.push(`$_SERVER = array_merge($_SERVER, ${phpArray(merged)});`);
  parts.push(`$GLOBALS['APP_TEST_INPUT'] = ${body !== null ? phpQuote(JSON.stringify(body)) : "null"};`);
  if (post !== null) parts.push(`$_POST = ${phpArray(post)};`);
  if (cookie !== null) parts.push(`$_COOKIE = ${phpArray(cookie)};`);
  if (get !== null) parts.push(`$_GET = ${phpArray(get)};`);
  parts.push(`try { include ${phpQuote(APP + script)}; } catch (Throwable $e) { if ($e->getMessage() !== 'app_exit') { echo "\n@@TEST_ERROR@@" . get_class($e) . ': ' . $e->getMessage(); } }`);
  parts.push(`$body = ob_get_clean();`);
  parts.push(`file_put_contents('/out.json', json_encode(['status' => http_response_code(), 'headers' => headers_list(), 'body' => $body], JSON_UNESCAPED_UNICODE));`);
  await run(php, parts.join("\n"));
  let raw;
  try {
    raw = mod.FS.readFile("/out.json", { encoding: "utf8" });
  } catch (e) {
    return { status: 0, payload: "", json: null, headers: [] };
  }
  mod.FS.unlink("/out.json");
  const parsed = JSON.parse(raw);
  const payload = String(parsed.body || "").trim();
  let json = null;
  try {
    json = JSON.parse(payload);
  } catch {
    /* не JSON */
  }
  return { status: Number(parsed.status) || 0, payload, json, headers: parsed.headers || [] };
}

/** Читает файл из ФС wasm без запуска PHP. */
async function readAppFile(php, rel) {
  const mod = await php.binary;
  try {
    return mod.FS.readFile(APP + rel, { encoding: "utf8" });
  } catch {
    return "";
  }
}

/** Достаёт значение cookie из заголовков ответа. */
function cookieFrom(headers, name) {
  for (const h of headers) {
    const m = String(h).match(new RegExp(`^Set-Cookie:\\s*${name}=([^;]+)`, "i"));
    if (m) return m[1];
  }
  return null;
}

/** Все cookie из ответа: {имя: значение}. */
function cookiesFrom(headers) {
  const result = {};
  for (const h of headers) {
    const m = String(h).match(/^Set-Cookie:\s*([^=]+)=([^;]+)/i);
    if (m) {
      const name = m[1].trim();
      if (!/deleted/i.test(m[2])) result[name] = m[2];
    }
  }
  return result;
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
  collect(php);

  /* ------------------------------- загрузка ------------------------------- */

  const files = {};
  for (const [rel, b64] of Object.entries(walkFiles(SRC))) files[`${APP}/${rel}`] = b64;

  // config.php для теста: пароль "test-password-123", Telegram отключён, почта отключена.
  const hash = await run(php, `<?php echo password_hash('test-password-123', PASSWORD_DEFAULT);`);
  const config = `<?php
return [
    'siteName' => 'Astra Test',
    'siteUrl' => 'https://astra-test.ru',
    'owner' => ['email' => 'owner@astra-test.ru', 'passwordHash' => ${phpQuote(hash.trim())}],
    'telegram' => ['botToken' => '', 'chatId' => ''],
    'mail' => ['adminEmail' => '', 'from' => '', 'subjectPrefix' => 'Заявка'],
    'security' => ['salt' => 'test-salt', 'setupToken' => 'setup-token-1', 'allowInsecureCookie' => false],
    'limits' => ['leadsPerWindow' => 3, 'windowMinutes' => 15, 'loginAttempts' => 3, 'lockMinutes' => 15],
    'retentionDays' => 365,
    'timezoneOffsetHours' => 3,
];
`;
  files[`${APP}/config.php`] = Buffer.from(config, "utf8").toString("base64");

  const loader = `<?php
$files = json_decode(base64_decode(${phpQuote(Buffer.from(JSON.stringify(files), "utf8").toString("base64"))}), true);
$n = 0;
foreach ($files as $path => $b64) {
    @mkdir(dirname($path), 0777, true);
    file_put_contents($path, base64_decode($b64));
    $n++;
}
@mkdir(${phpQuote(APP + "/data")}, 0777, true);
echo "loaded:$n";
`;
  const loaded = await run(php, loader);
  console.log(`\nФайлы в песочнице: ${loaded}`);
  const phpVersion = await run(php, `<?php echo PHP_VERSION;`);
  console.log(`PHP ${phpVersion}\n`);

  /* --------------------------- 1. простая заявка --------------------------- */

  console.log("1. API: успешная заявка");
  const lead = {
    name: "Мария",
    direction: "matrix",
    channel: "telegram",
    contact: "@maria_test",
    question: "Хочу разобрать финансовую линию",
    consent: true,
    calc: "Центр: 10. Деньги: 3 + 10",
    birth: "1992-06-23",
    place: "Челябинск",
    trap: "",
  };
  let res = await request(php, {
    script: "/api/lead.php",
    method: "POST",
    server: { HTTP_ORIGIN: "https://astra-test.ru", CONTENT_TYPE: "application/json" },
    body: lead,
  });
  check("статус 200", res.status === 200, String(res.status));
  check("ok:true", res.json?.ok === true, res.payload.slice(0, 200));
  check("номер вида AP-YYYY-001", /^AP-\d{4}-001$/.test(res.json?.reference || ""), res.json?.reference);
  check("delivered — массив", Array.isArray(res.json?.delivered), JSON.stringify(res.json?.delivered));
  const firstId = res.json?.id;

  const stored = await readAppFile(php, "/data/leads.php");
  check("файл заявок начинается с защиты", stored.startsWith("<?php exit; ?>"), stored.slice(0, 20));
  check("в файле есть имя клиента", stored.includes("Мария"));
  check("контакт сохранён", stored.includes("@maria_test"));
  check("расчёт сохранён", stored.includes("Центр: 10"));
  check("нет сырого IP", !stored.includes("203.0.113.7"));

  /* ------------------------------ 2. валидация ----------------------------- */

  console.log("\n2. API: валидация и антиспам");
  res = await request(php, {
    script: "/api/lead.php",
    method: "POST",
    server: { HTTP_ORIGIN: "https://astra-test.ru" },
    body: { ...lead, contact: "нет-контакта", channel: "email" },
  });
  check("422 на плохой e-mail", res.status === 422, String(res.status));
  check("ошибка относится к контакту", /почт/i.test(res.json?.fields?.contact || ""), JSON.stringify(res.json));

  res = await request(php, {
    script: "/api/lead.php",
    method: "POST",
    server: { HTTP_ORIGIN: "https://astra-test.ru" },
    body: { ...lead, name: "", consent: true, channel: "telegram", contact: "@ok_user" },
  });
  check("422 на пустое имя", res.status === 422, String(res.status));
  check("ошибка в fields.name", Boolean(res.json?.fields?.name), JSON.stringify(res.json?.fields));

  res = await request(php, {
    script: "/api/lead.php",
    method: "POST",
    server: { HTTP_ORIGIN: "https://astra-test.ru" },
    body: { ...lead, trap: "http://spam" },
  });
  check("honeypot отклонён с 422", res.status === 422, String(res.status));

  res = await request(php, {
    script: "/api/lead.php",
    method: "POST",
    server: { HTTP_ORIGIN: "https://evil.example" },
    body: lead,
  });
  check("403 на чужой origin", res.status === 403, String(res.status));

  res = await request(php, { script: "/api/lead.php", method: "GET" });
  check("405 на GET", res.status === 405, String(res.status));

  /* -------------------------------- 3. лимиты ------------------------------- */

  console.log("\n3. API: лимит заявок (3 за 15 минут)");
  const codes = [];
  for (let i = 0; i < 4; i++) {
    const r = await request(php, {
      script: "/api/lead.php",
      method: "POST",
      server: { HTTP_ORIGIN: "https://astra-test.ru", REMOTE_ADDR: "198.51.100.9" },
      body: { ...lead, name: `Клиент ${i}`, contact: "@client_" + i },
    });
    codes.push(r.status);
  }
  check("первые три проходят", codes.slice(0, 3).every((c) => c === 200 || c === 500), codes.join(","));
  check("четвёртая — 429", codes[3] === 429, codes.join(","));

  /* --------------------------- 4. вход в кабинет --------------------------- */

  console.log("\n4. Кабинет: вход");
  res = await request(php, { script: "/cabinet/index.php" });
  check("форма входа отдаётся", res.status === 200 && /Пароль|пароль/.test(res.payload), res.payload.slice(0, 120));
  check("noindex в заголовках формы", res.payload.includes("noindex") || res.headers.some((h) => /noindex/i.test(h)));
  check("cabinet отдаёт no-store", res.headers.some((h) => /no-store/i.test(h)), JSON.stringify(res.headers));

  res = await request(php, {
    script: "/cabinet/index.php",
    method: "POST",
    post: { email: "owner@astra-test.ru", password: "wrong-password" },
  });
  check("неверный пароль не пускает", /Неверн/i.test(res.payload) && res.status === 200, res.payload.slice(0, 160));

  const okLogin = await request(php, {
    script: "/cabinet/index.php",
    method: "POST",
    post: { email: "owner@astra-test.ru", password: "test-password-123" },
  });
  const session = cookiesFrom(okLogin.headers);
  check("верный пароль даёт редирект", okLogin.status === 303, String(okLogin.status));
  check("сессия выдана", Object.keys(session).length > 0, JSON.stringify(okLogin.headers));
  check("cookie сессии Secure + HttpOnly + SameSite", okLogin.headers.some((h) => /Set-Cookie: .*HttpOnly.*SameSite=Lax/i.test(h) && /secure/i.test(h)), JSON.stringify(okLogin.headers));

  /* ------------------------- 5. кабинет: карточка ------------------------- */

  const CSRF = "test-csrf-token-abc123";
  const owner = { csrf: CSRF };

  console.log("\n5. Кабинет: список, карточка, действия");
  const list = await request(php, { script: "/cabinet/index.php", owner });
  check("в списке видна заявка", /AP-\d{4}-001/.test(list.payload), list.payload.slice(0, 200));
  check("в списке есть имя клиента", /Мария/.test(list.payload));

  check("фильтр по направлениям есть", /matrix|Матрица/i.test(list.payload));

  const card = await request(php, { script: "/cabinet/lead.php", get: { id: firstId }, owner });
  check("карточка открывается", /Мария/.test(card.payload), card.payload.slice(0, 200));
  check("в карточке есть расчёт", /Центр: 10/.test(card.payload));
  check("в карточке есть контакт", /maria_test/.test(card.payload));
  check("csrf-токен в формах карточки", card.payload.includes(`value="${CSRF}"`), String(CSRF));

  const action = await request(php, {
    script: "/cabinet/action.php",
    method: "POST",
    owner,
    post: { csrf: CSRF, id: firstId, action: "status", status: "in_progress", comment: "Взяла в работу" },
  });
  check("смена статуса → редирект", action.status === 303, String(action.status));
  const afterStatus = await readAppFile(php, "/data/leads.php");
  check("статус сохранён", afterStatus.includes("in_progress"), "нет in_progress");
  check("история пополнилась", afterStatus.includes("Взяла в работу"));

  const notes = await request(php, {
    script: "/cabinet/action.php",
    method: "POST",
    owner,
    post: { csrf: CSRF, id: firstId, action: "notes", notes: "Клиент просил разбор по деньгам" },
  });
  check("заметки сохраняются", notes.status === 303 && (await readAppFile(php, "/data/leads.php")).includes("разбор по деньгам"), String(notes.status));

  const badCsrf = await request(php, {
    script: "/cabinet/action.php",
    method: "POST",
    owner,
    post: { csrf: "deadbeef", id: firstId, action: "status", status: "done" },
  });
  check("неверный CSRF отклонён с 400", badCsrf.status === 400, String(badCsrf.status));

  const noSession = await request(php, {
    script: "/cabinet/action.php",
    method: "POST",
    post: { csrf: CSRF, id: firstId, action: "status", status: "done" },
  });
  check("без сессии действие редиректит на вход", noSession.status === 303, String(noSession.status));

  const notify = await request(php, {
    script: "/cabinet/action.php",
    method: "POST",
    owner,
    post: { csrf: CSRF, id: firstId, action: "notify" },
  });
  check("повторное уведомление → редирект", notify.status === 303, String(notify.status));
  const afterNotify = await readAppFile(php, "/app/data/leads.php".replace("/app", ""));
  check("попытка уведомления записана", /notif/i.test(afterNotify), afterNotify.slice(0, 200));

  const missing = await request(php, { script: "/cabinet/lead.php", get: { id: "lead_deadbeef" }, owner });
  check("несуществующая заявка → 404", missing.status === 404, String(missing.status));

  const filter = await request(php, { script: "/cabinet/index.php", get: { status: "in_progress" }, owner });
  check("фильтр по статусу работает", /Мария/.test(filter.payload), filter.payload.slice(0, 200));
  const filterNone = await request(php, { script: "/cabinet/index.php", get: { status: "cancelled" }, owner });
  check("фильтр по пустому статусу не показывает заявку", !/Мария/.test(filterNone.payload));

  /* ---------------------------- 6. обезличивание --------------------------- */

  console.log("\n6. Кабинет: обезличивание");
  const anon = await request(php, {
    script: "/cabinet/action.php",
    method: "POST",
    owner,
    post: { csrf: CSRF, id: firstId, action: "anonymize" },
  });
  check("обезличивание → редирект", anon.status === 303, String(anon.status));
  const afterAnon = await readAppFile(php, "/data/leads.php");
  check("имя клиента удалено", !afterAnon.includes("Мария"), "имя осталось");
  check("контакт удалён", !afterAnon.includes("@maria_test"), "контакт остался");
  check("заявка осталась в базе", afterAnon.includes("AP-"));
  check("обезличивание отмечено в истории", /anonym|обезлич/i.test(afterAnon), afterAnon.slice(0, 200));

  /* ------------------------------ 7. setup.php ----------------------------- */

  console.log("\n7. setup.php");
  res = await request(php, { script: "/setup.php" });
  check("setup закрыт при заданном пароле", res.status === 403, String(res.status));
  res = await request(php, { script: "/setup.php", get: { token: "setup-token-1" } });
  check("с токеном открывается", res.status === 200 && /Пароль/.test(res.payload), res.payload.slice(0, 120));
  res = await request(php, { script: "/setup.php", method: "POST", get: { token: "setup-token-1" }, post: { password: "short" } });
  check("короткий пароль отклонён", /не короче/i.test(res.payload), res.payload.slice(0, 200));
  res = await request(php, { script: "/setup.php", method: "POST", get: { token: "setup-token-1" }, post: { password: "long-enough-password" } });
  check("хеш пароля генерируется", /\$2y\$|\$argon/i.test(res.payload), res.payload.slice(0, 200));

  /* ----------------------- 8. защита файлов данных ------------------------ */

  console.log("\n8. Защита файлов данных");
  const leadsRaw = await readAppFile(php, "/data/leads.php");
  check("файл заявок начинается с exit-заглушки", leadsRaw.startsWith("<?php exit; ?>"), JSON.stringify(leadsRaw.slice(0, 40)));
  const limitsFile = await readAppFile(php, "/data/limits.php");
  check("файл лимитов существует", limitsFile.includes("lead:"), limitsFile.slice(0, 120));
  check("в лимитах нет IP в открытом виде", !/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(limitsFile), "найден IP");

  /* ------------------- 9. устойчивость без .htaccess ---------------------- */

  console.log("\n9. Если .htaccess не работает (nginx, отключённые модули)");
  const cfgFile = await request(php, { script: "/config.php" });
  check("config.php при прямом запросе отдаёт пустой ответ", cfgFile.status === 200 && cfgFile.payload.trim() === "", JSON.stringify(cfgFile.payload.slice(0, 80)));
  check("в ответе config.php нет секретов", !/salt|passwordHash|botToken/.test(cfgFile.payload), cfgFile.payload.slice(0, 80));

  const incFile = await request(php, { script: "/inc/store.php" });
  check("inc/store.php не выводит ничего", incFile.payload.trim() === "", JSON.stringify(incFile.payload.slice(0, 80)));

  const apiGet = await request(php, { script: "/api/lead.php", method: "GET" });
  check("api/lead.php на GET отвечает 405 JSON", apiGet.status === 405 && apiGet.json?.error === "Метод не поддерживается", JSON.stringify(apiGet.json));

  /* --------------------- 10. ответ API всегда чистый ---------------------- */

  console.log("\n10. Формат ответа API");
  const cleanJson = await request(php, {
    script: "/api/lead.php",
    method: "POST",
    server: { HTTP_ORIGIN: "https://astra-test.ru", REMOTE_ADDR: "203.0.113.55" },
    body: { name: "", direction: "matrix", channel: "telegram", contact: "@x_user", consent: true, trap: "" },
  });
  check("ответ — валидный JSON без warning/notice", cleanJson.json !== null && !/(Warning|Notice|Deprecated|Fatal)/.test(cleanJson.payload), cleanJson.payload.slice(0, 160));

  /* ------------------- 11. нет записи в data/ → ошибка -------------------- */

  console.log("\n11. Каталог data/ недоступен для записи");
  const mod = await php.binary;
  try {
    mod.FS.chmod("/app/data", 0o555);
  } catch (e) {
    console.log("  (chmod недоступен в этой сборке:", String(e).slice(0, 60), ")");
  }
  const readOnly = await request(php, {
    script: "/api/lead.php",
    method: "POST",
    server: { HTTP_ORIGIN: "https://astra-test.ru", REMOTE_ADDR: "203.0.113.56" },
    body: { name: "Тест", direction: "matrix", channel: "telegram", contact: "@ro_user", consent: true, trap: "" },
  });
  check("при ошибке записи API отдаёт 500 и не выдаёт номер", readOnly.status === 500 && !readOnly.json?.reference, `${readOnly.status} ${JSON.stringify(readOnly.json).slice(0, 200)}`);
  check("в ошибке нет путей сервера", !/\/app\/|Warning|Fatal/.test(readOnly.payload), readOnly.payload.slice(0, 160));

  const cabinetHttp = await request(php, { script: "/cabinet/index.php", owner, server: { HTTPS: "off" } });
  check("по http кабинет предупреждает о незашифрованном соединении", /http/.test(cabinetHttp.payload) && /SSL/i.test(cabinetHttp.payload), cabinetHttp.payload.slice(0, 200));
  const cabinetHttps = await request(php, { script: "/cabinet/index.php", owner });
  check("по https предупреждения нет", !/без шифрования/.test(cabinetHttps.payload));

  const cabinetRo = await request(php, { script: "/cabinet/index.php", owner });
  check("кабинет предупреждает, что заявки не сохраняются", /не сохраняются/.test(cabinetRo.payload), cabinetRo.payload.slice(0, 200));
  try {
    mod.FS.chmod("/app/data", 0o777);
  } catch (e) {
    /* права возвращаем для дальнейших проверок */
  }
  const afterFix = await request(php, {
    script: "/api/lead.php",
    method: "POST",
    server: { HTTP_ORIGIN: "https://astra-test.ru", REMOTE_ADDR: "203.0.113.57" },
    body: { name: "Тест", direction: "matrix", channel: "telegram", contact: "@ro_user", consent: true, trap: "" },
  });
  check("после восстановления прав заявка сохраняется", afterFix.status === 200 && Boolean(afterFix.json?.reference), `${afterFix.status} ${JSON.stringify(afterFix.json).slice(0, 120)}`);
  const cabinetOk = await request(php, { script: "/cabinet/index.php", owner });
  check("предупреждение о правах исчезло", !/не сохраняются/.test(cabinetOk.payload));

  /* ------------------------------- 12. logout ------------------------------- */

  console.log("\n12. Выход");
  const out = await request(php, { script: "/cabinet/logout.php", session });
  check("logout отдаёт редирект", out.status === 303, String(out.status));

  console.log(`\nИтого: ${pass} ok, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error("HARNESS ERROR", e);
  process.exit(2);
});
