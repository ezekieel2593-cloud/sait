import { energyLabel, type MatrixChart, type MatrixPoint } from "../matrix/engine";
import { getArcanumEntry, getPositionEntry } from "../knowledge/queries";
import type { Interpretation, InterpretationSection } from "./types";

/**
 * Интерпретация Матрицы судьбы.
 * Тексты берутся из базы знаний (позиция + аркан), расчётные числа — из движка.
 */

const FREE_POINTS = ["center", "A", "B", "D", "money-entry", "love-entry"];

function pointSection(point: MatrixPoint): InterpretationSection {
  const position = getPositionEntry(point.key);
  const arcana = getArcanumEntry(point.arcanum);

  const paragraphs: string[] = [];
  if (position) {
    paragraphs.push(`${position.title}. ${position.summary}`);
    paragraphs.push(`Формула расчёта: ${point.formula}.`);
  }
  if (arcana) {
    paragraphs.push(`${energyLabel(point.arcanum)}. ${arcana.summary}`);
  }
  if (arcana?.details.money && ["money-entry", "money-middle", "shared"].includes(point.key)) {
    paragraphs.push(`В контексте денег: ${arcana.details.money}`);
  }
  if (arcana?.details.love && ["love-entry", "love-middle", "shared"].includes(point.key)) {
    paragraphs.push(`В контексте отношений: ${arcana.details.love}`);
  }
  if (arcana?.details.karma && ["D", "center", "family-force"].includes(point.key)) {
    paragraphs.push(`Задача энергии: ${arcana.details.karma}`);
  }

  return {
    id: `point-${point.key}`,
    title: point.title,
    subtitle: point.arcanumTitle,
    paragraphs,
    positive: arcana?.positive,
    shadow: arcana?.shadow,
    recommendations: arcana?.recommendations,
    premium: !FREE_POINTS.includes(point.key),
    arcana: point.arcanum,
    sourceNote: arcana?.source?.title,
  };
}

export interface MatrixInterpretationOptions {
  freeSections?: number;
  /**
   * true — открыть все разделы (владелец в кабинете).
   * Ограничения бесплатной версии к его расчётам не применяются.
   */
  includePremium?: boolean;
}

export function buildMatrixInterpretation(
  chart: MatrixChart,
  options: MatrixInterpretationOptions = {}
): Interpretation {
  const freeSections = Math.max(3, options.freeSections ?? 5);

  const ordered = [
    "center",
    "A",
    "B",
    "C",
    "D",
    "money-entry",
    "money-middle",
    "love-entry",
    "love-middle",
    "shared",
    "family-top-left",
    "family-top-right",
    "family-bottom-left",
    "family-bottom-right",
    "family-force",
  ]
    .map((key) => chart.byKey[key])
    .filter((point): point is MatrixPoint => Boolean(point));

  const sections = [...ordered.map(pointSection), pointSection(chart.yearEnergy)];

  const prepared = sections.map((section, index) => ({
    ...section,
    premium: options.includePremium === true ? false : section.premium ? true : index >= freeSections,
  }));

  const center = chart.byKey.center!;
  const centerEntry = getArcanumEntry(center.arcanum);

  return {
    direction: "matrix",
    headline: `Центр матрицы — ${center.arcanumTitle}`,
    lead: centerEntry
      ? `Ваша опорная энергия — ${center.arcanumTitle}. ${centerEntry.summary}`
      : `Опорная энергия вашей схемы — ${center.arcanumTitle}.`,
    sections: prepared,
    freeCount: prepared.filter((section) => !section.premium).length,
    totalCount: prepared.length,
    methodology: `${chart.meta.methodology}; редукция: ${chart.meta.reductionLabel}; порядок арканов: ${chart.meta.arcanumOrder}`,
    version: chart.meta.version,
    warnings: chart.warnings,
    limitations: chart.limitations,
  };
}

export function fullInterpretationText(chart: MatrixChart, interpretation: Interpretation): string {
  const lines: string[] = [];
  lines.push("МАТРИЦА СУДЬБЫ");
  lines.push(`Дата рождения: ${chart.birth.date}`);
  lines.push(`Методика: ${chart.meta.methodology}; версия ${chart.meta.version}; редукция: ${chart.meta.reductionLabel}`);
  lines.push("");
  lines.push("РАСЧЁТНЫЕ ПОЗИЦИИ");
  for (const point of chart.points) {
    lines.push(`  ${point.title}: ${point.arcanumTitle} — ${point.formula}`);
  }
  lines.push(`  ${chart.yearEnergy.title}: ${chart.yearEnergy.arcanumTitle}`);
  lines.push("");
  lines.push("ИНТЕРПРЕТАЦИЯ");
  lines.push(interpretation.headline);
  for (const section of interpretation.sections) {
    lines.push("");
    lines.push(`— ${section.title} (${section.subtitle})`);
    for (const paragraph of section.paragraphs) lines.push(paragraph);
    if (section.positive?.length) lines.push(`Сильные проявления: ${section.positive.join("; ")}.`);
    if (section.shadow?.length) lines.push(`Тени: ${section.shadow.join("; ")}.`);
    if (section.recommendations?.length) lines.push(`Рекомендации: ${section.recommendations.join(" ")}`);
  }
  lines.push("");
  lines.push("ОГРАНИЧЕНИЯ МЕТОДИКИ");
  for (const limitation of chart.limitations) lines.push(`- ${limitation}`);
  return lines.join("\n");
}
