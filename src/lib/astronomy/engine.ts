import { Body, Ecliptic, GeoVector, MakeTime, SiderealTime } from "astronomy-engine";
import {
  ASPECTS,
  HOUSES,
  PLANETS,
  SIGNS,
  formatDegree,
  signFromLongitude,
  type AspectKey,
  type PlanetKey,
  type SignInfo,
} from "./constants";
import { offsetLabelAt, zonedTimeToUtc } from "./timezone";

/**
 * Астрологический расчётный движок (версия astro-v1).
 *
 * Что фиксировано в методике:
 *  · эфемериды: astronomy-engine (VSOP87 для планет, ELP2000 для Луны);
 *  · зодиак: тропический, эклиптика даты;
 *  · координаты: геоцентрические, с учётом аберрации;
 *  · дома: Placidus (по умолчанию), Equal или Whole Sign — выбирается в настройках;
 *  · аспекты: соединение/секстиль/квадрат/трин/оппозиция с орбисами из constants.ts;
 *  · Плутон: точность astronomy-engine ограничена (доли градуса) — это указано в ограничениях.
 *
 * Точность положений: планеты — секунды-минуты дуги, Луна — до нескольких минут,
 * что для интерпретации достаточно. Проверка: tests/astrology.test.ts.
 */

export const ALGORITHM_VERSION = "astro-v1";
export const ASTRO_EPHEMERIS = "astronomy-engine 2.1 (VSOP87/ELP2000)";
export const ZODIAC = "Тропический зодиак, эклиптика даты";

export type HouseSystem = "placidus" | "equal" | "whole";

export interface NatalInput {
  date: string;
  timeAccuracy: "exact" | "approx" | "unknown";
  time?: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string;
}

export interface PlanetPosition {
  key: PlanetKey;
  name: string;
  symbol: string;
  longitude: number;
  sign: string;
  signIndex: number;
  degreeInSign: number;
  formatted: string;
  retrograde: boolean;
  house: number | null;
  kind: string;
}

export interface HouseCusp {
  number: number;
  cusp: number;
  sign: string;
  formatted: string;
  title: string;
  sphere: string;
}

export interface AspectHit {
  a: PlanetKey;
  b: PlanetKey;
  aName: string;
  bName: string;
  type: AspectKey;
  name: string;
  symbol: string;
  angle: number;
  exactAngle: number;
  orb: number;
  orbLimit: number;
  nature: "harmonious" | "tense" | "neutral";
  formatted: string;
}

export interface NatalChart {
  meta: {
    algorithmVersion: string;
    ephemeris: string;
    zodiac: string;
    houseSystem: HouseSystem;
    houseSystemLabel: string;
    computedAt: string;
  };
  birth: {
    date: string;
    time: string | null;
    timeAccuracy: "exact" | "approx" | "unknown";
    timeAssumed: boolean;
    placeName: string;
    latitude: number;
    longitude: number;
    timezone: string;
    utcIso: string;
    utcOffset: string;
    julianDay: number;
  };
  positions: PlanetPosition[];
  ascendant: { longitude: number; sign: string; signIndex: number; formatted: string } | null;
  midheaven: { longitude: number; sign: string; formatted: string };
  houses: HouseCusp[] | null;
  aspects: AspectHit[];
  distribution: {
    elements: Record<string, number>;
    modalities: Record<string, number>;
    hemispheres: { top: number; bottom: number; east: number; west: number } | null;
  };
  moonPhase: { angle: number; name: string; illumination: number };
  warnings: string[];
  limitations: string[];
  summary: {
    sun: string;
    moon: string;
    ascendant: string | null;
    dominantElement: string;
    dominantModality: string;
  };
}

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function norm360(value: number): number {
  return ((value % 360) + 360) % 360;
}

function norm180(value: number): number {
  const v = norm360(value);
  return v > 180 ? v - 360 : v;
}

/** Средний наклон эклиптики (Meeus 22.2, без учёта нутации). */
function meanObliquity(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  return 23.439291111111 - 0.0130041666667 * T - 1.6666667e-7 * T * T + 5.0277778e-7 * T * T * T;
}

function eclipticToEquatorial(longitude: number, obliquity: number): { ra: number; dec: number } {
  const l = longitude * DEG;
  const e = obliquity * DEG;
  const ra = Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l)) * RAD;
  const dec = Math.asin(Math.sin(e) * Math.sin(l)) * RAD;
  return { ra: norm360(ra), dec };
}

function altitudeAt(longitude: number, ramc: number, latitude: number, obliquity: number): number {
  const { ra, dec } = eclipticToEquatorial(longitude, obliquity);
  const H = norm180(ramc - ra) * DEG;
  const phi = latitude * DEG;
  const d = dec * DEG;
  const sinAlt = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;
}

/** Численно ищет точку эклиптики на горизонте (асцендент). */
function computeAscendant(ramc: number, latitude: number, obliquity: number): number {
  let previousLon = 0;
  let previousAlt = altitudeAt(previousLon, ramc, latitude, obliquity);
  const roots: number[] = [];

  for (let step = 1; step <= 72 * 8; step += 1) {
    const lon = (step * 360) / (72 * 8);
    const alt = altitudeAt(lon, ramc, latitude, obliquity);
    if (previousAlt === 0 || previousAlt * alt < 0) {
      let lo = previousLon;
      let hi = lon;
      for (let i = 0; i < 50; i += 1) {
        const mid = (lo + hi) / 2;
        const altMid = altitudeAt(mid, ramc, latitude, obliquity);
        if (altitudeAt(lo, ramc, latitude, obliquity) * altMid <= 0) hi = mid;
        else lo = mid;
      }
      roots.push((lo + hi) / 2);
    }
    previousLon = lon;
    previousAlt = alt;
  }

  const rising = roots.find((lon) => {
    const { ra } = eclipticToEquatorial(lon, obliquity);
    const H = norm180(ramc - ra);
    return Math.sin(H * DEG) < 0;
  });

  return norm360(rising ?? roots[0] ?? 0);
}

function semiDiurnalArc(latitude: number, declination: number): number | null {
  const product = Math.tan(latitude * DEG) * Math.tan(declination * DEG);
  if (Number.isNaN(product)) return null;
  const value = -product;
  if (value <= -1 || value >= 1) return null; // полярные широты
  return Math.acos(value) * RAD;
}

function placidusCusp(
  target: (h: number) => number,
  ramc: number,
  latitude: number,
  obliquity: number
): number | null {
  // f(λ) = H(λ) - target(SA, NA); ищем корень перебором + бисекцией
  const evaluate = (lon: number): number => {
    const { ra, dec } = eclipticToEquatorial(lon, obliquity);
    const H = norm180(ramc - ra);
    const sa = semiDiurnalArc(latitude, dec);
    if (sa === null) return Number.NaN;
    return H - target(sa);
  };

  const samples = 720;
  let previousLon = 0;
  let previousValue = evaluate(0);
  const roots: { lon: number; distance: number }[] = [];

  for (let step = 1; step <= samples; step += 1) {
    const lon = (step * 360) / samples;
    const value = evaluate(lon);
    if (Number.isFinite(previousValue) && Number.isFinite(value) && previousValue * value <= 0 && previousValue !== value) {
      let lo = previousLon;
      let hi = lon;
      for (let i = 0; i < 60; i += 1) {
        const mid = (lo + hi) / 2;
        const midValue = evaluate(mid);
        if (!Number.isFinite(midValue)) break;
        if (evaluate(lo) * midValue <= 0) hi = mid;
        else lo = mid;
      }
      const root = (lo + hi) / 2;
      roots.push({ lon: root, distance: Math.abs(evaluate(root)) });
    }
    previousLon = lon;
    previousValue = value;
  }

  if (roots.length === 0) return null;
  roots.sort((a, b) => a.distance - b.distance);
  return norm360(roots[0]!.lon);
}

function computeHouses(
  system: HouseSystem,
  ascendant: number,
  midheaven: number,
  ramc: number,
  latitude: number,
  obliquity: number
): { cusps: number[]; fallback: boolean; note?: string } {
  if (system === "whole") {
    const start = Math.floor(norm360(ascendant) / 30) * 30;
    return { cusps: Array.from({ length: 12 }, (_, i) => norm360(start + i * 30)), fallback: false };
  }

  if (system === "equal") {
    return { cusps: Array.from({ length: 12 }, (_, i) => norm360(ascendant + i * 30)), fallback: false };
  }

  // Placidus
  if (Math.abs(latitude) > 66) {
    return {
      cusps: Array.from({ length: 12 }, (_, i) => norm360(ascendant + i * 30)),
      fallback: true,
      note: "Для широт выше 66° Placidus не определён — дома рассчитаны как равные от асцендента.",
    };
  }

  const cusp11 = placidusCusp((sa) => -sa / 3, ramc, latitude, obliquity);
  const cusp12 = placidusCusp((sa) => (-2 * sa) / 3, ramc, latitude, obliquity);
  const cusp2 = placidusCusp((sa) => -sa - (180 - sa) / 3, ramc, latitude, obliquity);
  const cusp3 = placidusCusp((sa) => -sa - (2 * (180 - sa)) / 3, ramc, latitude, obliquity);

  if (cusp2 === null || cusp3 === null || cusp11 === null || cusp12 === null) {
    return {
      cusps: Array.from({ length: 12 }, (_, i) => norm360(ascendant + i * 30)),
      fallback: true,
      note: "Placidus не удалось вычислить для этой широты — использованы равные дома.",
    };
  }

  // Индекс 0 = I дом. Полярные куспиды симметричны: X = MC, IV = MC+180.
  const cusps: number[] = [
    norm360(ascendant), // I
    norm360(cusp2), // II
    norm360(cusp3), // III
    norm360(midheaven + 180), // IV (IC)
    norm360(cusp11 + 180), // V
    norm360(cusp12 + 180), // VI
    norm360(ascendant + 180), // VII (DSC)
    norm360(cusp2 + 180), // VIII
    norm360(cusp3 + 180), // IX
    norm360(midheaven), // X (MC)
    norm360(cusp11), // XI
    norm360(cusp12), // XII
  ];

  return { cusps, fallback: false };
}

function houseOf(longitude: number, cusps: number[]): number {
  const lon = norm360(longitude);
  for (let i = 0; i < 12; i += 1) {
    const start = cusps[i]!;
    const end = cusps[(i + 1) % 12]!;
    const span = norm360(end - start);
    const offset = norm360(lon - start);
    if (offset < span || span === 0) return i + 1;
  }
  return 12;
}

function bodyLongitude(body: Body, time: ReturnType<typeof MakeTime>): number {
  const vector = GeoVector(body, time, true);
  const ecliptic = Ecliptic(vector);
  return norm360(ecliptic.elon);
}

function bodySpeed(body: Body, time: ReturnType<typeof MakeTime>): number {
  const before = bodyLongitude(body, MakeTime(new Date(time.date.getTime() - 12 * 3600_000)));
  const after = bodyLongitude(body, MakeTime(new Date(time.date.getTime() + 12 * 3600_000)));
  return norm180(after - before);
}

const BODY_MAP: Record<PlanetKey, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
};

const MOON_PHASES: { limit: number; name: string }[] = [
  { limit: 22.5, name: "Новолуние" },
  { limit: 67.5, name: "Растущий серп" },
  { limit: 112.5, name: "Первая четверть" },
  { limit: 157.5, name: "Растущая Луна" },
  { limit: 202.5, name: "Полнолуние" },
  { limit: 247.5, name: "Убывающая Луна" },
  { limit: 292.5, name: "Последняя четверть" },
  { limit: 337.5, name: "Убывающий серп" },
  { limit: 360, name: "Новолуние" },
];

export function computeNatalChart(input: NatalInput, houseSystem: HouseSystem = "placidus"): NatalChart {
  const warnings: string[] = [];
  const limitations: string[] = [
    "Положения планет рассчитаны геоцентрически и не учитывают топоцентрическую поправку (для Луны она доходит до ~1°).",
    "Плутон в astronomy-engine вычисляется приближённо (доли градуса).",
    "Исторические часовые пояса берутся из базы IANA; для дат до 1900 года возможны расхождения с местным солнечным временем.",
  ];

  // ------------------------------- дата/время -------------------------------
  const [yearStr, monthStr, dayStr] = input.date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) throw new Error("Некорректная дата рождения");

  const timeAssumed = input.timeAccuracy === "unknown" || !input.time;
  const [hourStr, minuteStr] = (input.time ?? "12:00").split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
    throw new Error("Некорректное время рождения");
  }

  if (timeAssumed) {
    warnings.push(
      "Время рождения неизвестно: расчёт выполнен на 12:00 местного времени. Положения Луны могут отличаться на несколько градусов, асцендент и дома не определяются достоверно."
    );
  } else if (input.timeAccuracy === "approx") {
    warnings.push(
      "Время рождения указано приблизительно: асцендент и куспиды домов могут смещаться примерно на 1° за каждые 4 минуты погрешности."
    );
  }

  const utcDate = zonedTimeToUtc(year, month, day, hour, minute, input.timezone);
  const astroTime = MakeTime(utcDate);
  const jd = astroTime.ut + 2451545.0; // юлианская дата

  // ------------------------------- планеты -------------------------------
  const rawPositions = PLANETS.map((planet) => {
    const body = BODY_MAP[planet.key];
    const longitude = bodyLongitude(body, astroTime);
    const speed = bodySpeed(body, astroTime);
    const sign = signFromLongitude(longitude);
    return {
      planet,
      longitude,
      speed,
      sign,
      retrograde: speed < 0,
    };
  });

  // ------------------------------- углы и дома -------------------------------
  const gast = SiderealTime(astroTime); // часы
  const lst = norm360(gast * 15 + input.longitude);
  const ramc = lst;
  const obliquity = meanObliquity(jd);
  const midheavenLon = norm360(Math.atan2(Math.sin(ramc * DEG), Math.cos(ramc * DEG) * Math.cos(obliquity * DEG)) * RAD);
  const ascendantLon = computeAscendant(ramc, input.latitude, obliquity);

  const houseResult = timeAssumed
    ? null
    : computeHouses(houseSystem, ascendantLon, midheavenLon, ramc, input.latitude, obliquity);

  if (houseResult?.fallback) {
    warnings.push(houseResult.note ?? "Дома рассчитаны по резервной системе.");
  }
  if (timeAssumed) {
    warnings.push("Асцендент и куспиды домов не рассчитываются: без времени рождения они недостоверны.");
  }

  const cusps = houseResult?.cusps ?? null;

  const positions: PlanetPosition[] = rawPositions.map(({ planet, longitude, retrograde, sign }) => ({
    key: planet.key,
    name: planet.name,
    symbol: planet.symbol,
    longitude: Number(longitude.toFixed(4)),
    sign: sign.name,
    signIndex: sign.index,
    degreeInSign: Number((norm360(longitude) - sign.index * 30).toFixed(4)),
    formatted: formatDegree(longitude),
    retrograde,
    house: cusps ? houseOf(longitude, cusps) : null,
    kind: planet.kind,
  }));

  // ------------------------------- аспекты -------------------------------
  const aspects: AspectHit[] = [];
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i]!;
      const b = positions[j]!;
      let delta = Math.abs(norm180(a.longitude - b.longitude));
      delta = Math.min(delta, 360 - delta);
      for (const aspect of ASPECTS) {
        const appliesToLuminary = a.kind === "luminary" || b.kind === "luminary";
        const limit = appliesToLuminary ? aspect.luminaryOrb : aspect.orb;
        const orb = Math.abs(delta - aspect.angle);
        if (orb > limit) continue;
        aspects.push({
          a: a.key,
          b: b.key,
          aName: a.name,
          bName: b.name,
          type: aspect.key,
          name: aspect.name,
          symbol: aspect.symbol,
          angle: aspect.angle,
          exactAngle: Number(delta.toFixed(2)),
          orb: Number(orb.toFixed(2)),
          orbLimit: limit,
          nature: aspect.nature,
          formatted: `${a.name} ${aspect.symbol} ${b.name} · орб ${orb.toFixed(1)}°`,
        });
        break;
      }
    }
  }
  aspects.sort((x, y) => x.orb - y.orb);

  // ------------------------------- распределения -------------------------------
  const elements: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalities: Record<string, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const position of positions) {
    const sign = SIGNS[position.signIndex]!;
    elements[sign.element] = (elements[sign.element] ?? 0) + 1;
    modalities[sign.modality] = (modalities[sign.modality] ?? 0) + 1;
  }
  if (cusps) {
    const sign = signFromLongitude(ascendantLon);
    elements[sign.element] = (elements[sign.element] ?? 0) + 1;
    modalities[sign.modality] = (modalities[sign.modality] ?? 0) + 1;
  }

  let hemispheres: NatalChart["distribution"]["hemispheres"] = null;
  if (cusps) {
    let top = 0;
    let bottom = 0;
    let east = 0;
    let west = 0;
    positions.forEach((position) => {
      if (position.house === null) return;
      if ([7, 8, 9, 10, 11, 12].includes(position.house)) top += 1;
      else bottom += 1;
      if ([10, 11, 12, 1, 2, 3].includes(position.house)) east += 1;
      else west += 1;
    });
    hemispheres = { top, bottom, east, west };
  }

  const sunPos = positions.find((p) => p.key === "sun")!;
  const moonPos = positions.find((p) => p.key === "moon")!;
  const phaseAngle = norm360(moonPos.longitude - sunPos.longitude);
  const moonPhase = {
    angle: Number(phaseAngle.toFixed(1)),
    name: MOON_PHASES.find((phase) => phaseAngle < phase.limit)?.name ?? "Новолуние",
    illumination: Number(((1 - Math.cos(phaseAngle * DEG)) / 2).toFixed(3)),
  };

  const dominantElementKey = Object.entries(elements).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "fire";
  const dominantModalityKey = Object.entries(modalities).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "cardinal";

  const elementLabels: Record<string, string> = { fire: "Огонь", earth: "Земля", air: "Воздух", water: "Вода" };
  const modalityLabels: Record<string, string> = {
    cardinal: "Кардинальный",
    fixed: "Фиксированный",
    mutable: "Мутабельный",
  };

  const houseSystemLabels: Record<HouseSystem, string> = {
    placidus: "Placidus",
    equal: "Равные дома",
    whole: "Whole Sign (знак = дом)",
  };

  return {
    meta: {
      algorithmVersion: ALGORITHM_VERSION,
      ephemeris: ASTRO_EPHEMERIS,
      zodiac: ZODIAC,
      houseSystem,
      houseSystemLabel: houseSystemLabels[houseSystem],
      computedAt: new Date().toISOString(),
    },
    birth: {
      date: input.date,
      time: timeAssumed ? null : `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      timeAccuracy: input.timeAccuracy,
      timeAssumed,
      placeName: input.placeName ?? "",
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      utcIso: utcDate.toISOString(),
      utcOffset: offsetLabelAt(utcDate, input.timezone),
      julianDay: Number(jd.toFixed(5)),
    },
    positions,
    ascendant: cusps
      ? {
          longitude: Number(ascendantLon.toFixed(4)),
          sign: signFromLongitude(ascendantLon).name,
          signIndex: signFromLongitude(ascendantLon).index,
          formatted: formatDegree(ascendantLon),
        }
      : null,
    midheaven: {
      longitude: Number(midheavenLon.toFixed(4)),
      sign: signFromLongitude(midheavenLon).name,
      formatted: formatDegree(midheavenLon),
    },
    houses: cusps
      ? cusps.map((cusp, index) => ({
          number: index + 1,
          cusp: Number(cusp.toFixed(4)),
          sign: signFromLongitude(cusp).name,
          formatted: formatDegree(cusp),
          title: HOUSES[index]!.title,
          sphere: HOUSES[index]!.sphere,
        }))
      : null,
    aspects,
    distribution: { elements, modalities, hemispheres },
    moonPhase,
    warnings,
    limitations,
    summary: {
      sun: `${sunPos.formatted}`,
      moon: `${moonPos.formatted}`,
      ascendant: cusps ? formatDegree(ascendantLon) : null,
      dominantElement: elementLabels[dominantElementKey] ?? dominantElementKey,
      dominantModality: modalityLabels[dominantModalityKey] ?? dominantModalityKey,
    },
  };
}

export function describeSign(index: number): SignInfo {
  return SIGNS[index]!;
}
