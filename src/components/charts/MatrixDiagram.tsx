import type { MatrixChart } from "@/lib/matrix/engine";

/**
 * Полная схема Матрицы судьбы: два квадрата (личный и родовой), центр, точки
 * каналов, таланта и опоры, а по кругу — линия жизни: возраст человека и энергия
 * каждого периода от 0 до 80 лет.
 *
 * Дизайн — по образцу классической схемы: пастельные круги с номером энергии,
 * тонкие линии, подписи роли рядом с кругом. Названий карт таро нет:
 * только номер и слово «энергия».
 *
 * `highlight` — ключи точек, которые нужно подсветить (например, из блока
 * «Матрица простыми словами»): остальные круги при этом приглушаются.
 */

const SIZE = 880;
const HEIGHT = 960;
const CX = SIZE / 2;
const CY = 428;
/** Радиус восьмиугольника: на нём стоят восемь углов квадратов. */
const R = 250;
/** Внешнее кольцо точек на осях (ближе к углу). */
const R_INNER = 170;
/** Внутреннее кольцо точек на осях (ближе к центру). */
const R_MIDDLE = 96;

type NodeShape = {
  key: string;
  /** Угол от «верх» по часовой стрелке. */
  angle: number;
  radius: number;
  r: number;
  /** Подпись: угол, радиус и выравнивание. */
  caption?: { angle: number; radius: number; anchor?: "start" | "middle" | "end" };
  /** Номер в легенде — для точек внутри восьмиугольника. */
  badge?: number;
  /** Куда ставить бейдж относительно круга. */
  badgeSide?: "right" | "below" | "left" | "above";
};

const NODES: NodeShape[] = [
  // Восемь углов: четыре точки личного квадрата и четыре родовых угла.
  { key: "B", angle: 0, radius: R, r: 35, caption: { angle: 0, radius: 206 } },
  { key: "family-top-right", angle: 45, radius: R, r: 28, caption: { angle: 45, radius: 186 } },
  { key: "C", angle: 90, radius: R, r: 35, caption: { angle: 124, radius: 192 } },
  { key: "family-bottom-right", angle: 135, radius: R, r: 28, caption: { angle: 135, radius: 186 } },
  { key: "D", angle: 180, radius: R, r: 35, caption: { angle: 180, radius: 206 } },
  { key: "family-bottom-left", angle: 225, radius: R, r: 28, caption: { angle: 225, radius: 186 } },
  { key: "A", angle: 270, radius: R, r: 35, caption: { angle: 293, radius: 190 } },
  { key: "family-top-left", angle: 315, radius: R, r: 28, caption: { angle: 315, radius: 186 } },

  // Оси: талант — вверх, деньги — вправо, отношения — вниз, личная опора — влево.
  { key: "talent-second", angle: 0, radius: R_INNER, r: 24, badge: 2, badgeSide: "right" },
  { key: "talent-line", angle: 0, radius: R_MIDDLE, r: 23, badge: 1, badgeSide: "right" },
  { key: "money-middle", angle: 90, radius: R_INNER, r: 24, badge: 4, badgeSide: "below" },
  { key: "money-entry", angle: 90, radius: R_MIDDLE, r: 23, badge: 3, badgeSide: "below" },
  { key: "love-middle", angle: 180, radius: R_INNER, r: 24, badge: 6, badgeSide: "right" },
  { key: "love-entry", angle: 180, radius: R_MIDDLE, r: 23, badge: 5, badgeSide: "below" },
  { key: "person-experience", angle: 270, radius: R_INNER, r: 24, badge: 8, badgeSide: "below" },
  { key: "person-support", angle: 270, radius: R_MIDDLE, r: 23, badge: 7, badgeSide: "below" },

  // Опорные точки рода и пересечения каналов — во внутреннем ромбе.
  { key: "family-force", angle: 315, radius: 84, r: 21, badge: 9, badgeSide: "above" },
  { key: "shared", angle: 135, radius: 100, r: 21, badge: 10, badgeSide: "below" },
];

/** Легенда внутренних точек: номер → что означает. */
const INNER_LEGEND: [number, string][] = [
  [1, "личные таланты"],
  [2, "развитие таланта"],
  [3, "вход в деньги"],
  [4, "удержание денег"],
  [5, "отношения"],
  [6, "устойчивость пары"],
  [7, "личная опора"],
  [8, "опыт личности"],
];
/** Подписи углов: что читают в этой точке. */
const CAPTIONS: Record<string, string> = {
  A: "как тебя видят",
  B: "таланты",
  C: "родовая программа",
  D: "кармическая задача",
  "family-top-left": "род: линия отца",
  "family-top-right": "род: линия матери",
  "family-bottom-right": "род: реализация",
  "family-bottom-left": "род: унаследованное",
};

const DIAMOND_LEGEND: [number, string][] = [
  [9, "сила рода"],
  [10, "общая точка каналов"],
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

const RAD = Math.PI / 180;

function polar(angle: number, radius: number) {
  return {
    x: CX + Math.sin(angle * RAD) * radius,
    y: CY - Math.cos(angle * RAD) * radius,
  };
}

/** Углы восьмиугольника по часовой стрелке — в том же порядке, что линия жизни. */
const VERTEX_ANGLES = [270, 315, 0, 45, 90, 135, 180, 225];

export const MATRIX_DIAGRAM_KEYS = [
  ...NODES.map((node) => node.key),
  "center",
  "year",
];

/** Возраст для подписи: 0, 2,5, 5 … 75 лет. */
function ageLabel(age: number): string {
  if (age === 0) return "0 лет";
  if (Number.isInteger(age)) return `${age} лет`;
  return `${String(age).replace(".", ",")} лет`;
}

export function MatrixDiagram({
  chart,
  compact = false,
  highlight,
  idPrefix = "mx2",
}: {
  chart: MatrixChart;
  compact?: boolean;
  /** Ключи точек для подсветки; пусто — показываем все одинаково. */
  highlight?: string[] | null;
  /** Уникальный префикс id — если на странице две схемы. */
  idPrefix?: string;
}) {
  const active = highlight && highlight.length > 0 ? new Set(highlight) : null;
  const dim = (key: string) => (active && !active.has(key) ? 0.32 : 1);

  const point = (key: string) => (key === "year" ? chart.yearEnergy : chart.byKey[key] ?? null);

  const vertex = (index: number) => polar(VERTEX_ANGLES[index]!, R);

  /** Точка на отрезке между двумя углами: t = 0 у первого угла, 1 у второго. */
  const edgePoint = (index: number, t: number) => {
    const from = vertex(index);
    const to = vertex((index + 1) % 8);
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  };

  const outward = (p: { x: number; y: number }) => {
    const dx = p.x - CX;
    const dy = p.y - CY;
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
  };

  const offset = (p: { x: number; y: number }, distance: number) => {
    const normal = outward(p);
    return { x: p.x + normal.x * distance, y: p.y + normal.y * distance };
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

  const nodeEls = NODES.map((node) => {
    const value = point(node.key);
    if (!value) return null;
    const center = polar(node.angle, node.radius);
    const colors = COLORS[node.key] ?? COLORS.center!;
    const isActive = active?.has(node.key) ?? false;

    return (
      <g key={node.key} opacity={dim(node.key)}>
        {isActive ? (
          <circle cx={center.x} cy={center.y} r={node.r + 9} fill="none" stroke="#3b7b83" strokeWidth="2" strokeDasharray="5 4" />
        ) : null}
        <circle cx={center.x} cy={center.y + 3} r={node.r} fill="rgba(70,52,60,0.10)" />
        <circle cx={center.x} cy={center.y} r={node.r} fill={colors.fill} stroke={colors.ring} strokeWidth="1.4" />
        <circle cx={center.x - node.r * 0.3} cy={center.y - node.r * 0.34} r={node.r * 0.52} fill="rgba(255,255,255,0.45)" />
        <text
          x={center.x}
          y={center.y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontWeight="600"
          fontSize={compact ? node.r * 0.78 : node.r * 0.92}
          fill={colors.text}
        >
          {value.arcanum}
        </text>
        {compact ? null : node.caption ? (
          <text
            x={polar(node.caption.angle, node.caption.radius).x}
            y={polar(node.caption.angle, node.caption.radius).y}
            textAnchor={node.caption.anchor ?? "middle"}
            dominantBaseline="central"
            fontSize="11"
            letterSpacing="0.01em"
            fill="#6a5b62"
            stroke="#fdf8f4"
            strokeWidth="3.4"
            paintOrder="stroke"
          >
            {CAPTIONS[node.key]}
          </text>
        ) : null}
        {compact || !node.badge ? null : (() => {
          const side = node.badgeSide ?? "right";
          const bx =
            side === "right" ? center.x + node.r + 11 : side === "left" ? center.x - node.r - 11 : center.x;
          const by =
            side === "below" ? center.y + node.r + 11 : side === "above" ? center.y - node.r - 11 : center.y;
          return (
            <g>
              <circle cx={bx} cy={by} r="8" fill="#fdf8f4" stroke="rgba(120,140,150,0.55)" strokeWidth="1" />
              <text x={bx} y={by + 1} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#4f6b74">
                {node.badge}
              </text>
            </g>
          );
        })()}
        <title>{`${value.title}: ${value.arcanumTitle}`}</title>
      </g>
    );
  });

  // Линия жизни: в каждом десятилетии три промежуточные точки (2,5 · 5 · 7,5 года).
  const lifeEls = compact
    ? null
    : chart.lifeLine.map((entry) => {
        if (entry.kind === "vertex") return null;
        const index = Math.floor(entry.age / 10);
        const t = entry.kind === "middle" ? 0.5 : entry.age % 10 === 2.5 ? 0.25 : 0.75;
        const base = edgePoint(index, t);
        const normal = edgeNormal(index);
        const spot = { x: base.x + normal.x * 32, y: base.y + normal.y * 32 };
        const ageSpot = { x: base.x + normal.x * 74, y: base.y + normal.y * 74 };
        return (
          <g key={`life-${entry.age}`} opacity={active ? 0.32 : 1}>
            <circle cx={spot.x} cy={spot.y} r="11.5" fill="#fdf8f4" stroke="rgba(150,128,136,0.45)" strokeWidth="1" />
            <text
              x={spot.x}
              y={spot.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11.5"
              fontWeight="600"
              fill="#5b4750"
            >
              {entry.arcanum}
            </text>
            {entry.kind === "middle" ? (
              <text x={ageSpot.x} y={ageSpot.y + 1} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#8b7d83">
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
          const spot = polar(VERTEX_ANGLES[index]!, R + 52);
          return (
            <text
              key={`age-${entry.age}`}
              x={spot.x}
              y={spot.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fill="#8b7d83"
              opacity={active ? 0.32 : 1}
            >
              {ageLabel(entry.age)}
            </text>
          );
        });

  const centerValue = chart.byKey.center;
  const centerColors = COLORS.center!;
  const centerActive = active?.has("center") ?? false;

  const line = (a: { x: number; y: number }, b: { x: number; y: number }, style: string, width = 1, dash?: string) => (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={style}
      strokeWidth={width}
      strokeDasharray={dash}
      strokeLinecap="round"
    />
  );

  const octagon = VERTEX_ANGLES.map((angle) => polar(angle, R));
  const squares = [
    [0, 90, 180, 270],
    [45, 135, 225, 315],
  ];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Полная схема Матрицы судьбы: центр ${chart.byKey.center.arcanumTitle}, личность ${chart.byKey.A.arcanumTitle}, талант ${chart.byKey.B.arcanumTitle}, кармическая задача ${chart.byKey.D.arcanumTitle}; по кругу — линия жизни с 0 до 80 лет`}
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
        strokeWidth="1.2"
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

      {/* Линия жизни по кругу: числа периодов и возраст. */}
      {lifeEls}
      {lifeVertices}

      {nodeEls}

      {/* Центр — зона комфорта. */}
      <g opacity={centerActive ? 1 : active ? 0.32 : 1}>
        {centerActive ? (
          <circle cx={CX} cy={CY} r={44 + 10} fill="none" stroke="#3b7b83" strokeWidth="2" strokeDasharray="5 4" />
        ) : null}
        <circle cx={CX} cy={CY + 3} r="46" fill="rgba(70,52,60,0.10)" />
        <circle cx={CX} cy={CY} r="46" fill={centerColors.fill} stroke={centerColors.ring} strokeWidth="1.6" />
        <circle cx={CX - 14} cy={CY - 16} r="24" fill="rgba(255,255,255,0.5)" />
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontWeight="600"
          fontSize={compact ? 34 : 44}
          fill={centerColors.text}
        >
          {centerValue.arcanum}
        </text>
        {compact ? null : (
          <text x={CX} y={CY + 68} textAnchor="middle" fontSize="12.5" fill="#6a5b62">
            зона комфорта
          </text>
        )}
        <title>{`${centerValue.title}: ${centerValue.arcanumTitle}`}</title>
      </g>

      {/* Энергия года и подсказка по цветам — внизу, вне восьмиугольника. */}
      {compact ? null : (
        <>
          <g opacity={active && !active.has("year") ? 0.32 : 1}>
            <rect x={CX - 118} y={HEIGHT - 200} width="236" height="42" rx="21" fill="#fffaf4" stroke="rgba(207,188,166,0.9)" />
            <circle cx={CX - 88} cy={HEIGHT - 179} r="16" fill={COLORS.year!.fill} stroke={COLORS.year!.ring} strokeWidth="1.2" />
            <text
              x={CX - 88}
              y={HEIGHT - 178}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="15"
              fontFamily="'Cormorant Garamond', Georgia, serif"
              fontWeight="600"
              fill={COLORS.year!.text}
            >
              {chart.yearEnergy.arcanum}
            </text>
            <text x={CX - 64} y={HEIGHT - 174} fontSize="12" fill="#6a5b62">
              энергия {chart.yearEnergy.year} года
            </text>
          </g>
          {/* Номера внутренних точек: расшифровка в легенде. */}
          {[INNER_LEGEND.slice(0, 4), INNER_LEGEND.slice(4), DIAMOND_LEGEND].map((row, rowIndex) => (
            <g key={`legend-${rowIndex}`} transform={`translate(${CX - 316} ${HEIGHT - 148 + rowIndex * 22})`}>
              {row.map(([num, label], index) => (
                <g key={num} transform={`translate(${index * 168} 0)`}>
                  <circle cx="0" cy="-4" r="8" fill="#fdf8f4" stroke="rgba(120,140,150,0.55)" strokeWidth="1" />
                  <text x="0" y="-3" textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#4f6b74">
                    {num}
                  </text>
                  <text x="13" y="0" fontSize="10.5" fill="#7b6c73">
                    {label}
                  </text>
                </g>
              ))}
            </g>
          ))}

          <g transform={`translate(${CX - 306} ${HEIGHT - 44})`}>
            {(
              [
                ["#c9b4ea", "личность"],
                ["#cfe3ee", "род"],
                ["#c4c0ee", "талант"],
                ["#bfe4c9", "деньги"],
                ["#f8cbdc", "отношения"],
                ["#f7d98a", "комфорт"],
              ] as const
            ).map(([color, label], index) => {
              const x = index * 104;
              return (
                <g key={label} transform={`translate(${x} 0)`}>
                  <circle cx="0" cy="-4" r="6" fill={color} stroke="rgba(90,70,80,0.18)" />
                  <text x="11" y="0" fontSize="10.5" fill="#7b6c73">
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
