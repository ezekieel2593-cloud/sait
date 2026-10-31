import { energyLabel, type MatrixChart } from "../matrix/engine";
import { getArcanumEntry } from "../knowledge/queries";
import { getEnergyGuideText } from "../knowledge/guides";
import { getPracticalText } from "../knowledge/practical";

/**
 * Гайды по энергиям: собираем практическую инструкцию для каждой энергии,
 * которая реально есть в схеме человека.
 *
 * Одна и та же энергия может стоять в нескольких точках (например, в центре
 * и в канале денег) — тогда гайд один, а в подзаголовке перечислены все места.
 */

export interface MatrixGuide {
  id: string;
  /** Номер энергии 1–22. */
  arcanum: number;
  /** «10 — энергия». */
  label: string;
  title: string;
  /** Где встречается: «Центр · Канал денег (вход)». */
  where: string;
  places: string[];
  essence: string;
  /** Логика энергии: почему советы именно такие. */
  logic: string;
  signs: string[];
  steps: string[];
  practice: string;
  check: string;
  avoid: string[];
  /** Сильные проявления из базы знаний. */
  strength: string[];
  /** Зоны внимания из базы знаний. */
  risk: string[];
  premium: boolean;
}

export interface MatrixGuideOptions {
  /** Сколько гайдов открыто без заявки. */
  freeCount?: number;
  /** true — открыть всё (владелец). */
  includePremium?: boolean;
}

const MAX_GUIDES = 16;

export function buildMatrixGuides(
  chart: MatrixChart,
  options: MatrixGuideOptions = {}
): MatrixGuide[] {
  const freeCount = Math.max(0, options.freeCount ?? 2);
  const all = [...chart.points, chart.yearEnergy];

  const byArcanum = new Map<number, { arcanum: number; places: string[] }>();
  for (const point of all) {
    const entry = byArcanum.get(point.arcanum);
    if (entry) {
      if (!entry.places.includes(point.title)) entry.places.push(point.title);
    } else {
      byArcanum.set(point.arcanum, { arcanum: point.arcanum, places: [point.title] });
    }
  }

  const ordered = [...byArcanum.values()].slice(0, MAX_GUIDES);

  return ordered.map(({ arcanum, places }, index) => {
    const text = getEnergyGuideText(arcanum);
    const arcana = getArcanumEntry(arcanum);
    const label = energyLabel(arcanum);
    return {
      id: `guide-${arcanum}`,
      arcanum,
      label,
      title: `${label}`,
      where: places.join(" · "),
      places,
      essence: text?.essence ?? arcana?.summary ?? "",
      logic: getPracticalText(arcanum)?.logic ?? "",
      signs: text?.signs ?? [],
      steps: text?.steps ?? [],
      practice: text?.practice ?? "",
      check: text?.check ?? "",
      avoid: text?.avoid ?? [],
      strength: arcana?.positive ?? [],
      risk: arcana?.shadow ?? [],
      premium: options.includePremium === true ? false : index >= freeCount,
    };
  });
}

/** Текст гайда для письма или буфера обмена. */
export function guideToText(guide: MatrixGuide): string {
  const lines: string[] = [];
  lines.push(`${guide.label}: ${guide.essence}`);
  if (guide.logic) lines.push(`Почему советы такие: ${guide.logic}`);
  lines.push(`Где в вашей схеме: ${guide.where}.`);
  if (guide.signs.length) lines.push(`Как проявляется: ${guide.signs.join(" ")}`);
  if (guide.steps.length) {
    lines.push("Что делать:");
    guide.steps.forEach((step, index) => lines.push(`  ${index + 1}. ${step}`));
  }
  if (guide.practice) lines.push(`Практика на неделю: ${guide.practice}`);
  if (guide.check) lines.push(`Признак, что энергия в плюсе: ${guide.check}`);
  if (guide.avoid.length) lines.push(`Чего избегать: ${guide.avoid.join(" ")}`);
  return lines.join("\n");
}
