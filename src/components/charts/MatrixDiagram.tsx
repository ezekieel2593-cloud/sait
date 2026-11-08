import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { MatrixChart } from "@/lib/matrix/engine";

/**
 * Схема Матрицы судьбы в классическом виде — как в онлайн-калькуляторах,
 * но в жемчужной палитре сайта:
 *
 * - восемь больших кругов-углов в двойной обводке (графит + тонкое золото),
 *   внутри — жемчужная заливка;
 * - внутренние точки — перламутровые круги с тонким ободком и тёмной цифрой;
 * - два квадрата и диагонали, тонкие тёмные линии;
 * - по краю — восемь секторов с разметкой периода: числа энергий, подписи
 *   «5 лет», «15 лет», «55 лет» … на середине каждого десятилетия;
 * - по диагоналям из центра идут линии рода с подписями и стрелками,
 *   деньги и любовь отмечены значками $ и ♥.
 *
 * Мелкие числа вдоль сторон автоматически отодвигаются от больших угловых
 * кругов, чтобы их не закрывало.
 *
 * Названий карт таро нет: только номер и слово «энергия».
 */

export const MATRIX_DIAGRAM_WIDTH = 1700;
/** Высота холста: сверху и снизу — секторы с разметкой периода. */
export const MATRIX_DIAGRAM_HEIGHT = 1720;

const SIZE = MATRIX_DIAGRAM_WIDTH;
const HEIGHT = MATRIX_DIAGRAM_HEIGHT;
const CX = SIZE / 2;
const CY = HEIGHT / 2;
/** Радиус, на котором стоят восемь углов двух квадратов. */
const R = 500;
/** Внешняя граница секторов разметки. */
const R_SECTOR = R + 172;
/** Радиус кольца с числами периода — вне угловых кругов, чтобы не перекрывать их. */
const R_ENERGY = R + 74;
/** Отступ подписей «5 лет», «15 лет» … от стороны восьмиугольника. */
const AGE_OFFSET = 134;

type NodeShape = {
  key: string;
  /** Угол от «верх» по часовой стрелке. */
  angle: number;
  radius: number;
  r: number;
  /**
   * corner — большой круг в двойной обводке (углы квадратов);
   * core    — центр в золотой заливке;
   * inner   — жемчужный круг с тёмной цифрой.
   */
  kind: "corner" | "core" | "inner";
  /** Оттенок заливки (для inner) — из жемчужной палитры. */
  paint?: PaintKey;
};

/**
 * Жемчужная палитра: приглушённые перламутровые оттенки вместо
 * насыщенных цветов — серо-розовый, лавандовый, шалфейный, аквамарин,
 * кремовый, дымчатый. Цифры тёмные, поэтому читаются на любом оттенке.
 */
const PAINT = {
  plum: { fill: "#c7a6dd", ring: "#9a76bb" },
  lilac: { fill: "#d6c2e6", ring: "#a98cc4" },
  rose: { fill: "#f0aab9", ring: "#cc8296" },
  blush: { fill: "#f8c6b1", ring: "#dd9c7e" },
  cream: { fill: "#f2dda4", ring: "#cfb474" },
  peach: { fill: "#f7c598", ring: "#db9f66" },
  gold: { fill: "#f0d29a", ring: "#c9a86a" },
  sage: { fill: "#bcd49a", ring: "#93b06f" },
  mint: { fill: "#a8dcc0", ring: "#78bb98" },
  aqua: { fill: "#a6d8e2", ring: "#74b3c2" },
  sky: { fill: "#aec8ea", ring: "#7f9fcd" },
  iris: { fill: "#bdb6ec", ring: "#9189cf" },
  teal: { fill: "#9fd4ca", ring: "#6fb0a3" },
  slate: { fill: "#c3c9d8", ring: "#969eb2" },
} as const;

type PaintKey = keyof typeof PAINT;

/** Тёмная краска цифр и линий — жемчужный графит вместо чёрного. */
const INK = "#2b2a33";
const INK_SOFT = "#5b5769";

/** Восемь углов: личный квадрат (A, B, C, D) и родовой (F, G, H, I). */
const NODES: NodeShape[] = [
  { key: "B", angle: 0, radius: R, r: 52, kind: "corner" },
  { key: "family-top-right", angle: 45, radius: R, r: 44, kind: "corner" },
  { key: "C", angle: 90, radius: R, r: 52, kind: "corner" },
  { key: "family-bottom-right", angle: 135, radius: R, r: 44, kind: "corner" },
  { key: "D", angle: 180, radius: R, r: 52, kind: "corner" },
  { key: "family-bottom-left", angle: 225, radius: R, r: 44, kind: "corner" },
  { key: "A", angle: 270, radius: R, r: 52, kind: "corner" },
  { key: "family-top-left", angle: 315, radius: R, r: 44, kind: "corner" },

  // Центр рода: родовой центр и общая точка — рядом с центром.
  { key: "family-core", angle: 90, radius: 132, r: 27, kind: "inner", paint: "plum" },
  { key: "family-force", angle: 90, radius: 210, r: 25, kind: "inner", paint: "peach" },

  // Вертикаль вверх: удовольствия → таланты → вторая аджна.
  { key: "pleasures", angle: 0, radius: 128, r: 25, kind: "inner", paint: "sage" },
  { key: "talent-line", angle: 0, radius: 240, r: 25, kind: "inner", paint: "aqua" },
  { key: "talent-second", angle: 0, radius: 330, r: 27, kind: "inner", paint: "sky" },

  // Горизонталь влево: страхи → внуки → дети.
  { key: "fears", angle: 270, radius: 150, r: 25, kind: "inner", paint: "sage" },
  { key: "person-support", angle: 270, radius: 250, r: 24, kind: "inner", paint: "sky" },
  { key: "person-experience", angle: 270, radius: 340, r: 24, kind: "inner", paint: "iris" },

  // Горизонталь вправо: деньги.
  { key: "money-entry", angle: 90, radius: 300, r: 25, kind: "inner", paint: "peach" },
  { key: "money-middle", angle: 90, radius: 372, r: 24, kind: "inner", paint: "cream" },

  // Вертикаль вниз: готовность к отношениям и кармический хвост.
  { key: "love-entry", angle: 180, radius: 150, r: 26, kind: "inner", paint: "blush" },
  { key: "love-middle", angle: 180, radius: 300, r: 25, kind: "inner", paint: "rose" },

  // Диагонали рода: таланты и деньги линий отца и матери.
  { key: "family-talent-father", angle: 315, radius: 230, r: 24, kind: "inner", paint: "sky" },
  { key: "family-material-father", angle: 315, radius: 330, r: 24, kind: "inner", paint: "aqua" },
  { key: "family-talent-mother", angle: 45, radius: 230, r: 24, kind: "inner", paint: "sky" },
  { key: "family-material-mother", angle: 45, radius: 330, r: 24, kind: "inner", paint: "aqua" },
  { key: "family-spirit-father", angle: 135, radius: 230, r: 24, kind: "inner", paint: "mint" },
  { key: "family-balance", angle: 135, radius: 330, r: 24, kind: "inner", paint: "sage" },
  { key: "family-spirit-mother", angle: 225, radius: 230, r: 24, kind: "inner", paint: "mint" },
  { key: "family-support", angle: 225, radius: 330, r: 24, kind: "inner", paint: "lilac" },

  // Нижний правый сектор: пара, отношения, профессия.
  { key: "shared", angle: 135, radius: 150, r: 24, kind: "inner", paint: "iris" },
  { key: "love-partner", angle: 158, radius: 254, r: 23, kind: "inner", paint: "rose" },
  { key: "money-profession", angle: 112, radius: 254, r: 23, kind: "inner", paint: "sage" },
];

const INNER_LEGEND: [string, string, string][] = [
  [PAINT.plum.fill, PAINT.plum.ring, "родовой центр и общий центр квадратов"],
  [PAINT.sage.fill, PAINT.sage.ring, "страхи и удовольствия"],
  [PAINT.sky.fill, PAINT.sky.ring, "таланты и способности"],
  [PAINT.peach.fill, PAINT.peach.ring, "деньги, отношения, год"],
  [PAINT.rose.fill, PAINT.rose.ring, "готовность к отношениям"],
  [PAINT.mint.fill, PAINT.mint.ring, "духовные программы рода"],
  [PAINT.blush.fill, PAINT.blush.ring, "характер пары"],
];

/** Углы восьмиугольника по часовой стрелке — в том же порядке, что линия жизни. */
const VERTEX_ANGLES = [270, 315, 0, 45, 90, 135, 180, 225];

const RAD = Math.PI / 180;

function polar(angle: number, radius: number) {
  return {
    x: CX + Math.sin(angle * RAD) * radius,
    y: CY - Math.cos(angle * RAD) * radius,
  };
}

export const MATRIX_DIAGRAM_KEYS = [...NODES.map((node) => node.key), "center", "year"];

/** Возраст для подписи: 0, 1,25, 5 … 78,75 лет. */
function ageLabel(age: number): string {
  if (age === 0) return "0 лет";
  if (Number.isInteger(age)) return `${age} лет`;
  return `${String(age).replace(".", ",")} лет`;
}

const SANS = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

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
  const dim = (key: string) => (active && !active.has(key) ? 0.25 : 1);

  const point = (key: string) => (key === "year" ? chart.yearEnergy : chart.byKey[key] ?? null);

  const vertex = (index: number) => polar(VERTEX_ANGLES[index]!, R);

  const line = (a: { x: number; y: number }, b: { x: number; y: number }, width = 1.6) => (
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={width} strokeLinecap="round" />
  );

  /* --------------------------- секторы периода --------------------------- */

  /** Нормаль к стороне восьмиугольника, направленная наружу. */
  const sideNormal = (from: { x: number; y: number }, to: { x: number; y: number }) => {
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

  /** Подпись возраста идёт вдоль стороны восьмиугольника, снаружи от чисел. */
  const sideCaption = (index: number) => {
    const from = vertex(index);
    const to = vertex((index + 1) % 8);
    const normal = sideNormal(from, to);
    const x = (from.x + to.x) / 2 + normal.x * AGE_OFFSET;
    const y = (from.y + to.y) / 2 + normal.y * AGE_OFFSET;
    const deg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
    return { x, y, rotation: deg > 90 || deg < -90 ? deg + 180 : deg };
  };

  /**
   * Число периода идёт по кольцу между восьмиугольником и рамкой секторов.
   * Кольцо проходит вне угловых кругов, поэтому мелкие цифры никогда
   * не прячутся за большими.
   */
  const ringPoint = (index: number, t: number, radius: number) => {
    const angle = VERTEX_ANGLES[index]! + t * 45;
    const p = polar(angle, radius);
    // Разворот подписи всегда «читаемым» боком: угол в пределах ±90°.
    let rotation = angle + 90;
    while (rotation > 90) rotation -= 180;
    while (rotation < -90) rotation += 180;
    return { ...p, rotation };
  };

  const octagonOuter = VERTEX_ANGLES.map((angle) => polar(angle, R_SECTOR));

  /* --------------------------- линия жизни --------------------------- */

  const lifeEls = compact
    ? null
    : chart.lifeLine.map((entry) => {
        const sector = Math.floor(entry.age / 10 + 0.0001);
        const t = entry.kind === "vertex" ? 0 : (entry.age - sector * 10) / 10;
        const mid = entry.age % 10 === 5;
        const spot = ringPoint(sector, t, R_ENERGY);
        const ageSpot = mid ? sideCaption(sector) : null;
        return (
          <g
            key={`life-${entry.age}`}
            opacity={active ? 0.3 : 1}
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
              <circle cx={spot.x} cy={spot.y} r="18" fill="#ffffff" opacity="0.9" />
            ) : null}
            {selectedAge === entry.age ? (
              <circle cx={spot.x} cy={spot.y} r="18" fill="none" stroke={PAINT.plum.ring} strokeWidth="2.4" />
            ) : null}
            <g transform={`rotate(${spot.rotation} ${spot.x} ${spot.y})`}>
              <text
                x={spot.x}
                y={spot.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={SANS}
                fontSize={entry.kind === "vertex" ? 15 : 13.5}
                fontWeight={entry.kind === "vertex" ? 700 : 500}
                fill={INK}
              >
                {entry.arcanum}
              </text>
            </g>
            {entry.kind === "vertex" || !ageSpot ? null : (
              <g transform={`rotate(${ageSpot.rotation} ${ageSpot.x} ${ageSpot.y})`}>
                <text
                  x={ageSpot.x}
                  y={ageSpot.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily={SANS}
                  fontSize="15"
                  fontWeight="700"
                  fill={INK}
                  stroke="#fffdfa"
                  strokeWidth="4"
                  paintOrder="stroke"
                >
                  {ageLabel(entry.age)}
                </text>
              </g>
            )}
            <title>{`${ageLabel(entry.age)}: ${entry.arcanum}-я энергия (${entry.formula})`}</title>
          </g>
        );
      });

  /* ------------------------------ круги ------------------------------ */

  const nodeEls = NODES.map((node) => {
    const value = point(node.key);
    if (!value) return null;
    const center = polar(node.angle, node.radius);
    const isSelected = selected === node.key;
    const isActive = active?.has(node.key) ?? false;
    const label = `${value.title}: ${value.arcanumTitle}`;

    return (
      <g key={node.key} opacity={dim(node.key)} {...interactive(node.key, label)}>
        {isActive ? (
          <circle cx={center.x} cy={center.y} r={node.r + 12} fill="none" stroke={PAINT.plum.ring} strokeWidth="2.4" strokeDasharray="6 5" />
        ) : null}
        {node.kind === "corner" ? (
          <>
            {isSelected ? (
              <circle cx={center.x} cy={center.y} r={node.r + 9} fill="none" stroke={PAINT.plum.ring} strokeWidth="3" />
            ) : null}
            {/* Двойная обводка углов: графит снаружи, тонкое золото внутри. */}
            <circle cx={center.x} cy={center.y} r={node.r} fill="#ffffff" stroke={INK} strokeWidth="4" />
            <circle cx={center.x} cy={center.y} r={node.r} fill={`url(#pearl-white-${idPrefix})`} />
            <circle cx={center.x} cy={center.y} r={node.r - 8} fill="none" stroke="#c9ae83" strokeWidth="1.3" />
            <text
              x={center.x}
              y={center.y + 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={SANS}
              fontWeight="700"
              fontSize={node.r * 0.82}
              fill={INK}
            >
              {value.arcanum}
            </text>
          </>
        ) : (
          (() => {
            const paint = PAINT[node.paint ?? "sky"];
            return (
              <>
                {isSelected ? (
                  <circle cx={center.x} cy={center.y} r={node.r + 6} fill="none" stroke={PAINT.plum.ring} strokeWidth="3" />
                ) : null}
                <circle cx={center.x} cy={center.y} r={node.r + 5} fill={paint.fill} opacity="0.3" />
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={node.r}
                  fill={paint.fill}
                  stroke={paint.ring}
                  strokeWidth="1.6"
                />
                <circle cx={center.x} cy={center.y} r={node.r} fill={`url(#pearl-sheen-${idPrefix})`} />
                <text
                  x={center.x}
                  y={center.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily={SANS}
                  fontWeight="700"
                  fontSize={node.r * 0.86}
                  fill={INK}
                >
                  {value.arcanum}
                </text>
              </>
            );
          })()
        )}
        <title>{label}</title>
      </g>
    );
  });

  /* ------------------------------ центр ------------------------------ */

  const centerValue = chart.byKey.center;
  const centerActive = active?.has("center") ?? false;
  const centerR = 62;

  const LEGEND = INNER_LEGEND;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Схема Матрицы судьбы: центр ${chart.byKey.center.arcanumTitle}, личность ${chart.byKey.A.arcanumTitle}, талант ${chart.byKey.B.arcanumTitle}, кармическая задача ${chart.byKey.D.arcanumTitle}; по кругу — энергия каждого периода жизни`}
    >
      <defs>
        {/* Жемчужный фон холста: светлый центр, перламутровые края. */}
        <radialGradient id={`pearl-bg-${idPrefix}`} cx="50%" cy="46%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#fdfbf8" />
          <stop offset="82%" stopColor="#f7f2f6" />
          <stop offset="100%" stopColor="#f1eaf2" />
        </radialGradient>
        {/* Перламутровый блик на кругах. */}
        <radialGradient id={`pearl-sheen-${idPrefix}`} cx="34%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`pearl-white-${idPrefix}`} cx="36%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fbf7f2" />
          <stop offset="100%" stopColor="#f2e9df" />
        </radialGradient>
        {/* Мягкое жемчужное свечение под схемой. */}
        <radialGradient id={`pearl-halo-${idPrefix}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e9dced" stopOpacity="0.75" />
          <stop offset="70%" stopColor="#efe6ef" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f6f1f4" stopOpacity="0" />
        </radialGradient>
        <marker id={`${idPrefix}-arrow-blue`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#7b89b8" />
        </marker>
        <marker id={`${idPrefix}-arrow-red`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#c07f8d" />
        </marker>
      </defs>

      <rect x="0" y="0" width={SIZE} height={HEIGHT} rx="18" fill={`url(#pearl-bg-${idPrefix})`} />
      <circle cx={CX} cy={CY} r={R * 1.18} fill={`url(#pearl-halo-${idPrefix})`} />

      {/* Внешний восьмиугольник — рамка шкалы периода. */}
      <polygon
        points={octagonOuter.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={INK}
        strokeWidth="1.5"
      />
      {/* Лучи от углов к внешней рамке: восемь секторов по десять лет. */}
      {VERTEX_ANGLES.map((angle) => (
        <g key={`spoke-${angle}`}>{line(polar(angle, R), polar(angle, R_SECTOR), 1.1)}</g>
      ))}

      {/* Два квадрата и диагонали: тонкие тёмные линии. */}
      <polygon
        points={[0, 90, 180, 270]
          .map((angle) => polar(angle, R))
          .map((p) => `${p.x},${p.y}`)
          .join(" ")}
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
      />
      <polygon
        points={[45, 135, 225, 315]
          .map((angle) => polar(angle, R))
          .map((p) => `${p.x},${p.y}`)
          .join(" ")}
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
      />
      {[0, 45, 90, 135].map((angle) => (
        <g key={`diag-${angle}`}>{line(polar(angle, R), polar(angle + 180, R), 2)}</g>
      ))}
      {/* Оси от углов к центру. */}
      {VERTEX_ANGLES.map((angle) => (
        <g key={`axis-${angle}`}>{line(polar(angle, R), { x: CX, y: CY }, 1.1)}</g>
      ))}
      {/* Средний круг: зона комфорта. */}
      <circle cx={CX} cy={CY} r={R * 0.62} fill="none" stroke={INK} strokeWidth="1.1" />
      <circle cx={CX} cy={CY} r={R * 0.36} fill="none" stroke={INK} strokeOpacity="0.2" strokeWidth="1" />

      {/* Линии рода и каналов со стрелками — как в классической схеме. */}
      {!compact ? (
        <>
          {(() => {
            const from = polar(315, R * 0.34);
            const to = polar(315, R * 0.92);
            return (
              <g>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#7b89b8"
                  strokeWidth="3"
                  markerEnd={`url(#${idPrefix}-arrow-blue)`}
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 10}
                  textAnchor="middle"
                  transform={`rotate(-45 ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 10})`}
                  fontFamily={SANS}
                  fontSize="12"
                  fill="#65729c"
                >
                  линия мужского рода
                </text>
              </g>
            );
          })()}
          {(() => {
            const from = polar(45, R * 0.34);
            const to = polar(45, R * 0.92);
            return (
              <g>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#c07f8d"
                  strokeWidth="3"
                  markerEnd={`url(#${idPrefix}-arrow-red)`}
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 10}
                  textAnchor="middle"
                  transform={`rotate(45 ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 10})`}
                  fontFamily={SANS}
                  fontSize="12"
                  fill="#a76976"
                >
                  линия женского рода
                </text>
              </g>
            );
          })()}
          {/* Деньги и любовь: значки на схеме. */}
          <text x={CX + 150} y={CY + 84} fontFamily={SANS} fontSize="34" fontWeight="700" fill="#8aa98c">
            $
          </text>
          <text x={CX - 156} y={CY + 106} fontSize="26" fill="#c98a96" textAnchor="middle">
            ♥
          </text>
          <rect x={CX - 132} y={CY + 80} width="264" height="28" rx="14" fill="#fffdfa" opacity="0.92" />
          <text
            x={CX}
            y={CY + 100}
            textAnchor="middle"
            fontFamily={SANS}
            fontSize="13"
            letterSpacing="0.16em"
            fill={INK_SOFT}
          >
            ЗОНА КОМФОРТА
          </text>
        </>
      ) : null}

      {lifeEls}
      {nodeEls}

      {/* Центр — зона комфорта: жемчужно-золотой круг. */}
      <g opacity={centerActive ? 1 : active ? 0.3 : 1} {...interactive("center", `${centerValue.title}: ${centerValue.arcanumTitle}`)}>
        {centerActive ? (
          <circle cx={CX} cy={CY} r={centerR + 12} fill="none" stroke={PAINT.plum.ring} strokeWidth="2.4" strokeDasharray="6 5" />
        ) : null}
        {selected === "center" ? (
          <circle cx={CX} cy={CY} r={centerR + 8} fill="none" stroke={PAINT.plum.ring} strokeWidth="3" />
        ) : null}
        <circle cx={CX} cy={CY} r={centerR} fill={PAINT.gold.fill} stroke="#cbb083" strokeWidth="2" />
        <circle cx={CX} cy={CY} r={centerR} fill={`url(#pearl-sheen-${idPrefix})`} />
        <circle cx={CX} cy={CY} r={centerR + 6} fill="none" stroke="#e3d2b4" strokeWidth="1.2" />
        <text
          x={CX}
          y={CY + 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SANS}
          fontWeight="700"
          fontSize={compact ? 40 : 52}
          fill={INK}
        >
          {centerValue.arcanum}
        </text>
        <title>{`${centerValue.title}: ${centerValue.arcanumTitle}`}</title>
      </g>

      {/* Энергия года — в левом верхнем углу холста, как подпись. */}
      {compact ? null : (
        <g
          opacity={active && !active.has("year") ? 0.3 : 1}
          {...interactive("year", `${chart.yearEnergy.title}: ${chart.yearEnergy.arcanumTitle}`)}
        >
          {selected === "year" ? (
            <rect x={64} y={54} width="330" height="76" rx="12" fill="none" stroke={PAINT.plum.ring} strokeWidth="3" />
          ) : null}
          <rect x={70} y={60} width="318" height="64" rx="10" fill="#fffdfa" stroke="#cdbfae" strokeWidth="1.4" />
          <circle cx={110} cy={92} r="22" fill={PAINT.peach.fill} stroke={PAINT.peach.ring} strokeWidth="1.6" />
          <circle cx={110} cy={92} r="22" fill={`url(#pearl-sheen-${idPrefix})`} />
          <text x={110} y={93} textAnchor="middle" dominantBaseline="central" fontFamily={SANS} fontWeight="700" fontSize="19" fill={INK}>
            {chart.yearEnergy.arcanum}
          </text>
          <text x={144} y={98} fontFamily={SANS} fontSize="15" fill={INK}>
            энергия {chart.yearEnergy.year} года
          </text>
        </g>
      )}

      {/* Легенда цветов — мелко, под схемой. */}
      {compact ? null : (
        <g transform={`translate(70 ${HEIGHT - 96})`}>
          {LEGEND.map(([fillColor, ringColor, text], index) => (
            <g key={text} transform={`translate(${(index % 4) * 430} ${Math.floor(index / 4) * 26})`}>
              <circle cx="0" cy="-4" r="8" fill={fillColor} stroke={ringColor} strokeWidth="1.2" />
              <text x="16" y="0" fontFamily={SANS} fontSize="14" fill={INK_SOFT}>
                {text}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
