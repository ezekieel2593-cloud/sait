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

  const downloads = [];
  const dom = new JSDOM(fs.readFileSync(path.join(dir, diskName), "utf8"), {
    url: `https://astra-test.ru/${file}`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      const fontPath = path.join(dir, "fonts/guide-sans.ttf");
      // PDF-гайд подгружает шрифт тем же fetch — отдаём настоящий файл.
      window.URL.createObjectURL = (blob) => {
        downloads.push(blob);
        return "blob:guide";
      };
      window.URL.revokeObjectURL = () => {};
      window.fetch = (url) => {
        requests.push(String(url));
        if (String(url).includes("guide-sans.ttf")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            arrayBuffer: () => Promise.resolve(fs.readFileSync(fontPath).buffer.slice(0)),
          });
        }
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
  return { window, requests, downloads };
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

  /* --------------------- расширенный разбор владельца --------------------- */

  console.log("\n6. Расширенный вариант только для владельца");
  for (const title of [
    "Параметры расчёта",
    "Точные положения планет",
    "Куспиды домов",
    "Аспекты: полный список",
  ]) {
    check(`астрология: раздел «${title}»`, astroText.includes(title));
  }
  check("астрология: у планет есть точные данные", /Долгота на эклиптике/.test(astroText));
  check("астрология: стихия и крест знака", /крест — /.test(astroText));
  check("астрология: все аспекты каждой планеты", /Аспекты Солнца: /.test(astroText));
  check("астрология: юлианская дата в параметрах", /Юлианская дата/.test(astroText));
  check("гость не получает технические таблицы", !/Долгота на эклиптике|Юлианская дата|Куспиды домов/.test(guestAstroText));

  const adminMatrix = openPage("matrix.html", { admin: true });
  check("матрица считается", await calculateMatrix(adminMatrix));
  const adminMatrixText = adminMatrix.window.document.body.textContent || "";
  check("матрица: схема всех позиций", adminMatrixText.includes("Схема расчёта: все позиции"));
  check("матрица: каналы денег и отношений", adminMatrixText.includes("Каналы денег и отношений"));
  check("матрица: параметры методики", adminMatrixText.includes("Параметры расчёта"));
  check("матрица: формула и число у точки", /До редукции/.test(adminMatrixText));
  check("матрица: место точки в схеме", /Где стоит: /.test(adminMatrixText));

  const guestMatrix = openPage("matrix.html", { admin: false });
  check("матрица считается", await calculateMatrix(guestMatrix));
  const guestMatrixText = guestMatrix.window.document.body.textContent || "";
  check("гость не видит схему расчёта", !/Схема расчёта: все позиции|До редукции|Каналы денег и отношений/.test(guestMatrixText));

  /* ----------------------- гайды по энергиям и PDF ------------------------ */

  console.log("\n7. Гайды по энергиям");
  const guestGuides = guestMatrix.window.document;
  const guestGuidesText = guestMatrixText;
  check("гость видит раздел гайдов", guestGuidesText.includes("Гайды: что делать с вашими энергиями"));
  check("гостю открыты несколько гайдов", (guestGuidesText.match(/Что делать/g) || []).length >= 2);
  check("шаги гайда видны", /Практика на неделю/.test(guestGuidesText));
  check("часть гайдов закрыта", /закрыто/.test(guestGuidesText));
  check("закрытые гайды без шагов", (guestGuidesText.match(/Что делать/g) || []).length < 16);
  const guideButton = [...guestGuides.querySelectorAll("button")].find((node) =>
    (node.textContent || "").includes("Получить гайд")
  );
  check("есть кнопка «Получить гайд»", Boolean(guideButton));
  if (guideButton) {
    guideButton.click();
    await wait(120);
    check("кнопка открывает форму с контактами", Boolean(guestGuides.querySelector("#guide-name")));
    check("форма гайда просит канал связи", Boolean(guestGuides.querySelector("#guide-contact")));
  }

  const adminGuidesDoc = adminMatrix.window.document;
  const adminGuidesText = adminMatrixText;
  check("владелец видит гайды без закрытых", !/закрыто/.test(adminGuidesText));
  check("у владельца есть кнопка PDF", /Создать гайд \(PDF\)/.test(adminGuidesText));
  check("у владельца нет формы запроса гайда", !adminGuidesDoc.querySelector("#guide-name"));
  check("владельцу открыты все энергии схемы", (adminGuidesText.match(/Что делать/g) || []).length >= 10,
    String((adminGuidesText.match(/Что делать/g) || []).length));

  /* --------------------------- сборка PDF в браузере ---------------------- */

  console.log("\n8. Владелец: гайд в PDF");
  const pdfPage = openPage(`matrix.html?d=1992-06-23&guide=1&name=${encodeURIComponent("Анна")}`, { admin: true });
  await wait(1600);
  const pdfDoc = pdfPage.window.document;
  const pdfText = pdfDoc.body.textContent || "";
  check("панель PDF видна владельцу", /Создать гайд \(PDF\)/.test(pdfText));
  check("имя из ссылки подставлено", pdfDoc.querySelector("#guide-pdf-name")?.value === "Анна");
  check("файл сформирован автоматически", pdfPage.downloads.length > 0, String(pdfPage.downloads.length));
  if (pdfPage.downloads.length > 0) {
    const bytes = new Uint8Array(await pdfPage.downloads[0].arrayBuffer());
    const head = Buffer.from(bytes.slice(0, 8)).toString("latin1");
    const tail = Buffer.from(bytes.slice(-1024)).toString("latin1");
    check("это PDF по сигнатуре", head.startsWith("%PDF-1.4"), head);
    check("PDF завершён корректно", tail.includes("%%EOF"));
    check("в PDF встроен шрифт с кириллицей", Buffer.from(bytes).toString("latin1").includes("/FontFile2"));
    check("PDF весит разумно", bytes.byteLength > 40000 && bytes.byteLength < 1500000, String(bytes.byteLength));
  }
  check("после сборки показано подтверждение", /Файл готов/.test(pdfText));

  /* --------------------------- схема матрицы ----------------------------- */

  console.log("\n9. Схема матрицы");
  const guestMatrixDoc = guestMatrix.window.document;
  check("блока «простыми словами» на странице матрицы нет", !/Матрица простыми словами/.test(guestMatrixText));
  const matrixSvg = guestMatrixDoc.querySelector("figure svg");
  const svgText = matrixSvg?.textContent || "";
  const circles = matrixSvg ? matrixSvg.querySelectorAll("circle").length : 0;
  check("схема подробная", circles >= 20, String(circles));
  for (const label of ["таланты", "кармическая задача", "как тебя видят", "зона комфорта", "кем работать", "отношения"]) {
    check(`на схеме подписано «${label}»`, svgText.includes(label));
  }
  check("на схеме есть легенда", svgText.includes("комфорт"));

  /* ------------------------ отдельная страница гайда ----------------------- */

  console.log("\n10. Страница «Гайд по 22 энергиям»");
  const guidePage = openPage("guide.html", { admin: false });
  await wait(500);
  const guideDoc = guidePage.window.document;
  const guideText = guideDoc.body.textContent || "";
  check("страница открывается", /22 энергии/.test(guideText));
  check("все 22 энергии на странице", guideDoc.querySelectorAll("article[id^=\"energy-\"]").length === 22,
    String(guideDoc.querySelectorAll("article[id^=\"energy-\"]").length));
  for (const aspect of [
    "Каким тебя видят другие",
    "Таланты",
    "Главная кармическая задача души",
    "Каким спортом заниматься",
    "Как начинать утро",
    "Что даёт ресурс",
    "Что расслабляет",
    "Кем и где работать",
    "Как приходят деньги",
    "Что важно в отношениях",
  ]) {
    check(`аспект «${aspect}»`, guideText.includes(aspect));
  }
  check("аспекты раскрыты для каждой энергии", (guideText.match(/Каким спортом заниматься/g) || []).length === 22);
  check("под каждым советом есть объяснение «почему так»",
    (guideText.match(/Почему так:/g) || []).length === 220,
    String((guideText.match(/Почему так:/g) || []).length));
  check("у каждой энергии раскрыта её логика",
    (guideText.match(/Логика энергии/g) || []).length === 22,
    String((guideText.match(/Логика энергии/g) || []).length));
  check("есть навигация по номерам", guideDoc.querySelectorAll("nav a[href^=\"#energy-\"]").length === 22);
  check("нет названий карт таро", !/Колесо Фортуны|Иерофант|Императрица|Жрица/.test(guideText));
  check("гостю предложен персональный гайд", /Получить персональный гайд/.test(guideText));
  const personalButton = [...guideDoc.querySelectorAll("button")].find((node) =>
    (node.textContent || "").includes("Получить персональный гайд")
  );
  if (personalButton) {
    personalButton.click();
    await wait(150);
    check("открывается форма с контактами", Boolean(guideDoc.querySelector("#guide-name")));
  }

  const guideAdmin = openPage("guide.html", { admin: true });
  await wait(500);
  const guideAdminDoc = guideAdmin.window.document;
  const guideAdminText = guideAdminDoc.body.textContent || "";
  check("владельцу доступна сборка PDF по дате", /гайд в PDF по дате рождения/.test(guideAdminText));
  check("у владельца есть поле даты", Boolean(guideAdminDoc.querySelector("#guide-pdf-date")));
  check("у владельца нет формы запроса", !guideAdminDoc.querySelector("#guide-name"));
  if (guideAdminDoc.querySelector("#guide-pdf-date")) {
    setValue(guideAdmin.window, guideAdminDoc.querySelector("#guide-pdf-date"), "1992-06-23");
    const pdfButton = [...guideAdminDoc.querySelectorAll("button")].find((node) =>
      (node.textContent || "").includes("Создать гайд (PDF)")
    );
    pdfButton?.click();
    await wait(1500);
    check("PDF собирается по введённой дате", guideAdmin.downloads.length > 0, String(guideAdmin.downloads.length));
    if (guideAdmin.downloads.length > 0) {
      const bytes = new Uint8Array(await guideAdmin.downloads[0].arrayBuffer());
      const head = Buffer.from(bytes.slice(0, 8)).toString("latin1");
      check("это корректный PDF", head.startsWith("%PDF-1.4"), head);
    }
  }

  const headerLinks = [...guestMatrixDoc.querySelectorAll("header a")].map((node) => node.getAttribute("href"));
  check("ссылка на гайд есть в шапке сайта", headerLinks.includes("guide.html"), headerLinks.join(","));
  check("со страницы матрицы есть переход в гайд", Boolean(guestMatrixDoc.querySelector('a[href="guide.html"]')));

  console.log(`\nИтого: ${pass} ok, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
})();
