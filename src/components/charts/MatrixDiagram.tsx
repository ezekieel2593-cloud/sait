import type { MatrixChart } from "@/lib/matrix/engine";

/**
 * Полная схема Матрицы судьбы: восьмиугольник из двух квадратов, все 16 точек
 * расчёта, возрастные периоды по краям и подписи «что где читать».
 *
 * Дизайн — по образцу классической схемы: пастельные круги с номером энергии,
 * тонкие линии, подписи роли под каждым кругом. Названий карт таро нет:
 * только номер и слово «энергия».
 *
 * `highlight` — ключи точек, которые нужно подсветить (например, из блока
 * «Матрица простыми словами»): остальные круги при этом приглушаются.
 */

const SIZE = 720;
const HEIGHT = 842;
const CX = SIZE / 2;
const CY = 372;
/** Радиус восьмиугольника: на нём стоят восемь основных точек. */
const R = 252;
const R_INNER = 176;
const R_MIDDLE = 92;

type NodeShape = {
  key: string;
  /** Угол от «верх» по часовой стрелке. */
  angle?: number;
  radius?: number;
  /** Абсолютные координаты — для точек, которые не на луче. */
  x?: number;
  y?: number;
  r: number;
  caption: string;
  /** Куда ставить подпись относительно круга. */
  side: "above" | "below" | "left" | "right";
};

const NODES: NodeShape[] = [
  // Восемь вершин восьмиугольника: четыре главные точки и четыре родовых угла.
  { key: "B", angle: 0, radius: R, r: 38, caption: "таланты", side: "above" },
  { key: "family-top-right", angle: 45, radius: R, r: 30, caption: "род: линия матери", side: "below" },
  { key: "C", angle: 90, radius: R, r: 38, caption: "родовая программа", side: "below" },
  { key: "family-bottom-right", angle: 135, radius: R, r: 30, caption: "род: реализация", side: "below" },
  { key: "D", angle: 180, radius: R, r: 38, caption: "кармическая задача", side: "below" },
  { key: "family-bottom-left", angle: 225, radius: R, r: 30, caption: "род: унаследованное", side: "below" },
  { key: "A", angle: 270, radius: R, r: 38, caption: "как тебя видят", side: "below" },
  { key: "family-top-left", angle: 315, radius: R, r: 30, caption: "род: линия отца", side: "below" },
  // Внутреннее кольцо: опора рода и входы в каналы.
  { key: "family-force", angle: 0, radius: R_INNER, r: 26, caption: "опора рода", side: "below" },
  { key: "money-entry", angle: 90, radius: R_INNER, r: 26, caption: "кем работать", side: "above" },
  { key: "love-entry", angle: 180, radius: R_INNER, r: 26, caption: "отношения", side: "below" },
  { key: "shared", angle: 270, radius: R_INNER, r: 26, caption: "общая точка", side: "above" },
  // Ближе к центру — середины каналов.
  { key: "money-middle", angle: 90, radius: R_MIDDLE, r: 21, caption: "как удержать", side: "below" },
  { key: "love-middle", angle: 180, radius: R_MIDDLE, r: 21, caption: "устойчивость", side: "right" },
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
  shared: { fill: "#c3e6e6", ring: "#97c9c9", text: "#234a4a" },
  year: { fill: "#efe6da", ring: "#cfbca6", text: "#463a2b" },
};

/** Возрастные периоды: в методике жизнь делится на отрезки по 22 года. */
const AGE_LABELS: { angle: number; text: string }[] = [
  { angle: 45, text: "0–22 года" },
  { angle: 135, text: "22–44 года" },
  { angle: 225, text: "44–66 лет" },
  { angle: 315, text: "66–88 лет" },
];

const RAD = Math.PI / 180;

function polar(angle: number, radius: number) {
  return {
    x: CX + Math.sin(angle * RAD) * radius,
    y: CY - Math.cos(angle * RAD) * radius,
  };
}

export const MATRIX_DIAGRAM_KEYS = [
  ...NODES.map((node) => node.key),
  "center",
  "year",
];

export function MatrixDiagram({
  chart,
  compact = false,
  highlight,
}: {
  chart: MatrixChart;
  compact?: boolean;
  /** Ключи точек для подсветки; пусто — показываем все одинаково. */
  highlight?: string[] | null;
}) {
  const active = highlight && highlight.length > 0 ? new Set(highlight) : null;
  const dim = (key: string) => (active && !active.has(key) ? 0.32 : 1);

  const point = (key: string) =>
    key === "year" ? chart.yearEnergy : chart.byKey[key] ?? null;

  const filled = (key: string) => {
    const value = point(key);
    return value ? String(value.arcanum) : "—";
  };

  const nodeEls = NODES.map((node) => {
    const value = point(node.key);
    if (!value) return null;
    const center =
      node.x !== undefined && node.y !== undefined
        ? { x: node.x, y: node.y }
        : polar(node.angle ?? 0, node.radius ?? R);
    const colors = COLORS[node.key] ?? COLORS.center!;
    const isActive = active?.has(node.key) ?? false;

    // Подпись — рядом с кругом, с той стороны, где нет соседей.
    let captionX = center.x;
    let captionY = center.y + node.r + 15;
    let anchor: "middle" | "start" | "end" = "middle";
    if (node.side === "above") {
      captionY = center.y - node.r - 9;
    } else if (node.side === "below") {
      captionY = center.y + node.r + 15;
    } else if (node.side === "left") {
      captionX = center.x - node.r - 8;
      captionY = center.y + 4;
      anchor = "end";
    } else {
      captionX = center.x + node.r + 8;
      captionY = center.y + 4;
      anchor = "start";
    }

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
        {compact ? null : (
          <text
            x={captionX}
            y={captionY}
            textAnchor={anchor}
            fontSize="11.5"
            letterSpacing="0.02em"
            fill="#6a5b62"
          >
            {node.caption}
          </text>
        )}
        <title>{`${value.title}: ${value.arcanumTitle}`}</title>
      </g>
    );
  });

  // Центр рисуем последним, чтобы он был поверх линий.
  const centerValue = chart.byKey.center;
  const centerColors = COLORS.center!;
  const centerActive = active?.has("center") ?? false;

  const vertex = (angle: number) => polar(angle, R);
  const inner = (angle: number) => polar(angle, R_INNER);

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

  const octagon = [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => vertex(angle));
  const squares = [
    [0, 90, 180, 270],
    [45, 135, 225, 315],
  ];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Схема Матрицы судьбы: центр ${chart.byKey.center.arcanumTitle}, личность ${chart.byKey.A.arcanumTitle}, талант ${chart.byKey.B.arcanumTitle}, кармическая задача ${chart.byKey.D.arcanumTitle}`}
    >
      <defs>
        <radialGradient id="mx2-bg" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#fffefc" />
          <stop offset="1" stopColor="#f7f1ec" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={SIZE} height={HEIGHT} rx="26" fill="url(#mx2-bg)" />

      {/* Восьмиугольник и два квадрата — каркас схемы. */}
      <polygon
        points={octagon.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="rgba(122,108,112,0.35)"
        strokeWidth="1.2"
      />
      {squares.map((set, index) => (
        <polygon
          key={index}
          points={set
            .map((angle) => vertex(angle))
            .map((p) => `${p.x},${p.y}`)
            .join(" ")}
          fill="none"
          stroke="rgba(122,108,112,0.22)"
          strokeWidth="1"
        />
      ))}

      {/* Оси от вершин к центру. */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const from = vertex(angle);
        return (
          <g key={`axis-${angle}`}>{line(from, { x: CX, y: CY }, "rgba(122,108,112,0.16)", 0.9, "3 6")}</g>
        );
      })}

      {/* Каналы: деньги — вправо, отношения — вниз. */}
      {line(inner(90), { x: CX, y: CY }, "rgba(74,140,102,0.55)", 1.8)}
      {line(inner(180), { x: CX, y: CY }, "rgba(196,110,140,0.5)", 1.8)}

      {/* Возрастные периоды по краям. */}
      {AGE_LABELS.map((age) => {
        const position = polar(age.angle, R + 120);
        return (
          <g key={age.text}>
            <text
              x={position.x}
              y={position.y}
              textAnchor="middle"
              fontSize="11"
              fill="#8b7d83"
              letterSpacing="0.04em"
            >
              {age.text}
            </text>
          </g>
        );
      })}

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
      {!compact ? (
        <>
          <g opacity={active && !active.has("year") ? 0.32 : 1}>
            <rect x={CX - 118} y={HEIGHT - 126} width="236" height="42" rx="21" fill="#fffaf4" stroke="rgba(207,188,166,0.9)" />
            <circle cx={CX - 88} cy={HEIGHT - 105} r="16" fill={COLORS.year!.fill} stroke={COLORS.year!.ring} strokeWidth="1.2" />
            <text
              x={CX - 88}
              y={HEIGHT - 104}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="15"
              fontFamily="'Cormorant Garamond', Georgia, serif"
              fontWeight="600"
              fill={COLORS.year!.text}
            >
              {chart.yearEnergy.arcanum}
            </text>
            <text x={CX - 64} y={HEIGHT - 100} fontSize="12" fill="#6a5b62">
              энергия {chart.yearEnergy.year} года
            </text>
          </g>
          <g transform={`translate(${CX - 252} ${HEIGHT - 46})`}>
            {(
              [
                ["#c9b4ea", "личность"],
                ["#cfe3ee", "род"],
                ["#bfe4c9", "деньги"],
                ["#f8cbdc", "отношения"],
                ["#f7d98a", "комфорт"],
              ] as const
            ).map(([color, label], index) => {
              const x = index * 101;
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
      ) : null}
    </svg>
  );
}
