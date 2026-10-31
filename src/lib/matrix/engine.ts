/**
 * Расчётный движок Матрицы судьбы (версия matrix-22-v1).
 *
 * Методика: 22 старших аркана, порядок Марсельской традиции
 * (8 — Справедливость, 11 — Сила, 22 — Шут).
 *
 * Правило редукции — сложение цифр (digit sum), как в базовом описании школы
 * Наталии Ладини: любое число больше 22 сводится сложением цифр, пока не попадёт
 * в диапазон 1–22; число 22 сохраняется как есть.
 * ВАЖНО: часть школ вместо сложения цифр вычитает 22 (тогда день 23 даёт 1, а не 5).
 * Мы фиксируем один вариант и указываем его в результате и в документации.
 *
 * Формулы позиций (см. knowledge/positions):
 *   A = reduce(день)
 *   B = месяц
 *   C = reduce(сумма цифр года)
 *   D = reduce(A + B + C)
 *   центр = reduce(A + B + C + D)
 *   родовые углы = reduce(сумма двух соседних углов личного квадрата)
 *   сила рода = reduce(сумма родовых углов)
 *   вход в канал = reduce(угол + центр); середина = reduce(вход + центр)
 *   общая точка = reduce(вход денег + вход отношений)
 *   энергия года = reduce(день + месяц + сумма цифр текущего года)
 *
 * Ограничения методики описаны в limitations.
 */

export const MATRIX_METHODOLOGY = "Матрица судьбы по 22 старшим арканам (школа Ладини)";
export const MATRIX_VERSION = "matrix-22-v1";
export const REDUCTION_RULE = "digit-sum" as const;

export interface MatrixInput {
  date: string; // YYYY-MM-DD
  currentYear?: number;
}

export interface MatrixPoint {
  key: string;
  title: string;
  arcanum: number;
  arcanumTitle: string;
  formula: string;
  raw: number;
  sphere: string;
  role: string;
}

/** Точка «линии жизни»: возраст человека и энергия этого периода. */
export interface LifeLinePoint {
  /** Возраст в годах; шаг 2,5 года. */
  age: number;
  /** Какой это возраст: вершина квадрата, середина десятилетия или четверть. */
  kind: "vertex" | "middle" | "quarter";
  /** Ключ вершины, от которой считается отрезок. */
  corner: string;
  arcanum: number;
  formula: string;
}

export interface MatrixChart {
  meta: {
    methodology: string;
    version: string;
    reduction: "digit-sum";
    reductionLabel: string;
    arcanumOrder: string;
    computedAt: string;
  };
  birth: { date: string; day: number; month: number; year: number };
  points: MatrixPoint[];
  byKey: Record<string, MatrixPoint>;
  layout: { key: string; x: number; y: number; label: string }[];
  yearEnergy: MatrixPoint & { year: number };
  /** Линия жизни: от 0 до 80 лет по 2,5 года, считается по углам квадратов. */
  lifeLine: LifeLinePoint[];
  /** Порядок углов по часовой стрелке — от него зависит линия жизни. */
  lifeOrder: string[];
  summary: {
    center: string;
    personality: string;
    talent: string;
    karma: string;
    moneyArcanum: string;
    loveArcanum: string;
  };
  warnings: string[];
  limitations: string[];
}

const ARCANA_NAMES: Record<number, string> = {
  1: "Маг",
  2: "Жрица",
  3: "Императрица",
  4: "Император",
  5: "Иерофант",
  6: "Влюблённые",
  7: "Колесница",
  8: "Справедливость",
  9: "Отшельник",
  10: "Колесо Фортуны",
  11: "Сила",
  12: "Повешенный",
  13: "Смерть",
  14: "Умеренность",
  15: "Дьявол",
  16: "Башня",
  17: "Звезда",
  18: "Луна",
  19: "Солнце",
  20: "Суд",
  21: "Мир",
  22: "Шут",
};

/**
 * Название аркана из таро-традиции — служебное: в интерфейсе Матрицы
 * используются не названия карт, а «7-я энергия» (см. energyLabel).
 */
export function arcanumName(value: number): string {
  return ARCANA_NAMES[value] ?? `Энергия ${value}`;
}

/** Как энергия называется на сайте: «7-я энергия», «21-я энергия». */
export function energyLabel(value: number): string {
  return `${value}-я энергия`;
}

function digitSum(value: number): number {
  return String(Math.abs(value))
    .split("")
    .reduce((sum, digit) => sum + Number(digit), 0);
}

/** Редукция до диапазона 1–22 сложением цифр. 22 сохраняется. */
export function reduce22(value: number): number {
  let current = Math.abs(Math.trunc(value));
  if (current === 0) return 22; // 0 трактуется как Шут
  while (current > 22) {
    current = digitSum(current);
  }
  return current;
}

const POINT_META: Record<
  string,
  { title: string; formula: string; sphere: string; role: string }
> = {
  A: { title: "Точка дня — личность", formula: "день рождения, редукция до 22", sphere: "личность и способ действовать", role: "характер" },
  B: { title: "Точка месяца — талант", formula: "месяц рождения (1–12)", sphere: "способности и вдохновение", role: "талант" },
  C: { title: "Точка года — родовые программы", formula: "сумма цифр года, редукция до 22", sphere: "родовые программы и опыт", role: "наследие" },
  D: { title: "Нижняя точка — кармическая задача", formula: "A + B + C, редукция до 22", sphere: "кармическая задача", role: "задача" },
  center: { title: "Центр — зона комфорта", formula: "A + B + C + D, редукция до 22", sphere: "зона комфорта и суть", role: "ядро" },
  "family-top-left": { title: "Родовой угол I", formula: "A + B, редукция до 22", sphere: "линия отца", role: "род" },
  "family-top-right": { title: "Родовой угол II", formula: "B + C, редукция до 22", sphere: "линия матери", role: "род" },
  "family-bottom-right": { title: "Родовой угол III", formula: "C + D, редукция до 22", sphere: "реализация рода", role: "род" },
  "family-bottom-left": { title: "Родовой угол IV", formula: "D + A, редукция до 22", sphere: "унаследованные задачи", role: "род" },
  "family-force": { title: "Сила рода", formula: "сумма четырёх родовых углов, редукция до 22", sphere: "ресурс семьи", role: "опора" },
  "money-entry": { title: "Вход в денежный канал", formula: "C + центр, редукция до 22", sphere: "деньги и ресурсы", role: "доход" },
  "money-middle": { title: "Середина денежного канала", formula: "вход в канал + общая точка, редукция до 22", sphere: "удержание ресурса", role: "доход" },
  "love-entry": { title: "Вход в канал отношений", formula: "D + центр, редукция до 22", sphere: "отношения", role: "близость" },
  "love-middle": { title: "Середина канала отношений", formula: "вход в канал + общая точка, редукция до 22", sphere: "устойчивость отношений", role: "близость" },
  shared: { title: "Общая точка каналов", formula: "вход денег + вход отношений, редукция до 22", sphere: "деньги и отношения", role: "пересечение" },
  "talent-line": { title: "Личные таланты", formula: "B + центр, редукция до 22", sphere: "способности", role: "талант" },
  "talent-second": { title: "Развитие таланта", formula: "B + точка таланта, редукция до 22", sphere: "способности", role: "талант" },
  "person-support": { title: "Личная опора", formula: "A + центр, редукция до 22", sphere: "опора и характер", role: "опора" },
  "person-experience": { title: "Опыт личности", formula: "A + точка опоры, редукция до 22", sphere: "жизненный опыт", role: "опыт" },
};

/** Координаты для отрисовки схемы (0..100, 0 — верх). */
const LAYOUT_COORDS: Record<string, { x: number; y: number }> = {
  A: { x: 12, y: 50 },
  B: { x: 50, y: 12 },
  C: { x: 88, y: 50 },
  D: { x: 50, y: 88 },
  center: { x: 50, y: 50 },
  "family-top-left": { x: 30, y: 30 },
  "family-top-right": { x: 70, y: 30 },
  "family-bottom-right": { x: 70, y: 70 },
  "family-bottom-left": { x: 30, y: 70 },
  "family-force": { x: 50, y: 26 },
  "money-entry": { x: 74, y: 50 },
  "money-middle": { x: 62, y: 50 },
  "love-entry": { x: 50, y: 74 },
  "love-middle": { x: 50, y: 62 },
  shared: { x: 40, y: 38 },
  "talent-line": { x: 50, y: 38 },
  "talent-second": { x: 50, y: 28 },
  "person-support": { x: 38, y: 50 },
  "person-experience": { x: 28, y: 50 },
};

export function computeMatrix(input: MatrixInput): MatrixChart {
  const [yearStr, monthStr, dayStr] = input.date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) throw new Error("Некорректная дата рождения");
  if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error("Некорректная дата рождения");

  const warnings: string[] = [];
  const limitations: string[] = [
    "Методика использует только дату рождения и не учитывает время и место — это её принципиальное ограничение.",
    "Редукция выполняется сложением цифр. Школы, вычитающие 22, получат другие значения для дней 23–31.",
    "Трактовки арканов — символические. Это инструмент саморефлексии, а не предсказание событий.",
    "Позиции «кармический хвост» и «чакры» в этой версии методики не рассчитываются: их формулы в источниках описаны неоднозначно.",
  ];

  const A = reduce22(day);
  const B = reduce22(month);
  const C = reduce22(digitSum(year));
  const D = reduce22(A + B + C);
  const center = reduce22(A + B + C + D);

  const values: Record<string, number> = {
    A,
    B,
    C,
    D,
    center,
    "family-top-left": reduce22(A + B),
    "family-top-right": reduce22(B + C),
    "family-bottom-right": reduce22(C + D),
    "family-bottom-left": reduce22(D + A),
    "money-entry": reduce22(C + center),
    "love-entry": reduce22(D + center),
  };
  values["family-force"] = reduce22(
    values["family-top-left"]! +
      values["family-top-right"]! +
      values["family-bottom-right"]! +
      values["family-bottom-left"]!
  );
  // Середина канала = вход в канал + общая точка каналов (см. описание формулы в источнике).
  values["shared"] = reduce22(values["money-entry"]! + values["love-entry"]!);
  values["money-middle"] = reduce22(values["money-entry"]! + values["shared"]!);
  values["love-middle"] = reduce22(values["love-entry"]! + values["shared"]!);
  // Второе кольцо точек: «угол + центр» и «угол + найденная точка» (правило соседних точек).
  values["talent-line"] = reduce22(B + center);
  values["talent-second"] = reduce22(B + values["talent-line"]!);
  values["person-support"] = reduce22(A + center);
  values["person-experience"] = reduce22(A + values["person-support"]!);

  const points: MatrixPoint[] = Object.keys(POINT_META).map((key) => {
    const meta = POINT_META[key]!;
    const value = values[key]!;
    return {
      key,
      title: meta.title,
      arcanum: value,
      arcanumTitle: energyLabel(value),
      formula: meta.formula,
      raw: value,
      sphere: meta.sphere,
      role: meta.role,
    };
  });

  const byKey = points.reduce<Record<string, MatrixPoint>>((acc, point) => {
    acc[point.key] = point;
    return acc;
  }, {});

  const currentYear = input.currentYear ?? new Date().getFullYear();
  const yearValue = reduce22(day + reduce22(month) + reduce22(digitSum(currentYear)));
  const yearEnergy = {
    key: "year",
    title: `Энергия ${currentYear} года`,
    arcanum: yearValue,
    arcanumTitle: energyLabel(yearValue),
    formula: "день + месяц + сумма цифр текущего года, редукция до 22",
    raw: yearValue,
    sphere: "актуальный период",
    role: "год",
    year: currentYear,
  };

  // Линия жизни: углы квадратов идут по кругу шагом 10 лет (A — 0, F — 10, B — 20 …),
  // середина десятилетия — сумма соседних углов, точки 2,5 и 7,5 года — сумма угла и середины.
  const lifeOrder = ["A", "family-top-left", "B", "family-top-right", "C", "family-bottom-right", "D", "family-bottom-left"];
  const lifeLine: LifeLinePoint[] = [];
  lifeOrder.forEach((key, index) => {
    const next = lifeOrder[(index + 1) % lifeOrder.length]!;
    const corner = values[key]!;
    const following = values[next]!;
    const middle = reduce22(corner + following);
    const base = index * 10;
    lifeLine.push({ age: base, kind: "vertex", corner: key, arcanum: corner, formula: "угол квадрата" });
    lifeLine.push({ age: base + 2.5, kind: "quarter", corner: key, arcanum: reduce22(corner + middle), formula: `${key} + середина 5 лет` });
    lifeLine.push({ age: base + 5, kind: "middle", corner: key, arcanum: middle, formula: `${key} + ${next}` });
    lifeLine.push({ age: base + 7.5, kind: "quarter", corner: key, arcanum: reduce22(middle + following), formula: `середина + ${next}` });
  });

  if (values["money-entry"] === center && values["love-entry"] === center) {
    warnings.push("Несколько каналов совпали с центральной энергией — трактовка требует внимания специалиста.");
  }

  return {
    meta: {
      methodology: MATRIX_METHODOLOGY,
      version: MATRIX_VERSION,
      reduction: REDUCTION_RULE,
      reductionLabel: "Сложение цифр с редукцией до 22",
      arcanumOrder: "Марсельская традиция (8 — Справедливость, 11 — Сила)",
      computedAt: new Date().toISOString(),
    },
    birth: { date: input.date, day, month, year },
    points,
    byKey,
    layout: Object.entries(LAYOUT_COORDS).map(([key, coords]) => ({
      key,
      x: coords.x,
      y: coords.y,
      label: POINT_META[key]?.title ?? key,
    })),
    yearEnergy,
    lifeLine,
    lifeOrder,
    summary: {
      center: `${center} · ${energyLabel(center)}`,
      personality: `${A} · ${energyLabel(A)}`,
      talent: `${B} · ${energyLabel(B)}`,
      karma: `${D} · ${energyLabel(D)}`,
      moneyArcanum: `${values["money-entry"]} · ${energyLabel(values["money-entry"]!)}`,
      loveArcanum: `${values["love-entry"]} · ${energyLabel(values["love-entry"]!)}`,
    },
    warnings,
    limitations,
  };
}
