import { SIGNS } from "@/lib/astronomy/constants";
import type { NatalChart } from "@/lib/astronomy/engine";

/**
 * Натальная карта в том виде, к которому привыкли по профессиональным
 * программам (Sotis, Chronos): круг зодиака с градусной шкалой, кольцо домов,
 * планеты с точными градусами, точки (узлы, Лилит, Хирон, Фортуна) и аспектные
 * линии внутри круга.
 *
 * Карта разворачивается так, что асцендент — слева, и дальше знаки и дома идут
 * против часовой стрелки, как в стандартной записи гороскопа.
 *
 * Компонент без состояния: интерактивность (наведение, клик по планете,
 * увеличение) живёт в обёртке `NatalChartFigure`, чтобы эту же схему можно было
 * рисовать на сервере.
 */

const SIZE = 760;
const C = SIZE / 2;

const R = {
  edge: 348,
  signOuter: 328,
  signInner: 282,
  houseOuter: 282,
  houseInner: 236,
  /** Первая дорожка планет; следующие — ближе к центру с шагом LANE_STEP. */
  planet: 234,
  aspect: 146,
  center: 52,
  axisLabel: 366,
} as const;

const LANE_STEP = 36;

export interface WheelItem {
  key: string;
  name: string;
  symbol: string;
  longitude: number;
  degreeInSign: number;
  sign: string;
  retrograde: boolean;
  house: number | null;
  kind: "planet" | "point";
}

/** Полярные координаты: 0° — слева (асцендент), рост угла — против часовой стрелки. */
function polar(radius: number, angleDeg: number) {
  const rad = Math.PI - (angleDeg * Math.PI) / 180;
  return { x: C + radius * Math.cos(rad), y: C + radius * Math.sin(rad) };
}

function arcPath(outerRadius: number, innerRadius: number, from: number, to: number) {
  const a = polar(outerRadius, from);
  const b = polar(outerRadius, to);
  const c = polar(innerRadius, to);
  const d = polar(innerRadius, from);
  // Угол растёт против часовой стрелки, поэтому внешняя дуга — sweep 0,
  // обратная внутренняя — sweep 1.
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${outerRadius} ${outerRadius} 0 0 0 ${b.x.toFixed(2)} ${b.y.toFixed(2)} L${c.x.toFixed(2)} ${c.y.toFixed(2)} A${innerRadius} ${innerRadius} 0 0 1 ${d.x.toFixed(2)} ${d.y.toFixed(2)} Z`;
}

/** Долгота коротко: «3°26′». */
function shortDegree(longitude: number) {
  const within = ((longitude % 30) + 30) % 30;
  const degrees = Math.floor(within);
  const minutes = Math.round((within - degrees) * 60) % 60;
  return `${degrees}°${String(minutes).padStart(2, "0")}′`;
}

function radiusPlanetFor(item: WheelItem) {
  return item.kind === "point" ? 9 : 12;
}

const ASPECT_COLOR = {
  harmonious: "#3f8791",
  tense: "#b06a56",
  neutral: "#c9a777",
} as const;

export interface NatalWheelProps {
  chart: NatalChart;
  /** Префикс для id градиентов: на странице может быть два экземпляра карты. */
  idPrefix?: string;
  showAspects?: boolean;
  showHouses?: boolean;
  showPoints?: boolean;
  /** Ключ планеты или точки, которую нужно подсветить. */
  highlight?: string | null;
  /** Если передан, планеты становятся кнопками. */
  onSelect?: (key: string) => void;
  /** Показывать подписи градусов у планет. */
  showDegreeLabels?: boolean;
}

export function NatalWheel({
  chart,
  idPrefix = "wheel",
  showAspects = true,
  showHouses = true,
  showPoints = true,
  highlight = null,
  onSelect,
  showDegreeLabels = true,
}: NatalWheelProps) {
  const ascendant = chart.ascendant?.longitude ?? 0;
  // Асцендент — слева: вычитаем его долготу из всех остальных.
  const rotate = (longitude: number) => (longitude - ascendant + 360) % 360;

  const items: WheelItem[] = [
    ...chart.positions.map((position) => ({
      key: position.key as string,
      name: position.name,
      symbol: position.symbol,
      longitude: position.longitude,
      degreeInSign: position.degreeInSign,
      sign: position.sign,
      retrograde: position.retrograde,
      house: position.house,
      kind: "planet" as const,
    })),
    ...(showPoints
      ? chart.points.map((point) => ({
          key: point.key,
          name: point.name,
          symbol: point.symbol,
          longitude: point.longitude,
          degreeInSign: point.degreeInSign,
          sign: point.sign,
          retrograde: point.retrograde,
          house: point.house,
          kind: "point" as const,
        }))
      : []),
  ];

  const longitudeByKey = new Map(items.map((item) => [item.key, item.longitude]));

  // Планеты, стоящие близко, иначе наезжают друг на друга. Разводим их по
  // кольцу с минимальным шагом, а к точному градусу тянем тонкую выноску:
  // так градус остаётся честным, а подписи читаются.
  const MIN_STEP = 11;
  const sorted = [...items]
    .map((item) => ({ item, angle: rotate(item.longitude) }))
    .sort((a, b) => a.angle - b.angle);

  const displayAngles = sorted.map((entry) => entry.angle);
  for (let pass = 0; pass < 3; pass += 1) {
    for (let index = 1; index < displayAngles.length; index += 1) {
      const minimum = displayAngles[index - 1]! + MIN_STEP;
      if (displayAngles[index]! < minimum) displayAngles[index] = minimum;
    }
    // Если разведённые планеты «переползли» через 0°, возвращаем их назад.
    const overshoot = displayAngles[displayAngles.length - 1]! - (displayAngles[0]! + 360 - MIN_STEP);
    if (overshoot > 0) {
      for (let index = 0; index < displayAngles.length; index += 1) {
        displayAngles[index] = displayAngles[index]! - overshoot;
      }
      for (let index = 1; index < displayAngles.length; index += 1) {
        const minimum = displayAngles[index - 1]! + MIN_STEP;
        if (displayAngles[index]! < minimum) displayAngles[index] = minimum;
      }
    }
  }

  const placed = sorted.map((entry, index) => ({ ...entry, displayAngle: displayAngles[index]! }));


  const cusps = chart.houses?.map((house) => rotate(house.cusp)) ?? null;
  const mc = rotate(chart.midheaven.longitude);

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
        <radialGradient id={`${idPrefix}-bg`} cx="0.42" cy="0.34" r="0.78">
          <stop offset="0" stopColor="#fffdfa" />
          <stop offset="0.6" stopColor="#fbf5ef" />
          <stop offset="1" stopColor="#eddfd8" />
        </radialGradient>
        <radialGradient id={`${idPrefix}-pearl`} cx="0.34" cy="0.28" r="0.82">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#fbf2ec" />
          <stop offset="1" stopColor="#e3cec6" />
        </radialGradient>
        <radialGradient id={`${idPrefix}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${idPrefix}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C9A777" />
          <stop offset="1" stopColor="#E2CCAA" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-sign`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f6ece5" stopOpacity="0.85" />
        </linearGradient>
        <filter id={`${idPrefix}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#7a5f57" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Фон */}
      <circle cx={C} cy={C} r={R.edge + 8} fill={`url(#${idPrefix}-bg)`} />
      <circle cx={C} cy={C} r={(R.edge + 8) * 0.66} fill={`url(#${idPrefix}-glow)`} opacity="0.85" />
      <circle cx={C} cy={C} r={R.edge + 8} fill="none" stroke={`url(#${idPrefix}-gold)`} strokeWidth="1.4" />

      {/* Зодиакальные сектора */}
      {SIGNS.map((sign) => {
        const from = rotate(sign.index * 30);
        const to = from + 30;
        const middle = polar((R.signOuter + R.signInner) / 2, from + 15);
        return (
          <g key={sign.index}>
            <path
              d={arcPath(R.signOuter, R.signInner, from, to)}
              fill={sign.index % 2 === 0 ? `url(#${idPrefix}-sign)` : "rgba(246,236,229,0.5)"}
              stroke="rgba(37,61,75,0.10)"
              strokeWidth="0.6"
            />
            <text
              x={middle.x}
              y={middle.y - 4}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="23"
              fill="#5a4d55"
              fontFamily="'Cormorant Garamond', Georgia, serif"
            >
              {sign.symbol}
            </text>
            <text
              x={middle.x}
              y={middle.y + 15}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8.5"
              letterSpacing="0.06em"
              fill="#8b7d84"
            >
              {sign.name.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Градусная шкала: 1°, 5°, 10° */}
      {Array.from({ length: 360 }, (_, degree) => {
        const angle = rotate(degree);
        const isTen = degree % 10 === 0;
        const isFive = degree % 5 === 0;
        const length = isTen ? 12 : isFive ? 8 : 4;
        const outer = polar(R.edge, angle);
        const inner = polar(R.edge - length, angle);
        return (
          <line
            key={`tick-${degree}`}
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
            stroke={isTen ? "rgba(37,61,75,0.55)" : isFive ? "rgba(37,61,75,0.32)" : "rgba(37,61,75,0.16)"}
            strokeWidth={isTen ? 1.1 : 0.7}
          />
        );
      })}

      <circle cx={C} cy={C} r={R.edge} fill="none" stroke="rgba(37,61,75,0.28)" strokeWidth="1" />
      <circle cx={C} cy={C} r={R.signOuter} fill="none" stroke="rgba(37,61,75,0.22)" strokeWidth="0.9" />
      <circle cx={C} cy={C} r={R.signInner} fill="none" stroke={`url(#${idPrefix}-gold)`} strokeWidth="1" />
      <circle cx={C} cy={C} r={R.houseInner} fill="none" stroke="rgba(37,61,75,0.16)" strokeWidth="0.8" />
      <circle cx={C} cy={C} r={R.aspect} fill="none" stroke="rgba(37,61,75,0.10)" strokeWidth="0.6" />

      {/* Дома */}
      {showHouses && cusps
        ? cusps.map((cusp, index) => {
            const isAxis = index % 3 === 0;
            const outer = polar(R.houseOuter, cusp);
            const inner = polar(R.aspect - 6, cusp);
            const numberAngle = cusp + 7;
            const label = polar(R.houseInner + 24, numberAngle);
            const house = chart.houses![index]!;
            return (
              <g key={`cusp-${index}`}>
                <line
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                  stroke={isAxis ? "rgba(37,61,75,0.6)" : "rgba(37,61,75,0.26)"}
                  strokeWidth={isAxis ? 1.3 : 0.8}
                  strokeDasharray={isAxis ? undefined : "4 5"}
                />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fontWeight="600"
                  fill={isAxis ? "#2f4f5c" : "#8b7d84"}
                >
                  {index + 1}
                </text>
                <title>{`${house.title}: куспид ${house.formatted}`}</title>
              </g>
            );
          })
        : null}

      {/* Оси: ASC — DSC, MC — IC */}
      {chart.ascendant ? (
        <g>
          <line
            x1={polar(R.signOuter, 0).x}
            y1={polar(R.signOuter, 0).y}
            x2={polar(R.aspect, 180).x}
            y2={polar(R.aspect, 180).y}
            stroke="rgba(63,135,145,0.55)"
            strokeWidth="1.4"
          />
          <text
            x={polar(R.axisLabel, 0).x}
            y={polar(R.axisLabel, 0).y}
            textAnchor="start"
            dominantBaseline="central"
            fontSize="10"
            letterSpacing="0.1em"
            fontWeight="700"
            fill="#33707a"
          >
            ASC <tspan fontSize="8.5" fill="#5f8f96">{chart.ascendant ? shortDegree(chart.ascendant.longitude) : ""}</tspan>
          </text>
          <text
            x={polar(R.axisLabel, 180).x}
            y={polar(R.axisLabel, 180).y}
            textAnchor="end"
            dominantBaseline="central"
            fontSize="9"
            letterSpacing="0.1em"
            fill="#8b7d84"
          >
            DSC
          </text>
        </g>
      ) : null}

      <line
        x1={polar(R.signOuter, mc).x}
        y1={polar(R.signOuter, mc).y}
        x2={polar(R.aspect, mc + 180).x}
        y2={polar(R.aspect, mc + 180).y}
        stroke="rgba(201,167,119,0.85)"
        strokeWidth="1.2"
      />
      <text
        x={polar(R.axisLabel, mc).x}
        y={polar(R.axisLabel, mc).y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9"
        letterSpacing="0.1em"
        fontWeight="700"
        fill="#a9884f"
      >
        MC <tspan fontSize="8.5" fill="#b79457">{shortDegree(chart.midheaven.longitude)}</tspan>
      </text>
      <text
        x={polar(R.axisLabel, mc + 180).x}
        y={polar(R.axisLabel, mc + 180).y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9"
        letterSpacing="0.1em"
        fill="#a9884f"
      >
        IC <tspan fontSize="8.5" fill="#b79457">{shortDegree(chart.midheaven.longitude + 180)}</tspan>
      </text>

      {/* Аспектные линии */}
      {showAspects ? (
        <g>
          {chart.aspects.map((aspect) => {
            const aLongitude = longitudeByKey.get(aspect.a);
            const bLongitude = longitudeByKey.get(aspect.b);
            if (aLongitude === undefined || bLongitude === undefined) return null;
            const a = polar(R.aspect, rotate(aLongitude));
            const b = polar(R.aspect, rotate(bLongitude));
            const active = !highlight || highlight === aspect.a || highlight === aspect.b;
            const isConjunction = aspect.type === "conjunction";
            return (
              <line
                key={`${aspect.a}-${aspect.b}-${aspect.type}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={ASPECT_COLOR[aspect.nature]}
                strokeWidth={Math.max(0.7, 2.2 - aspect.orb * 0.2)}
                strokeOpacity={active ? 0.72 : 0.1}
                strokeDasharray={isConjunction ? "3 3" : undefined}
              />
            );
          })}
        </g>
      ) : null}

      {/* Планеты и точки */}
      {placed.map(({ item, angle, displayAngle }) => {
        const radius = R.planet;
        const point = polar(radius, displayAngle);
        const degreePoint = polar(radius - 20, displayAngle);
        const exactPoint = polar(R.signInner, angle);
        const isActive = highlight === item.key;
        const isPoint = item.kind === "point";
        const dimmed = Boolean(highlight) && !isActive;
        const minutes = Math.round((item.degreeInSign % 1) * 60) % 60;
        const degreeLabel = `${Math.floor(item.degreeInSign)}°${String(minutes).padStart(2, "0")}′${item.retrograde ? " R" : ""}`;
        const radiusPlanet = radiusPlanetFor(item);

        return (
          <g
            key={item.key}
            opacity={dimmed ? 0.42 : 1}
            onClick={onSelect ? () => onSelect(item.key) : undefined}
            style={onSelect ? { cursor: "pointer" } : undefined}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={`${item.name}: ${item.sign}, ${degreeLabel}${item.house ? `, ${item.house} дом` : ""}`}
            onKeyDown={
              onSelect
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") onSelect(item.key);
                  }
                : undefined
            }
          >
            <title>{`${item.name} — ${item.sign}, ${degreeLabel}${item.house ? `, ${item.house} дом` : ""}`}</title>
            {/* Выноска от точного градуса на кольце к глифу */}
            <line
              x1={exactPoint.x}
              y1={exactPoint.y}
              x2={point.x}
              y2={point.y}
              stroke={isActive ? "rgba(63,135,145,0.8)" : "rgba(37,61,75,0.22)"}
              strokeWidth={isActive ? 1.1 : 0.6}
            />
            <circle cx={exactPoint.x} cy={exactPoint.y} r="1.6" fill="rgba(37,61,75,0.45)" />
            <circle
              cx={point.x}
              cy={point.y}
              r={radiusPlanet}
              fill={`url(#${idPrefix}-pearl)`}
              stroke={isActive ? "#3f8791" : isPoint ? "rgba(140,120,110,0.75)" : `url(#${idPrefix}-gold)`}
              strokeWidth={isActive ? 1.8 : 1}
              strokeDasharray={isPoint ? "2.5 2" : undefined}
              filter={`url(#${idPrefix}-soft)`}
            />
            <text
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isPoint ? 11 : 13}
              fill="#253d4b"
              fontFamily="'Cormorant Garamond', Georgia, serif"
            >
              {item.symbol}
            </text>
            {showDegreeLabels ? (
              <text
                x={degreePoint.x}
                y={degreePoint.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8.5"
                fill={item.retrograde ? "#a1604a" : "#7d7078"}
              >
                {degreeLabel}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Центр: жемчужная подложка под аспектные линии */}
      <circle cx={C} cy={C} r={R.center} fill={`url(#${idPrefix}-pearl)`} opacity="0.92" />
      <circle cx={C} cy={C} r={R.center} fill="none" stroke="rgba(201,167,119,0.6)" strokeWidth="0.9" />
      <text x={C} y={C - 7} textAnchor="middle" fontSize="8" letterSpacing="0.16em" fill="#8b7d84">
        НАТАЛЬНАЯ
      </text>
      <text x={C} y={C + 6} textAnchor="middle" fontSize="8" letterSpacing="0.16em" fill="#8b7d84">
        КАРТА
      </text>
      <text x={C} y={C + 24} textAnchor="middle" fontSize="7.5" fill="#a99ba1">
        {chart.birth.date}
      </text>
    </svg>
  );
}

/** Легенда к карте: объясняет, что означают линии и значки. */
export function NatalWheelLegend() {
  return (
    <ul className="grid gap-1 text-[0.78rem] text-[var(--ink-soft)]">
      <li>· Символы на кольце — знаки зодиака, цифры внутри — номера домов.</li>
      <li>· Голубые линии — гармоничные аспекты (трин, секстиль), тёплые — напряжённые (квадрат, оппозиция).</li>
      <li>· Пунктирные кружки — расчётные точки: узлы, Лилит, Хирон, Фортуна.</li>
      <li>· ASC слева, MC — золотая ось; «R» рядом с градусом означает попятное движение.</li>
    </ul>
  );
}
