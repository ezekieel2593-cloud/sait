import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../../services/api";
import {
  getTariffs,
  createSubscriptionCheckout,
  type Tariffs,
} from "../../services/payments";
import { generateShareImage, downloadBlob } from "../../services/pdfService";
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

/** Клиент кабинета — то, что сервер отдаёт без чувствительных полей. */
type ClientUser = {
  id: string;
  name: string;
  email: string;
  telegram: string;
  birthday: string;
  birthTime: string;
  place: string;
  subscriptionUntil: string | null;
  subscribed: boolean;
  onboarding: string;
};

type ServerPerson = { id: string; name: string; relation: string; birthday: string };
type LibraryItem = { id: string; title: string; url: string; createdAt: string };
type TabKey = "data" | "reports" | "subscribe" | "library" | "consult";

const TABS: { key: TabKey; label: string }[] = [
  { key: "data", label: "Мои данные" },
  { key: "reports", label: "Мои расчёты" },
  { key: "subscribe", label: "Подписка" },
  { key: "library", label: "Мои PDF" },
  { key: "consult", label: "Консультация" },
];

const TOPICS: { key: string; title: string; note: string }[] = [
  { key: "relations", title: "Отношения", note: "любовь, партнёр, близость" },
  { key: "money", title: "Деньги", note: "доход, работа, реализация" },
  { key: "energy", title: "Энергия и поиск себя", note: "ресурс, отдых, предназначение" },
];

const PDF_FALLBACKS = [
  {
    id: "moon-code",
    title: "Полный Лунный код",
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
    description: "Тематический обзор личного года и календарь для планирования.",
    price: 1290,
  },
];

const API_BASE = (): string | null => {
  try {
    const config = (window as unknown as { ASTRA_CONFIG?: { api?: { enabled?: boolean; base?: string } } })
      .ASTRA_CONFIG;
    if (!config?.api?.enabled) return null;
    return (config.api.base || "api").replace(/\/$/, "");
  } catch {
    return null;
  }
};

async function postJson(
  base: string,
  script: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const response = await fetch(`${base}/${script}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: {} };
  }
}


/** GET JSON без падений: в jsdom и старых браузерах fetch может отсутствовать. */
function getJson(base: string, script: string): Promise<Record<string, unknown> | null> {
  try {
    return fetch(`${base}/${script}`, { credentials: "same-origin" })
      .then((response) => response.json())
      .catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

function greeting(name: string): string {
  if (!name) return "Личное пространство";
  return `Здравствуйте, ${name}`;
}

/** «1992-06-23» / ISO → «23.06.1992»; остальное — как есть. */
function formatDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
}


export function CabinetPage() {
  const base = API_BASE();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(base ? null : false);
  const [tab, setTab] = useState<TabKey>("data");

  // Ссылка «Открыть полный доступ» из закрытых блоков разборов ведёт
  // в кабинет сразу на вкладку подписки.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("paywall")) {
      setTab("subscribe");
    }
  }, []);

  useEffect(() => {
    if (!base) return;
    getJson(base, "auth.php").then((data) => {
      if (data?.authed) {
        setAuthed(true);
        setUser(data.user as ClientUser);
      } else {
        setAuthed(false);
      }
    });
  }, [base]);

  const logout = async () => {
    if (base) {
      await postJson(base, "auth.php", { action: "logout" });
    }
    setUser(null);
    setAuthed(false);
  };

  if (!base) {
    return (
      <div className="portal-panel">
        <p className="portal-muted">
          Личный кабинет работает на хостинге с PHP. Откройте сайт через
          cosmorox.ru — или воспользуйтесь расчётами: они сохраняются в этом
          браузере.
        </p>
        <div className="cabinet-links">
          <a className="portal-button" href="astrology.html">
            Рассчитать карту
          </a>
          <a className="portal-button portal-button--ghost" href="matrix.html">
            Рассчитать матрицу
          </a>
        </div>
      </div>
    );
  }

  if (authed === null) {
    return <p className="portal-muted">Загружаю кабинет…</p>;
  }

  if (!user) {
    return <AuthPanel base={base} onAuthed={setUser} />;
  }

  return (
    <div>
      <div className="client-topline">
        <p className="portal-h1">{greeting(user.name)}</p>
        <div className="client-topline__side">
          <span
            className={`client-badge${user.subscribed ? " client-badge--active" : ""}`}
          >
            {user.subscribed
              ? `Подписка активна${user.subscriptionUntil ? ` до ${formatDate(user.subscriptionUntil)}` : ""}`
              : "Бесплатный доступ"}
          </span>
          <button type="button" className="text-action" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>

      <div className="client-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? "active" : ""}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "data" ? (
        <DataTab base={base} user={user} onUpdate={setUser} />
      ) : null}
      {tab === "reports" ? <ReportsTab /> : null}
      {tab === "subscribe" ? <SubscribeTab base={base} user={user} /> : null}
      {tab === "library" ? <LibraryTab base={base} subscribed={user.subscribed} /> : null}
      {tab === "consult" ? <ConsultTab base={base} user={user} /> : null}
    </div>
  );
}

/** Экран входа и быстрой регистрации (Email / Telegram + пароль). */
function AuthPanel({
  base,
  onAuthed,
}: {
  base: string;
  onAuthed: (user: ClientUser) => void;
}) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [password, setPassword] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { ok, data } = await postJson(base, "auth.php", {
      action: mode,
      name,
      email,
      telegram,
      password,
      birthday,
    });
    setBusy(false);
    if (ok && data.user) {
      onAuthed(data.user as ClientUser);
    } else {
      setError(String(data.error ?? "Не получилось. Попробуйте ещё раз."));
    }
  };

  return (
    <div className="portal-panel client-auth">
      <h2 className="portal-h2">
        {mode === "register" ? "Создать личный кабинет" : "Вход в кабинет"}
      </h2>
      <p className="portal-muted">
        {mode === "register"
          ? "Сохраняйте расчёты, близких людей и PDF-разборы — на любом устройстве."
          : "С возвращением! Ваши карты и разборы ждут вас."}
      </p>
      <div className="client-tabs">
        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
        >
          Регистрация
        </button>
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          У меня есть аккаунт
        </button>
      </div>
      <form className="portal-form" onSubmit={submit}>
        {mode === "register" ? (
          <label className="portal-field">
            <span>Как вас зовут</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Имя или ник"
              autoComplete="name"
            />
          </label>
        ) : null}
        <label className="portal-field">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@mail.ru"
            autoComplete="email"
          />
        </label>
        {mode === "register" ? (
          <label className="portal-field">
            <span>Telegram (необязательно)</span>
            <input
              value={telegram}
              onChange={(event) => setTelegram(event.target.value)}
              placeholder="@nickname"
              autoComplete="username"
            />
          </label>
        ) : null}
        <label className="portal-field">
          <span>Пароль (от 8 символов)</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
        </label>
        {mode === "register" ? (
          <label className="portal-field">
            <span>Дата рождения (необязательно)</span>
            <input
              type="date"
              value={birthday}
              onChange={(event) => setBirthday(event.target.value)}
            />
          </label>
        ) : null}
        {error ? <p className="client-error">{error}</p> : null}
        <button className="portal-button" type="submit" disabled={busy}>
          {busy ? "Секунду…" : mode === "register" ? "Создать кабинет" : "Войти"}
        </button>
      </form>
    </div>
  );
}

/** «Я и мои близкие»: данные рождения, онбординг, люди, сторис-карточка. */
function DataTab({
  base,
  user,
  onUpdate,
}: {
  base: string;
  user: ClientUser;
  onUpdate: (user: ClientUser) => void;
}) {
  const config = getConfig();
  const [name, setName] = useState(user.name);
  const [telegram, setTelegram] = useState(user.telegram);
  const [birthday, setBirthday] = useState(user.birthday);
  const [birthTime, setBirthTime] = useState(user.birthTime);
  const [place, setPlace] = useState(user.place);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setSaved("");
    const { ok, data } = await postJson(base, "profile.php", {
      action: "updateMe",
      name,
      telegram,
      birthday,
      birthTime,
      place,
    });
    setBusy(false);
    if (ok && data.user) onUpdate(data.user as ClientUser);
    if (ok) setSaved("Сохранено — расчёты подставят эти данные автоматически.");
    else setSaved("");
  };

  const share = async (world: "astro" | "matrix") => {
    const blob = await generateShareImage({
      name: user.name || "Друг",
      emblem: user.birthday ? user.birthday.slice(5).split("-").reverse().join(".") : "✦",
      subtitle:
        world === "astro"
          ? "Натальная карта — мои сильные стороны"
          : "Матрица судьбы — мои таланты",
      birthday: user.birthday,
      world,
      siteUrl: config.siteUrl || "https://cosmorox.ru",
    });
    downloadBlob(blob, `cosmorox-stories-${world}.png`);
  };

  return (
    <div className="grid gap-4">
      {user.onboarding ? null : <OnboardingCard base={base} onUpdate={onUpdate} />}
      <section className="portal-panel">
        <h2 className="portal-h2">Мои данные рождения</h2>
        <form className="portal-form client-fields" onSubmit={save}>
          <label className="portal-field">
            <span>Имя</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="portal-field">
            <span>Telegram</span>
            <input
              value={telegram}
              onChange={(event) => setTelegram(event.target.value)}
              placeholder="@nickname"
            />
          </label>
          <label className="portal-field">
            <span>Дата рождения</span>
            <input
              type="date"
              value={birthday}
              onChange={(event) => setBirthday(event.target.value)}
            />
          </label>
          <label className="portal-field">
            <span>Время рождения</span>
            <input
              type="time"
              value={birthTime}
              onChange={(event) => setBirthTime(event.target.value)}
            />
          </label>
          <label className="portal-field client-fields__wide">
            <span>Город рождения</span>
            <input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="Москва"
            />
          </label>
          <button className="portal-button" type="submit" disabled={busy}>
            {busy ? "Сохраняю…" : "Сохранить"}
          </button>
        </form>
        {saved ? <p className="client-note">{saved}</p> : null}
      </section>

      <PeopleSection base={base} />

      <section className="portal-panel">
        <h2 className="portal-h2">Карточка для Stories</h2>
        <p className="portal-muted">
          Эстетичная вертикальная картинка с вашей датой рождения и подписью
          сайта — поделитесь в сторис, чтобы друзья тоже увидели себя.
        </p>
        <div className="cabinet-links">
          <button type="button" className="portal-button" onClick={() => share("astro")}>
            Создать космос-версию ✨
          </button>
          <button
            type="button"
            className="portal-button portal-button--ghost"
            onClick={() => share("matrix")}
          >
            Создать ледяную версию ❄️
          </button>
        </div>
      </section>
    </div>
  );
}

/** Онбординг: что сейчас важнее всего — подсвечивает нужные разделы. */
function OnboardingCard({
  base,
  onUpdate,
}: {
  base: string;
  onUpdate: (user: ClientUser) => void;
}) {
  const [busy, setBusy] = useState(false);
  const pick = async (topic: string) => {
    setBusy(true);
    const { ok, data } = await postJson(base, "profile.php", {
      action: "onboarding",
      topic,
    });
    setBusy(false);
    if (ok && data.user) onUpdate(data.user as ClientUser);
  };

  return (
    <section className="portal-panel client-onboarding">
      <h2 className="portal-h2">Что для тебя сейчас важнее всего?</h2>
      <p className="portal-muted">
        Подскажи — и я сразу выделю разделы, которые ответят на твой вопрос.
      </p>
      <div className="client-topics">
        {TOPICS.map((topic) => (
          <button
            key={topic.key}
            type="button"
            disabled={busy}
            onClick={() => pick(topic.key)}
          >
            <strong>{topic.title}</strong>
            <small>{topic.note}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Люди: партнёр, подруга, ребёнок — карта близкого человека в один клик. */
function PeopleSection({ base }: { base: string }) {
  const [people, setPeople] = useState<ServerPerson[]>([]);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Партнёр");
  const [birthday, setBirthday] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getJson(base, "profile.php").then((data) => {
      setPeople(((data?.people as ServerPerson[] | undefined) ?? []));
    });
  }, [base]);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { ok, data } = await postJson(base, "profile.php", {
      action: "add",
      name,
      relation,
      birthday,
    });
    setBusy(false);
    if (ok && data.people) {
      setPeople(data.people as ServerPerson[]);
      setName("");
      setBirthday("");
    }
  };

  const remove = async (id: string) => {
    const { ok, data } = await postJson(base, "profile.php", {
      action: "delete",
      id,
    });
    if (ok && data.people) setPeople(data.people as ServerPerson[]);
  };

  return (
    <section className="portal-panel">
      <h2 className="portal-h2">Я и мои близкие</h2>
      <p className="portal-muted">
        Добавьте дату рождения партнёра или подруги — расчёты для них будут
        под рукой, без повторного ввода.
      </p>
      {people.length ? (
        <ul className="people-list">
          {people.map((person) => (
            <li key={person.id} className="person-row">
              <span>
                <strong>{person.name}</strong> · {person.relation}
                {person.birthday ? ` · ${formatDate(person.birthday)}` : ""}
              </span>
              <span className="person-actions">
                <a href="astrology.html">Расчёт →</a>
                <button
                  type="button"
                  className="text-action"
                  onClick={() => remove(person.id)}
                >
                  Убрать
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="portal-muted">Пока никого не добавлено.</p>
      )}
      <form className="portal-form client-fields" onSubmit={add}>
        <label className="portal-field">
          <span>Имя близкого</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Оля"
          />
        </label>
        <label className="portal-field">
          <span>Кто это</span>
          <select
            value={relation}
            onChange={(event) => setRelation(event.target.value)}
          >
            {["Партнёр", "Подруга", "Ребёнок", "Родитель", "Друг"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="portal-field">
          <span>Дата рождения</span>
          <input
            type="date"
            required
            value={birthday}
            onChange={(event) => setBirthday(event.target.value)}
          />
        </label>
        <button className="portal-button" type="submit" disabled={busy}>
          Добавить
        </button>
      </form>
    </section>
  );
}

/** Мои расчёты: сохранённые карты этого браузера + быстрые ссылки. */
function ReportsTab() {
  const store = useMemo(() => readPortalStore(), []);
  return (
    <div className="grid gap-4">
      <section className="portal-panel">
        <h2 className="portal-h2">Сохранённые расчёты</h2>
        {store.reports.length ? (
          <ul className="people-list">
            {store.reports.slice(0, 12).map((report) => (
              <li key={report.id} className="person-row">
                <span>
                  <strong>{report.title}</strong> ·{" "}
                  {report.kind === "astrology" ? "Астрология" : "Матрица"} ·{" "}
                  {formatDate(report.createdAt)}
                </span>
                <a href={report.href}>Открыть →</a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="portal-muted">
            Пока пусто. Сделайте расчёт — кнопка «Сохранить в кабинете»
            оставит его здесь.
          </p>
        )}
      </section>
      <div className="cabinet-links">
        <a className="portal-button" href="astrology.html">
          Рассчитать карту ✨
        </a>
        <a className="portal-button portal-button--ghost" href="matrix.html">
          Рассчитать матрицу ❄️
        </a>
      </div>
    </div>
  );
}

/** Подписка: оффер, PDF-гайды и запрос на активацию специалисту. */
function SubscribeTab({ base, user }: { base: string; user: ClientUser }) {
  const [tariffs, setTariffs] = useState<Tariffs | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTariffs().then(setTariffs);
  }, []);

  const activate = async () => {
    setBusy(true);
    setNote("");
    const checkout = await createSubscriptionCheckout(
      tariffs?.subscription ?? { title: "Полный доступ", price: 990, period: "месяц", note: "" },
    );
    await postJson(base, "booking.php", {
      theme: "Подписка — активация",
      comment: "Прошу открыть полный доступ по подписке",
      contact: user.telegram || user.email,
      name: user.name,
    });
    setBusy(false);
    if (checkout.status === "redirect") {
      window.location.href = checkout.confirmationUrl;
      return;
    }
    setNote(checkout.instructions);
  };

  if (user.subscribed) {
    return (
      <section className="portal-panel">
        <p className="client-note">
          Полный доступ открыт — все разделы и прогнозы на сайте уже без
          замочков. Новые PDF-гайды появятся на полке «Мои PDF».
        </p>
        <a className="portal-button" href="cabinet.html?tab=library">
          Перейти к моим PDF
        </a>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="portal-panel">
        <h2 className="portal-h2">
          {tariffs?.subscription.title ?? "Полный доступ"}
        </h2>
        <div className="client-offer">
          <span className="product-price">
            {tariffs ? `${tariffs.subscription.price} ₽` : "990 ₽"}
            <small> / {tariffs?.subscription.period ?? "месяц"}</small>
          </span>
          <span className="portal-muted">
            {tariffs?.subscription.note ??
              "Все скрытые разделы по астрологии, матрице и чакрам + ежедневные прогнозы."}
          </span>
        </div>
        <button
          type="button"
          className="portal-button client-subscribe-cta"
          onClick={activate}
          disabled={busy}
        >
          {busy ? "Отправляю…" : "Открыть полный доступ (Подписка)"}
        </button>
        {note ? <p className="client-note">{note}</p> : null}
      </section>

      <section className="portal-panel">
        <h2 className="portal-h2">Персональные PDF-гайды</h2>
        <div className="product-grid">
          {((tariffs?.pdfs ?? PDF_FALLBACKS) as Array<{
            id: string;
            title: string;
            description: string;
            price: number;
          }>).map((pdf) => (
            <ProductCard key={pdf.id} product={pdf} />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Полка «Мои PDF»: личные гайды от специалиста — скачивание в один клик. */
function LibraryTab({
  base,
  subscribed,
}: {
  base: string;
  subscribed: boolean;
}) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);

  useEffect(() => {
    getJson(base, "library.php").then((data) => {
      setItems(((data?.items as LibraryItem[] | undefined) ?? []));
    });
  }, [base]);

  if (items === null) return <p className="portal-muted">Загружаю полку…</p>;

  return (
    <section className="portal-panel">
      <h2 className="portal-h2">Мои PDF-разборы</h2>
      {items.length ? (
        <ul className="people-list">
          {items.map((item) => (
            <li key={item.id} className="person-row">
              <span>
                <strong>{item.title}</strong>
                {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ""}
              </span>
              <a className="portal-button portal-button--ghost" href={item.url} download>
                Скачать PDF
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="portal-muted">
          {subscribed
            ? "Полка пока пуста — специалист добавит ваши персональные разборы после консультации."
            : "Здесь появятся купленные PDF-гайды и личные разборы от специалиста."}
        </p>
      )}
    </section>
  );
}

/** Заявка на личную консультацию — уходит специалисту с контактом клиента. */
function ConsultTab({ base, user }: { base: string; user: ClientUser }) {
  const [tariffs, setTariffs] = useState<Tariffs | null>(null);
  const [theme, setTheme] = useState("");
  const [comment, setComment] = useState("");
  const [contact, setContact] = useState(user.telegram || user.email);
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTariffs().then((value) => {
      setTariffs(value);
      const themes = value?.consultation.themes?.length
        ? value.consultation.themes
        : ["Натальная карта", "Матрица судьбы", "Чакры и энергия", "Совместимость"];
      setTheme((current) => current || themes[0]);
    });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { ok, data } = await postJson(base, "booking.php", {
      theme,
      comment,
      contact,
      name: user.name,
    });
    setBusy(false);
    if (ok) {
      setRef(String(data.ref ?? ""));
    } else {
      setError(String(data.error ?? "Заявка не ушла. Попробуйте ещё раз."));
    }
  };

  if (ref) {
    return (
      <section className="portal-panel">
        <h2 className="portal-h2">Заявка принята</h2>
        <p className="client-note">
          Номер заявки <strong>{ref}</strong>. Специалист ответит вам в
          Telegram или на почту — обычно в течение дня.
        </p>
        <button type="button" className="portal-button" onClick={() => setRef("")}>
          Отправить ещё одну заявку
        </button>
      </section>
    );
  }

  return (
    <section className="portal-panel">
      <h2 className="portal-h2">Личная консультация</h2>
      <p className="portal-muted">
        Разбор вашей карты в живом разговоре: деньги, отношения, ресурс.
        {tariffs ? ` Стоимость — ${tariffs.consultation.price} ₽.` : ""}
      </p>
      <form className="portal-form" onSubmit={submit}>
        <label className="portal-field">
          <span>Тема</span>
          <select value={theme} onChange={(event) => setTheme(event.target.value)}>
            {(tariffs?.consultation.themes?.length
              ? tariffs.consultation.themes
              : ["Натальная карта", "Матрица судьбы", "Чакры и энергия", "Совместимость"]
            ).map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="portal-field">
          <span>О чём хотите поговорить</span>
          <textarea
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Например: не складывается с деньгами на новой работе"
          />
        </label>
        <label className="portal-field">
          <span>Контакт для ответа (Telegram или email)</span>
          <input
            required
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="@nickname"
          />
        </label>
        {error ? <p className="client-error">{error}</p> : null}
        <button className="portal-button" type="submit" disabled={busy}>
          {busy ? "Отправляю…" : "Оставить заявку"}
        </button>
      </form>
    </section>
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
