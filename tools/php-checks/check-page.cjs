/**
 * Проверка диагностической страницы php/check.php в php-wasm.
 *
 *   node tools/php-checks/check-page.cjs
 *
 * Страница должна открываться на любом PHP 7+/8.x (поэтому написана без
 * конструкций 8.x) и честно показывать состояние хостинга: версию PHP,
 * обязательные расширения, наличие файлов, права на data/, пароль кабинета.
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

const source = fs.readFileSync(path.join(repoRoot, "php/check.php"), "utf8");

(async () => {
  const php = new PhpNode();
  let out = "";
  php.addEventListener("output", (e) => {
    for (const chunk of e.detail) out += String(chunk);
  });

  const b64 = Buffer.from(source, "utf8").toString("base64");
  // Готовим «распакованный архив» в виртуальной ФС.
  await php.run(`<?php
@mkdir('/app', 0777, true);
file_put_contents('/app/check.php', base64_decode('${b64}'));
@mkdir('/app/data', 0777, true);
foreach (['index.html','app.js','styles.css','api/lead.php','cabinet/index.php','inc/bootstrap.php'] as $file) {
    @mkdir('/app/' . dirname($file), 0777, true);
    @touch('/app/' . $file);
}
@touch('/app/.htaccess');
`);

  out = "";
  await php.run("<?php $_SERVER['REQUEST_URI']='/check.php'; $_SERVER['SERVER_SOFTWARE']='Apache/2.4'; include '/app/check.php';");
  const body = out;

  check("страница отдаёт HTML", /^<!doctype html>/i.test(body.trim()), body.slice(0, 80));
  check("нет предупреждений PHP", !/(Warning|Notice|Fatal|Deprecated)/.test(body), body.slice(0, 200));
  check("показана версия PHP", /Версия PHP/.test(body) && /8\./.test(body));
  check("версия PHP признана подходящей", !/НУЖНА 8\.0/.test(body));
  check("проверяются обязательные расширения", /Обязательные расширения/.test(body));
  check("проверяется наличие файлов сайта", /Файлы сайта/.test(body));
  check("проверяются права на data/", /Папка data/.test(body));
  check("без config.php предлагается скачать архив заново", /config\.php/.test(body) && /не найден/.test(body));
  check("показывается количество заявок", /Заявок в базе/.test(body));
  check("есть подсказка про SSL", /SSL/i.test(body));
  // В тексте допустимы названия полей, но не их значения.
  check("нет значений секретов в ответе", !/\$2y\$|\$argon2|bot\d+:AA/.test(body), body.slice(0, 200));

  // Второй сценарий: пароль задан, права есть → «всё готово»
  await php.run(`<?php
file_put_contents('/app/config.php', "<?php return ['owner'=>['email'=>'owner@test.ru','passwordHash'=>'\\$2y\\$10\\$hash']];");
file_put_contents('/app/data/leads.php', "<?php exit; ?>\\n" . json_encode(['items'=>[['id'=>'lead_1'],['id'=>'lead_2']]]));
`);
  out = "";
  await php.run("<?php $_SERVER['REQUEST_URI']='/check.php'; include '/app/check.php';");
  const ready = out;
  check("при готовой установке показано «Всё готово»", /Всё готово/.test(ready), ready.slice(-400));
  check("пароль кабинета отмечен как заданный", /задан/.test(ready));
  check("хеш пароля не выводится", !/\$2y\$10\$hash/.test(ready));
  check("посчитаны заявки из файла (2)", /<td>2<\/td>/.test(ready), ready.match(/Заявок в базе[\s\S]{0,200}/)?.[0]);

  console.log(`\nИтого: ${pass} ok, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((error) => {
  console.error("HARNESS ERROR", error);
  process.exit(2);
});
