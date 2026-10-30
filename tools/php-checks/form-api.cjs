/**
 * Проверка формы заявки в собранном PHP-пакете (jsdom, без браузера).
 *
 *   npm run build:php
 *   node tools/php-checks/form-api.cjs
 *
 * Сценарий: расчёт матрицы на 23.06.1992 → заполнение формы → отправка.
 * fetch подменяется, поэтому запрос не уходит в сеть: проверяем, что форма
 * собирает правильное тело POST на api/lead.php и показывает принятый номер.
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");
const { JSDOM, VirtualConsole } = require(path.join(repoRoot, "node_modules/jsdom"));

const dir = path.join(repoRoot, "release/php");
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
  console.error("нет release/php/matrix.html — сначала выполните npm run build:php");
  process.exit(2);
}

let posted = null;
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => console.log("jsdomError:", e.message));

const dom = new JSDOM(fs.readFileSync(page, "utf8"), {
  url: "https://astra-test.ru/matrix.html",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.fetch = (url, options) => {
      posted = { url, body: JSON.parse(options.body) };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, apiVersion: "1", reference: "AP-2026-007", id: "lead_x", delivered: ["telegram"] }),
      });
    };
    window.HTMLElement.prototype.scrollIntoView = () => {};
  },
});

const { window } = dom;
for (const script of window.document.querySelectorAll("script[src]")) {
  const src = script.getAttribute("src").replace(/^\//, "");
  window.eval(fs.readFileSync(path.join(dir, src), "utf8"));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** React отслеживает значение через прототипный сеттер — иначе состояние не обновится. */
function setValue(el, value) {
  const proto = el instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
  el.dispatchEvent(new window.Event("change", { bubbles: true }));
}

async function run() {
  const doc = window.document;
  await wait(400);

  check("config.js включает серверный приём заявок", window.ASTRA_CONFIG?.api?.enabled === true, String(window.ASTRA_CONFIG?.api?.enabled));

  const header = doc.querySelector("header");
  check("название бренда — «Жемчужина»", /Жемчужина/.test(header?.textContent || ""));
  check("на главной нет блока о специалисте", !/Фотография специалиста/.test(doc.body.textContent || ""));

  const loginLink = doc.querySelector('header a[href="cabinet/index.php"]');
  check("в шапке есть кнопка «Войти»", Boolean(loginLink), doc.querySelector("header")?.innerHTML.slice(0, 200));
  check("кнопка «Войти» подписана", /Войти/.test(loginLink?.textContent || ""), loginLink?.textContent);
  check(
    "«Войти» стоит рядом с «Рассчитать карту»",
    Boolean(loginLink?.parentElement?.querySelector(".btn--primary")),
    loginLink?.parentElement?.className
  );

  const date = doc.querySelector("#matrix-date");
  check("форма расчёта отрисована", Boolean(date));
  if (!date) return;

  setValue(date, "1992-06-23");
  doc.querySelector("form button").click();
  await wait(400);
  check("расчёт матрицы появился", doc.body.textContent.includes("Центр"));
  const matrixText = doc.body.textContent || "";
  check("энергии подписаны как «N-я энергия»", /\d+-я энергия/.test(matrixText));
  check("названий карт таро на странице нет", !/Колесо Фортуны|Иерофант|Императрица/.test(matrixText));
  check("«Бесплатная расшифровка» убрана", !/Бесплатная расшифровка/i.test(matrixText));

  const takeForm = [...doc.querySelectorAll("form")].find((f) => f.querySelector("#lead-name"));
  check("форма заявки отрисована", Boolean(takeForm));
  if (!takeForm) return;

  check("кнопка подписана как отправка на сервер", /Отправить заявку/.test(takeForm.textContent), takeForm.querySelector("button")?.textContent);

  // Оформление кнопок: голубой оттенок вместо зелёно-бирюзового.
  const css = fs.readFileSync(path.join(dir, "styles.css"), "utf8");
  const primaryBlock = (css.match(/\.btn--primary\s*\{[^}]*\}/) || [])[0] || "";
  check("основная кнопка голубая", /d5edfb/i.test(primaryBlock) && /a9d6ec/i.test(primaryBlock), primaryBlock.slice(0, 120));
  check("зелёно-бирюзовый оттенок кнопок убран", !/cdeacc|aed6d9/i.test(css));
  const secondaryBlock = (css.match(/\.btn--secondary\s*\{[^}]*\}/) || [])[0] || "";
  check("вторая кнопка с голубой рамкой", /#8cb8d0/i.test(secondaryBlock), secondaryBlock.slice(0, 120));
  check("пометка о том, что заявка сразу уходит специалисту", /Заявка сразу уходит специалисту/.test(takeForm.textContent));
  check("нет слов про «появляется в кабинете специалиста»", !/появляется в кабинете специалиста/.test(doc.body.textContent));

  setValue(takeForm.querySelector("#lead-name"), "Мария");
  setValue(takeForm.querySelector("#lead-contact"), "@maria_test");
  const consent = takeForm.querySelector('input[type="checkbox"]');
  if (consent && !consent.checked) consent.click();
  const question = takeForm.querySelector("textarea");
  if (question) setValue(question, "Хочу разбор по деньгам");

  takeForm.querySelector('button[type="submit"]').click();
  await wait(500);

  check("запрос ушёл на api/lead.php", posted?.url === "api/lead.php", String(posted?.url));
  if (posted) {
    const body = posted.body;
    check("в теле есть имя и контакт", body.name === "Мария" && body.contact === "@maria_test", JSON.stringify({ name: body.name, contact: body.contact }));
    check("направление matrix", body.direction === "matrix", String(body.direction));
    check("расчёт приложен к заявке", (body.calc || "").length > 50, String((body.calc || "").length));
    check("дата рождения приложена", body.birth === "1992-06-23", String(body.birth));
    check("согласие передано", body.consent === true, String(body.consent));
    check("honeypot пустой", body.trap === "", JSON.stringify(body.trap));
    check("полный расчёт приложен к заявке", (body.details || "").length > 200, String((body.details || "").length));
    check("в полном расчёте есть все позиции матрицы", /ВСЕ ПОЗИЦИИ/.test(body.details || ""), (body.details || "").slice(0, 120));
    check("в полном расчёте есть формулы", /формула:/.test(body.details || ""));
    check("в теле нет лишних полей", Object.keys(body).length === 11, Object.keys(body).join(","));
  }

  const text = doc.body.textContent;
  check("показан экран «Заявка принята»", /Заявка принята/.test(text));
  check("на экране номер заявки", /AP-2026-007/.test(text));
  check("нет ложного текста о сообщении в Telegram", !/Открыть Telegram/.test(text));

  // Политика конфиденциальности должна описывать реальное поведение: хранение на сервере.
  const privacyDom = new JSDOM(fs.readFileSync(path.join(dir, "privacy.html"), "utf8"), {
    url: "https://astra-test.ru/privacy.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  for (const script of privacyDom.window.document.querySelectorAll("script[src]")) {
    const src = script.getAttribute("src").replace(/^\//, "");
    privacyDom.window.eval(fs.readFileSync(path.join(dir, src), "utf8"));
  }
  await wait(400);
  const privacyText = privacyDom.window.document.body.textContent;
  check("политика говорит о хранении заявок на сервере", /сохраняется на сервере сайта/.test(privacyText));
  check("политика упоминает хеш IP вместо адреса", /хеш/.test(privacyText));
  check("политика не обещает «данные не хранятся»", !/данные не отправляются и не хранятся/.test(privacyText));
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
