import { SIGNS, signFromLongitude } from "@/lib/astronomy/constants";
import type { NatalChart } from "@/lib/astronomy/engine";

/**
 * Визуализация натальной карты в SVG: знаки, дома, планеты, оси.
 * Полностью серверный компонент — без JS на клиенте.
 */

const SIZE = 520;
const CENTER = SIZE / 2;
const R_OUTER = 236;
const R_SIGNS = 200;
const R_HOUSES = 158;
const R_PLANETS = 128;

function polar(radius: number, angleDeg: number) {
  // 0° Овна — слева (9 часов), против часовой стрелки, как принято в картах
  const rad = ((180 - angleDeg) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER - radius * Math.sin(rad) };
}

export function NatalWheel({ chart }: { chart: NatalChart }) {
  const ascendant = chart.ascendant?.longitude ?? 0;
  // Разворачиваем карту так, чтобы асцендент был слева
  const rotate = (longitude: number) => (longitude - ascendant + 360) % 360;

  const cusps = chart.houses?.map((house) => rotate(house.cusp)) ?? null;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full"
      role="img"
      aria-label={
        chart.ascendant
          ? `Натальная карта: Солнце ${chart.summary.sun}, Луна ${chart.summary.moon}, асцендент ${chart.summary.ascendant}`
          : `Натальная карта: Солнце ${chart.summary.sun}, Луна ${chart.summary.moon}`
      }
    >
      <defs>
        <radialGradient id="wheel-bg" cx="0.42" cy="0.36" r="0.72">
          <stop offset="0" stopColor="#fffdfa" />
          <stop offset="0.55" stopColor="#fbf4ee" />
          <stop offset="1" stopColor="#efe0d9" />
        </radialGradient>
        <radialGradient id="wheel-pearl" cx="0.34" cy="0.28" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#fbf1ea" />
          <stop offset="1" stopColor="#e4cfc8" />
        </radialGradient>
        <radialGradient id="wheel-center" cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#fdf2ea" />
          <stop offset="1" stopColor="#ecd8ce" />
        </radialGradient>
        <radialGradient id="wheel-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wheel-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C9A777" />
          <stop offset="1" stopColor="#E0C9A6" />
        </linearGradient>
      </defs>

      <circle cx={CENTER} cy={CENTER} r={R_OUTER + 14} fill="url(#wheel-bg)" />
      <circle cx={CENTER} cy={CENTER} r={(R_OUTER + 14) * 0.62} fill="url(#wheel-glow)" opacity="0.8" />
      <circle cx={CENTER} cy={CENTER} r={R_OUTER + 14} fill="none" stroke="url(#wheel-gold)" strokeWidth="1" />
      <circle cx={CENTER} cy={CENTER} r={R_OUTER} fill="none" stroke="rgba(37,61,75,0.22)" strokeWidth="1" />
      <circle cx={CENTER} cy={CENTER} r={R_SIGNS} fill="none" stroke="url(#wheel-gold)" strokeWidth="1.1" />
      <circle cx={CENTER} cy={CENTER} r={R_HOUSES} fill="none" stroke="rgba(37,61,75,0.12)" strokeWidth="1" />

      {/* Знаки */}
      {SIGNS.map((sign) => {
        const start = rotate(sign.index * 30);
        const end = rotate(sign.index * 30 + 30);
        const outerStart = polar(R_OUTER, start);
        const outerEnd = polar(R_OUTER, end);
        const innerEnd = polar(R_SIGNS, end);
        const mid = polar((R_OUTER + R_SIGNS) / 2, start + 15);
        return (
          <g key={sign.index}>
            <line x1={outerEnd.x} y1={outerEnd.y} x2={innerEnd.x} y2={innerEnd.y} stroke="rgba(37,61,75,0.16)" strokeWidth="1" />
            <text
              x={mid.x}
              y={mid.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="16"
              fill="#5c5158"
              fontFamily="'Cormorant Garamond', Georgia, serif"
            >
              {sign.symbol}
            </text>
            <line
              x1={outerStart.x}
              y1={outerStart.y}
              x2={innerEnd.x}
              y2={innerEnd.y}
              stroke="rgba(37,61,75,0.05)"
              strokeWidth="0.6"
            />
          </g>
        );
      })}

      {/* Дома */}
      {cusps
        ? cusps.map((cusp, index) => {
            const isAxis = index === 0 || index === 3 || index === 6 || index === 9;
            const outer = polar(R_SIGNS, cusp);
            const inner = polar(R_PLANETS - 22, cusp);
            const label = polar(R_SIGNS - 16, cusp + 6);
            return (
              <g key={`house-${index}`}>
                <line
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                  stroke={isAxis ? "rgba(37,61,75,0.55)" : "rgba(37,61,75,0.18)"}
                  strokeWidth={isAxis ? 1.4 : 0.8}
                  strokeDasharray={isAxis ? undefined : "3 6"}
                />
                <text x={label.x} y={label.y} textAnchor="middle" fontSize="9" fill="#857a80">
                  {index + 1}
                </text>
              </g>
            );
          })
        : null}

      {/* Оси */}
      {chart.ascendant ? (
        <g>
          <line
            x1={polar(R_SIGNS, 0).x}
            y1={polar(R_SIGNS, 0).y}
            x2={polar(R_SIGNS, 180).x}
            y2={polar(R_SIGNS, 180).y}
            stroke="rgba(111,168,174,0.65)"
            strokeWidth="1.4"
          />
          <text
            x={polar(R_OUTER - 26, 0).x + 4}
            y={polar(R_OUTER - 26, 0).y - 6}
            textAnchor="start"
            fontSize="10"
            letterSpacing="0.08em"
            fill="#41818a"
            fontWeight="600"
          >
            ASC
          </text>
        </g>
      ) : null}

      <line
        x1={polar(R_SIGNS, rotate(chart.midheaven.longitude)).x}
        y1={polar(R_SIGNS, rotate(chart.midheaven.longitude)).y}
        x2={polar(R_SIGNS, rotate(chart.midheaven.longitude) + 180).x}
        y2={polar(R_SIGNS, rotate(chart.midheaven.longitude) + 180).y}
        stroke="rgba(220,197,217,0.9)"
        strokeWidth="1.2"
      />

      {/* Планеты */}
      {chart.positions.map((position, index) => {
        const angle = rotate(position.longitude);
        // Небольшое вертикальное смещение, чтобы близкие планеты не сливались
        const near = chart.positions.filter((other, otherIndex) => {
          if (otherIndex >= index) return false;
          const delta = Math.abs(((rotate(other.longitude) - angle + 540) % 360) - 180);
          return delta > 172;
        }).length;
        const point = polar(R_PLANETS - near * 16, angle);
        return (
          <g key={position.key}>
            <ellipse cx={point.x} cy={point.y + 12} rx="10" ry="2.6" fill="rgba(94,74,66,0.14)" />
            <circle cx={point.x} cy={point.y} r="14" fill="url(#wheel-pearl)" stroke="url(#wheel-gold)" strokeWidth="1" />
            <ellipse cx={point.x - 4} cy={point.y - 5} rx="6" ry="4" fill="rgba(255,255,255,0.6)" />
            <text
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="12"
              fill="#253d4b"
              fontFamily="Georgia, serif"
            >
              {position.symbol}
            </text>
            {position.retrograde ? (
              <text x={point.x + 9} y={point.y - 8} fontSize="7" fill="#b3836a">
                R
              </text>
            ) : null}
            <line
              x1={point.x}
              y1={point.y}
              x2={polar(R_SIGNS - 2, angle).x}
              y2={polar(R_SIGNS - 2, angle).y}
              stroke="rgba(201,167,119,0.3)"
              strokeWidth="0.7"
            />
          </g>
        );
      })}

      {/* Центр */}
      <circle cx={CENTER} cy={CENTER} r="72" fill="url(#wheel-center)" stroke="url(#wheel-gold)" strokeWidth="1.2" />
      <circle cx={CENTER} cy={CENTER} r="66" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" />
      <ellipse cx={CENTER - 22} cy={CENTER - 34} rx="26" ry="16" fill="rgba(255,255,255,0.5)" />
      <text x={CENTER} y={CENTER - 14} textAnchor="middle" fontSize="10" letterSpacing="0.12em" fill="#7d7078">
        СОЛНЦЕ
      </text>
      <text x={CENTER} y={CENTER + 4} textAnchor="middle" fontSize="16" fill="#3a2f36" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="600">
        {chart.positions[0]?.sign}
      </text>
      <text x={CENTER} y={CENTER + 27} textAnchor="middle" fontSize="10" fill="#7d7078">
        {chart.positions[0]
          ? `${Math.floor(chart.positions[0].degreeInSign)}° ${Math.round((chart.positions[0].degreeInSign % 1) * 60)}′`
          : ""}
      </text>
    </svg>
  );
}

export function formatSignLabel(longitude: number): string {
  return signFromLongitude(longitude).name;
}
