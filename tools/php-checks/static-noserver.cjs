/**
 * Проверка статической версии (без сервера) в jsdom.
 *
 *   npm run build:static
 *   node tools/php-checks/static-noserver.cjs
 *
 * Проверяем, что без API форма не пытается отправлять запрос и честно
 * предлагает сформировать сообщение для Telegram или почты.
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");
const { JSDOM } = require(path.join(repoRoot, "node_modules/jsdom"));

const dir = path.join(repoRoot, "release/static");
const page = path.join(dir, "matrix.html");

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

if (!fs.existsSync(page)) {
  console.error("нет release/static/matrix.html — сначала выполните npm run build:static");
  process.exit(2);
}

let fetchCalled = false;
const dom = new JSDOM(fs.readFileSync(page, "utf8"), {
  url: "https://example.com/matrix.html",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  beforeParse(window) {
    window.fetch = () => {
      fetchCalled = true;
      return Promise.reject(new Error("в статической версии сетевых запросов быть не должно"));
    };
  },
});

const { window } = dom;
for (const script of window.document.querySelectorAll("script[src]")) {
  const src = script.getAttribute("src").replace(/^\//, "");
  window.eval(fs.readFileSync(path.join(dir, src), "utf8"));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setValue(el, value) {
  const proto = el instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
}

async function run() {
  const doc = window.document;
  await wait(400);

  check("config.js без серверного приёма заявок", window.ASTRA_CONFIG?.api?.enabled === false, String(window.ASTRA_CONFIG?.api?.enabled));

  const date = doc.querySelector("#matrix-date");
  check("форма расчёта отрисована", Boolean(date));
  if (!date) return;

  setValue(date, "1992-06-23");
  doc.querySelector("form button").click();
  await wait(400);
  check("расчёт матрицы появился", doc.body.textContent.includes("Центр"));

  const takeForm = [...doc.querySelectorAll("form")].find((f) => f.querySelector("#lead-name"));
  check("форма заявки отрисована", Boolean(takeForm));
  if (!takeForm) return;

  check("кнопка подписана как формирование заявки", /Сформировать заявку/.test(takeForm.textContent), takeForm.querySelector("button")?.textContent);
  check("пометка «работает без сервера» на месте", /работает без сервера/.test(takeForm.textContent));

  setValue(takeForm.querySelector("#lead-name"), "Мария");
  setValue(takeForm.querySelector("#lead-contact"), "@maria_test");
  const consent = takeForm.querySelector('input[type="checkbox"]');
  if (consent && !consent.checked) consent.click();
  takeForm.querySelector('button[type="submit"]').click();
  await wait(400);

  check("сетевой запрос не отправлялся", fetchCalled === false);
  const text = doc.body.textContent;
  check("показан экран «Заявка готова к отправке»", /Заявка готова к отправке/.test(text), text.slice(-300));
  check("текст заявки сформирован из расчёта", text.includes("Матрица судьбы") || text.includes("Центр"));
}

run()
  .then(() => {
    console.log(`\nИтого: ${pass} ok, ${fail} fail`);
    process.exit(fail === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error("ERR", e);
    process.exit(1);
  });
