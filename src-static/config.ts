/**
 * Конфигурация статической (FTP) версии сайта.
 *
 * Все значения владелец меняет в файле `config.js` рядом с index.html —
 * без сборки и без правки кода. Ниже — значения по умолчанию.
 */

export interface StaticConfig {
  siteName: string;
  logoText: string;
  tagline: string;
  description: string;
  siteUrl: string;
  specialist: { name: string; title: string; bio: string; photoUrl: string; note: string };
  contacts: { telegram: string; max: string; email: string; phone: string; location: string };
  services: { priceNote: string; turnaround: string; fullReadingIncludes: string[]; fullReadingFormat: string[] };
  freeResult: { astrologyCardCount: number; matrixPointCount: number };
  methodology: { astrologyHouseSystem: "placidus" | "equal" | "whole"; astrologyHouseSystemLabel: string };
  legal: { privacyUpdatedAt: string; dataRetentionDays: number; responsiblePerson: string };
  faq: { question: string; answer: string }[];
  reviews: { author: string; text: string; context?: string }[];
}

export const DEFAULT_CONFIG: StaticConfig = {
  siteName: "Astra Pearl",
  logoText: "Astra Pearl",
  tagline: "Натальная карта и Матрица судьбы",
  description:
    "Астрологический разбор и Матрица судьбы по дате рождения: реальные расчёты, понятные расшифровки и персональная консультация специалиста.",
  siteUrl: "",
  specialist: {
    name: "Ваше имя",
    title: "Астролог и специалист по Матрице судьбы",
    bio: "Здесь будет ваш текст о себе: подход, образование, опыт и то, как проходит консультация. Отредактируйте файл config.js рядом с index.html.",
    photoUrl: "images/specialist-placeholder.svg",
    note: "Информация о специалисте заполняется владельцем проекта.",
  },
  contacts: { telegram: "", max: "", email: "", phone: "", location: "" },
  services: {
    priceNote: "",
    turnaround: "",
    fullReadingIncludes: [
      "Полная натальная карта или полная схема Матрицы с расшифровкой всех позиций",
      "Разбор характера, сильных сторон и зон роста",
      "Финансы, реализация, отношения и жизненные задачи",
      "Ответы на ваши вопросы в рамках выбранного направления",
      "Письменный разбор и одна онлайн-встреча",
    ],
    fullReadingFormat: [
      "Онлайн-встреча 60–90 минут или письменный разбор",
      "Срок подготовки — по договорённости со специалистом",
      "Стоимость и сроки специалист указывает в config.js",
    ],
  },
  freeResult: { astrologyCardCount: 4, matrixPointCount: 5 },
  methodology: { astrologyHouseSystem: "placidus", astrologyHouseSystemLabel: "Плацидус (Placidus)" },
  legal: { privacyUpdatedAt: "2026-01-01", dataRetentionDays: 365, responsiblePerson: "Владелец проекта" },
  faq: [
    {
      question: "Как рассчитывается натальная карта?",
      answer:
        "По дате, времени и месту рождения: положения планет считаются по эфемеридам (VSOP87/ELP2000), дома и асцендент — по выбранной системе домов с учётом исторического часового пояса. Версия алгоритма указана в результате.",
    },
    {
      question: "Как считается Матрица судьбы?",
      answer:
        "Арифметически, по методике 22 старших арканов: день, месяц, год и их суммы приводятся к диапазону 1–22. Никаких случайных чисел — одна дата всегда даёт один результат.",
    },
    {
      question: "Что если я не знаю время рождения?",
      answer:
        "Укажите «время неизвестно»: планеты и матрица считаются, а асцендент и дома не выдаются как достоверные — без точного времени они недостоверны.",
    },
    {
      question: "Что входит в бесплатный результат?",
      answer:
        "Ключевые разделы расшифровки: у натальной карты — Солнце, Луна, асцендент, стихия и аспекты, у Матрицы — центр, личный квадрат и входы в каналы. Полный разбор с остальными разделами готовит специалист.",
    },
  ],
  reviews: [],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function merge<T>(base: T, patch: unknown): T {
  if (!isObject(patch)) return base;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    const current = result[key];
    if (isObject(current) && isObject(value)) {
      result[key] = merge(current, value);
    } else if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  }
  return result as T;
}

/** Конфигурация с учётом config.js (если он подключён на странице). */
export function getConfig(): StaticConfig {
  const fromFile = (globalThis as unknown as { ASTRA_CONFIG?: unknown }).ASTRA_CONFIG;
  return merge(DEFAULT_CONFIG, fromFile);
}

/** Ссылка на диалог в Telegram с заранее заполненным текстом заявки. */
export function telegramLink(config: StaticConfig, text: string): string | null {
  const raw = config.contacts.telegram.trim();
  if (!raw) return null;
  const handle = raw
    .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
  if (!handle) return null;
  return `https://t.me/${handle}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(config: StaticConfig, text: string, subject: string): string | null {
  const email = config.contacts.email.trim();
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
