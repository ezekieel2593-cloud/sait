import type { MatrixChart } from "@/lib/matrix/engine";

/**
 * Схема Матрицы судьбы в «жемчужной» подаче: объёмные сферы, тонкие золотые
 * линии, подписи «7-я энергия» рядом с каждой точкой. Никаких названий карт
 * таро — только номер и слово «энергия».
 *
 * На схеме девять ключевых сфер (центр, личный квадрат и родовые углы),
 * чтобы она читалась с телефона. Остальные энергии — рядом, в виде жемчужных
 * плашек (см. MatrixPage).
 */

const SIZE = 520;
/** Поля под подписи по краям схемы. */
const PAD = 78;

const RADIUS: Record<string, number> = {
  center: 46,
  A: 30,
  B: 30,
  C: 30,
  D: 30,
  "family-top-left": 23,
  "family-top-right": 23,
  "family-bottom-left": 23,
  "family-bottom-right": 23,
};

type Variant = "center" | "main" | "family";

const VARIANTS: Record<string, Variant> = {
  center: "center",
  A: "main",
  B: "main",
  C: "main",
  D: "main",
  "family-top-left": "family",
  "family-top-right": "family",
  "family-bottom-left": "family",
  "family-bottom-right": "family",
};

/** Куда ставить подпись относительно сферы. */
const CAPTION_SIDE: Record<string, "top" | "bottom" | "left" | "right" | "corner"> = {
  A: "top",
  B: "top",
  C: "top",
  D: "bottom",
  center: "bottom",
  "family-top-left": "corner",
  "family-top-right": "corner",
  "family-bottom-left": "corner",
  "family-bottom-right": "corner",
};

export const MATRIX_DIAGRAM_KEYS = [
  "A",
  "B",
  "C",
  "D",
  "center",
  "family-top-left",
  "family-top-right",
  "family-bottom-left",
  "family-bottom-right",
];

export function MatrixDiagram({ chart, compact = false }: { chart: MatrixChart; compact?: boolean }) {
  const inner = SIZE - PAD * 2;
  const scale = (value: number) => PAD + (value / 100) * inner;
  const get = (key: string) => chart.layout.find((item) => item.key === key);
  const point = (key: string) => chart.byKey[key];

  const node = (key: string) => {
    const position = get(key);
    const value = point(key);
    if (!position || !value) return null;

    const variant = VARIANTS[key] ?? "family";
    const radius = RADIUS[key] ?? 24;
    const x = scale(position.x);
    const y = scale(position.y);
    const fill =
      variant === "center" ? "url(#pearl-center)" : variant === "main" ? "url(#pearl-main)" : "url(#pearl-family)";
    const side = CAPTION_SIDE[key] ?? "bottom";

    // Подписи: номер энергии + короткая роль точки.
    const caption = value.arcanumTitle;
    const role = value.role;
    const captionFont = compact ? 8 : 11;
    const roleFont = compact ? 7 : 8.6;

    let captionX = x;
    let captionY = y + radius + 15;
    let anchor: "middle" | "start" | "end" = "middle";
    if (side === "top") {
      captionY = y - radius - 18;
    } else if (side === "bottom") {
      captionY = y + radius + 15;
    } else if (side === "left") {
      captionX = x - radius - 10;
      captionY = y - 3;
      anchor = "end";
    } else if (side === "right") {
      captionX = x + radius + 10;
      captionY = y - 3;
      anchor = "start";
    } else if (side === "corner") {
      const toLeft = position.x < 50;
      const toTop = position.y < 50;
      captionX = x + (toLeft ? -radius - 8 : radius + 8);
      captionY = toTop ? y - 2 : y + 4;
      anchor = toLeft ? "end" : "start";
    }

    return (
      <g key={key}>
        <ellipse cx={x} cy={y + radius * 0.86} rx={radius * 0.82} ry={radius * 0.22} fill="rgba(96,72,66,0.13)" />
        <circle cx={x} cy={y} r={radius} fill={fill} stroke="url(#gold-ring)" strokeWidth={variant === "center" ? 1.7 : 1.1} />
        <circle cx={x} cy={y} r={radius - 3.5} fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="0.8" />
        <ellipse
          cx={x - radius * 0.3}
          cy={y - radius * 0.36}
          rx={radius * 0.46}
          ry={radius * 0.3}
          fill="rgba(255,255,255,0.62)"
        />
        <text
          x={x}
          y={y + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontWeight="600"
          fontSize={variant === "center" ? (compact ? 26 : 36) : compact ? 18 : 24}
          fill="#3a2f36"
        >
          {value.arcanum}
        </text>

        {!compact ? (
          <g>
            <text x={captionX} y={captionY} textAnchor={anchor} fontSize={captionFont} letterSpacing="0.04em" fill="#463b41">
              {caption}
            </text>
            <text x={captionX} y={captionY + captionFont + 1} textAnchor={anchor} fontSize={roleFont} fill="#8b7d83">
              {role}
            </text>
          </g>
        ) : null}

        <title>{`${value.title}: ${value.arcanumTitle}`}</title>
      </g>
    );
  };

  const line = (fromKey: string, toKey: string, gold = true) => {
    const from = get(fromKey);
    const to = get(toKey);
    if (!from || !to) return null;
    return (
      <line
        key={`${fromKey}-${toKey}-${gold ? "g" : "s"}`}
        x1={scale(from.x)}
        y1={scale(from.y)}
        x2={scale(to.x)}
        y2={scale(to.y)}
        stroke={gold ? "url(#gold-line)" : "rgba(120,104,108,0.3)"}
        strokeWidth={gold ? 1.2 : 0.9}
        strokeDasharray={gold ? undefined : "2 6"}
      />
    );
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Матрица судьбы: центр ${chart.byKey.center.arcanumTitle}, личность ${chart.byKey.A.arcanumTitle}, талант ${chart.byKey.B.arcanumTitle}, задача ${chart.byKey.D.arcanumTitle}`}
    >
      <defs>
        <radialGradient id="mx-bg" cx="0.5" cy="0.42" r="0.72">
          <stop offset="0" stopColor="#fffdfa" />
          <stop offset="0.55" stopColor="#fbf3ec" />
          <stop offset="1" stopColor="#f1e3dc" />
        </radialGradient>
        <radialGradient id="mx-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pearl-main" cx="0.36" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#fbeee7" />
          <stop offset="1" stopColor="#e6d2c9" />
        </radialGradient>
        <radialGradient id="pearl-family" cx="0.4" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#fffdfb" />
          <stop offset="0.6" stopColor="#f7ece6" />
          <stop offset="1" stopColor="#e9d8d1" />
        </radialGradient>
        <radialGradient id="pearl-center" cx="0.34" cy="0.28" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#fdf0e6" />
          <stop offset="0.85" stopColor="#edd6ca" />
          <stop offset="1" stopColor="#dcc0b4" />
        </radialGradient>
        <linearGradient id="gold-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3c79b" />
          <stop offset="0.5" stopColor="#c9a777" />
          <stop offset="1" stopColor="#e8d3ae" />
        </linearGradient>
        <linearGradient id="gold-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(201,167,119,0.75)" />
          <stop offset="1" stopColor="rgba(214,186,146,0.45)" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width={SIZE - 4} height={SIZE - 4} rx="32" fill="url(#mx-bg)" stroke="rgba(201,167,119,0.34)" />
      <ellipse cx={SIZE * 0.5} cy={SIZE * 0.48} rx={SIZE * 0.36} ry={SIZE * 0.33} fill="url(#mx-glow)" opacity="0.75" />

      {/* Ромб личного квадрата */}
      {line("A", "B")}
      {line("B", "D")}
      {line("D", "C")}
      {line("C", "A")}

      {/* Родовой квадрат */}
      {line("family-top-left", "family-top-right", false)}
      {line("family-top-right", "family-bottom-right", false)}
      {line("family-bottom-right", "family-bottom-left", false)}
      {line("family-bottom-left", "family-top-left", false)}

      {/* Лучи от центра к углам */}
      {line("center", "A", false)}
      {line("center", "B", false)}
      {line("center", "C", false)}
      {line("center", "D", false)}

      {/* Сферы поверх линий */}
      {["A", "B", "C", "D"].map((key) => node(key))}
      {["family-top-left", "family-top-right", "family-bottom-left", "family-bottom-right"].map((key) => node(key))}
      {node("center")}
    </svg>
  );
}
