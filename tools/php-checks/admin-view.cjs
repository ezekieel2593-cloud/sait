/**
 * Проверка доступа владельца на страницах расчёта (jsdom, без браузера).
 *
 *   npm run build:php
 *   node tools/php-checks/admin-view.cjs
 *
 * Сценарий: расчёт матрицы и натальной карты в двух режимах —
 *   гость  → часть расшифровки закрыта;
 *   админ  → открыто всё, формы заявки нет, окно-приглашение не всплывает.
 * Ответ /api/session.php подменяется, запросы в сеть не уходят.
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");
const { JSDOM, VirtualConsole } = require(path.join(repoRoot, "node_modules/jsdom"));

const dir = path.join(repoRoot, "release/php");

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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Открывает страницу пакета.
 * admin = true — сервер отвечает, что владелец вошёл.
 */
function openPage(file, { admin }) {
  // file может содержать query — для чтения с диска берём только имя.
  const diskName = file.split("?")[0];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (error) => console.log("jsdomError:", error.message));
  const requests = [];

  const dom = new JSDOM(fs.readFileSync(path.join(dir, diskName), "utf8"), {
    url: `https://astra-test.ru/${file}`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.fetch = (url) => {
        requests.push(String(url));
        if (String(url).includes("session.php")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ ok: true, admin, login: admin ? "Adelina" : "" }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, reference: "AP-1", id: "lead_x", delivered: [] }),
        });
      };
      window.HTMLElement.prototype.scrollIntoView = () => {};
    },
  });

  const window = dom.window;
  const scripts = [...window.document.querySelectorAll("script[src]")];
  const configScript = scripts.find((node) => node.getAttribute("src").includes("config.js"));
  if (configScript) {
    const src = configScript.getAttribute("src").split("?")[0].replace(/^\//, "");
    window.eval(fs.readFileSync(path.join(dir, src), "utf8"));
  }
  for (const script of scripts) {
    if (script === configScript) continue;
    const src = script.getAttribute("src").split("?")[0].replace(/^\//, "");
    window.eval(fs.readFileSync(path.join(dir, src), "utf8"));
  }
  return { window, requests };
}

function setValue(window, el, value) {
  const proto =
    el instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
  el.dispatchEvent(new window.Event("change", { bubbles: true }));
}

async function calculateMatrix(page) {
  const doc = page.window.document;
  await wait(350);
  const date = doc.querySelector("#matrix-date");
  if (!date) return false;
  setValue(page.window, date, "1992-06-23");
  doc.querySelector("form button").click();
  await wait(500);
  return doc.body.textContent.includes("Центр");
}

(async () => {
  if (!fs.existsSync(path.join(dir, "matrix.html"))) {
    console.error("нет release/php/matrix.html — сначала выполните npm run build:php");
    process.exit(2);
  }

  /* ------------------------------ гость ---------------------------------- */

  console.log("\n1. Гость");
  const guestPage = openPage("matrix.html", { admin: false });
  check("матрица считается", await calculateMatrix(guestPage));
  const guestText = guestPage.window.document.body.textContent || "";
  check("гость видит заголовок «Ваша расшифровка»", /Ваша расшифровка/.test(guestText));
  check("гость видит закрытые разделы", /Что скрыто в вашей схеме/.test(guestText));
  check("гость видит форму заявки", Boolean(guestPage.window.document.querySelector("#lead-name")));
  check("гостю не показывают плашку владельца", !/Вы вошли как владелец/.test(guestText));
  check("страница спрашивает у сервера, кто смотрит", guestPage.requests.some((url) => url.includes("session.php")));

  /* ------------------------------ админ ---------------------------------- */

  console.log("\n2. Владелец: матрица");
  const adminPage = openPage("matrix.html", { admin: true });
  check("матрица считается", await calculateMatrix(adminPage));
  const adminDoc = adminPage.window.document;
  const adminText = adminDoc.body.textContent || "";
  check("заголовок «Полная расшифровка»", /Полная расшифровка/.test(adminText));
  check("плашка «Вы вошли как владелец»", /Вы вошли как владелец/.test(adminText));
  check("закрытых разделов нет", !/Что скрыто в вашей схеме/.test(adminText));
  check("карточек расшифровки больше, чем у гостя", (adminText.match(/Сильные стороны/g) || []).length >= 10,
    String((adminText.match(/Сильные стороны/g) || []).length));
  check("формы заявки нет", !adminDoc.querySelector("#lead-name"));
  check("ссылка в кабинет есть", Boolean(adminDoc.querySelector('.note--admin a[href="cabinet/index.php"]')));

  // Окно-приглашение владельцу не всплывает даже с коротким интервалом.
  adminPage.window.ASTRA_CONFIG.invite = { enabled: true, delayMs: 100 };
  await wait(1200);
  check("окно-приглашение владельцу не показывается", !adminDoc.querySelector(".invite__card"));

  /* ---------------------- владелец: астрология --------------------------- */

  console.log("\n3. Владелец: натальная карта");
  // Данные рождения передаются в адресе — расчёт запускается сразу.
  const astroQuery =
    "?d=1992-06-23&a=exact&t=14%3A30&c=Москва&p=Москва&la=55.7558&lo=37.6173&tz=Europe%2FMoscow";
  const astroPage = openPage(`astrology.html${astroQuery}`, { admin: true });
  await wait(700);
  const astroDoc = astroPage.window.document;
  const astroText = astroDoc.body.textContent || "";
  check("карта рассчитана", /Асцендент|Солнце/.test(astroText));
  check("заголовок «Полная расшифровка»", /Полная расшифровка/.test(astroText));
  check("закрытых разделов нет", !/Что ещё видно в вашей карте/.test(astroText));
  check("плашка владельца есть", /Вы вошли как владелец/.test(astroText));
  check("формы заявки нет", !astroDoc.querySelector("#lead-name"));

  console.log("\n4. Гость: натальная карта");
  const astroGuest = openPage(`astrology.html${astroQuery}`, { admin: false });
  await wait(700);
  const guestAstroDoc = astroGuest.window.document;
  const guestAstroText = guestAstroDoc.body.textContent || "";
  check("гость видит закрытые разделы", /Что ещё видно в вашей карте/.test(guestAstroText));
  check("гостю не показывают плашку владельца", !/Вы вошли как владелец/.test(guestAstroText));
  check("гость видит форму заявки", Boolean(guestAstroDoc.querySelector("#lead-name")));

  /* ------------------------- описание всех 12 домов ----------------------- */

  console.log("\n5. Дома в разборе карты");
  const houseCards = (astroText.match(/Управитель дома — /g) || []).length;
  check("у владельца разобраны все 12 домов", houseCards >= 12, String(houseCards));
  check("у домов есть знак на куспиде", (astroText.match(/На куспиде — /g) || []).length >= 12);
  check("у домов есть управитель и его положение", /В вашей карте .+ находится в знаке /.test(astroText));
  check("планеты внутри дома описаны", /в этом доме работает тема/.test(astroText));
  check("аспекты к планетам дома показаны", /Аспекты к планетам дома: /.test(astroText));
  const recBlocks = (astroText.match(/Рекомендации/g) || []).length;
  check("в карточках домов есть рекомендации", recBlocks >= 12, String(recBlocks));
  check("список всех аспектов в деталях", /Аспекты \(\d+\)/.test(astroText));
  const guestHouses = (guestAstroText.match(/Управитель дома — /g) || []).length;
  check("гостю дома закрыты", guestHouses === 0, String(guestHouses));

  console.log(`\nИтого: ${pass} ok, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
})();
