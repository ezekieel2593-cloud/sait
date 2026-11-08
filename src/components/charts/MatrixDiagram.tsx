import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { MatrixChart } from "@/lib/matrix/engine";

/**
 * Схема Матрицы судьбы в классическом виде — как в онлайн-калькуляторах:
 *
 * - восемь больших кругов-углов в двойной чёрной обводке;
 * - цветные круги внутренних точек (род, деньги, отношения, таланты);
 * - два квадрата и диагонали, тонкие чёрные линии;
 * - по краю — восемь секторов с разметкой периода: числа энергий, крошечные
 *   подписи диапазона лет и крупные «5 лет», «15 лет», «55 лет» … на середине
 *   каждого десятилетия;
 * - по диагоналям из центра идут линии рода с подписями и стрелками,
 *   деньги и любовь отмечены значками $ и ♥.
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
/** Радиус, на котором стоят числа периода. */
const R_ENERGY = R + 62;
/** Радиус крошечных подписей «12-13» и крупных «5 лет». */
const R_AGES = R + 132;

type NodeShape = {
  key: string;
  /** Угол от «верх» по часовой стрелке. */
  angle: number;
  radius: number;
  r: number;
  /**
   * corner — большой круг в двойной обводке (углы квадратов);
   * core    — центр в золотой заливке;
   * inner   — цветной круг с белой цифрой.
   */
  kind: "corner" | "core" | "inner";
  /** Цвет заливки (для inner) — из классической палитры. */
  paint?: PaintKey;
};

/** Палитра как в классических калькуляторах: насыщенные цвета, белые цифры. */
const PAINT = {
  blue: { fill: "#2563eb", ring: "#1e4fbf" },
  sky: { fill: "#0ea5e9", ring: "#0284c7" },
  cyan: { fill: "#06b6d4", ring: "#0891b2" },
  teal: { fill: "#0d9488", ring: "#0f766e" },
  green: { fill: "#16a34a", ring: "#15803d" },
  lime: { fill: "#65a30d", ring: "#4d7c0f" },
  gold: { fill: "#f4c430", ring: "#d9a917" },
  orange: { fill: "#f59e0b", ring: "#d97706" },
  red: { fill: "#ef4444", ring: "#dc2626" },
  rose: { fill: "#e11d48", ring: "#be123c" },
  pink: { fill: "#ec4899", ring: "#db2777" },
  purple: { fill: "#8b5cf6", ring: "#7c3aed" },
  violet: { fill: "#7c3aed", ring: "#6d28d9" },
  indigo: { fill: "#4f46e5", ring: "#4338ca" },
} as const;

type PaintKey = keyof typeof PAINT;

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

  // Центр рода: родовой центр и общая точка — рядом с центром, как «12» и «8».
  { key: "family-core", angle: 90, radius: 132, r: 27, kind: "inner", paint: "purple" },
  { key: "family-force", angle: 90, radius: 210, r: 25, kind: "inner", paint: "orange" },

  // Вертикаль вверх: удовольствия → таланты → вторая аджна.
  { key: "pleasures", angle: 0, radius: 128, r: 25, kind: "inner", paint: "green" },
  { key: "talent-line", angle: 0, radius: 240, r: 25, kind: "inner", paint: "cyan" },
  { key: "talent-second", angle: 0, radius: 330, r: 27, kind: "inner", paint: "blue" },

  // Горизонталь влево: страхи → внуки → дети.
  { key: "fears", angle: 270, radius: 150, r: 25, kind: "inner", paint: "green" },
  { key: "person-support", angle: 270, radius: 250, r: 24, kind: "inner", paint: "sky" },
  { key: "person-experience", angle: 270, radius: 340, r: 24, kind: "inner", paint: "blue" },

  // Горизонталь вправо: деньги.
  { key: "money-entry", angle: 90, radius: 300, r: 25, kind: "inner", paint: "orange" },
  { key: "money-middle", angle: 90, radius: 372, r: 24, kind: "inner", paint: "orange" },

  // Вертикаль вниз: готовность к отношениям и кармический хвост.
  { key: "love-entry", angle: 180, radius: 150, r: 26, kind: "inner", paint: "orange" },
  { key: "love-middle", angle: 180, radius: 300, r: 25, kind: "inner", paint: "red" },

  // Диагонали рода: таланты и деньги линий отца и матери.
  { key: "family-talent-father", angle: 315, radius: 230, r: 24, kind: "inner", paint: "blue" },
  { key: "family-material-father", angle: 315, radius: 330, r: 24, kind: "inner", paint: "sky" },
  { key: "family-talent-mother", angle: 45, radius: 230, r: 24, kind: "inner", paint: "blue" },
  { key: "family-material-mother", angle: 45, radius: 330, r: 24, kind: "inner", paint: "sky" },
  { key: "family-spirit-father", angle: 135, radius: 230, r: 24, kind: "inner", paint: "teal" },
  { key: "family-balance", angle: 135, radius: 330, r: 24, kind: "inner", paint: "lime" },
  { key: "family-spirit-mother", angle: 225, radius: 230, r: 24, kind: "inner", paint: "teal" },
  { key: "family-support", angle: 225, radius: 330, r: 24, kind: "inner", paint: "purple" },

  // Нижний правый сектор: пара, отношения, профессия.
  { key: "shared", angle: 135, radius: 150, r: 24, kind: "inner", paint: "indigo" },
  { key: "love-partner", angle: 158, radius: 254, r: 23, kind: "inner", paint: "pink" },
  { key: "money-profession", angle: 112, radius: 254, r: 23, kind: "inner", paint: "lime" },
];

/** Легенда внутренних точек — расшифровка номеров и цветов под схемой. */
const INNER_LEGEND: [string, string][] = [
  ["#8b5cf6", "родовой центр и общий центр квадратов"],
  ["#16a34a", "страхи и удовольствия"],
  ["#2563eb", "таланты и способности"],
  ["#f59e0b", "деньги, отношения, год"],
  ["#ef4444", "готовность к отношениям"],
  ["#0d9488", "духовные программы рода"],
  ["#ec4899", "характер пары"],
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

/** Крошечная подпись диапазона: «12-13». */
function rangeLabel(start: number): string {
  const from = Number.isInteger(start) ? String(start) : String(start).replace(".", ",");
  const to = Number.isInteger(start + 1.25) ? String(start + 1.25) : String(start + 1.25).replace(".", ",");
  return `${from}-${to}`;
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
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1b1b1b" strokeWidth={width} strokeLinecap="round" />
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

  /** Точка на стороне: t = 0 у первого угла, 1 у второго, плюс смещение наружу. */
  const sidePoint = (index: number, t: number, offset: number) => {
    const from = vertex(index);
    const to = vertex((index + 1) % 8);
    const normal = sideNormal(from, to);
    return {
      x: from.x + (to.x - from.x) * t + normal.x * offset,
      y: from.y + (to.y - from.y) * t + normal.y * offset,
      rotation: (() => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        return deg > 90 || deg < -90 ? deg + 180 : deg;
      })(),
    };
  };

  const octagon = VERTEX_ANGLES.map((angle) => polar(angle, R));
  const octagonOuter = VERTEX_ANGLES.map((angle) => polar(angle, R_SECTOR));

  /* --------------------------- линия жизни --------------------------- */

  const lifeEls = compact
    ? null
    : chart.lifeLine.map((entry) => {
        const sector = Math.floor(entry.age / 10 + 0.0001);
        const t = entry.kind === "vertex" ? 0 : (entry.age - sector * 10) / 10;
        const mid = entry.age % 10 === 5;
        const spot = sidePoint(sector, t, 24);
        const ageSpot = sidePoint(sector, t, 92);
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
              <circle cx={spot.x} cy={spot.y} r="17" fill="none" stroke="#2563eb" strokeWidth="2.6" />
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
                fill="#1b1b1b"
              >
                {entry.arcanum}
              </text>
            </g>
            {entry.kind === "vertex" || !mid ? null : (
              <g transform={`rotate(${ageSpot.rotation} ${ageSpot.x} ${ageSpot.y})`}>
                <text
                  x={ageSpot.x}
                  y={ageSpot.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily={SANS}
                  fontSize="15"
                  fontWeight="700"
                  fill="#111111"
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
          <circle cx={center.x} cy={center.y} r={node.r + 12} fill="none" stroke="#2563eb" strokeWidth="2.4" strokeDasharray="6 5" />
        ) : null}
        {node.kind === "corner" ? (
          <>
            {isSelected ? (
              <circle cx={center.x} cy={center.y} r={node.r + 9} fill="none" stroke="#2563eb" strokeWidth="3" />
            ) : null}
            {/* Двойная чёрная обводка углов — как в классической схеме. */}
            <circle cx={center.x} cy={center.y} r={node.r} fill="#ffffff" stroke="#1b1b1b" strokeWidth="5" />
            <circle cx={center.x} cy={center.y} r={node.r - 8} fill="none" stroke="#1b1b1b" strokeWidth="1.4" />
            <text
              x={center.x}
              y={center.y + 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={SANS}
              fontWeight="700"
              fontSize={node.r * 0.82}
              fill="#1b1b1b"
            >
              {value.arcanum}
            </text>
          </>
        ) : (
          (() => {
            const paint = PAINT[node.paint ?? "blue"];
            return (
              <>
                {isSelected ? (
                  <circle cx={center.x} cy={center.y} r={node.r + 6} fill="none" stroke="#2563eb" strokeWidth="3" />
                ) : null}
                <circle cx={center.x} cy={center.y} r={node.r + 4} fill={paint.fill} opacity="0.25" />
                <circle cx={center.x} cy={center.y} r={node.r} fill={paint.fill} stroke={paint.ring} strokeWidth="1.5" />
                <text
                  x={center.x}
                  y={center.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily={SANS}
                  fontWeight="700"
                  fontSize={node.r * 0.82}
                  fill="#ffffff"
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
      <rect x="0" y="0" width={SIZE} height={HEIGHT} rx="18" fill="#ffffff" />

      {/* Внешний восьмиугольник — рамка шкалы периода. */}
      <polygon
        points={octagonOuter.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="#1b1b1b"
        strokeWidth="1.6"
      />
      {/* Лучи от углов к внешней рамке: восемь секторов по десять лет. */}
      {VERTEX_ANGLES.map((angle) => (
        <g key={`spoke-${angle}`}>{line(polar(angle, R), polar(angle, R_SECTOR), 1.2)}</g>
      ))}

      {/* Два квадрата и диагонали: тонкие чёрные линии. */}
      <polygon
        points={[0, 90, 180, 270]
          .map((angle) => polar(angle, R))
          .map((p) => `${p.x},${p.y}`)
          .join(" ")}
        fill="none"
        stroke="#1b1b1b"
        strokeWidth="2.4"
      />
      <polygon
        points={[45, 135, 225, 315]
          .map((angle) => polar(angle, R))
          .map((p) => `${p.x},${p.y}`)
          .join(" ")}
        fill="none"
        stroke="#1b1b1b"
        strokeWidth="2.4"
      />
      {[0, 45, 90, 135].map((angle) => (
        <g key={`diag-${angle}`}>
          {line(polar(angle, R), polar(angle + 180, R), 2)}
        </g>
      ))}
      {/* Оси от углов к центру. */}
      {VERTEX_ANGLES.map((angle) => (
        <g key={`axis-${angle}`}>{line(polar(angle, R), { x: CX, y: CY }, 1.1)}</g>
      ))}
      {/* Средний круг: зона комфорта. */}
      <circle cx={CX} cy={CY} r={R * 0.62} fill="none" stroke="#1b1b1b" strokeWidth="1.1" />
      <circle cx={CX} cy={CY} r={R * 0.36} fill="none" stroke="rgba(27,27,27,0.18)" strokeWidth="1" />

      {/* Линии рода и каналов со стрелками — как в классической схеме. */}
      {!compact ? (
        <>
          {(() => {
            const from = polar(315, R * 0.34);
            const to = polar(315, R * 0.92);
            return (
              <g>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#4f6ed7" strokeWidth="3" markerEnd={`url(#${idPrefix}-arrow-blue)`} />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 10}
                  textAnchor="middle"
                  transform={`rotate(-45 ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 10})`}
                  fontFamily={SANS}
                  fontSize="12"
                  fill="#4f6ed7"
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
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#e0584f" strokeWidth="3" markerEnd={`url(#${idPrefix}-arrow-red)`} />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 10}
                  textAnchor="middle"
                  transform={`rotate(45 ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 10})`}
                  fontFamily={SANS}
                  fontSize="12"
                  fill="#e0584f"
                >
                  линия женского рода
                </text>
              </g>
            );
          })()}
          {/* Деньги и любовь: значки на схеме. */}
          <text x={CX + 150} y={CY + 78} fontFamily={SANS} fontSize="40" fontWeight="700" fill="#3ecf4a">
            $
          </text>
          <text x={CX + 62} y={CY + 118} fontSize="34" fill="#ef2b2b" textAnchor="middle">
            ♥
          </text>
          <text x={CX} y={CY + 158} textAnchor="middle" fontFamily={SANS} fontSize="11.5" letterSpacing="0.06em" fill="#4b5563">
            ЗОНА КОМФОРТА
          </text>
        </>
      ) : null}

      <defs>
        <marker id={`${idPrefix}-arrow-blue`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#4f6ed7" />
        </marker>
        <marker id={`${idPrefix}-arrow-red`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#e0584f" />
        </marker>
      </defs>

      {lifeEls}
      {nodeEls}

      {/* Центр — зона комфорта: золотой круг с тёмной цифрой. */}
      <g opacity={centerActive ? 1 : active ? 0.3 : 1} {...interactive("center", `${centerValue.title}: ${centerValue.arcanumTitle}`)}>
        {centerActive ? (
          <circle cx={CX} cy={CY} r={centerR + 12} fill="none" stroke="#2563eb" strokeWidth="2.4" strokeDasharray="6 5" />
        ) : null}
        {selected === "center" ? (
          <circle cx={CX} cy={CY} r={centerR + 8} fill="none" stroke="#2563eb" strokeWidth="3" />
        ) : null}
        <circle cx={CX} cy={CY} r={centerR} fill={PAINT.gold.fill} stroke="#ffffff" strokeWidth="4" />
        <circle cx={CX} cy={CY} r={centerR + 4} fill="none" stroke="#e8c96a" strokeWidth="1.6" />
        <text
          x={CX}
          y={CY + 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SANS}
          fontWeight="700"
          fontSize={compact ? 40 : 52}
          fill="#1b1b1b"
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
            <rect x={64} y={54} width="330" height="76" rx="10" fill="none" stroke="#2563eb" strokeWidth="3" />
          ) : null}
          <rect x={70} y={60} width="318" height="64" rx="8" fill="#ffffff" stroke="#1b1b1b" strokeWidth="1.6" />
          <circle cx={110} cy={92} r="22" fill={PAINT.orange.fill} stroke={PAINT.orange.ring} strokeWidth="1.6" />
          <text x={110} y={93} textAnchor="middle" dominantBaseline="central" fontFamily={SANS} fontWeight="700" fontSize="19" fill="#ffffff">
            {chart.yearEnergy.arcanum}
          </text>
          <text x={144} y={98} fontFamily={SANS} fontSize="15" fill="#1b1b1b">
            энергия {chart.yearEnergy.year} года
          </text>
        </g>
      )}

      {/* Легенда цветов — мелко, под схемой. */}
      {compact ? null : (
        <g transform={`translate(70 ${HEIGHT - 96})`}>
          {LEGEND.map(([color, text], index) => (
            <g key={text} transform={`translate(${(index % 4) * 430} ${Math.floor(index / 4) * 26})`}>
              <circle cx="0" cy="-4" r="8" fill={color} />
              <text x="16" y="0" fontFamily={SANS} fontSize="14" fill="#4b5563">
                {text}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
