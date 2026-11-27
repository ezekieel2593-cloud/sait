/**
 * Прогон клиентских API в php-wasm: регистрация, вход, люди, онбординг,
 * подписка, полка PDF, заявка на консультацию, тарифы.
 *
 *   PHP_WASM_DIR=/tmp/php-vendor node tools/php-checks/user-auth.cjs
 *
 * php-wasm ставится отдельно: npm i php-wasm в отдельной папке.
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

function phpArray(obj) {
  const parts = Object.entries(obj || {}).map(([k, v]) => `${phpQuote(k)} => ${phpQuote(v)}`);
  return `[${parts.join(", ")}]`;
}

/**
 * Запрос к API с постоянной клиентской сессией: если передан cookie —
 * сессия не очищается, как в браузере между запросами.
 */
async function request(php, { script, method = "GET", body = null, get = null, clientCookie = null, clientUser = null }) {
  const mod = await php.binary;
  const parts = [
    "<?php",
    "if (!defined('APP_TEST_NO_EXIT')) { define('APP_TEST_NO_EXIT', true); }",
    "http_response_code(200);",
    "header_remove();",
    "if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); }",
    "$_SESSION = [];",
  ];
  if (clientCookie) {
    parts.push("session_name('astra_client');");
    parts.push(`session_id(${phpQuote(clientCookie)});`);
    parts.push("session_start();");
    // php-wasm не сохраняет данные сессии между запусками (см. api-cabinet.cjs):
    // для проверок «вошедшего клиента» сессия наполняется заранее.
    if (clientUser) {
      parts.push(`$_SESSION['client'] = ${phpQuote(clientUser)};`);
      parts.push("$_SESSION['clientExpires'] = time() + 7200;");
    }
  }
  parts.push("ob_start();");
  parts.push(`require_once ${phpQuote(APP + "/inc/bootstrap.php")};`);
  parts.push("app_config(true);");
  parts.push(`$_SERVER = array_merge($_SERVER, ${phpArray({
    HTTP_HOST: "astra-test.ru",
    HTTPS: "on",
    REQUEST_METHOD: method,
    REMOTE_ADDR: "203.0.113.7",
    REQUEST_URI: script,
    HTTP_USER_AGENT: "php-wasm-test",
  })});`);
  parts.push(`$GLOBALS['APP_TEST_INPUT'] = ${body !== null ? phpQuote(JSON.stringify(body)) : "null"};`);
  if (get !== null) parts.push(`$_GET = ${phpArray(get)};`);
  parts.push(`try { include ${phpQuote(APP + script)}; } catch (Throwable $e) { if ($e->getMessage() !== 'app_exit') { echo "\\n@@TEST_ERROR@@" . get_class($e) . ': ' . $e->getMessage(); } }`);
  parts.push("$body = ob_get_clean();");
  parts.push("file_put_contents('/out.json', json_encode(['status' => http_response_code(), 'headers' => headers_list(), 'body' => $body], JSON_UNESCAPED_UNICODE));");
  await run(php, parts.join("\n"));
  let raw;
  try {
    raw = mod.FS.readFile("/out.json", { encoding: "utf8" });
  } catch {
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

function cookieFrom(headers, name) {
  for (const h of headers) {
    const m = String(h).match(new RegExp(`^Set-Cookie:\\s*${name}=([^;]+)`, "i"));
    if (m) return m[1];
  }
  return null;
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

  const files = {};
  for (const [rel, b64] of Object.entries(walkFiles(SRC))) files[`${APP}/${rel}`] = b64;

  const hash = await run(php, `<?php echo password_hash('test-password-123', PASSWORD_DEFAULT);`);
  const config = `<?php
return [
    'siteName' => 'Astra Test',
    'siteUrl' => 'https://astra-test.ru',
    'owner' => ['login' => 'Adelina', 'email' => 'owner@astra-test.ru', 'passwordHash' => ${phpQuote(hash.trim())}],
    'telegram' => ['botToken' => '', 'chatId' => ''],
    'mail' => ['adminEmail' => '', 'from' => '', 'subjectPrefix' => 'Заявка'],
    'security' => ['salt' => 'test-salt', 'setupToken' => 'setup-token-1', 'allowInsecureCookie' => false],
    'limits' => ['leadsPerWindow' => 10, 'windowMinutes' => 15, 'loginAttempts' => 20, 'lockMinutes' => 15],
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

  /* --------------------------- 1. гость до входа --------------------------- */

  console.log("1. Гость: до входа");
  const guest = await request(php, { script: "/api/auth.php" });
  check("auth.php отвечает 200", guest.status === 200, `status ${guest.status}`);
  check("гость не авторизован", guest.json?.authed === false, guest.payload.slice(0, 120));

  /* --------------------------- 2. регистрация ----------------------------- */

  console.log("\n2. Регистрация");
  const badReg = await request(php, {
    script: "/api/auth.php",
    method: "POST",
    body: { action: "register", email: "не-почта", password: "12345678" },
  });
  check("регистрация с плохим email отклонена", badReg.status === 400, `status ${badReg.status}`);

  const reg = await request(php, {
    script: "/api/auth.php",
    method: "POST",
    body: {
      action: "register",
      name: "Мария",
      email: "maria@test.ru",
      telegram: "@maria",
      password: "parol-12345",
      birthday: "1992-06-23",
    },
  });
  check("регистрация успешна", reg.status === 200 && reg.json?.ok === true, `status ${reg.status} :: ${reg.payload.slice(0, 160)}`);
  check("в ответе имя и подписка", reg.json?.user?.name === "Мария" && reg.json?.user?.subscribed === false);
  const clientCookie = cookieFrom(reg.headers, "astra_client");
  check("сессия клиента установлена", Boolean(clientCookie));

  const dupe = await request(php, {
    script: "/api/auth.php",
    method: "POST",
    body: { action: "register", email: "maria@test.ru", password: "parol-12345" },
  });
  check("повторная регистрация отклонена", dupe.status === 400, `status ${dupe.status}`);

  let clientUid = String(reg.json?.user?.id ?? "");
  const me = await request(php, { script: "/api/auth.php", clientCookie, clientUser: clientUid });
  check("после регистрации «я» авторизован", me.json?.authed === true && me.json?.user?.email === "maria@test.ru");
  check("в «я» нет хеша пароля", !("passHash" in (me.json?.user ?? { passHash: 1 })));

  /* ------------------------------ 3. вход --------------------------------- */

  console.log("\n3. Вход");
  const badLogin = await request(php, {
    script: "/api/auth.php",
    method: "POST",
    body: { action: "login", email: "maria@test.ru", password: "неверный" },
  });
  check("неверный пароль → 401", badLogin.status === 401);

  const wrongCookie = "aabbccdd0000000000000000000000ff";
  const login = await request(php, {
    script: "/api/auth.php",
    method: "POST",
    body: { action: "login", email: "maria@test.ru", password: "parol-12345" },
    clientCookie: wrongCookie,
  });
  check("вход по email и паролю", login.status === 200 && login.json?.user?.name === "Мария");

  /* --------------------------- 4. люди и профиль -------------------------- */

  console.log("\n4. Люди и профиль");
  const person = await request(php, {
    script: "/api/profile.php",
    method: "POST",
    clientCookie,
    clientUser: clientUid,
    body: { action: "add", name: "Оля", relation: "Подруга", birthday: "1990-01-15" },
  });
  check("человек добавлен", person.status === 200 && person.json?.people?.length === 1, `:: ${person.payload.slice(0, 140)}`);

  const people = await request(php, { script: "/api/profile.php", clientCookie, clientUser: clientUid });
  check("список людей отдаётся", people.json?.people?.[0]?.name === "Оля");

  const badPerson = await request(php, {
    script: "/api/profile.php",
    method: "POST",
    clientCookie,
    clientUser: clientUid,
    body: { action: "add", name: "", birthday: "" },
  });
  check("человек без имени/даты отклонён", badPerson.status === 400);

  const onboard = await request(php, {
    script: "/api/profile.php",
    method: "POST",
    clientCookie,
    clientUser: clientUid,
    body: { action: "onboarding", topic: "money" },
  });
  check("онбординг сохраняется", onboard.json?.ok === true);
  const meAfter = await request(php, { script: "/api/auth.php", clientCookie, clientUser: clientUid });
  check("тема онбординга видна в профиле", meAfter.json?.user?.onboarding === "money");

  const deleted = await request(php, {
    script: "/api/profile.php",
    method: "POST",
    clientCookie,
    clientUser: clientUid,
    body: { action: "delete", id: people.json.people[0].id },
  });
  check("человек удаляется", deleted.json?.people?.length === 0);

  /* ----------------------------- 5. подписка ------------------------------ */

  console.log("\n5. Подписка");
  await run(php, `<?php
require_once ${phpQuote(APP + "/inc/bootstrap.php")};
require_once ${phpQuote(APP + "/inc/users.php")};
$user = find_user_by_email('maria@test.ru');
user_mutate($user['id'], function ($u) { $u['subscriptionUntil'] = gmdate('Y-m-d', strtotime('+1 month')); return $u; });
echo 'granted';
`);
  const meSubscribed = await request(php, { script: "/api/auth.php", clientCookie, clientUser: clientUid });
  check("подписка видна клиенту", meSubscribed.json?.user?.subscribed === true && meSubscribed.json?.user?.subscriptionUntil !== null);
  check("в «я» нет passHash и подписка — дата, не булево", typeof meSubscribed.json?.user?.subscriptionUntil === "string");

  /* --------------------------- 6. библиотека PDF -------------------------- */

  console.log("\n6. Библиотека PDF");
  await run(php, `<?php
require_once ${phpQuote(APP + "/inc/bootstrap.php")};
require_once ${phpQuote(APP + "/inc/users.php")};
$user = find_user_by_email('maria@test.ru');
@mkdir(data_dir() . '/library/' . $user['id'], 0775, true);
file_put_contents(data_dir() . '/library/' . $user['id'] . '/moon-code.pdf', "%PDF-1.4 test-guide");
data_mutate('library', function ($state) use ($user) {
    $items = is_array($state['items'] ?? null) ? $state['items'] : [];
    $items[] = ['id' => 'pdf_test1', 'userId' => $user['id'], 'title' => 'Полный Лунный код', 'file' => 'moon-code.pdf', 'size' => 17, 'createdAt' => now_iso()];
    $state['items'] = $items;
    return [$state, true];
});
echo 'ok';
`);
  const library = await request(php, { script: "/api/library.php", clientCookie, clientUser: clientUid });
  check("полка PDF отдаёт гайд", library.json?.items?.length === 1 && library.json?.items[0]?.title === "Полный Лунный код");
  check("в списке есть ссылка скачивания", String(library.json?.items?.[0]?.url || "").includes("library.php?id="));

  const pdf = await request(php, { script: "/api/library.php", clientCookie, clientUser: clientUid, get: { id: "pdf_test1" } });
  check("файл отдаётся с подписью PDF", pdf.payload.startsWith("%PDF-1.4"), pdf.payload.slice(0, 40));

  const guestLibrary = await request(php, { script: "/api/library.php" });
  check("без входа полка недоступна", guestLibrary.status === 401);

  /* --------------------------- 7. консультация ---------------------------- */

  console.log("\n7. Заявка на консультацию");
  const booking = await request(php, {
    script: "/api/booking.php",
    method: "POST",
    clientCookie,
    clientUser: clientUid,
    body: { theme: "Матрица судьбы", comment: "Хочу разобрать деньги", contact: "@maria", name: "Мария" },
  });
  check("заявка принята с номером", booking.json?.ok === true && /^AP-\d{4}-\d{3,}$/.test(String(booking.json?.ref ?? "")), `:: ${booking.payload.slice(0, 140)}`);

  const noContact = await request(php, {
    script: "/api/booking.php",
    method: "POST",
    body: { theme: "Натальная карта", comment: "", contact: "" },
  });
  check("заявка без контакта отклонена", noContact.status === 400);

  const leadCount = await run(php, `<?php
require_once ${phpQuote(APP + "/inc/bootstrap.php")};
require_once ${phpQuote(APP + "/inc/store.php")};
echo count(all_leads());`);
  check("заявка попала в базу специалиста", leadCount.trim() === "1", leadCount);

  /* ------------------------------- 8. тарифы ------------------------------ */

  console.log("\n8. Тарифы");
  const tariffs = await request(php, { script: "/api/tariffs.php" });
  check("тарифы отдаются гостю", tariffs.json?.tariffs?.subscription?.price === 990 && Array.isArray(tariffs.json?.tariffs?.pdfs));
  await run(php, `<?php
require_once ${phpQuote(APP + "/inc/bootstrap.php")};
require_once ${phpQuote(APP + "/inc/users.php")};
save_tariffs(['subscription' => ['price' => 1290, 'period' => 'месяц', 'note' => ''], 'pdfs' => [], 'consultation' => []]);
echo 'saved';`);
  const tariffs2 = await request(php, { script: "/api/tariffs.php" });
  check("тарифы, сохранённые специалистом, применяются", tariffs2.json?.tariffs?.subscription?.price === 1290);

  /* -------------------------------- 9. выход ------------------------------ */

  console.log("\n9. Выход");
  await request(php, { script: "/api/auth.php", method: "POST", body: { action: "logout" }, clientCookie, clientUser: clientUid });
  const afterLogout = await request(php, { script: "/api/auth.php", clientCookie });
  check("после logout «я» гость", afterLogout.json?.authed === false);
  const libraryAfter = await request(php, { script: "/api/library.php", clientCookie });
  check("полка закрыта после выхода", libraryAfter.status === 401);

  console.log(`\nИтого: ${pass} ok, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
