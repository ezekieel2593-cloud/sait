import { energyLabel, type MatrixChart } from "../matrix/engine";
import { getArcanumEntry } from "../knowledge/queries";
import { getPracticalText, type PracticalText } from "../knowledge/practical";

/**
 * «Матрица простыми словами»: короткие бытовые ответы, привязанные к точкам схемы.
 *
 * Каждый пункт знает свою точку (`pointKey`) — поэтому его можно подсветить
 * в схеме матрицы. Тексты берутся из `knowledge/practical.ts` (для энергии)
 * и из базы знаний аркана (деньги, отношения, задача).
 */

export type SimpleTopic =
  | "others"
  | "talent"
  | "karma"
  | "sport"
  | "morning"
  | "resource"
  | "relax"
  | "work"
  | "moneyKeep"
  | "love"
  | "family"
  | "year";

export interface SimpleGuideItem {
  id: string;
  topic: SimpleTopic;
  title: string;
  /** Короткая подпись под заголовком: где это в схеме. */
  where: string;
  /** Точка схемы, которую нужно подсветить. */
  pointKey: string;
  arcanum: number;
  label: string;
  text: string;
  premium: boolean;
}

const TOPICS: { topic: SimpleTopic; title: string; pointKey: string; field: keyof PracticalText }[] = [
  { topic: "others", title: "Каким тебя видят другие", pointKey: "A", field: "others" },
  { topic: "talent", title: "Твои таланты", pointKey: "B", field: "talent" },
  { topic: "sport", title: "Каким спортом заниматься", pointKey: "center", field: "sport" },
  { topic: "karma", title: "Главная кармическая задача души", pointKey: "D", field: "karma" },
  { topic: "morning", title: "Как начинать утро", pointKey: "center", field: "morning" },
  { topic: "resource", title: "Что даёт ресурс", pointKey: "center", field: "resource" },
  { topic: "relax", title: "Что расслабляет", pointKey: "center", field: "relax" },
  { topic: "work", title: "Кем и где работать", pointKey: "money-entry", field: "work" },
];

export interface SimpleGuideOptions {
  /** Сколько пунктов открыто без заявки. */
  freeCount?: number;
  /** true — открыть всё (владелец). */
  includePremium?: boolean;
}

function pointOf(chart: MatrixChart, key: string) {
  return chart.byKey[key] ?? null;
}

export function buildSimpleGuide(
  chart: MatrixChart,
  options: SimpleGuideOptions = {}
): SimpleGuideItem[] {
  const freeCount = Math.max(0, options.freeCount ?? 4);
  const items: SimpleGuideItem[] = [];

  for (const topic of TOPICS) {
    const point = pointOf(chart, topic.pointKey);
    if (!point) continue;
    const practical = getPracticalText(point.arcanum);
    if (!practical) continue;
    items.push({
      id: `simple-${topic.topic}`,
      topic: topic.topic,
      title: topic.title,
      where: point.title,
      pointKey: point.key,
      arcanum: point.arcanum,
      label: energyLabel(point.arcanum),
      text: practical[topic.field],
      premium: false,
    });
  }

  // Дополнения, которые считаются по каналам и роду.
  const extras: { topic: SimpleTopic; title: string; pointKey: string; text: string }[] = [];
  const moneyMiddle = pointOf(chart, "money-middle");
  const loveEntry = pointOf(chart, "love-entry");
  const familyForce = pointOf(chart, "family-force");

  if (moneyMiddle) {
    const arcana = getArcanumEntry(moneyMiddle.arcanum);
    extras.push({
      topic: "moneyKeep",
      title: "Как удерживать деньги",
      pointKey: moneyMiddle.key,
      text: [arcana?.summary, arcana?.details.money].filter(Boolean).join(" ") || "Тема удержания ресурса.",
    });
  }
  if (loveEntry) {
    const arcana = getArcanumEntry(loveEntry.arcanum);
    extras.push({
      topic: "love",
      title: "Какие отношения тебе подходят",
      pointKey: loveEntry.key,
      text: [arcana?.summary, arcana?.details.love].filter(Boolean).join(" ") || "Тема близости.",
    });
  }
  if (familyForce) {
    const arcana = getArcanumEntry(familyForce.arcanum);
    extras.push({
      topic: "family",
      title: "Опора рода",
      pointKey: familyForce.key,
      text: arcana?.summary ?? "Ресурс семьи.",
    });
  }

  const yearPoint = chart.yearEnergy;
  const yearText = getArcanumEntry(yearPoint.arcanum);
  extras.push({
    topic: "year",
    title: `Что важно в ${yearPoint.year} году`,
    pointKey: yearPoint.key,
    text: [yearText?.summary, yearText?.details.karma].filter(Boolean).join(" ") || "Энергия года.",
  });

  for (const extra of extras) {
    const point = pointOf(chart, extra.pointKey) ?? (extra.pointKey === "year" ? yearPoint : null);
    if (!point) continue;
    items.push({
      id: `simple-${extra.topic}`,
      topic: extra.topic,
      title: extra.title,
      where: point.title,
      pointKey: extra.pointKey,
      arcanum: point.arcanum,
      label: energyLabel(point.arcanum),
      text: extra.text,
      premium: false,
    });
  }

  return items.map((item, index) => ({
    ...item,
    premium: options.includePremium === true ? false : index >= freeCount,
  }));
}

/** Короткий текстовый вариант для письма и PDF. */
export function simpleGuideToText(items: SimpleGuideItem[]): string {
  return items
    .map((item) => `${item.title} (${item.label}): ${item.text}`)
    .join("\n");
}
