import { energyLabel, type MatrixChart, type MatrixPoint } from "../matrix/engine";
import { getArcanumEntry, getPositionEntry } from "../knowledge/queries";
import type { Interpretation, InterpretationSection } from "./types";

/**
 * Интерпретация Матрицы судьбы.
 * Тексты берутся из базы знаний (позиция + аркан), расчётные числа — из движка.
 */

const FREE_POINTS = ["center", "A", "B", "D", "money-entry", "love-entry"];

function pointSection(point: MatrixPoint, detailed = false): InterpretationSection {
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

  // Расширенный разбор для владельца: место точки в схеме, все трактовки аркана
  // по сферам и точные числа, из которых получилось значение.
  if (detailed) {
    paragraphs.push(`Где стоит: ${point.role}. Сфера: ${point.sphere}.`);
    if (arcana?.details.money && !["money-entry", "money-middle", "shared"].includes(point.key)) {
      paragraphs.push(`Деньги в этой энергии: ${arcana.details.money}`);
    }
    if (arcana?.details.love && !["love-entry", "love-middle", "shared"].includes(point.key)) {
      paragraphs.push(`Отношения в этой энергии: ${arcana.details.love}`);
    }
    if (arcana?.details.karma && !["D", "center", "family-force"].includes(point.key)) {
      paragraphs.push(`Задача энергии: ${arcana.details.karma}`);
    }
    if (arcana?.methodology) paragraphs.push(`Методика трактовки: ${arcana.methodology}.`);
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
    table: detailed
      ? {
          caption: "Расчёт точки",
          rows: [
            { label: "Энергия", value: energyLabel(point.arcanum) },
            { label: "Формула", value: point.formula },
            { label: "До редукции", value: String(point.raw) },
            { label: "Позиция в схеме", value: point.role },
            { label: "Сфера", value: point.sphere },
            ...(arcana?.source?.title ? [{ label: "Источник трактовки", value: arcana.source.title }] : []),
          ],
        }
      : undefined,
  };
}

/**
 * Технические разделы матрицы — только в расширенном разборе владельца.
 * Показывают всю схему: каждую точку с формулой и «сырым» числом, каналы
 * денег и отношений, родовые углы и параметры методики.
 */
function matrixCalculationSections(chart: MatrixChart): InterpretationSection[] {
  const allPoints = [...chart.points, chart.yearEnergy];
  const sections: InterpretationSection[] = [];

  sections.push({
    id: "data-matrix-scheme",
    title: "Схема расчёта: все позиции",
    subtitle: `${allPoints.length} точек · ${chart.meta.version}`,
    paragraphs: [],
    table: {
      caption: "Позиция, энергия, формула и число до редукции",
      rows: allPoints.map((point) => ({
        label: `${point.title} — ${point.sphere}`,
        value: `${energyLabel(point.arcanum)} · ${point.formula} → ${point.raw}`,
      })),
    },
    premium: false,
  });

  sections.push({
    id: "data-matrix-channels",
    title: "Каналы денег и отношений",
    subtitle: "вход, середина и общая точка",
    paragraphs: [],
    table: {
      caption: "Как связаны каналы",
      rows: [
        {
          label: "Деньги: вход",
          value: `${energyLabel(chart.byKey["money-entry"].arcanum)} · ${chart.byKey["money-entry"].formula}`,
        },
        {
          label: "Деньги: середина",
          value: `${energyLabel(chart.byKey["money-middle"].arcanum)} · ${chart.byKey["money-middle"].formula}`,
        },
        {
          label: "Отношения: вход",
          value: `${energyLabel(chart.byKey["love-entry"].arcanum)} · ${chart.byKey["love-entry"].formula}`,
        },
        {
          label: "Отношения: середина",
          value: `${energyLabel(chart.byKey["love-middle"].arcanum)} · ${chart.byKey["love-middle"].formula}`,
        },
        {
          label: "Общая точка каналов",
          value: `${energyLabel(chart.byKey.shared.arcanum)} · ${chart.byKey.shared.formula}`,
        },
        {
          label: "Сила рода",
          value: `${energyLabel(chart.byKey["family-force"].arcanum)} · ${chart.byKey["family-force"].formula}`,
        },
      ],
    },
    premium: false,
  });

  sections.push({
    id: "data-matrix-meta",
    title: "Параметры расчёта",
    subtitle: chart.meta.version,
    paragraphs: [],
    table: {
      caption: "Методика и версия",
      rows: [
        { label: "Дата рождения", value: chart.birth.date },
        { label: "День / месяц / год", value: `${chart.birth.day} / ${chart.birth.month} / ${chart.birth.year}` },
        { label: "Методика", value: chart.meta.methodology },
        { label: "Редукция", value: chart.meta.reductionLabel },
        { label: "Порядок арканов", value: chart.meta.arcanumOrder },
        { label: "Версия", value: chart.meta.version },
        { label: "Рассчитано", value: chart.meta.computedAt },
        { label: "Энергия года", value: `${chart.yearEnergy.year}: ${energyLabel(chart.yearEnergy.arcanum)}` },
      ],
    },
    premium: false,
  });

  return sections;
}

export interface MatrixInterpretationOptions {
  freeSections?: number;
  /**
   * true — открыть все разделы (владелец в кабинете).
   * Ограничения бесплатной версии к его расчётам не применяются.
   */
  includePremium?: boolean;
  /**
   * true — расширенный разбор для владельца: формула и «сырое» число у каждой
   * энергии, трактовки аркана по всем сферам, таблица всей схемы расчёта.
   * Гостю эти данные не передаются.
   */
  detailed?: boolean;
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

  const detailed = options.detailed === true;
  const sections = [
    ...ordered.map((point) => pointSection(point, detailed)),
    pointSection(chart.yearEnergy, detailed),
    ...(detailed ? matrixCalculationSections(chart) : []),
  ];

  const prepared = sections.map((section, index) => ({
    ...section,
    premium:
      options.includePremium === true || (detailed && section.id.startsWith("data-"))
        ? false
        : section.premium
          ? true
          : index >= freeSections,
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
    if (section.table?.rows.length) {
      if (section.table.caption) lines.push(`${section.table.caption}:`);
      for (const row of section.table.rows) lines.push(`  ${row.label}: ${row.value}`);
    }
  }
  lines.push("");
  lines.push("ОГРАНИЧЕНИЯ МЕТОДИКИ");
  for (const limitation of chart.limitations) lines.push(`- ${limitation}`);
  return lines.join("\n");
}
