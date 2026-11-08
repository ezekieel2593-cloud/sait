import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { MatrixChart } from "@/lib/matrix/engine";

/**
 * Подробная схема Матрицы судьбы — как в классических разборах.
 *
 * Вокруг восьмиугольника стоят подписи-выноски: у каждой свой рамка с названием
 * роли и строкой-пояснением, а тонкая линия указывает, к какому кругу она
 * относится. Внутри восьмиугольника точки каналов подписаны прямо на месте,
 * по кругу идёт линия жизни: возраст человека и энергия каждого периода от 0
 * до 80 лет, по центру — зона комфорта.
 *
 * Названий карт таро нет: только номер и слово «энергия». Пастельные круги,
 * тонкие линии, никакого неона.
 *
 * `highlight` — ключи точек, которые нужно подсветить (например, из блока
 * «Матрица простыми словами»): остальные круги при этом приглушаются.
 */

export const MATRIX_DIAGRAM_WIDTH = 1440;
export const MATRIX_DIAGRAM_HEIGHT = 1330;

const SIZE = MATRIX_DIAGRAM_WIDTH;
const HEIGHT = MATRIX_DIAGRAM_HEIGHT;
const CX = 720;
const CY = 710;
/** Радиус восьмиугольника: на нём стоят восемь углов квадратов. */
const R = 300;
/** Кольцо точек на осях ближе к углу. */
const R_INNER = 205;
/** Кольцо точек на осях ближе к центру. */
const R_MIDDLE = 122;

type PointKind = "main" | "family" | "inner" | "diamond";

type NodeShape = {
  key: string;
  /** Угол от «верх» по часовой стрелке. */
  angle: number;
  radius: number;
  r: number;
  kind: PointKind;
};

const NODES: NodeShape[] = [
  // Восемь углов: четыре точки личного квадрата и четыре родовых угла.
  { key: "B", angle: 0, radius: R, r: 40, kind: "main" },
  { key: "family-top-right", angle: 45, radius: R, r: 32, kind: "family" },
  { key: "C", angle: 90, radius: R, r: 40, kind: "main" },
  { key: "family-bottom-right", angle: 135, radius: R, r: 32, kind: "family" },
  { key: "D", angle: 180, radius: R, r: 40, kind: "main" },
  { key: "family-bottom-left", angle: 225, radius: R, r: 32, kind: "family" },
  { key: "A", angle: 270, radius: R, r: 40, kind: "main" },
  { key: "family-top-left", angle: 315, radius: R, r: 32, kind: "family" },

  // Оси: талант — вверх, деньги — вправо, отношения — вниз, опора — влево.
  { key: "talent-second", angle: 0, radius: R_INNER, r: 26, kind: "inner" },
  { key: "talent-line", angle: 0, radius: R_MIDDLE, r: 25, kind: "inner" },
  { key: "money-middle", angle: 90, radius: R_INNER, r: 26, kind: "inner" },
  { key: "money-entry", angle: 90, radius: R_MIDDLE, r: 25, kind: "inner" },
  { key: "love-middle", angle: 180, radius: R_INNER, r: 26, kind: "inner" },
  { key: "love-entry", angle: 180, radius: R_MIDDLE, r: 25, kind: "inner" },
  { key: "person-experience", angle: 270, radius: R_INNER, r: 26, kind: "inner" },
  { key: "person-support", angle: 270, radius: R_MIDDLE, r: 25, kind: "inner" },

  // Опорные точки рода и пересечение каналов — во внутреннем ромбе.
  { key: "family-force", angle: 315, radius: 172, r: 24, kind: "diamond" },
  { key: "shared", angle: 135, radius: 172, r: 24, kind: "diamond" },
];

/** Цвета кругов: спокойная пастель, у каждой роли свой оттенок. */
const COLORS: Record<string, { fill: string; ring: string; text: string }> = {
  A: { fill: "#d9c8ef", ring: "#b79fdb", text: "#3d2f52" },
  B: { fill: "#c9b4ea", ring: "#a98fd3", text: "#362a4a" },
  C: { fill: "#f6c3d2", ring: "#e39cb3", text: "#56293a" },
  D: { fill: "#f0a9c0", ring: "#d98aa5", text: "#4f2333" },
  "family-top-left": { fill: "#cfe3ee", ring: "#a8c6d6", text: "#2f4450" },
  "family-top-right": { fill: "#d6e7f0", ring: "#aecbd9", text: "#2f4450" },
  "family-bottom-right": { fill: "#d3efe2", ring: "#a8d3c1", text: "#2b4a3d" },
  "family-bottom-left": { fill: "#dbeaf3", ring: "#b3ccda", text: "#2f4450" },
  center: { fill: "#f7d98a", ring: "#dfb85f", text: "#4a3a12" },
  "family-force": { fill: "#c6e3bb", ring: "#9ec794", text: "#2f4529" },
  "money-entry": { fill: "#bfe4c9", ring: "#94c7a3", text: "#254434" },
  "money-middle": { fill: "#cdeada", ring: "#a3cfb9", text: "#254434" },
  "love-entry": { fill: "#f8cbdc", ring: "#e0a5bd", text: "#4f2333" },
  "love-middle": { fill: "#fadbe6", ring: "#e5b6c9", text: "#4f2333" },
  "talent-line": { fill: "#cbc4ef", ring: "#a89fd9", text: "#332c50" },
  "talent-second": { fill: "#d8d2f4", ring: "#b4abdf", text: "#332c50" },
  "person-support": { fill: "#d9e6f4", ring: "#aec7de", text: "#2c3f52" },
  "person-experience": { fill: "#e3edf7", ring: "#b9cfe2", text: "#2c3f52" },
  shared: { fill: "#c3e6e6", ring: "#97c9c9", text: "#234a4a" },
  year: { fill: "#efe6da", ring: "#cfbca6", text: "#463a2b" },
};

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Подпись-выноска у схемы. `align` — к какой стороне холста прижат блок,
 * `x` — край, от которого он растёт, `y` — вертикаль центра.
 */
type Callout = { key: string; lines: string[]; align: "left" | "right" | "center"; x: number; y: number };

const CALLOUTS: Callout[] = [
  // Верх и низ — главные точки личного квадрата.
  { key: "B", lines: ["Таланты от природы", "что даётся легче всего"], align: "center", x: CX, y: 250 },
  { key: "D", lines: ["Кармическая задача", "что предстоит освоить"], align: "center", x: CX, y: 1146 },

  // Слева: внутренний портрет и линия отца.
  { key: "family-top-left", lines: ["Линия отца", "ресурсы и опора рода"], align: "right", x: 320, y: 420 },
  { key: "A", lines: ["Внутренний портрет", "как тебя видят другие"], align: "right", x: 320, y: 710 },
  { key: "family-bottom-left", lines: ["Унаследованные задачи", "что идёт из истории рода"], align: "right", x: 320, y: 1000 },

  // Справа: род по матери, родовые программы, реализация рода.
  { key: "family-top-right", lines: ["Линия матери", "ресурсы и опора рода"], align: "left", x: 1120, y: 420 },
  { key: "C", lines: ["Родовые программы", "опыт и установки семьи"], align: "left", x: 1120, y: 710 },
  { key: "family-bottom-right", lines: ["Реализация рода", "роль в социуме"], align: "left", x: 1120, y: 1000 },
];

/** Подписи внутренних точек — стоят прямо у круга. */
const INLINE: Record<string, { text: string; dx: number; dy: number; anchor?: "start" | "middle" | "end" }> = {
  "talent-second": { text: "развитие таланта", dx: 36, dy: 0, anchor: "start" },
  "talent-line": { text: "личные таланты", dx: 36, dy: 0, anchor: "start" },
  "money-entry": { text: "вход в деньги", dx: 0, dy: -40, anchor: "middle" },
  "money-middle": { text: "удержание денег", dx: 0, dy: 42, anchor: "middle" },
  "love-entry": { text: "вход в отношения", dx: -36, dy: 0, anchor: "end" },
  "love-middle": { text: "устойчивость пары", dx: 36, dy: 0, anchor: "start" },
  "person-support": { text: "личная опора", dx: 0, dy: -40, anchor: "middle" },
  "person-experience": { text: "опыт личности", dx: 0, dy: 42, anchor: "middle" },
  "family-force": { text: "сила рода", dx: 0, dy: -40, anchor: "middle" },
  shared: { text: "общие каналы", dx: 0, dy: 42, anchor: "middle" },
};

const CALLOUT_TITLE = 15;
const CALLOUT_SUB = 13;
const CALLOUT_LINE = 19;
const CALLOUT_PAD_X = 15;
const CALLOUT_PAD_Y = 10;
const INLINE_FONT = 13;

/** Ширина строки без измерений DOM: средняя буква чуть шире половины кегля. */
function textWidth(text: string, size: number) {
  return text.length * size * 0.54;
}

function calloutBox(callout: Callout): Rect {
  const widest = Math.max(
    ...callout.lines.map((line, index) => textWidth(line, index === 0 ? CALLOUT_TITLE : CALLOUT_SUB))
  );
  const w = Math.max(170, Math.round(widest) + CALLOUT_PAD_X * 2);
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
        const lastLineY = box.y + box.h - CALLOUT_PAD_Y - 6;
        const firstLineY = box.y + CALLOUT_PAD_Y + 11;
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
              stroke="rgba(74,110,120,0.42)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
            <circle cx={target.x} cy={target.y} r="3.2" fill="rgba(74,110,120,0.55)" />
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx="7"
              fill="rgba(255,253,250,0.94)"
              stroke={selected === callout.key ? "#2f6f78" : "rgba(150,132,138,0.42)"}
              strokeWidth={selected === callout.key ? 2 : 1}
            />
            <text
              x={box.x + box.w / 2}
              y={firstLineY}
              textAnchor="middle"
              fontFamily={SANS}
              fontSize={CALLOUT_TITLE}
              fontWeight="600"
              fill="#35424a"
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
                fill="#6d6f78"
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
    const label = INLINE[node.key];
    const fontSize = node.kind === "main" ? node.r * 0.92 : node.r * 0.86;

    return (
      <g key={node.key} opacity={dim(node.key)} {...interactive(node.key, `${value.title}: ${value.arcanumTitle}`)}>
        {isActive ? (
          <circle cx={center.x} cy={center.y} r={node.r + 10} fill="none" stroke="#3b7b83" strokeWidth="2" strokeDasharray="5 4" />
        ) : null}
        {isSelected ? (
          <circle cx={center.x} cy={center.y} r={node.r + 6} fill="none" stroke="#2f6f78" strokeWidth="3" />
        ) : null}
        <circle cx={center.x} cy={center.y + 3} r={node.r} fill="rgba(70,52,60,0.10)" />
        <circle cx={center.x} cy={center.y} r={node.r} fill={colors.fill} stroke={colors.ring} strokeWidth="1.4" />
        <circle cx={center.x - node.r * 0.3} cy={center.y - node.r * 0.34} r={node.r * 0.52} fill="rgba(255,255,255,0.45)" />
        <text
          x={center.x}
          y={center.y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SERIF}
          fontWeight="600"
          fontSize={fontSize}
          fill={colors.text}
        >
          {value.arcanum}
        </text>
        {compact || !label ? null : (
          <text
            x={center.x + label.dx}
            y={center.y + label.dy}
            textAnchor={label.anchor ?? "middle"}
            dominantBaseline="central"
            fontFamily={SANS}
            fontSize={INLINE_FONT}
            fill="#5f6b72"
            stroke="#fdf8f4"
            strokeWidth="3.6"
            paintOrder="stroke"
          >
            {label.text}
          </text>
        )}
        <title>{`${value.title}: ${value.arcanumTitle}`}</title>
      </g>
    );
  });

  /* --------------------------- линия жизни --------------------------- */

  // В каждом десятилетии три промежуточные точки (2,5 · 5 · 7,5 года).
  const lifeEls = compact
    ? null
    : chart.lifeLine.map((entry) => {
        if (entry.kind === "vertex") return null;
        const index = Math.floor(entry.age / 10);
        const t = entry.kind === "middle" ? 0.5 : entry.age % 10 === 2.5 ? 0.25 : 0.75;
        const base = edgePoint(index, t);
        const normal = edgeNormal(index);
        const spot = { x: base.x + normal.x * 34, y: base.y + normal.y * 34 };
        const ageSpot = { x: base.x + normal.x * 72, y: base.y + normal.y * 72 };
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
              <circle cx={spot.x} cy={spot.y} r="17" fill="none" stroke="#2f6f78" strokeWidth="2.4" />
            ) : null}
            <circle cx={spot.x} cy={spot.y} r="12.5" fill="#fdf8f4" stroke="rgba(150,128,136,0.45)" strokeWidth="1" />
            <text
              x={spot.x}
              y={spot.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={SERIF}
              fontSize="12.5"
              fontWeight="600"
              fill="#5b4750"
            >
              {entry.arcanum}
            </text>
            {entry.kind === "middle" ? (
              <text
                x={ageSpot.x}
                y={ageSpot.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={SANS}
                fontSize="10.5"
                fill="#8b7d83"
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
          const spot = polar(VERTEX_ANGLES[index]!, R + 78);
          return (
            <text
              key={`age-${entry.age}`}
              x={spot.x}
              y={spot.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={SANS}
              fontSize="11"
              fill="#8b7d83"
              stroke="#fdf8f4"
              strokeWidth="3.4"
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
  const centerR = 58;

  const octagon = VERTEX_ANGLES.map((angle) => polar(angle, R));
  const squares = [
    [0, 90, 180, 270],
    [45, 135, 225, 315],
  ];

  const LEGEND: [string, string][] = [
    ["#c9b4ea", "личность"],
    ["#cfe3ee", "род"],
    ["#c4c0ee", "талант"],
    ["#bfe4c9", "деньги"],
    ["#f8cbdc", "отношения"],
    ["#f7d98a", "комфорт"],
  ];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Подробная схема Матрицы судьбы с подписями: центр ${chart.byKey.center.arcanumTitle}, личность ${chart.byKey.A.arcanumTitle}, талант ${chart.byKey.B.arcanumTitle}, кармическая задача ${chart.byKey.D.arcanumTitle}; по кругу — линия жизни с 0 до 80 лет`}
    >
      <defs>
        <radialGradient id={`${idPrefix}-bg`} cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#fffefc" />
          <stop offset="1" stopColor="#f7f1ec" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={SIZE} height={HEIGHT} rx="26" fill={`url(#${idPrefix}-bg)`} />

      {/* Восьмиугольник и два квадрата — каркас схемы. */}
      <polygon
        points={octagon.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="rgba(122,108,112,0.38)"
        strokeWidth="1.3"
      />
      {squares.map((set, index) => (
        <polygon
          key={index}
          points={set
            .map((angle) => polar(angle, R))
            .map((p) => `${p.x},${p.y}`)
            .join(" ")}
          fill="none"
          stroke="rgba(122,108,112,0.24)"
          strokeWidth="1"
        />
      ))}
      <circle cx={CX} cy={CY} r={R * 0.62} fill="none" stroke="rgba(122,108,112,0.16)" strokeWidth="0.9" />

      {/* Оси от углов к центру. */}
      {VERTEX_ANGLES.map((angle) => (
        <g key={`axis-${angle}`}>{line(polar(angle, R), { x: CX, y: CY }, "rgba(122,108,112,0.18)", 0.9, "3 6")}</g>
      ))}

      {/* Каналы: деньги — вправо, отношения — вниз. */}
      {line(polar(90, R_INNER), { x: CX, y: CY }, "rgba(74,140,102,0.5)", 1.6)}
      {line(polar(180, R_INNER), { x: CX, y: CY }, "rgba(196,110,140,0.45)", 1.6)}

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
        <circle cx={CX} cy={CY + 3} r={centerR} fill="rgba(70,52,60,0.10)" />
        <circle cx={CX} cy={CY} r={centerR} fill={centerColors.fill} stroke={centerColors.ring} strokeWidth="1.6" />
        <circle cx={CX - 18} cy={CY - 20} r="30" fill="rgba(255,255,255,0.5)" />
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SERIF}
          fontWeight="600"
          fontSize={compact ? 34 : 52}
          fill={centerColors.text}
        >
          {centerValue.arcanum}
        </text>
        {compact ? null : (
          <text
            x={CX}
            y={CY - centerR - 14}
            textAnchor="middle"
            fontFamily={SANS}
            fontSize="13"
            fontWeight="600"
            fill="#5f5b46"
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
              <rect x={CX - 132} y={1194} width="264" height="58" rx="29" fill="none" stroke="#2f6f78" strokeWidth="3" />
            ) : null}
            <rect x={CX - 128} y={1199} width="256" height="48" rx="24" fill="#fffaf4" stroke="rgba(207,188,166,0.9)" />
            <circle cx={CX - 96} cy={1223} r="17" fill={COLORS.year!.fill} stroke={COLORS.year!.ring} strokeWidth="1.2" />
            <text
              x={CX - 96}
              y={1224}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={SERIF}
              fontSize="16"
              fontWeight="600"
              fill={COLORS.year!.text}
            >
              {chart.yearEnergy.arcanum}
            </text>
            <text x={CX - 70} y={1228} fontFamily={SANS} fontSize="12.5" fill="#6a5b62">
              энергия {chart.yearEnergy.year} года
            </text>
          </g>

          <g transform={`translate(${CX - 452} 1276)`}>
            {LEGEND.map(([color, label], index) => {
              const x = index * 152;
              return (
                <g key={label} transform={`translate(${x} 0)`}>
                  <circle cx="0" cy="-4" r="6.5" fill={color} stroke="rgba(90,70,80,0.18)" />
                  <text x="12" y="0" fontFamily={SANS} fontSize="11.5" fill="#7b6c73">
                    {label}
                  </text>
                </g>
              );
            })}
          </g>

          <text x={CX} y={1310} textAnchor="middle" fontFamily={SANS} fontSize="11.5" fill="#8b7d83">
            Числа по кругу — возраст и энергия периода. Нажмите на круг или подпись, чтобы прочитать описание.
          </text>
        </>
      )}
    </svg>
  );
}
