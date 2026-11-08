import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { MatrixChart } from "@/lib/matrix/engine";

/**
 * Полная схема Матрицы судьбы — как в классических разборах по 22 арканам.
 *
 * На схеме все узлы методики:
 * - личный (диагональный) квадрат A–B–C–D и центр E;
 * - родовой (прямой) квадрат F–G–H–I и родовой центр L2 с общей точкой L1;
 * - горизонталь «линия земли»: A → O → J → S → E → L → Q → C;
 * - вертикаль «линия неба»: B → P → K → T → E → M → N → D;
 * - диагонали рода: F → F1 → F2, G → G1 → G2, H → H1 → H2, I → I1 → I2;
 * - нижний правый сектор: R, R1, R2 на линиях денег и отношений;
 * - по кругу — линия жизни с возрастом и энергией каждого периода.
 *
 * У восьми углов стоят подписи-выноски с пояснением простыми словами, у
 * внутренних точек — короткие подписи прямо на схеме. Названий карт таро нет:
 * только номер и слово «энергия».
 */

export const MATRIX_DIAGRAM_WIDTH = 1800;
export const MATRIX_DIAGRAM_HEIGHT = 1560;

const SIZE = MATRIX_DIAGRAM_WIDTH;
const HEIGHT = MATRIX_DIAGRAM_HEIGHT;
const CX = 900;
const CY = 760;
/** Радиус, на котором стоят восемь углов двух квадратов. */
const R = 380;

type NodeShape = {
  key: string;
  /** Угол от «верх» по часовой стрелке. */
  angle: number;
  radius: number;
  r: number;
  kind: "corner" | "family" | "axis" | "core" | "sec";
  /** Номер в легенде — у внутренних точек. */
  badge?: number;
};

const NODES: NodeShape[] = [
  // Личный квадрат и родовой квадрат: восемь углов октаграммы.
  { key: "B", angle: 0, radius: R, r: 50, kind: "corner" },
  { key: "family-top-right", angle: 45, radius: R, r: 42, kind: "family" },
  { key: "C", angle: 90, radius: R, r: 50, kind: "corner" },
  { key: "family-bottom-right", angle: 135, radius: R, r: 42, kind: "family" },
  { key: "D", angle: 180, radius: R, r: 50, kind: "corner" },
  { key: "family-bottom-left", angle: 225, radius: R, r: 42, kind: "family" },
  { key: "A", angle: 270, radius: R, r: 50, kind: "corner" },
  { key: "family-top-left", angle: 315, radius: R, r: 42, kind: "family" },

  // Горизонталь «линия земли»: слева страхи, дети и внуки, справа деньги.
  { key: "fears", angle: 270, radius: 110, r: 28, kind: "axis", badge: 6 },
  { key: "person-support", angle: 270, radius: 195, r: 30, kind: "axis", badge: 4 },
  { key: "person-experience", angle: 270, radius: 280, r: 30, kind: "axis", badge: 5 },
  { key: "money-entry", angle: 90, radius: 195, r: 30, kind: "axis", badge: 7 },
  { key: "money-middle", angle: 90, radius: 280, r: 30, kind: "axis", badge: 8 },

  // Вертикаль «линия неба»: сверху таланты, снизу отношения и кармический хвост.
  { key: "pleasures", angle: 0, radius: 110, r: 28, kind: "axis", badge: 3 },
  { key: "talent-line", angle: 0, radius: 195, r: 30, kind: "axis", badge: 1 },
  { key: "talent-second", angle: 0, radius: 280, r: 30, kind: "axis", badge: 2 },
  { key: "love-entry", angle: 180, radius: 145, r: 30, kind: "axis", badge: 10 },
  { key: "love-middle", angle: 180, radius: 245, r: 30, kind: "axis", badge: 11 },

  // Центр рода: родовой центр и общая точка двух центров.
  { key: "family-force", angle: 62, radius: 150, r: 27, kind: "core", badge: 14 },
  { key: "family-core", angle: 118, radius: 150, r: 27, kind: "core", badge: 15 },

  // Диагонали родового квадрата: от угла к центру две точки.
  { key: "family-talent-father", angle: 315, radius: 225, r: 28, kind: "family", badge: 16 },
  { key: "family-material-father", angle: 315, radius: 305, r: 28, kind: "family", badge: 17 },
  { key: "family-talent-mother", angle: 45, radius: 225, r: 28, kind: "family", badge: 18 },
  { key: "family-material-mother", angle: 45, radius: 305, r: 28, kind: "family", badge: 19 },
  { key: "family-balance", angle: 135, radius: 305, r: 28, kind: "family", badge: 20 },
  { key: "family-spirit-father", angle: 135, radius: 225, r: 28, kind: "family", badge: 21 },
  { key: "family-support", angle: 225, radius: 305, r: 28, kind: "family", badge: 22 },
  { key: "family-spirit-mother", angle: 225, radius: 225, r: 28, kind: "family", badge: 23 },

  // Нижний правый сектор: пересечение линий и точки рядом с ним.
  { key: "shared", angle: 135, radius: 175, r: 28, kind: "sec", badge: 13 },
  { key: "love-partner", angle: 152, radius: 300, r: 27, kind: "sec", badge: 12 },
  { key: "money-profession", angle: 124, radius: 296, r: 27, kind: "sec", badge: 9 },
];

/** Легенда внутренних точек: номер → короткое пояснение. */
const INNER_LEGEND: [number, string][] = [
  [1, "личные таланты"],
  [2, "как ты думаешь"],
  [3, "удовольствия"],
  [4, "отношения с внуками"],
  [5, "отношения с детьми"],
  [6, "страхи"],
  [7, "деньги: как приходят"],
  [8, "источники дохода"],
  [9, "профессия"],
  [10, "готовность к отношениям"],
  [11, "кармический хвост"],
  [12, "характер пары"],
  [13, "проблемы в паре"],
  [14, "родовой центр"],
  [15, "род + ты"],
  [16, "талант отца"],
  [17, "деньги отца"],
  [18, "талант матери"],
  [19, "деньги матери"],
  [20, "баланс рода"],
  [21, "духовное отца"],
  [22, "опора матери"],
  [23, "духовное матери"],
];

/**
 * Классическая палитра схемы: насыщенные круги с белыми цифрами, как в
 * калькуляторах матрицы. У каждой роли свой цвет, внутри точки — белое число.
 */
type Paint = { fill: string; ring: string };
const COLORS: Record<string, Paint> = {
  A: { fill: "#7b4bc9", ring: "#6438ac" },
  B: { fill: "#2f6fe0", ring: "#2458b8" },
  C: { fill: "#e0453e", ring: "#bd322c" },
  D: { fill: "#ef8f2b", ring: "#cf7618" },
  center: { fill: "#e0453e", ring: "#bd322c" },
  "family-top-left": { fill: "#1f9d94", ring: "#148078" },
  "family-top-right": { fill: "#2f6fe0", ring: "#2458b8" },
  "family-bottom-right": { fill: "#2fa46a", ring: "#218353" },
  "family-bottom-left": { fill: "#ef8f2b", ring: "#cf7618" },
  "family-force": { fill: "#7b4bc9", ring: "#6438ac" },
  "family-core": { fill: "#d94a8f", ring: "#b63674" },
  "family-talent-father": { fill: "#2f6fe0", ring: "#2458b8" },
  "family-material-father": { fill: "#4a8fe8", ring: "#2f6fc0" },
  "family-talent-mother": { fill: "#1f9d94", ring: "#148078" },
  "family-material-mother": { fill: "#38b0a8", ring: "#22948c" },
  "family-balance": { fill: "#2fa46a", ring: "#218353" },
  "family-spirit-father": { fill: "#3fb87a", ring: "#2c9660" },
  "family-support": { fill: "#d94a8f", ring: "#b63674" },
  "family-spirit-mother": { fill: "#e2649f", ring: "#c4457f" },
  "money-entry": { fill: "#2fa46a", ring: "#218353" },
  "money-middle": { fill: "#3fb87a", ring: "#2c9660" },
  "money-profession": { fill: "#22a37f", ring: "#178362" },
  "love-entry": { fill: "#e0453e", ring: "#bd322c" },
  "love-middle": { fill: "#ef8f2b", ring: "#cf7618" },
  "love-partner": { fill: "#d94a8f", ring: "#b63674" },
  shared: { fill: "#7b4bc9", ring: "#6438ac" },
  "talent-line": { fill: "#2f6fe0", ring: "#2458b8" },
  "talent-second": { fill: "#4a8fe8", ring: "#2f6fc0" },
  pleasures: { fill: "#ef8f2b", ring: "#cf7618" },
  "person-support": { fill: "#1f9d94", ring: "#148078" },
  "person-experience": { fill: "#38b0a8", ring: "#22948c" },
  fears: { fill: "#7b4bc9", ring: "#6438ac" },
  year: { fill: "#ef8f2b", ring: "#cf7618" },
};

type Rect = { x: number; y: number; w: number; h: number };

/** Подпись-выноска у схемы. */
type Callout = { key: string; lines: string[]; align: "left" | "right" | "center"; x: number; y: number };

const CALLOUTS: Callout[] = [
  { key: "B", lines: ["Таланты от природы", "что даётся легче всего"], align: "center", x: CX, y: 262 },
  { key: "D", lines: ["Кармическая задача", "что предстоит освоить"], align: "center", x: CX, y: 1292 },
  { key: "family-top-left", lines: ["Линия отца", "ресурсы и опора рода"], align: "right", x: 372, y: 430 },
  { key: "A", lines: ["Внутренний портрет", "как тебя видят другие"], align: "right", x: 372, y: 760 },
  { key: "family-bottom-left", lines: ["Унаследованные задачи", "что идёт из истории рода"], align: "right", x: 372, y: 1090 },
  { key: "family-top-right", lines: ["Линия матери", "ресурсы и опора рода"], align: "left", x: 1428, y: 430 },
  { key: "C", lines: ["Родовые программы", "опыт и установки семьи"], align: "left", x: 1428, y: 760 },
  { key: "family-bottom-right", lines: ["Реализация рода", "роль в социуме"], align: "left", x: 1428, y: 1090 },
];

const CALLOUT_TITLE = 19;
const CALLOUT_SUB = 16;
const CALLOUT_LINE = 24;
const CALLOUT_PAD_X = 18;
const CALLOUT_PAD_Y = 12;

/** Ширина строки без измерений DOM: средняя буква чуть шире половины кегля. */
function textWidth(text: string, size: number) {
  return text.length * size * 0.54;
}

function calloutBox(callout: Callout): Rect {
  const widest = Math.max(
    ...callout.lines.map((line, index) => textWidth(line, index === 0 ? CALLOUT_TITLE : CALLOUT_SUB))
  );
  const w = Math.max(210, Math.round(widest) + CALLOUT_PAD_X * 2);
  const h = callout.lines.length * CALLOUT_LINE + CALLOUT_PAD_Y * 2;
  const x = callout.align === "center" ? callout.x - w / 2 : callout.align === "right" ? callout.x - w : callout.x;
  return { x, y: callout.y - h / 2, w, h };
}

/** Точка на границе блока, ближайшая к цели: оттуда выходит линия-выноска. */
function exitPoint(rect: Rect, target: { x: number; y: number }) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scaleX = dx === 0 ? Infinity : rect.w / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Infinity : rect.h / 2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

const RAD = Math.PI / 180;

function polar(angle: number, radius: number) {
  return {
    x: CX + Math.sin(angle * RAD) * radius,
    y: CY - Math.cos(angle * RAD) * radius,
  };
}

/** Углы восьмиугольника по часовой стрелке — в том же порядке, что линия жизни. */
const VERTEX_ANGLES = [270, 315, 0, 45, 90, 135, 180, 225];

export const MATRIX_DIAGRAM_KEYS = [...NODES.map((node) => node.key), "center", "year"];

/** Возраст для подписи: 0, 2,5, 5 … 75 лет. */
function ageLabel(age: number): string {
  if (age === 0) return "0 лет";
  if (Number.isInteger(age)) return `${age} лет`;
  return `${String(age).replace(".", ",")} лет`;
}

const SANS = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF = "'Cormorant Garamond', Georgia, serif";

export function MatrixDiagram({
  chart,
  compact = false,
  highlight,
  idPrefix = "mx2",
  selected = null,
  onSelect,
  selectedAge = null,
  onSelectAge,
}: {
  chart: MatrixChart;
  compact?: boolean;
  /** Ключи точек для подсветки; пусто — показываем все одинаково. */
  highlight?: string[] | null;
  /** Уникальный префикс id — если на странице две схемы. */
  idPrefix?: string;
  /** Выбранная пользователем точка: обводим заметнее. */
  selected?: string | null;
  /** Клик по точке схемы. */
  onSelect?: (key: string) => void;
  /** Выбранный возраст на линии жизни. */
  selectedAge?: number | null;
  onSelectAge?: (age: number) => void;
}) {
  const active = highlight && highlight.length > 0 ? new Set(highlight) : null;

  /** Общие атрибуты кликабельной группы — и для мыши, и для клавиатуры. */
  const interactive = (key: string, label: string) =>
    onSelect
      ? {
          role: "button" as const,
          tabIndex: 0,
          "aria-label": label,
          "aria-pressed": selected === key,
          style: { cursor: "pointer" as const },
          onClick: () => onSelect(key),
          onKeyDown: (event: ReactKeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(key);
            }
          },
        }
      : {};
  const dim = (key: string) => (active && !active.has(key) ? 0.32 : 1);

  const point = (key: string) => (key === "year" ? chart.yearEnergy : chart.byKey[key] ?? null);

  const vertex = (index: number) => polar(VERTEX_ANGLES[index]!, R);

  /** Точка на отрезке между двумя углами: t = 0 у первого угла, 1 у второго. */
  const edgePoint = (index: number, t: number) => {
    const from = vertex(index);
    const to = vertex((index + 1) % 8);
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  };

  /** Нормаль к ребру восьмиугольника, направленная наружу. */
  const edgeNormal = (index: number) => {
    const from = vertex(index);
    const to = vertex((index + 1) % 8);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    let nx = dy / length;
    let ny = -dx / length;
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    if ((mid.x - CX) * nx + (mid.y - CY) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    return { x: nx, y: ny };
  };

  const line = (a: { x: number; y: number }, b: { x: number; y: number }, stroke: string, width = 1, dash?: string) => (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={stroke}
      strokeWidth={width}
      strokeDasharray={dash}
      strokeLinecap="round"
    />
  );

  const nodeCenter = (key: string) => {
    const node = NODES.find((item) => item.key === key);
    return node ? polar(node.angle, node.radius) : { x: CX, y: CY };
  };

  /* ----------------------------- выноски ----------------------------- */

  const calloutEls = compact
    ? null
    : CALLOUTS.map((callout) => {
        const box = calloutBox(callout);
        const target = nodeCenter(callout.key);
        const from = exitPoint(box, target);
        const value = point(callout.key);
        if (!value) return null;
        const lastLineY = box.y + box.h - CALLOUT_PAD_Y - 7;
        const firstLineY = box.y + CALLOUT_PAD_Y + 14;
        return (
          <g
            key={`callout-${callout.key}`}
            opacity={dim(callout.key)}
            {...interactive(callout.key, `${value.title}: ${value.arcanumTitle}`)}
          >
            <line
              x1={from.x}
              y1={from.y}
              x2={target.x}
              y2={target.y}
              stroke="#4b5563"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
            <circle cx={target.x} cy={target.y} r="3" fill="#1f1f1f" />
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx="4"
              fill="#ffffff"
              stroke={selected === callout.key ? "#1f6feb" : "#d0d5dd"}
              strokeWidth={selected === callout.key ? 2 : 1.2}
            />
            <text
              x={box.x + box.w / 2}
              y={firstLineY}
              textAnchor="middle"
              fontFamily={SANS}
              fontSize={CALLOUT_TITLE}
              fontWeight="600"
              fill="#1f2328"
            >
              {callout.lines[0]}
            </text>
            {callout.lines[1] ? (
              <text
                x={box.x + box.w / 2}
                y={lastLineY}
                textAnchor="middle"
                fontFamily={SANS}
                fontSize={CALLOUT_SUB}
                fill="#6b7280"
              >
                {callout.lines[1]}
              </text>
            ) : null}
            <title>{`${callout.lines.join(". ")}. ${value.title}: ${value.arcanumTitle}`}</title>
          </g>
        );
      });

  /* ------------------------------ круги ------------------------------ */

  const nodeEls = NODES.map((node) => {
    const value = point(node.key);
    if (!value) return null;
    const center = polar(node.angle, node.radius);
    const colors = COLORS[node.key] ?? COLORS.center!;
    const isSelected = selected === node.key;
    const isActive = active?.has(node.key) ?? false;
    const fontSize = node.kind === "corner" ? node.r * 0.86 : node.r * 0.82;
    // Номер легенды — снаружи от круга, по направлению от центра схемы.
    const badgeSpot = polar(node.angle, node.radius + node.r + 9);

    return (
      <g key={node.key} opacity={dim(node.key)} {...interactive(node.key, `${value.title}: ${value.arcanumTitle}`)}>
        {isActive ? (
          <circle cx={center.x} cy={center.y} r={node.r + 9} fill="none" stroke="#1f6feb" strokeWidth="2.5" strokeDasharray="5 4" />
        ) : null}
        {isSelected ? (
          <circle cx={center.x} cy={center.y} r={node.r + 5} fill="none" stroke="#1f6feb" strokeWidth="3" />
        ) : null}
        <circle cx={center.x} cy={center.y} r={node.r} fill={colors.fill} stroke={colors.ring} strokeWidth="1.6" />
        <text
          x={center.x}
          y={center.y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SANS}
          fontWeight="700"
          fontSize={fontSize}
          fill="#ffffff"
        >
          {value.arcanum}
        </text>
        {compact || !node.badge ? null : (
          <g>
            <circle cx={badgeSpot.x} cy={badgeSpot.y} r="12" fill="#ffffff" stroke="#9aa0a6" strokeWidth="1.1" />
            <text
              x={badgeSpot.x}
              y={badgeSpot.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={SANS}
              fontSize="12.5"
              fontWeight="600"
              fill="#374151"
            >
              {node.badge}
            </text>
          </g>
        )}
        <title>{`${value.title}: ${value.arcanumTitle}`}</title>
      </g>
    );
  });

  /* --------------------------- линия жизни --------------------------- */

  // В каждом десятилетии восемь делений по 1,25 года — числа идут по всему кругу.
  const lifeEls = compact
    ? null
    : chart.lifeLine.map((entry) => {
        if (entry.kind === "vertex") return null;
        const index = Math.floor(entry.age / 10 + 0.0001);
        // Восемь делений на стороне: отступ от углов, чтобы числа не наезжали на круги.
        const step = (entry.age - index * 10) / 1.25; // 1…7
        const t = 0.145 + ((step - 1) / 6) * 0.71;
        const base = edgePoint(index, t);
        const normal = edgeNormal(index);
        const spot = { x: base.x + normal.x * 62, y: base.y + normal.y * 62 };
        const ageSpot = { x: base.x + normal.x * 96, y: base.y + normal.y * 96 };
        return (
          <g
            key={`life-${entry.age}`}
            opacity={active ? 0.32 : 1}
            {...(onSelectAge
              ? {
                  role: "button" as const,
                  tabIndex: 0,
                  "aria-label": `${ageLabel(entry.age)}: ${entry.arcanum}-я энергия`,
                  "aria-pressed": selectedAge === entry.age,
                  style: { cursor: "pointer" as const },
                  onClick: () => onSelectAge(entry.age),
                  onKeyDown: (event: ReactKeyboardEvent) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectAge(entry.age);
                    }
                  },
                }
              : {})}
          >
            {selectedAge === entry.age ? (
              <circle cx={spot.x} cy={spot.y} r="17" fill="none" stroke="#1f6feb" strokeWidth="2.4" />
            ) : null}
            <circle cx={spot.x} cy={spot.y} r="13" fill="#ffffff" stroke="#9aa0a6" strokeWidth="1.1" />
            <text
              x={spot.x}
              y={spot.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={SANS}
              fontSize="13"
              fontWeight="600"
              fill="#1f2328"
            >
              {entry.arcanum}
            </text>
            {entry.age % 10 === 5 ? (
              <text
                x={ageSpot.x}
                y={ageSpot.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={SANS}
                fontSize="13"
                fill="#6b7280"
              >
                {ageLabel(entry.age)}
              </text>
            ) : null}
            <title>{`${ageLabel(entry.age)}: ${entry.arcanum}-я энергия (${entry.formula})`}</title>
          </g>
        );
      });

  const lifeVertices = compact
    ? null
    : chart.lifeLine
        .filter((entry) => entry.kind === "vertex")
        .map((entry) => {
          const index = Math.round(entry.age / 10);
          const angle = VERTEX_ANGLES[index]!;
          const spot = polar(angle, R + 118);
          // Слева и справа подпись возраста стоит на линии земли — поднимаем её,
          // чтобы чёрная линия не перечёркивала текст.
          if (angle === 270 || angle === 90) spot.y -= 18;
          return (
            <text
              key={`age-${entry.age}`}
              x={spot.x}
              y={spot.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={SANS}
              fontSize="13.5"
              fill="#4b5563"
              stroke="#ffffff"
              strokeWidth="5"
              paintOrder="stroke"
              opacity={active ? 0.32 : 1}
            >
              {ageLabel(entry.age)}
            </text>
          );
        });

  /* ------------------------------ центр ------------------------------ */

  const centerValue = chart.byKey.center;
  const centerColors = COLORS.center!;
  const centerActive = active?.has("center") ?? false;
  const centerR = 72;

  const octagon = VERTEX_ANGLES.map((angle) => polar(angle, R));
  const squares = [
    [0, 90, 180, 270],
    [45, 135, 225, 315],
  ];

  const LEGEND: [string, string][] = [
    ["#2f6fe0", "личный квадрат"],
    ["#1f9d94", "родовой квадрат"],
    ["#2fa46a", "деньги"],
    ["#e0453e", "отношения"],
    ["#ef8f2b", "таланты и год"],
    ["#7b4bc9", "центр рода"],
  ];

  return (
    <svg
      viewBox={`0 190 ${SIZE} ${HEIGHT - 190}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Полная схема Матрицы судьбы: центр ${chart.byKey.center.arcanumTitle}, личность ${chart.byKey.A.arcanumTitle}, талант ${chart.byKey.B.arcanumTitle}, кармическая задача ${chart.byKey.D.arcanumTitle}; все точки схемы и линия жизни с 0 до 80 лет`}
    >
      <rect x="0" y="190" width={SIZE} height={HEIGHT - 190} rx="18" fill="#ffffff" />

      {/* Восьмиугольник и два квадрата — каркас схемы. */}
      <polygon
        points={octagon.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="#1f1f1f"
        strokeWidth="1.4"
      />
      {squares.map((set, index) => (
        <polygon
          key={index}
          points={set
            .map((angle) => polar(angle, R))
            .map((p) => `${p.x},${p.y}`)
            .join(" ")}
          fill="none"
          stroke="#1f1f1f"
          strokeWidth="1.2"
        />
      ))}
      <circle cx={CX} cy={CY} r={R * 0.62} fill="none" stroke="rgba(31,31,31,0.14)" strokeWidth="1" />

      {/* Диагонали рода: от каждого угла к центру. */}
      {[315, 45, 135, 225].map((angle) => (
        <g key={`diag-${angle}`}>{line(polar(angle, R), { x: CX, y: CY }, "#1f1f1f", 1.1)}</g>
      ))}

      {/* Линии земли (горизонталь) и неба (вертикаль). */}
      {line(polar(270, R), polar(90, R), "#1f1f1f", 1.4)}
      {line(polar(0, R), polar(180, R), "#1f1f1f", 1.4)}

      {/* Выноски рисуем до кругов: линии уходят под подписи и обводки. */}
      {calloutEls}

      {/* Линия жизни по кругу: числа периодов и возраст. */}
      {lifeEls}
      {lifeVertices}

      {nodeEls}

      {/* Центр — зона комфорта. */}
      <g
        opacity={centerActive ? 1 : active ? 0.32 : 1}
        {...interactive("center", `${centerValue.title}: ${centerValue.arcanumTitle}`)}
      >
        {centerActive ? (
          <circle cx={CX} cy={CY} r={centerR + 10} fill="none" stroke="#3b7b83" strokeWidth="2" strokeDasharray="5 4" />
        ) : null}
        {selected === "center" ? (
          <circle cx={CX} cy={CY} r={centerR + 6} fill="none" stroke="#2f6f78" strokeWidth="3" />
        ) : null}
        <circle cx={CX} cy={CY} r={centerR} fill={centerColors.fill} stroke={centerColors.ring} strokeWidth="2" />
        <text
          x={CX}
          y={compact ? CY + 1 : CY - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SANS}
          fontWeight="700"
          fontSize={compact ? 34 : 56}
          fill="#ffffff"
        >
          {centerValue.arcanum}
        </text>
        {compact ? null : (
          <text
            x={CX}
            y={CY + centerR + 20}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={SANS}
            fontSize="15"
            fontWeight="600"
            fill="#1f2328"
          >
            зона комфорта
          </text>
        )}
        <title>{`${centerValue.title}: ${centerValue.arcanumTitle}`}</title>
      </g>

      {/* Энергия года и легенда — внизу, вне восьмиугольника. */}
      {compact ? null : (
        <>
          <g
            opacity={active && !active.has("year") ? 0.32 : 1}
            {...interactive("year", `${chart.yearEnergy.title}: ${chart.yearEnergy.arcanumTitle}`)}
          >
            {selected === "year" ? (
              <rect x={132} y={1126} width="284" height="58" rx="29" fill="none" stroke="#1f6feb" strokeWidth="3" />
            ) : null}
            <rect x={136} y={1131} width="276" height="48" rx="24" fill="#ffffff" stroke="#d0d5dd" strokeWidth="1.2" />
            <circle cx={168} cy={1155} r="17" fill={COLORS.year!.fill} stroke={COLORS.year!.ring} strokeWidth="1.2" />
            <text
              x={168}
              y={1156}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={SANS}
              fontSize="19"
              fontWeight="700"
              fill="#ffffff"
            >
              {chart.yearEnergy.arcanum}
            </text>
            <text x={197} y={1161} fontFamily={SANS} fontSize="15" fill="#374151">
              энергия {chart.yearEnergy.year} года
            </text>
          </g>

          {/* Номера внутренних точек: три колонки под схемой. */}
          {[0, 8, 16].map((offset, column) => (
            <g key={`inner-${column}`} transform={`translate(${140 + column * 480} 1350)`}>
              {INNER_LEGEND.slice(offset, offset + 8).map(([num, label], index) => (
                <g key={num} transform={`translate(0 ${index * 26})`}>
                  <circle cx="0" cy="-4" r="11" fill="#ffffff" stroke="#9aa0a6" strokeWidth="1.1" />
                  <text x="0" y="-3" textAnchor="middle" dominantBaseline="central" fontFamily={SANS} fontSize="12" fontWeight="600" fill="#374151">
                    {num}
                  </text>
                  <text x="18" y="1" fontFamily={SANS} fontSize="15" fill="#374151">
                    {label}
                  </text>
                </g>
              ))}
            </g>
          ))}

          <g transform={`translate(140 1236)`}>
            {LEGEND.map(([color, label], index) => {
              const x = (index % 3) * 190;
              const y = Math.floor(index / 3) * 30;
              return (
                <g key={label} transform={`translate(${x} ${y})`}>
                  <circle cx="0" cy="-4" r="8" fill={color} stroke="rgba(0,0,0,0.12)" />
                  <text x="14" y="1" fontFamily={SANS} fontSize="15" fill="#4b5563">
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </>
      )}
    </svg>
  );
}
