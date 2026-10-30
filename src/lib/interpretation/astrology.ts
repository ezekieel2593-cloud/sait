import { ELEMENT_LABELS, MODALITY_LABELS, PLANETS, SIGNS, signInSign } from "../astronomy/constants";
import type { NatalChart, PlanetPosition } from "../astronomy/engine";
import { getEntry, getSignEntry } from "../knowledge/queries";
import type { Interpretation, InterpretationSection } from "./types";

/**
 * Сборка персональной интерпретации из рассчитанных значений и базы знаний.
 *
 * Слой расчёта (engine) и слой интерпретации (этот файл) разделены:
 * здесь не вычисляется ни одно астрономическое значение — только используются
 * готовые числа и тексты базы знаний.
 */

const SIGN_BY_NAME: Record<string, number> = SIGNS.reduce<Record<string, number>>((acc, sign) => {
  acc[sign.name] = sign.index;
  return acc;
}, {});

function signIndexByName(name: string): number {
  return SIGN_BY_NAME[name] ?? 0;
}

function houseNote(house: number | null): string {
  if (!house) return "";
  const entry = getEntry("house", `house${house}`);
  return entry ? `${entry.title} описывает сферу: ${entry.details.sphere ?? entry.summary.toLowerCase()}` : "";
}

function retrogradeNote(position: PlanetPosition): string {
  if (!position.retrograde) return "";
  return `${position.name} в ретроградном движении: качество чаще проявляется внутренне — через размышления и пересмотр, а не через внешнюю активность.`;
}

function planetSection(position: PlanetPosition): InterpretationSection {
  const planetEntry = getEntry("planet", position.key);
  const signEntry = getSignEntry(signIndexByName(position.sign));
  const sign = SIGNS[signIndexByName(position.sign)]!;

  const paragraphs: string[] = [];
  if (planetEntry) {
    paragraphs.push(`Тема ${position.name} — ${planetEntry.details.theme ?? "ключевая тема карты"}.`);
  }
  if (signEntry) {
    paragraphs.push(`${position.name} в знаке ${sign.name} (${position.formatted}): ${signEntry.summary}`);
  }
  const house = houseNote(position.house);
  if (house) {
    paragraphs.push(`${house} Здесь эта энергия проявляется в первую очередь.`);
  }
  const retro = retrogradeNote(position);
  if (retro) paragraphs.push(retro);
  if (signEntry?.details.work) {
    paragraphs.push(`Реализация: ${signEntry.details.work}`);
  }

  return {
    id: `planet-${position.key}`,
    title: `${planetEntry?.title ?? position.name} в ${position.sign}`,
    subtitle: `${position.formatted}${position.house ? ` · ${position.house} дом` : ""}${position.retrograde ? " · R" : ""}`,
    paragraphs,
    positive: signEntry?.positive,
    shadow: signEntry?.shadow,
    recommendations: signEntry?.recommendations,
    premium: !["sun", "moon"].includes(position.key),
    sourceNote: signEntry?.source?.title,
  };
}

function ascendantSection(chart: NatalChart): InterpretationSection {
  if (!chart.ascendant) {
    return {
      id: "ascendant",
      title: "Асцендент не рассчитан",
      subtitle: "время рождения неизвестно",
      paragraphs: [
        "Без времени рождения асцендент и дома определяются недостоверно, поэтому мы не показываем их как факт.",
        "Если вы знаете время хотя бы приблизительно — пересчитайте карту: асцендент уточнит, как вас видят другие и через какие сферы жизни проявляется основная активность.",
      ],
      premium: false,
    };
  }

  const signEntry = getSignEntry(chart.ascendant.signIndex);
  return {
    id: "ascendant",
    title: `Асцендент в ${chart.ascendant.sign}`,
    subtitle: chart.ascendant.formatted,
    paragraphs: [
      `Асцендент — точка на восточном горизонте в момент рождения. Он показывает первое впечатление и привычный способ входить в новое.`,
      signEntry ? `В знаке ${chart.ascendant.sign}: ${signEntry.summary}` : "",
    ].filter(Boolean),
    positive: signEntry?.positive,
    shadow: signEntry?.shadow,
    recommendations: signEntry?.recommendations,
    premium: true,
  };
}

function elementSection(chart: NatalChart): InterpretationSection {
  const elements = chart.distribution.elements;
  const sorted = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  const [dominantKey, dominantValue] = sorted[0]!;
  const weakest = sorted[sorted.length - 1]!;
  const entry = getEntry("element", dominantKey);
  const weakEntry = getEntry("element", weakest[0]);
  const modality = Object.entries(chart.distribution.modalities).sort((a, b) => b[1] - a[1])[0]!;
  const modalityEntry = getEntry("modality", modality[0]);

  return {
    id: "distribution",
    title: `Ведущая стихия — ${ELEMENT_LABELS[dominantKey as keyof typeof ELEMENT_LABELS] ?? dominantKey}`,
    subtitle: `${dominantValue} из ${chart.positions.length + (chart.ascendant ? 1 : 0)} показателей · ${MODALITY_LABELS[modality[0] as keyof typeof MODALITY_LABELS] ?? modality[0]} крест`,
    paragraphs: [
      entry?.summary ?? "",
      weakEntry ? `Меньше всего выражена стихия «${weakEntry.title}» (${weakest[1]}): её качества обычно требуют осознанного развития.` : "",
      modalityEntry ? `${modalityEntry.title}: ${modalityEntry.summary}` : "",
    ].filter(Boolean),
    positive: entry?.positive,
    shadow: entry?.shadow,
    recommendations: [...(entry?.recommendations ?? []), ...(modalityEntry?.recommendations ?? [])].slice(0, 2),
    premium: false,
  };
}

function aspectSections(chart: NatalChart, limit: number): InterpretationSection[] {
  return chart.aspects.slice(0, limit).map((aspect, index) => {
    const entry = getEntry("aspect", aspect.type);
    return {
      id: `aspect-${aspect.a}-${aspect.b}`,
      title: `${aspect.name}: ${aspect.aName} и ${aspect.bName}`,
      subtitle: `${aspect.symbol} ${aspect.angle}° · орб ${aspect.orb.toFixed(1)}°`,
      paragraphs: [
        entry?.summary ?? "",
        `Точное расстояние между планетами — ${aspect.exactAngle.toFixed(1)}°, допустимый орбис для этого аспекта — ${aspect.orbLimit}°.`,
      ].filter(Boolean),
      positive: entry?.positive,
      shadow: entry?.shadow,
      recommendations: entry?.recommendations,
      premium: index >= 1,
    };
  });
}

/** Ключ планеты по её русскому названию — для поиска текста об управителе. */
const PLANET_KEY_BY_NAME: Record<string, string> = PLANETS.reduce<Record<string, string>>((acc, planet) => {
  acc[planet.name] = planet.key;
  return acc;
}, {});

/**
 * Разделы домов: не «сфера + список планет», а полноценный разбор.
 *
 * Для каждого дома собираем четыре слоя — знак на куспиде, управителя и его
 * положение в карте, планеты внутри и аспекты к ним. Именно эта связка делает
 * дом личным: без неё карточка дома одинаково звучит у всех людей.
 */
function houseSections(chart: NatalChart): InterpretationSection[] {
  if (!chart.houses) return [];

  return chart.houses.slice(0, 12).map((house) => {
    const entry = getEntry("house", `house${house.number}`);
    const spot = entry?.details.sphere ?? house.sphere;
    const planetsInHouse = chart.positions.filter((position) => position.house === house.number);

    const cuspSign = SIGNS.find((sign) => sign.name === house.sign);
    const cuspEntry = cuspSign ? getSignEntry(cuspSign.index) : undefined;

    const rulerName = cuspSign?.ruler ?? "";
    const rulerKey = PLANET_KEY_BY_NAME[rulerName] ?? "";
    const ruler = rulerKey ? chart.positions.find((position) => position.key === rulerKey) : undefined;
    const rulerEntry = rulerKey ? getEntry("planet", rulerKey) : undefined;
    const rulerHouseEntry = ruler?.house ? getEntry("house", `house${ruler.house}`) : undefined;

    const paragraphs: string[] = [];
    paragraphs.push(entry ? entry.summary : `Сфера дома: ${spot}.`);

    if (cuspEntry) {
      paragraphs.push(
        `На куспиде — ${house.sign}: тема «${spot}» раскрывается через этот знак. ${cuspEntry.summary}`
      );
    }

    if (ruler) {
      const rulerTheme = rulerEntry?.details.theme ?? "своя тема";
      const rulerPlace = ruler.house
        ? `в ${ruler.house} доме — «${rulerHouseEntry?.details.sphere ?? "своя сфера"}»`
        : "дом не определяется: время рождения неизвестно";
      paragraphs.push(
        `Управитель дома — ${rulerName}, его тема — ${rulerTheme}. В вашей карте ${rulerName} находится в знаке ${ruler.sign}, ${rulerPlace}. Именно там тема «${spot}» находит опору и развитие.`
      );
    }

    if (planetsInHouse.length) {
      for (const position of planetsInHouse) {
        const planetEntry = getEntry("planet", position.key);
        const planetSign = getSignEntry(signIndexByName(position.sign));
        const theme = planetEntry?.details.theme ?? "свою тему";
        const retro = position.retrograde
          ? " Ретроградность: тема раскрывается через внутреннюю работу и переосмысление."
          : "";
        const signNote = position.sign === house.sign ? "" : planetSign?.summary ?? "";
        paragraphs.push(
          `${position.name} в знаке ${position.sign}: в этом доме работает тема «${theme}».${signNote ? ` ${signNote}` : ""}${retro}`
        );
      }
    } else {
      paragraphs.push(
        `Планет в этом доме нет: тема не звучит громко сама по себе, её ведут знак на куспиде и управитель.`
      );
    }

    // Аспекты, которые касаются планет этого дома, — самая точная деталь.
    const housePlanetKeys = new Set(planetsInHouse.map((position) => position.key));
    const related = chart.aspects
      .filter((aspect) => housePlanetKeys.has(aspect.a) || housePlanetKeys.has(aspect.b))
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 2);
    if (related.length) {
      const phrases = related.map((aspect) => `${aspect.name} ${aspect.aName}–${aspect.bName} (орб ${aspect.orb.toFixed(1)}°)`);
      paragraphs.push(
        `Аспекты к планетам дома: ${phrases.join("; ")}. Они показывают, с какими сферами тема связана и где она встречает напряжение.`
      );
    }

    const recommendations = [
      ...(cuspEntry?.recommendations ?? []),
      ...planetsInHouse.flatMap((position) => getEntry("planet", position.key)?.recommendations ?? []),
    ].slice(0, 3);

    return {
      id: `house-${house.number}`,
      title: `${house.title}: ${house.sign}`,
      subtitle: `${house.formatted} · ${spot}`,
      paragraphs: paragraphs.filter(Boolean),
      positive: cuspEntry?.positive,
      shadow: cuspEntry?.shadow,
      recommendations: recommendations.length ? recommendations : undefined,
      premium: true,
    };
  });
}

export interface AstrologyInterpretationOptions {
  freeSections?: number;
  maxAspects?: number;
  includeHouses?: boolean;
  /** true — открыть все разделы (владелец в кабинете). */
  includePremium?: boolean;
}

export function buildAstrologyInterpretation(
  chart: NatalChart,
  options: AstrologyInterpretationOptions = {}
): Interpretation {
  const freeSections = Math.max(3, options.freeSections ?? 4);
  const maxAspects = options.maxAspects ?? 24;

  const sun = chart.positions.find((position) => position.key === "sun")!;
  const moon = chart.positions.find((position) => position.key === "moon")!;
  const sunEntry = getSignEntry(signIndexByName(sun.sign));
  const moonEntry = getSignEntry(signIndexByName(moon.sign));

  const sections: InterpretationSection[] = [
    planetSection(sun),
    planetSection(moon),
    ascendantSection(chart),
    elementSection(chart),
    ...aspectSections(chart, maxAspects),
    ...chart.positions
      .filter((position) => !["sun", "moon"].includes(position.key))
      .map(planetSection),
    ...(options.includeHouses === false ? [] : houseSections(chart)),
  ];

  // Проставляем премиум-флаг: первые N разделов открыты
  const prepared = sections.map((section, index) => ({
    ...section,
    premium: options.includePremium === true ? false : section.premium ? true : index >= freeSections,
  }));

  const openedCount = prepared.filter((section) => !section.premium).length;

  return {
    direction: "astrology",
    headline: `Солнце в ${signInSign(sun.sign)}, Луна в ${signInSign(moon.sign)}${
      chart.ascendant ? `, асцендент в ${signInSign(chart.ascendant.sign)}` : ""
    }`,
    lead: [
      sunEntry ? `Ваша базовая энергия — ${sunEntry.details.love ?? sunEntry.summary}` : "",
      moonEntry ? `Эмоционально важно: ${moonEntry.details.growth ?? moonEntry.summary}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    sections: prepared,
    freeCount: openedCount,
    totalCount: prepared.length,
    methodology: `${chart.meta.zodiac}, дома: ${chart.meta.houseSystemLabel}, эфемериды: ${chart.meta.ephemeris}`,
    version: chart.meta.algorithmVersion,
    warnings: chart.warnings,
    limitations: chart.limitations,
  };
}

export function fullInterpretationText(chart: NatalChart, interpretation: Interpretation): string {
  const lines: string[] = [];
  lines.push(`НАТАЛЬНАЯ КАРТА`);
  lines.push(`Дата: ${chart.birth.date}, время: ${chart.birth.time ?? "неизвестно"}, место: ${chart.birth.placeName}`);
  lines.push(`Координаты: ${chart.birth.latitude.toFixed(4)}, ${chart.birth.longitude.toFixed(4)} (${chart.birth.timezone}, ${chart.birth.utcOffset})`);
  lines.push(`UT: ${chart.birth.utcIso}`);
  lines.push(`Методика: ${chart.meta.zodiac}; дома ${chart.meta.houseSystemLabel}; эфемериды ${chart.meta.ephemeris}; версия ${chart.meta.algorithmVersion}`);
  lines.push("");
  lines.push("ПОЛОЖЕНИЯ ПЛАНЕТ");
  for (const position of chart.positions) {
    lines.push(`  ${position.name}: ${position.formatted}${position.house ? `, ${position.house} дом` : ""}${position.retrograde ? " (R)" : ""}`);
  }
  if (chart.ascendant) lines.push(`  Асцендент: ${chart.ascendant.formatted}`);
  lines.push(`  MC: ${chart.midheaven.formatted}`);
  if (chart.houses) {
    lines.push("");
    lines.push("ДОМА");
    for (const house of chart.houses) {
      lines.push(`  ${house.title}: ${house.formatted}`);
    }
  }
  lines.push("");
  lines.push("АСПЕКТЫ");
  for (const aspect of chart.aspects.slice(0, 25)) {
    lines.push(`  ${aspect.aName} ${aspect.symbol} ${aspect.bName} — орб ${aspect.orb.toFixed(1)}°`);
  }
  lines.push("");
  lines.push("ИНТЕРПРЕТАЦИЯ");
  lines.push(interpretation.headline);
  for (const section of interpretation.sections) {
    lines.push("");
    lines.push(`— ${section.title}${section.subtitle ? ` (${section.subtitle})` : ""}`);
    for (const paragraph of section.paragraphs) lines.push(paragraph);
    if (section.positive?.length) lines.push(`Сильные стороны: ${section.positive.join("; ")}.`);
    if (section.shadow?.length) lines.push(`Зоны внимания: ${section.shadow.join("; ")}.`);
    if (section.recommendations?.length) lines.push(`Рекомендации: ${section.recommendations.join(" ")}`);
  }
  if (chart.warnings.length) {
    lines.push("");
    lines.push("ОГРАНИЧЕНИЯ РАСЧЁТА");
    for (const warning of chart.warnings) lines.push(`- ${warning}`);
  }
  return lines.join("\n");
}

export { PLANETS };
