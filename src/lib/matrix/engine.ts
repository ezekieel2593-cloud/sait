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

/** Сложенная программа схемы: предназначение, линия рода, кармический хвост. */
export interface MatrixProgram {
  key: string;
  title: string;
  formula: string;
  arcanum: number;
  arcanumTitle: string;
  /** Из каких энергий сложилась программа. */
  parts: string;
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
  /** Предназначения: личное, социальное, духовное и линии, из которых они сложены. */
  programs: MatrixProgram[];
  /** Кармический хвост — три энергии нижней вертикали. */
  karmaTail: MatrixProgram[];
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

export const MATRIX_POINT_META: Record<
  string,
  { title: string; formula: string; sphere: string; role: string }
> = {
  // Личный (диагональный) квадрат: A слева, B сверху, C справа, D снизу, центр — E.
  A: { title: "Точка дня — как тебя видят", formula: "день рождения, редукция до 22", sphere: "характер и первое впечатление", role: "визитная карточка" },
  B: { title: "Точка месяца — талант от природы", formula: "месяц рождения (1–12)", sphere: "способности и вдохновение", role: "талант" },
  C: { title: "Точка года — задачи души до 40 лет", formula: "сумма цифр года, редукция до 22", sphere: "родовые программы и опыт", role: "задачи души" },
  D: { title: "Нижняя точка — главная проработка", formula: "A + B + C, редукция до 22", sphere: "кармическая задача", role: "задача" },
  center: { title: "Центр — зона комфорта", formula: "A + B + C + D, редукция до 22", sphere: "зона комфорта и суть", role: "ядро" },

  // Родовой (прямой) квадрат: F, G, H, I — углы по часовой стрелке.
  "family-top-left": { title: "Линия отца", formula: "A + B, редукция до 22", sphere: "программы отцовской линии", role: "род" },
  "family-top-right": { title: "Линия матери", formula: "B + C, редукция до 22", sphere: "программы материнской линии", role: "род" },
  "family-bottom-right": { title: "Реализация рода", formula: "C + D, редукция до 22", sphere: "реализация в социуме", role: "род" },
  "family-bottom-left": { title: "Унаследованные задачи", formula: "D + A, редукция до 22", sphere: "задачи из истории рода", role: "род" },

  // Центр рода: L2 — сумма углов, L1 — сумма родового и личного центров.
  "family-force": { title: "Родовой центр", formula: "F + G + H + I, редукция до 22", sphere: "ресурс семьи", role: "опора рода" },
  "family-core": { title: "Общий центр квадратов", formula: "центр + родовой центр, редукция до 22", sphere: "деньги и отношения", role: "ядро рода" },

  // Горизонталь: A → O → J → S → центр → L → Q → C.
  "love-entry": { title: "Готовность к отношениям", formula: "D + центр, редукция до 22", sphere: "отношения и знакомство", role: "близость" },
  "person-support": { title: "Карма отношений с внуками", formula: "A + центр, редукция до 22", sphere: "детско-родительская линия", role: "внуки" },
  "person-experience": { title: "Карма отношений с детьми", formula: "A + J, редукция до 22", sphere: "дети и родители", role: "дети" },
  "money-entry": { title: "Денежный канал", formula: "C + центр, редукция до 22", sphere: "деньги и ресурсы", role: "доход" },
  "money-middle": { title: "Источники заработка", formula: "C + денежный канал, редукция до 22", sphere: "источники дохода", role: "доход" },
  fears: { title: "Страхи", formula: "J + центр, редукция до 22", sphere: "что пугает и тормозит", role: "страхи" },

  // Вертикаль: B → P → K → T → центр → M → N → D.
  "talent-line": { title: "Личные таланты и способности", formula: "B + центр, редукция до 22", sphere: "способности", role: "талант" },
  "talent-second": { title: "Вторая энергия Аджны", formula: "B + талант, редукция до 22", sphere: "мышление и воля", role: "вторая аджна" },
  "love-middle": { title: "Средняя энергия кармического хвоста", formula: "D + готовность к отношениям, редукция до 22", sphere: "карма отношений", role: "хвост" },
  pleasures: { title: "Удовольствия", formula: "талант + центр, редукция до 22", sphere: "что радует и наполняет", role: "удовольствия" },

  // Диагонали родового квадрата: от каждого угла к центру две точки.
  "family-material-father": { title: "Материальные программы отца", formula: "F + талант отца, редукция до 22", sphere: "деньги отцовской линии", role: "род" },
  "family-talent-father": { title: "Талант по линии отца", formula: "F + родовой центр, редукция до 22", sphere: "способности отцовской линии", role: "талант рода" },
  "family-material-mother": { title: "Материальные программы матери", formula: "G + талант матери, редукция до 22", sphere: "деньги материнской линии", role: "род" },
  "family-talent-mother": { title: "Талант по линии матери", formula: "G + родовой центр, редукция до 22", sphere: "способности материнской линии", role: "талант рода" },
  "family-spirit-father": { title: "Духовные программы отца", formula: "H + хранитель баланса, редукция до 22", sphere: "духовные задачи отцовской линии", role: "род" },
  "family-balance": { title: "Хранитель баланса", formula: "H + родовой центр, редукция до 22", sphere: "равновесие в роду", role: "баланс" },
  "family-spirit-mother": { title: "Духовные программы матери", formula: "I + опора матери, редукция до 22", sphere: "духовные задачи материнской линии", role: "род" },
  "family-support": { title: "Опора материнской линии", formula: "I + родовой центр, редукция до 22", sphere: "опора рода", role: "опора" },

  // Нижний правый сектор: R на пересечении линий, рядом R1 и R2.
  shared: { title: "Проблемы в паре", formula: "M + L, редукция до 22", sphere: "отношения и деньги", role: "пересечение" },
  "love-partner": { title: "Характер отношений пары", formula: "R + M, редукция до 22", sphere: "устойчивость пары", role: "пара" },
  "money-profession": { title: "Профессия и сфера успеха", formula: "R + L, редукция до 22", sphere: "работа и признание", role: "профессия" },
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
  "family-force": { x: 50, y: 22 },
  "family-core": { x: 55, y: 50 },
  "money-entry": { x: 68, y: 50 },
  "money-middle": { x: 78, y: 50 },
  "money-profession": { x: 70, y: 66 },
  "love-entry": { x: 50, y: 68 },
  "love-middle": { x: 50, y: 78 },
  "love-partner": { x: 62, y: 62 },
  shared: { x: 60, y: 58 },
  "talent-line": { x: 50, y: 32 },
  "talent-second": { x: 50, y: 22 },
  "person-support": { x: 32, y: 50 },
  "person-experience": { x: 22, y: 50 },
  fears: { x: 42, y: 50 },
  pleasures: { x: 50, y: 40 },
  "family-material-father": { x: 36, y: 36 },
  "family-talent-father": { x: 42, y: 30 },
  "family-material-mother": { x: 64, y: 36 },
  "family-talent-mother": { x: 58, y: 30 },
  "family-spirit-father": { x: 64, y: 64 },
  "family-balance": { x: 58, y: 70 },
  "family-spirit-mother": { x: 36, y: 64 },
  "family-support": { x: 42, y: 70 },
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
    "Кармический хвост считается по нижней вертикали (M, N, D); школы, берущие другие точки, получат другие значения.",
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
    // Родовой квадрат: углы — суммы соседних углов личного квадрата.
    "family-top-left": reduce22(A + B),
    "family-top-right": reduce22(B + C),
    "family-bottom-right": reduce22(C + D),
    "family-bottom-left": reduce22(D + A),
    // Точки на осях: «угол + центр» и «угол + найденная точка».
    "money-entry": reduce22(C + center),
    "love-entry": reduce22(D + center),
    "talent-line": reduce22(B + center),
    "person-support": reduce22(A + center),
  };
  // Родовой центр L2 — сумма четырёх родовых углов; L1 — сумма двух центров.
  values["family-force"] = reduce22(
    values["family-top-left"]! +
      values["family-top-right"]! +
      values["family-bottom-right"]! +
      values["family-bottom-left"]!
  );
  values["family-core"] = reduce22(center + values["family-force"]!);
  values["money-middle"] = reduce22(C + values["money-entry"]!);
  values["love-middle"] = reduce22(D + values["love-entry"]!);
  values["talent-second"] = reduce22(B + values["talent-line"]!);
  values["person-experience"] = reduce22(A + values["person-support"]!);
  values["fears"] = reduce22(values["person-support"]! + center);
  values["pleasures"] = reduce22(values["talent-line"]! + center);
  // Диагонали родового квадрата: «угол + родовой центр» и «угол + найденная точка».
  const familyForce = values["family-force"]!;
  values["family-talent-father"] = reduce22(values["family-top-left"]! + familyForce);
  values["family-talent-mother"] = reduce22(values["family-top-right"]! + familyForce);
  values["family-balance"] = reduce22(values["family-bottom-right"]! + familyForce);
  values["family-support"] = reduce22(values["family-bottom-left"]! + familyForce);
  values["family-material-father"] = reduce22(values["family-top-left"]! + values["family-talent-father"]!);
  values["family-material-mother"] = reduce22(values["family-top-right"]! + values["family-talent-mother"]!);
  values["family-spirit-father"] = reduce22(values["family-bottom-right"]! + values["family-balance"]!);
  values["family-spirit-mother"] = reduce22(values["family-bottom-left"]! + values["family-support"]!);
  // Нижний правый сектор: пересечение линий денег и отношений.
  values["shared"] = reduce22(values["money-entry"]! + values["love-entry"]!);
  values["love-partner"] = reduce22(values["shared"]! + values["love-entry"]!);
  values["money-profession"] = reduce22(values["shared"]! + values["money-entry"]!);

  const points: MatrixPoint[] = Object.keys(MATRIX_POINT_META).map((key) => {
    const meta = MATRIX_POINT_META[key]!;
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

  // Предназначения складываются из диагоналей квадратов: земля (A+C) и небо (B+D).
  const program = (key: string, title: string, formula: string, arcanum: number, parts: string): MatrixProgram => ({
    key,
    title,
    formula,
    arcanum,
    arcanumTitle: energyLabel(arcanum),
    parts,
  });
  const earthLine = reduce22(A + C);
  const skyLine = reduce22(B + D);
  const fatherLine = reduce22(values["family-top-left"]! + values["family-bottom-right"]!);
  const motherLine = reduce22(values["family-top-right"]! + values["family-bottom-left"]!);
  const personal = reduce22(earthLine + skyLine);
  const social = reduce22(fatherLine + motherLine);
  const programs: MatrixProgram[] = [
    program("line-earth", "Линия земли", "A + C, редукция до 22", earthLine, `день ${A} + год ${C}`),
    program("line-sky", "Линия неба", "B + D, редукция до 22", skyLine, `месяц ${B} + низ ${D}`),
    program(
      "purpose-personal",
      "Личное предназначение",
      "линия земли + линия неба, редукция до 22",
      personal,
      `${earthLine} + ${skyLine}`
    ),
    program(
      "line-father",
      "Род отца",
      "F + H, редукция до 22",
      fatherLine,
      `${values["family-top-left"]} + ${values["family-bottom-right"]}`
    ),
    program(
      "line-mother",
      "Род матери",
      "G + I, редукция до 22",
      motherLine,
      `${values["family-top-right"]} + ${values["family-bottom-left"]}`
    ),
    program(
      "purpose-social",
      "Социальное предназначение",
      "род отца + род матери, редукция до 22",
      social,
      `${fatherLine} + ${motherLine}`
    ),
    program(
      "purpose-spiritual",
      "Духовное предназначение",
      "личное + социальное предназначение, редукция до 22",
      reduce22(personal + social),
      `${personal} + ${social}`
    ),
  ];
  const karmaTail: MatrixProgram[] = [
    program("tail-start", "Хвост: что мешает", "D + центр, редукция до 22", values["love-entry"]!, `${D} + ${center}`),
    program("tail-middle", "Хвост: следствие", "D + M, редукция до 22", values["love-middle"]!, `${D} + ${values["love-entry"]}`),
    program("tail-result", "Хвост: итог и задача", "A + B + C, редукция до 22", D, `${A} + ${B} + ${C}`),
  ];

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
      label: MATRIX_POINT_META[key]?.title ?? key,
    })),
    yearEnergy,
    lifeLine,
    programs,
    karmaTail,
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
