/**
 * Реестр источников базы знаний.
 *
 * ВАЖНО: сюда попадают только те источники, которые действительно использовались.
 * Для астрономических величин — документация расчётной библиотеки и база часовых поясов.
 * Для эзотерических трактовок — публичные описания методик (арифметика) и собственная
 * редакционная переработка. Тексты в базе — оригинальные формулировки проекта,
 * защищённые авторские тексты не копируются.
 */

export interface KnowledgeSource {
  id: string;
  title: string;
  url: string | null;
  publisher: string;
  accessedAt: string;
  note: string;
}

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: "src-astronomy-engine",
    title: "astronomy-engine — документация и исходный код (MIT)",
    url: "https://github.com/cosinekitty/astronomy",
    publisher: "Cosine Kitty",
    accessedAt: "2026-10-28",
    note: "Эфемериды VSOP87/ELP2000, функции эклиптических координат, сидерического времени и горизонтальных координат. Используется для всех астрономических величин.",
  },
  {
    id: "src-iana-tz",
    title: "IANA Time Zone Database",
    url: "https://www.iana.org/time-zones",
    publisher: "IANA",
    accessedAt: "2026-10-28",
    note: "Исторические смещения и правила перехода на летнее время. В рантайме доступны через ICU (Intl.DateTimeFormat).",
  },
  {
    id: "src-mind-university",
    title: "Матрица судьбы: как читать схему по шагам",
    url: "https://ru.mind.university/matritsa-sudby/kak-chitat-matritsu",
    publisher: "Mind University",
    accessedAt: "2026-10-28",
    note: "Публичное описание арифметики метода на 22 арканах: точки A/B/C/D, центр, родовой квадрат, линии и каналы. Использовано для проверки формул расчёта.",
  },
  {
    id: "src-sutra-center",
    title: "Матрица Судьбы: описание системы Наталии Ладини",
    url: "https://sutra.center/matrix-sudby",
    publisher: "Sutra Center",
    accessedAt: "2026-10-28",
    note: "Обзор школы: 22 старших аркана, редукция чисел, состав схемы (9 ключевых точек). Вторичный источник.",
  },
  {
    id: "src-method-matrix-22",
    title: "Матрица судьбы по 22 арканам — описание формулы и примера расчёта",
    url: "https://pixeltool.pro/blog/kak-rasschitat-matritsu-sudby",
    publisher: "PixelTool",
    accessedAt: "2026-10-28",
    note: "Пошаговый пример сведения чисел (17.03.1994) для проверки редукции. Вторичный источник.",
  },
  {
    id: "src-astro-tradition",
    title: "Внутренняя редакция проекта: астрологические значения",
    url: null,
    publisher: "Astra Pearl",
    accessedAt: "2026-10-28",
    note: "Оригинальные формулировки значений планет, знаков, домов и аспектов, написанные редакцией проекта на основе общепринятой астрологической традиции. Тексты не скопированы из внешних источников.",
  },
  {
    id: "src-matrix-editorial",
    title: "Внутренняя редакция проекта: значения 22 арканов",
    url: null,
    publisher: "Astra Pearl",
    accessedAt: "2026-10-28",
    note: "Оригинальные формулировки значений арканов в контексте Матрицы судьбы. Проверялись на соответствие общепринятому порядку старших арканов Таро (Марсельская традиция: 8 — Справедливость, 11 — Сила).",
  },
];

export function sourceById(id: string): KnowledgeSource | undefined {
  return KNOWLEDGE_SOURCES.find((item) => item.id === id);
}
