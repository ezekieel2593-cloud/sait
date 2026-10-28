import { ELEMENT_LABELS, MODALITY_LABELS, PLANETS, SIGNS } from "../astronomy/constants";
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
    paragraphs.push(`${position.name} отвечает за ${planetEntry.details.theme ?? "ключевую тему карты"}.`);
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

function houseSections(chart: NatalChart): InterpretationSection[] {
  if (!chart.houses) return [];
  return chart.houses.slice(0, 12).map((house) => {
    const entry = getEntry("house", `house${house.number}`);
    const planetsInHouse = chart.positions.filter((position) => position.house === house.number);
    return {
      id: `house-${house.number}`,
      title: `${house.title}: ${house.sign}`,
      subtitle: `${house.formatted} · ${house.sphere}`,
      paragraphs: [
        entry?.summary ?? "",
        planetsInHouse.length
          ? `В этом доме: ${planetsInHouse.map((p) => p.name).join(", ")}.`
          : "Планет в этом доме нет — тема включается через управителя и транзиты.",
      ].filter(Boolean),
      premium: true,
    };
  });
}

export interface AstrologyInterpretationOptions {
  freeSections?: number;
  maxAspects?: number;
  includeHouses?: boolean;
}

export function buildAstrologyInterpretation(
  chart: NatalChart,
  options: AstrologyInterpretationOptions = {}
): Interpretation {
  const freeSections = Math.max(3, options.freeSections ?? 4);
  const maxAspects = options.maxAspects ?? 6;

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
    premium: section.premium ? true : index >= freeSections,
  }));

  const openedCount = prepared.filter((section) => !section.premium).length;

  return {
    direction: "astrology",
    headline: `Солнце в ${sun.sign}, Луна в ${moon.sign}${chart.ascendant ? `, асцендент в ${chart.ascendant.sign}` : ""}`,
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
