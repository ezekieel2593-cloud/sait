import { useMemo, useState, type FormEvent } from "react";
import { api } from "../../services/api";
import { computeNatalChart, computeTransits } from "../astrology";
import { getConfig } from "../../../src-static/config";
import {
  CitySearch,
  type PlaceValue,
} from "../../../src-static/components/CitySearch";
import { readPortalStore, writePortalStore, type PortalStore } from "./storage";

const products = [
  {
    id: "moon-code",
    title: "Лунный код",
    description: "Лунный ритм, эмоциональные опоры и практики самонаблюдения.",
    price: 499,
  },
  {
    id: "matrix-money-love",
    title: "Матрица судьбы: Деньги и отношения",
    description: "Ключевые зоны финансов и партнёрства по дате рождения.",
    price: 790,
  },
  {
    id: "year-forecast",
    title: "Личный прогноз на год",
    description:
      "Тематический обзор личного года и календарь для планирования.",
    price: 1290,
  },
];

export function CabinetPage() {
  const [store, setStore] = useState<PortalStore>(() => readPortalStore());
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Я");
  const [birthday, setBirthday] = useState("");
  const [message, setMessage] = useState("");
  const addPerson = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !birthday) return;
    const next = {
      ...store,
      people: [
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          relation,
          birthday,
          createdAt: new Date().toISOString(),
        },
        ...store.people,
      ],
    };
    writePortalStore(next);
    setStore(next);
    setName("");
    setBirthday("");
    setMessage("Профиль сохранён только в этом браузере.");
  };
  const removePerson = (id: string) => {
    const next = {
      ...store,
      people: store.people.filter((person) => person.id !== id),
    };
    writePortalStore(next);
    setStore(next);
  };
  const removeReport = (id: string) => {
    const next = {
      ...store,
      reports: store.reports.filter((report) => report.id !== id),
    };
    writePortalStore(next);
    setStore(next);
  };
  const downloadGuide = (title: string) => {
    const doc = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:16px/1.7 system-ui;max-width:760px;margin:4rem auto;padding:0 24px;color:#10253a}h1{font:42px Georgia}button{padding:12px 20px;border-radius:20px;background:#d9effb;border:0}@media print{button{display:none}}</style><h1>${escapeHtml(title)}</h1><p>Персональный материал портала «Жемчужина».</p><p>Этот демо-макет подготовлен для проверки формата. Подробный персональный PDF будет сформирован после подключения сервиса генерации.</p><button onclick="print()">Сохранить как PDF</button></html>`;
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", `Открыть макет PDF: ${title}`);
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  return (
    <div className="portal-page cabinet-shell">
      <div className="container portal-container">
        <p className="portal-kicker">Личное пространство</p>
        <h1 className="portal-heading">Кабинет</h1>
        <p className="portal-intro">
          Ваши профили и расчёты хранятся в localStorage этого браузера. Аккаунт
          и синхронизация между устройствами пока не подключены.
        </p>
        <div className="cabinet-grid">
          <section className="portal-panel">
            <h2>Мои люди</h2>
            <form className="cabinet-form" onSubmit={addPerson}>
              <label>
                Имя
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, Анна"
                />
              </label>
              <label>
                Кто это?
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                >
                  {[
                    "Я",
                    "Партнёр",
                    "Ребёнок",
                    "Родитель",
                    "Близкий человек",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Дата рождения
                <input
                  required
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </label>
              <button className="portal-button portal-button--ice">
                Сохранить профиль
              </button>
            </form>
            {message && (
              <p className="portal-note" role="status">
                {message}
              </p>
            )}
            <div className="people-list">
              {store.people.map((person) => (
                <article className="person-row" key={person.id}>
                  <div>
                    <strong>{person.name}</strong>
                    <small>
                      {person.relation} · {person.birthday}
                    </small>
                  </div>
                  <div className="person-actions">
                    <a href={`astrology.html?date=${person.birthday}`}>
                      Натальная карта
                    </a>
                    <a href={`matrix.html?d=${person.birthday}`}>Матрица</a>
                    <button
                      onClick={() => removePerson(person.id)}
                      aria-label={`Удалить ${person.name}`}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
              {!store.people.length && (
                <p className="portal-muted">Пока нет сохранённых профилей.</p>
              )}
            </div>
          </section>
          <section className="portal-panel">
            <h2>Мои расчёты</h2>
            <p className="portal-muted">
              Сохраняйте результаты из калькуляторов кнопкой «Сохранить в
              кабинете».
            </p>
            <div className="people-list">
              {store.reports.map((report) => (
                <article className="person-row" key={report.id}>
                  <div>
                    <strong>{report.title}</strong>
                    <small>
                      {report.birthday} ·{" "}
                      {new Date(report.createdAt).toLocaleDateString("ru-RU")}
                    </small>
                  </div>
                  <div className="person-actions">
                    <a href={report.href}>Открыть</a>
                    <button onClick={() => downloadGuide(report.title)}>
                      Открыть макет PDF
                    </button>
                    <button onClick={() => removeReport(report.id)}>
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
              {!store.reports.length && (
                <p className="portal-muted">
                  Здесь появятся сохранённые натальные карты и матрицы.
                </p>
              )}
            </div>
          </section>
        </div>
        <section className="portal-panel cabinet-products">
          <h2>Витрина PDF-разборов</h2>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <ConsultationForm />
        </section>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: (typeof products)[number] }) {
  const [note, setNote] = useState("");
  return (
    <article className="product-card">
      <span className="product-label">PDF-разбор</span>
      <h3>{product.title}</h3>
      <p>{product.description}</p>
      <strong className="product-price">
        {product.price.toLocaleString("ru-RU")} ₽
      </strong>
      <button
        className="portal-button"
        onClick={async () =>
          setNote(
            (
              await api.checkout({
                productId: product.id,
                title: product.title,
                amountRub: product.price,
              })
            ).message,
          )
        }
      >
        Выбрать разбор
      </button>
      {note && <small role="status">{note}</small>}
    </article>
  );
}

function ConsultationForm() {
  const [status, setStatus] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setStatus("Отправляем запрос…");
    try {
      const result = await api.consultation({
        name: String(data.get("name")),
        contact: String(data.get("contact")),
        channel: String(data.get("channel")) as "telegram" | "max" | "email",
        topic: String(data.get("topic")),
        message: String(data.get("message")),
      });
      setStatus(
        result.demo
          ? "Демо-режим: заявка не отправлена. После подключения API она будет сохранена и передана уведомлению."
          : "Заявка принята сервисом.",
      );
      e.currentTarget.reset();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Не удалось отправить.");
    }
  };
  return (
    <div className="consult-box">
      <div>
        <p className="portal-kicker">Личная встреча</p>
        <h3>Консультация · 1 500 ₽</h3>
        <p>
          {getConfig().api?.enabled
            ? "Форма передаст заявку через защищённый PHP endpoint; уведомление зависит от настроек сайта."
            : "Демо-режим: эта форма не отправляет данные, пока не подключён backend."}
        </p>
      </div>
      <form className="cabinet-form consultation-form" onSubmit={submit}>
        <label>
          Имя
          <input required name="name" />
        </label>
        <label>
          Контакт для ответа
          <input required name="contact" />
        </label>
        <label>
          Канал связи
          <select name="channel">
            <option value="telegram">Telegram</option>
            <option value="email">Электронная почта</option>
            <option value="max">MAX</option>
          </select>
        </label>
        <label>
          Тема
          <select name="topic">
            <option>Финансы</option>
            <option>Отношения</option>
            <option>Ректификация</option>
            <option>Прогноз</option>
          </select>
        </label>
        <label className="consent-line">
          <input required type="checkbox" />{" "}
          <span>
            Согласен(на) на обработку данных по{" "}
            <a href="privacy.html">политике конфиденциальности</a>
          </span>
        </label>
        <button className="portal-button portal-button--ice">
          Оставить заявку
        </button>
        {status && (
          <p role="status" className="portal-note">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}

export function StorePage() {
  return (
    <div className="portal-page">
      <div className="container portal-container">
        <p className="portal-kicker">Цифровые материалы</p>
        <h1 className="portal-heading">Витрина разборов</h1>
        <p className="portal-intro">
          Выберите формат, который соответствует вашему запросу. Оплата пока не
          подключена: кнопки показывают сценарий готовности к интеграции ЮKassa
          и ничего не списывают.
        </p>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <ConsultationForm />
      </div>
    </div>
  );
}

export function ForecastPage() {
  const config = getConfig();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [birth, setBirth] = useState("");
  const [time, setTime] = useState("12:00");
  const [unknownTime, setUnknownTime] = useState(false);
  const [place, setPlace] = useState<PlaceValue | null>(null);
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const [error, setError] = useState("");
  const [report, setReport] = useState<{
    balance: number;
    harmonious: number;
    tense: number;
    aspects: { text: string; count: number; nature: string }[];
  } | null>(null);
  const phase = useMemo(() => moonPhase(new Date()), []);
  const calculate = (event: FormEvent) => {
    event.preventDefault();
    if (!birth || !place) {
      setError("Укажите дату рождения и выберите город.");
      return;
    }
    setError("");
    const natal = computeNatalChart(
      {
        date: birth,
        time: unknownTime ? null : time,
        timeAccuracy: unknownTime ? "unknown" : "exact",
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
        placeName: `${place.name}, ${place.country}`,
      },
      config.methodology.astrologyHouseSystem,
    );
    const start = new Date(`${date}T12:00:00Z`);
    const samples: Date[] = [];
    if (period === "day") samples.push(start);
    else if (period === "month") {
      const end = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
      );
      for (let day = 1; day <= end.getUTCDate(); day += 4)
        samples.push(
          new Date(
            Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), day, 12),
          ),
        );
    } else {
      for (let month = 0; month < 12; month++)
        samples.push(new Date(Date.UTC(start.getUTCFullYear(), month, 15, 12)));
    }
    const counts = new Map<
      string,
      { text: string; count: number; nature: string }
    >();
    let harmonious = 0,
      tense = 0;
    for (const sample of samples) {
      for (const aspect of computeTransits(natal, sample).aspects) {
        if (aspect.nature === "harmonious") harmonious++;
        if (aspect.nature === "tense") tense++;
        const key = `${aspect.transitKey}-${aspect.natalKey}-${aspect.type}`;
        const row = counts.get(key) ?? {
          text: aspect.formatted,
          count: 0,
          nature: aspect.nature,
        };
        row.count++;
        counts.set(key, row);
      }
    }
    const total = harmonious + tense;
    setReport({
      harmonious,
      tense,
      balance: total ? Math.round((harmonious / total) * 100) : 50,
      aspects: [...counts.values()]
        .sort((x, y) => y.count - x.count)
        .slice(0, 5),
    });
  };
  return (
    <div className="portal-page astro-world">
      <div className="container portal-container">
        <p className="portal-kicker">
          Небесный ритм ·{" "}
          {new Date().toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <h1 className="portal-heading">Личный прогноз</h1>
        <p className="portal-intro">
          Транзитные аспекты к вашей натальной карте на выбранную дату или
          период. Это язык символической астрологии, не вероятность событий и не
          замена профессиональному совету.
        </p>
        <div className="forecast-grid">
          <section className="portal-panel">
            <span className="moon-orb" aria-hidden="true" />
            <h2>Фаза Луны: {phase.label}</h2>
            <p>{phase.advice}</p>
            <div className="phase-track">
              <span style={{ width: `${phase.illumination}%` }} />
            </div>
            <small>Освещённость ориентировочно {phase.illumination}%</small>
          </section>
          <section className="portal-panel">
            <h2>Рассчитать транзиты</h2>
            <form className="cabinet-form" onSubmit={calculate}>
              <label>
                Дата рождения
                <input
                  required
                  type="date"
                  value={birth}
                  onChange={(e) => setBirth(e.target.value)}
                />
              </label>
              <label className="consent-line">
                <input
                  type="checkbox"
                  checked={unknownTime}
                  onChange={(e) => setUnknownTime(e.target.checked)}
                />{" "}
                Не знаю точное время рождения
              </label>
              {!unknownTime && (
                <label>
                  Время рождения
                  <input
                    required
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
              )}
              <CitySearch
                id="forecast-city"
                label="Город рождения"
                value={place}
                onChange={setPlace}
              />
              <label>
                Дата прогноза
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Период
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as typeof period)}
                >
                  <option value="day">День</option>
                  <option value="month">Месяц (срез каждые 4 дня)</option>
                  <option value="year">Год (срез по месяцам)</option>
                </select>
              </label>
              {error && (
                <p role="alert" className="portal-note">
                  {error}
                </p>
              )}
              <button className="portal-button portal-button--ice">
                Рассчитать транзиты
              </button>
            </form>
          </section>
        </div>
        {report && (
          <section className="portal-panel" aria-live="polite">
            <p className="portal-kicker">Аспекты к вашей карте</p>
            <h2>Баланс аспектов периода</h2>
            <div className="forecast-score">
              <span>Гармоничные аспекты: {report.harmonious}</span>
              <div className="phase-track">
                <span style={{ width: `${report.balance}%` }} />
              </div>
              <span>Напряжённые аспекты: {report.tense}</span>
              <strong>{report.balance}% гармоничных среди учтённых</strong>
            </div>
            <p>
              Это только отношение количества найденных аспектов в расчётной
              выборке, не оценка удачи и не процент вероятности события.
            </p>
            {report.aspects.length ? (
              <ul className="clean-list">
                {report.aspects.map((aspect, index) => (
                  <li key={`${aspect.text}-${index}`}>
                    <strong>{aspect.text}</strong> · повторений в выборке:{" "}
                    {aspect.count} ·{" "}
                    {aspect.nature === "tense" ? "напряжённый" : "гармоничный"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                В выбранной выборке значимых транзитных аспектов не обнаружено.
              </p>
            )}
            <p className="portal-note">
              Для реальных решений опирайтесь на проверяемые обстоятельства.
              Астрологическая интерпретация носит символический характер.
            </p>
          </section>
        )}
        <section className="portal-panel">
          <h2>Практики дня</h2>
          <ul className="clean-list">
            <li>Запишите одну задачу, которую важно завершить.</li>
            <li>Сделайте короткую паузу и оцените уровень энергии.</li>
            <li>Перед важным решением проверьте факты и сроки.</li>
          </ul>
          <p>
            Лунная фаза выше — примерная оценка по среднему синодическому
            месяцу; точное время фазы отличается от эфемерид.
          </p>
        </section>
      </div>
    </div>
  );
}

export function BlogPage() {
  const articles = [
    {
      title: "Как читать натальную карту: пять опорных точек",
      tag: "Астрология",
      text: "Солнце, Луна, Асцендент, Венера и Марс помогают выстроить первое знакомство с картой. Разберём, что именно описывает каждая точка и почему трактовка не сводится к одному знаку.",
    },
    {
      title: "Матрица судьбы: как устроен расчёт 22 энергий",
      tag: "Матрица",
      text: "Обзор формул, ключевых позиций и ограничений метода. Значения матрицы относятся к эзотерической системе интерпретации.",
    },
    {
      title: "Дневник наблюдений: превращаем прогноз в практику",
      tag: "Практика",
      text: "Короткая техника рефлексии: фиксировать контекст, намерение и фактический результат, не подменяя этим важные решения.",
    },
  ];
  return (
    <div className="portal-page">
      <div className="container portal-container">
        <p className="portal-kicker">Журнал «Жемчужина»</p>
        <h1 className="portal-heading">Блог</h1>
        <p className="portal-intro">
          Статьи о символических системах, расчётах и практиках самонаблюдения.
        </p>
        <div className="product-grid">
          {articles.map((item, i) => (
            <article className="portal-panel article-card" key={item.title}>
              <small>
                {item.tag} · 0{i + 1}
              </small>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
              <details>
                <summary>Читать статью</summary>
                <p>
                  {item.text} Используйте интерпретации как повод для
                  размышления, а не как гарантированный прогноз или замену
                  профессиональной консультации.
                </p>
              </details>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function moonPhase(date: Date) {
  const synodic = 29.530588853;
  const known = new Date("2000-01-06T18:14:00Z").getTime();
  const age =
    ((((date.getTime() - known) / 86400000) % synodic) + synodic) % synodic;
  const illumination = Math.round(
    ((1 - Math.cos((2 * Math.PI * age) / synodic)) / 2) * 100,
  );
  const label =
    age < 1.85 || age > synodic - 1.85
      ? "новолуние"
      : age < synodic / 2 - 1.85
        ? "растущая Луна"
        : age < synodic / 2 + 1.85
          ? "полнолуние"
          : "убывающая Луна";
  return {
    label,
    illumination,
    advice:
      "Фаза рассчитана приблизительно по среднему синодическому месяцу. Время лунных фаз отличается от эфемерид.",
  };
}
function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] || c,
  );
}
