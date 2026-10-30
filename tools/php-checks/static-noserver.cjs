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
  const src = script.getAttribute("src").replace(/^\//, "").split("?")[0];
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
  check("без сервера нет кнопки «Войти»", !doc.querySelector('header a[href="cabinet/index.php"]'));

  const header = doc.querySelector("header");
  check("название бренда — «Жемчужина»", /Жемчужина/.test(header?.textContent || ""), header?.textContent?.slice(0, 80));
  check(
    "под названием — «Драгоценная жемчужина души»",
    /Драгоценная жемчужина души/.test(header?.textContent || "")
  );

  const photo = doc.querySelector(".page-photo");
  check("фон сайта — жемчужная фотография", Boolean(photo), "нет слоя .page-photo");
  check(
    "фон подключён картинкой из images/",
    /images\/pearl-background\.jpg/.test(photo?.getAttribute("style") || ""),
    photo?.getAttribute("style")?.slice(0, 120)
  );
  check(
    "фон есть в сборке",
    fs.existsSync(path.join(dir, "images", "pearl-background.jpg")) &&
      fs.existsSync(path.join(dir, "images", "pearl-background-mobile.jpg"))
  );
  const backgroundSize = fs.statSync(path.join(dir, "images", "pearl-background.jpg")).size;
  check("фон не тяжелее 400 КБ", backgroundSize < 400_000, `${Math.round(backgroundSize / 1024)} КБ`);

  // Кэш браузера: адреса файлов должны меняться вместе со сборкой,
  // иначе после загрузки нового архива посетитель видит старое.
  const htmlSource = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const cssSource = fs.readFileSync(path.join(dir, "styles.css"), "utf8");
  check("стили подключены с версией", /styles\.css\?v=[0-9a-f]{6,}/.test(htmlSource), htmlSource.match(/styles\.css[^"]*/)?.[0]);
  check("скрипт подключён с версией", /app\.js\?v=[0-9a-f]{6,}/.test(htmlSource), htmlSource.match(/app\.js[^"]*/)?.[0]);
  check("настройки подключены с версией", /config\.js\?v=[0-9a-f]{6,}/.test(htmlSource));
  check("фон подключён с версией файла", /pearl-background\.jpg\?v=[0-9a-f]{6,}/.test(photo?.getAttribute("style") || ""), photo?.getAttribute("style")?.slice(0, 160));
  check("у фонового слоя нет отрицательного z-index", !/\.page-photo\{[^}]*z-index:-/.test(cssSource));
  check("контент выше фона", /main,\s*footer\{[^}]*z-index:\s*2/.test(cssSource));


  const date = doc.querySelector("#matrix-date");
  check("форма расчёта отрисована", Boolean(date));
  if (!date) return;

  setValue(date, "1992-06-23");
  doc.querySelector("form button").click();
  await wait(400);
  check("расчёт матрицы появился", doc.body.textContent.includes("Центр"));

  const resultText = doc.body.textContent || "";
  check("энергии называются «N-я энергия»", /\d+-я энергия/.test(resultText));
  check("названий карт таро нет", !/Колесо Фортуны|Иерофант|Императрица/.test(resultText));
  check("повторного «Бесплатная расшифровка» нет", !/Бесплатная расшифровка/i.test(resultText));
  check("заголовок расшифровки на месте", /Ваша расшифровка/.test(resultText));
  check("блок закрытых разделов заинтригован", /Что скрыто в вашей схеме/.test(resultText));
  check("схема в жемчужной подаче", Boolean(doc.querySelector("figure svg")), doc.querySelector("figure")?.className);

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

  // В версии без сервера политика должна честно говорить, что данные не хранятся в базе.
  /* ------------------------ страница астрологии ------------------------ */

  // Данные из ссылки: страница сразу считает карту, форму заполнять не нужно.
  const astroUrl =
    "https://example.com/astrology.html?" +
    new URLSearchParams({
      d: "1992-06-23",
      a: "exact",
      t: "14:30",
      la: "55.16",
      lo: "61.4",
      tz: "Asia/Yekaterinburg",
      p: "Челябинск",
      c: "Россия",
    }).toString();
  const astroDom = new JSDOM(fs.readFileSync(path.join(dir, "astrology.html"), "utf8"), {
    url: astroUrl,
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  for (const script of astroDom.window.document.querySelectorAll("script[src]")) {
    const src = script.getAttribute("src").replace(/^\//, "").split("?")[0];
    astroDom.window.eval(fs.readFileSync(path.join(dir, src), "utf8"));
  }
  await wait(600);
  const astroText = astroDom.window.document.body.textContent || "";
  check("астрология: карта посчиталась из ссылки", /Солнце/.test(astroText) && /Асцендент/.test(astroText));
  check("астрология: колесо в жемчужной подаче", Boolean(astroDom.window.document.querySelector("figure svg")));
  check("астрология: заголовок «Ваша расшифровка»", /Ваша расшифровка/.test(astroText));
  check("астрология: «Бесплатная расшифровка» убрана", !/Бесплатная расшифровка/i.test(astroText));
  check("астрология: интригующий блок про закрытые разделы", /Что ещё видно в вашей карте/.test(astroText));

  /* --------------------- всплывающее приглашение --------------------- */

  // Отдельная страница: подменяем задержку окна на 100 мс, чтобы не ждать 40 секунд.
  const inviteDom = new JSDOM(fs.readFileSync(path.join(dir, "index.html"), "utf8"), {
    url: "https://example.com/index.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const inviteWindow = inviteDom.window;
  const scripts = [...inviteWindow.document.querySelectorAll("script[src]")];
  const configScript = scripts.find((node) => node.getAttribute("src").includes("config.js"));
  if (configScript) {
    inviteWindow.eval(fs.readFileSync(path.join(dir, configScript.getAttribute("src").replace(/^\//, "").split("?")[0]), "utf8"));
    inviteWindow.ASTRA_CONFIG.invite = { enabled: true, delayMs: 1200 };
  }
  for (const script of scripts) {
    if (script === configScript) continue;
    const src = script.getAttribute("src").replace(/^\//, "").split("?")[0];
    inviteWindow.eval(fs.readFileSync(path.join(dir, src), "utf8"));
  }
  await wait(400); // React успевает отрисовать главную
  const homeText = inviteWindow.document.body.textContent || "";
  check("на главной крупный заголовок-название", /Драгоценная жемчужина души/.test(homeText));
  check("манифест: первый абзац", /В каждой женщине живёт своя драгоценная жемчужина/.test(homeText));
  check("манифест: абзац про страхи и ожидания", /Иногда она скрыта за страхами/.test(homeText));
  check("манифест: акцентная строка", /Ты не должна заслуживать свою ценность/.test(homeText));
  check("манифест: финальная строка", /каждая женщина — драгоценность/.test(homeText));
  check("манифест: блок оформлен", Boolean(inviteWindow.document.querySelector(".manifesto")));
  check("на главной нет блока о специалисте", !/Фотография специалиста/.test(homeText));
  check("текст про кабинет специалиста убран", !/появляется в кабинете специалиста|ответ придёт в выбранный/.test(homeText));
  // Текст для серверной версии лежит в бандле: на статике показывается ветка без сервера.
  // Кириллица в бандле записана как \uXXXX — раскодируем перед поиском.
  const bundleSource = fs
    .readFileSync(path.join(dir, "app.js"), "utf8")
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  check("написано, что специалист свяжется по выбранному каналу", /Специалист свяжется с вами по выбранному каналу связи/.test(bundleSource));
  check("нет строки про стоимость и сроки в config.js", !/указывает в config\.js/.test(homeText));
  check("нет строки «подтверждает в переписке — без скрытых доплат»", !/без скрытых доплат/.test(homeText));

  check("до истечения времени окна нет", !inviteWindow.document.querySelector(".invite__card"));
  await wait(1200);
  const invite = inviteWindow.document.querySelector(".invite__card");
  check("через время появляется всплывающее окно", Boolean(invite));
  check("в окне есть вопрос", Boolean(invite?.querySelector("#invite-title")));
  check("в окне есть форма заявки", Boolean(invite?.querySelector("#lead-name")));
  invite?.querySelector(".invite__close")?.dispatchEvent(new inviteWindow.Event("click", { bubbles: true }));
  await wait(50);
  check("окно закрывается крестиком", !inviteWindow.document.querySelector(".invite__card"));

  // Окно не одноразовое: после закрытия оно возвращается через тот же интервал.
  await wait(1400);
  check("окно появляется снова после закрытия (каждые N минут)", Boolean(inviteWindow.document.querySelector(".invite__card")));
  inviteWindow.document.querySelector(".invite__close")?.dispatchEvent(new inviteWindow.Event("click", { bubbles: true }));
  await wait(50);
  check("повторное окно тоже закрывается", !inviteWindow.document.querySelector(".invite__card"));

  // Один раз за визит больше не навязываем: в коде нет sessionStorage-защёлки.
  const inviteSource = fs.readFileSync(path.join(dir, "app.js"), "utf8");
  check("окно повторяется, а не показывается один раз", !/invite-shown/.test(inviteSource));

  const privacyDom = new JSDOM(fs.readFileSync(path.join(dir, "privacy.html"), "utf8"), {
    url: "https://example.com/privacy.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  for (const script of privacyDom.window.document.querySelectorAll("script[src]")) {
    const src = script.getAttribute("src").replace(/^\//, "").split("?")[0];
    privacyDom.window.eval(fs.readFileSync(path.join(dir, src), "utf8"));
  }
  await wait(400);
  const privacyText = privacyDom.window.document.body.textContent;
  check("политика описывает версию без сервера", /формируется как текст сообщения/.test(privacyText));
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
