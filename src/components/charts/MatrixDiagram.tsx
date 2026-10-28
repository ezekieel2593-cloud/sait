import type { MatrixChart } from "@/lib/matrix/engine";

/**
 * Схема Матрицы судьбы: диагональный квадрат, родовые углы, центр и каналы.
 * Координаты берутся из расчёта (layout), значения — из арканов.
 */

const SIZE = 460;

export function MatrixDiagram({ chart, compact = false }: { chart: MatrixChart; compact?: boolean }) {
  const scale = (value: number) => (value / 100) * SIZE;
  const get = (key: string) => chart.layout.find((item) => item.key === key);
  const point = (key: string) => chart.byKey[key];

  const A = get("A")!;
  const B = get("B")!;
  const C = get("C")!;
  const D = get("D")!;
  const center = get("center")!;

  const node = (key: string, highlight = false) => {
    const position = get(key);
    const value = point(key);
    if (!position || !value) return null;
    const isCenter = key === "center";
    const radius = isCenter ? 34 : 26;
    return (
      <g key={key}>
        <circle
          cx={scale(position.x)}
          cy={scale(position.y)}
          r={radius}
          fill={isCenter ? "#253d4b" : highlight ? "#f6ecdd" : "#ffffff"}
          stroke={isCenter ? "#253d4b" : "rgba(201,167,119,0.75)"}
          strokeWidth="1.2"
        />
        <text
          x={scale(position.x)}
          y={scale(position.y) - (compact ? 0 : 4)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={isCenter ? 22 : 17}
          fontFamily="Georgia, serif"
          fill={isCenter ? "#fdfaf8" : "#253d4b"}
        >
          {value.arcanum}
        </text>
        {!compact ? (
          <text
            x={scale(position.x)}
            y={scale(position.y) + (isCenter ? 16 : 12)}
            textAnchor="middle"
            fontSize="7.5"
            fill={isCenter ? "rgba(255,255,255,0.72)" : "#a89ea2"}
          >
            {value.arcanumTitle.length > 12 ? `${value.arcanumTitle.slice(0, 11)}…` : value.arcanumTitle}
          </text>
        ) : null}
        <title>{`${value.title}: ${value.arcanum} · ${value.arcanumTitle}`}</title>
      </g>
    );
  };

  const line = (from: { x: number; y: number }, to: { x: number; y: number }, gold = true) => (
    <line
      key={`${from.x}-${from.y}-${to.x}-${to.y}`}
      x1={scale(from.x)}
      y1={scale(from.y)}
      x2={scale(to.x)}
      y2={scale(to.y)}
      stroke={gold ? "rgba(201,167,119,0.5)" : "rgba(37,61,75,0.16)"}
      strokeWidth="1"
      strokeDasharray={gold ? undefined : "3 6"}
    />
  );

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Матрица судьбы: центр ${chart.byKey.center.arcanum} ${chart.byKey.center.arcanumTitle}, личность ${chart.byKey.A.arcanum}, талант ${chart.byKey.B.arcanum}, кармическая задача ${chart.byKey.D.arcanum}`}
    >
      <defs>
        <radialGradient id="mx-bg" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.75" stopColor="#fdfaf9" />
          <stop offset="1" stopColor="#f3eeeb" />
        </radialGradient>
      </defs>

      <rect x="6" y="6" width={SIZE - 12} height={SIZE - 12} rx="26" fill="url(#mx-bg)" stroke="rgba(201,167,119,0.35)" />

      {/* Диагональный личный квадрат */}
      {line(A, B)}
      {line(B, C)}
      {line(C, D)}
      {line(D, A)}

      {/* Родовой квадрат */}
      {line(get("family-top-left")!, get("family-top-right")!, false)}
      {line(get("family-top-right")!, get("family-bottom-right")!, false)}
      {line(get("family-bottom-right")!, get("family-bottom-left")!, false)}
      {line(get("family-bottom-left")!, get("family-top-left")!, false)}

      {/* Каналы */}
      {line(center, get("money-entry")!, false)}
      {line(center, get("love-entry")!, false)}
      {line(get("money-entry")!, get("shared")!, false)}
      {line(get("love-entry")!, get("shared")!, false)}

      {/* Соединение центра с углами */}
      {line(center, A, false)}
      {line(center, B, false)}
      {line(center, C, false)}
      {line(center, D, false)}

      {["A", "B", "C", "D"].map((key) => node(key))}
      {["family-top-left", "family-top-right", "family-bottom-left", "family-bottom-right"].map((key) => node(key))}
      {["money-entry", "money-middle", "love-entry", "love-middle", "shared"].map((key) => node(key, true))}
      {["family-force"].map((key) => node(key))}
      {node("center")}
    </svg>
  );
}
