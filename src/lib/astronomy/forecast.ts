/**
 * Прогнозные техники: транзиты и вторичные прогрессии.
 *
 * · Транзиты — положения планет на выбранную дату и их аспекты к натальным.
 *   Орбис сжат по сравнению с натальным (2° для быстрых планет, 3° для
 *   медленных), иначе к любой карте найдётся десяток «событий».
 * · Вторичные прогрессии — классическая техника «день за год»: берём дату
 *   рождения + N дней, где N — возраст в годах, и считаем карту на то же
 *   местное время и то же место. Один день = один год жизни.
 *
 * Обе техники описательные: это не предсказание событий, а язык периодов.
 */

import {
  ASPECTS,
  PLANETS,
  SIGNS,
  formatDegree,
  signFromLongitude,
  type AspectKey,
  type PlanetKey,
} from "./constants";
import {
  computeNatalChart,
  planetLongitudesAt,
  type HouseSystem,
  type NatalChart,
} from "./engine";

export interface ForecastAspect {
  transitKey: PlanetKey;
  transitName: string;
  natalKey: PlanetKey;
  natalName: string;
  type: AspectKey;
  name: string;
  symbol: string;
  angle: number;
  exactAngle: number;
  orb: number;
  nature: "harmonious" | "tense" | "neutral";
  /** Описание: «транзитный Сатурн в квадрате к натальному Солнцу». */
  formatted: string;
}

export interface TransitStrip {
  key: PlanetKey;
  name: string;
  symbol: string;
  sign: string;
  formatted: string;
  retrograde: boolean;
  house: number | null;
}

export interface TransitsResult {
  at: string;
  /** «7 ноября 2026». */
  atLabel: string;
  strip: TransitStrip[];
  aspects: ForecastAspect[];
  slow: ForecastAspect[];
}

/** Дательный падеж: «к натальному Солнцу», «к натальной Луне». */
const DATIVE: Record<PlanetKey, string> = {
  sun: "Солнцу",
  moon: "Луне",
  mercury: "Меркурию",
  venus: "Венере",
  mars: "Марсу",
  jupiter: "Юпитеру",
  saturn: "Сатурну",
  uranus: "Урану",
  neptune: "Нептуну",
  pluto: "Плутону",
};

const SLOW: PlanetKey[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];
const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function fastKey(key: PlanetKey): boolean {
  return !SLOW.includes(key);
}

function orbLimit(transitKey: PlanetKey, natalKey: PlanetKey): number {
  if (fastKey(transitKey) && fastKey(natalKey)) return 2;
  if (fastKey(transitKey) || fastKey(natalKey)) return 2.5;
  return 3;
}

/** Аспекты между двумя наборами долгот с ограничением по орбису. */
function aspectsBetween(
  from: { key: PlanetKey; name: string; longitude: number }[],
  to: { key: PlanetKey; name: string; longitude: number }[],
  prefix: "транзитный" | "прогрессивный"
): ForecastAspect[] {
  const result: ForecastAspect[] = [];
  for (const transit of from) {
    for (const natal of to) {
      if (transit.key === natal.key) continue;
      let delta = Math.abs(transit.longitude - natal.longitude) % 360;
      if (delta > 180) delta = 360 - delta;
      for (const aspect of ASPECTS) {
        const limit = orbLimit(transit.key, natal.key);
        const orb = Math.abs(delta - aspect.angle);
        if (orb > limit) continue;
        const transitWord = prefix === "транзитный" ? "транзитный" : "прогрессивный";
        result.push({
          transitKey: transit.key,
          transitName: transit.name,
          natalKey: natal.key,
          natalName: natal.name,
          type: aspect.key,
          name: aspect.name,
          symbol: aspect.symbol,
          angle: aspect.angle,
          exactAngle: Number(delta.toFixed(2)),
          orb: Number(orb.toFixed(2)),
          nature: aspect.nature,
          formatted: `${transitWord[0]!.toUpperCase()}${transitWord.slice(1)} ${transit.name} ${aspect.symbol} ${aspect.name.toLowerCase()} к ${DATIVE[natal.key] ?? natal.name}`,
        });
        break;
      }
    }
  }
  return result.sort((a, b) => a.orb - b.orb);
}

/** Транзиты на дату: положения планет сейчас и их аспекты к карте. */
/** Прямое или попятное движение: сравниваем долготу за сутки до и после. */
function isRetrograde(key: PlanetKey, at: Date): boolean {
  const before = planetLongitudesAt(new Date(at.getTime() - 43_200_000))[key];
  const after = planetLongitudesAt(new Date(at.getTime() + 43_200_000))[key];
  let delta = after - before;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

export function computeTransits(natal: NatalChart, at: Date = new Date()): TransitsResult {
  const keys = Object.keys(planetLongitudesAt(at)) as PlanetKey[];
  const longitudes = planetLongitudesAt(at);
  const strip: TransitStrip[] = PLANETS.filter((planet) => keys.includes(planet.key)).map((planet) => {
    const longitude = longitudes[planet.key]!;
    const sign = signFromLongitude(longitude);
    return {
      key: planet.key,
      name: planet.name,
      symbol: planet.symbol,
      sign: sign.name,
      formatted: formatDegree(longitude),
      retrograde: isRetrograde(planet.key, at),
      house: natal.houses
        ? (() => {
            const cusps = natal.houses!.map((house) => house.cusp);
            for (let i = 0; i < 12; i += 1) {
              const start = cusps[i]!;
              const end = cusps[(i + 1) % 12]!;
              const span = ((end - start) % 360 + 360) % 360;
              const offset = ((longitude - start) % 360 + 360) % 360;
              if (offset < span) return i + 1;
            }
            return 12;
          })()
        : null,
    };
  });

  const from = PLANETS.map((planet) => ({
    key: planet.key,
    name: planet.name,
    longitude: longitudes[planet.key]!,
  }));
  const to = natal.positions.map((position) => ({
    key: position.key,
    name: position.name,
    longitude: position.longitude,
  }));

  const aspects = aspectsBetween(from, to, "транзитный");
  return {
    at: at.toISOString(),
    atLabel: `${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()}`,
    strip,
    aspects,
    slow: aspects.filter((aspect) => !fastKey(aspect.transitKey)),
  };
}

export interface ProgressionsResult {
  /** Возраст в годах, на который посчитана прогрессия. */
  age: number;
  /** Дата прогрессии (день рождения + возраст дней). */
  date: string;
  chart: NatalChart;
  aspects: ForecastAspect[];
  note: string;
}

/** Вторичные прогрессии: «день за год» на текущую дату. */
export function computeProgressions(
  natal: NatalChart,
  at: Date = new Date(),
  houseSystem: HouseSystem = "placidus"
): ProgressionsResult {
  const birth = new Date(natal.birth.utcIso);
  const days = (at.getTime() - birth.getTime()) / 86_400_000;
  const age = days / 365.2422;
  const progressed = new Date(birth.getTime() + Math.floor(age) * 86_400_000);

  // Прогрессия считается на то же местное время и то же место: берём локальные
  // дату и время из исходных данных, а не из UTC, чтобы не сдвинуть углы.
  const date = progressed.toISOString().slice(0, 10);
  const time = natal.birth.time;

  let chart = natal;
  let note = "Время рождения неизвестно: прогрессии посчитаны по планетам, без асцендента.";
  if (time) {
    chart = computeNatalChart(
      {
        date,
        time,
        timeAccuracy: natal.birth.timeAccuracy,
        latitude: natal.birth.latitude,
        longitude: natal.birth.longitude,
        timezone: natal.birth.timezone,
        placeName: natal.birth.placeName,
      },
      houseSystem
    );
    note = "Прогрессии считаются по правилу «день за год»: один день после рождения равен одному году жизни.";
  }

  const from = chart.positions.map((position) => ({
    key: position.key,
    name: position.name,
    longitude: position.longitude,
  }));
  const to = natal.positions.map((position) => ({
    key: position.key,
    name: position.name,
    longitude: position.longitude,
  }));

  return {
    age: Number(age.toFixed(1)),
    date,
    chart,
    aspects: aspectsBetween(from, to, "прогрессивный"),
    note,
  };
}

export const SIGN_NAMES = SIGNS.map((sign) => sign.name);
export const MONTH_NAMES = MONTHS;

export interface SolarReturnResult {
  /** Год, на который построен соляр. */
  year: number;
  /** Локальная дата и время возвращения Солнца в натальную долготу. */
  date: string;
  time: string;
  chart: NatalChart;
  aspects: ForecastAspect[];
  /** Сколько часов от дня рождения до точного возврата (может быть отрицательным). */
  shiftHours: number;
  note: string;
}

/**
 * Соляр: момент, когда транзитное Солнце возвращается в натальную долготу.
 *
 * Считаем численно: берём день рождения в нужном году, огрубляем шаг до суток,
 * затем уточняем бисекцией по разности долгот. Точность — несколько минут;
 * для карты это меньше угловой минуты по Солнцу, но время указывается
 * с округлением до минуты, чтобы не создавать ложного впечатления точности.
 */
export function computeSolarReturn(
  natal: NatalChart,
  year: number,
  houseSystem: HouseSystem = "placidus"
): SolarReturnResult {
  const target = natal.positions.find((position) => position.key === "sun")!.longitude;
  const birth = new Date(natal.birth.utcIso);
  const start = new Date(birth.getTime());
  start.setUTCFullYear(year);

  const diff = (moment: Date) => {
    const value = planetLongitudesAt(moment).sun;
    let delta = value - target;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta;
  };

  // Грубый поиск: шаг в 6 часов в пределах ±4 суток от дня рождения.
  let previous = new Date(start.getTime() - 4 * 86_400_000);
  let previousDiff = diff(previous);
  let exact = start;
  for (let step = 1; step <= 32; step += 1) {
    const current = new Date(start.getTime() + (step - 4) * 6 * 3_600_000);
    const currentDiff = diff(current);
    if (previousDiff < 0 && currentDiff >= 0) {
      // Бисекция внутри найденного интервала.
      let low = previous.getTime();
      let high = current.getTime();
      for (let iteration = 0; iteration < 40; iteration += 1) {
        const middle = (low + high) / 2;
        if (diff(new Date(middle)) < 0) low = middle;
        else high = middle;
      }
      exact = new Date(Math.round((low + high) / 2 / 60_000) * 60_000);
      break;
    }
    previous = current;
    previousDiff = currentDiff;
  }

  // Соляр строится на место рождения: человек в этот день может быть в другом
  // городе, но без этих данных честнее взять известное место.
  const iso = exact.toISOString();
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: natal.birth.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(exact);
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: natal.birth.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(exact);

  const chart = computeNatalChart(
    {
      date: localDate,
      time: localTime,
      timeAccuracy: natal.birth.timeAccuracy,
      latitude: natal.birth.latitude,
      longitude: natal.birth.longitude,
      timezone: natal.birth.timezone,
      placeName: natal.birth.placeName,
    },
    houseSystem
  );

  const from = chart.positions.map((position) => ({
    key: position.key,
    name: position.name,
    longitude: position.longitude,
  }));
  const to = natal.positions.map((position) => ({
    key: position.key,
    name: position.name,
    longitude: position.longitude,
  }));

  return {
    year,
    date: localDate,
    time: localTime,
    chart,
    aspects: aspectsBetween(from, to, "прогрессивный"),
    shiftHours: Number(((exact.getTime() - start.getTime()) / 3_600_000).toFixed(1)),
    note: `Соляр построен на место рождения (${natal.birth.placeName}). Если день рождения проводится в другом городе, дома соляра сместятся — их нужно пересчитывать на место фактического пребывания. Момент возврата: ${iso.slice(11, 16)} UT.`,
  };
}

export interface SynastryAspect extends ForecastAspect {
  /** Чей это аспект по направлению: планета первого человека к планете второго. */
  direction: "a-to-b";
}

export interface SynastryHit {
  /** Планета первого человека и дом его карты, в который попадает планета партнёра. */
  house: number;
  fromName: string;
  houseTitle: string;
}

export interface SynastryResult {
  aspects: ForecastAspect[];
  /** Планеты партнёра в домах первого человека. */
  overlay: SynastryHit[];
  harmonious: number;
  tense: number;
  neutral: number;
  /** Короткий вывод: чего в паре больше — поддержки или трения. */
  summary: string;
}

/** Совместимость: аспекты планет двух карт и наложение домов. */
export function computeSynastry(a: NatalChart, b: NatalChart): SynastryResult {
  const from = b.positions.map((position) => ({
    key: position.key,
    name: position.name,
    longitude: position.longitude,
  }));
  const to = a.positions.map((position) => ({
    key: position.key,
    name: position.name,
    longitude: position.longitude,
  }));

  const aspects = aspectsBetween(from, to, "транзитный").map((aspect) => ({
    ...aspect,
    formatted: `${aspect.transitName} партнёра ${aspect.symbol} ${aspect.name.toLowerCase()} к ${DATIVE[aspect.natalKey] ?? aspect.natalName} (ваша карта)`,
  }));

  const overlay: SynastryHit[] = [];
  if (a.houses) {
    const cusps = a.houses.map((house) => house.cusp);
    for (const position of b.positions) {
      let house = 12;
      for (let i = 0; i < 12; i += 1) {
        const start = cusps[i]!;
        const end = cusps[(i + 1) % 12]!;
        const span = ((end - start) % 360 + 360) % 360;
        const offset = ((position.longitude - start) % 360 + 360) % 360;
        if (offset < span) {
          house = i + 1;
          break;
        }
      }
      overlay.push({ house, fromName: position.name, houseTitle: `Дом ${house}` });
    }
  }

  const harmonious = aspects.filter((aspect) => aspect.nature === "harmonious").length;
  const tense = aspects.filter((aspect) => aspect.nature === "tense").length;
  const neutral = aspects.filter((aspect) => aspect.nature === "neutral").length;

  let summary = "Аспектов в столь узком орбисе нет: карты связаны слабо, каждый идёт своим ритмом.";
  if (harmonious + tense + neutral > 0) {
    if (harmonious > tense * 1.5) {
      summary =
        "Преобладают гармоничные связи: рядом друг с другом легко договариваться и поддерживать. Трение возникает там, где один ждёт инициативы, а второй — покоя.";
    } else if (tense > harmonious * 1.5) {
      summary =
        "Преобладают напряжённые связи: пара притягивает друг друга через разницу, и в этом же источнике роста — источник усталости. Работает там, где есть договорённость о правилах.";
    } else {
      summary =
        "Гармоничные и напряжённые связи распределены ровно: рядом есть и опора, и задачи, которые приходится решать вместе.";
    }
  }

  return { aspects, overlay, harmonious, tense, neutral, summary };
}
