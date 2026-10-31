import { energyLabel } from "../matrix/engine";
import { getArcanumEntry } from "../knowledge/queries";
import { getPracticalText } from "../knowledge/practical";

/**
 * Общий гайд по 22 энергиям — справочник для всех, без привязки к дате рождения.
 *
 * Тот же набор аспектов, что раньше показывался в блоке «Матрица простыми
 * словами», но раскрытый для каждой энергии: спорт, каким видят другие,
 * таланты, кармическая задача, утро, ресурс, расслабление, работа, деньги
 * и отношения.
 */

export interface GuideAspect {
  id: string;
  title: string;
  text: string;
}

export interface GeneralEnergyGuide {
  arcanum: number;
  /** «7-я энергия». */
  label: string;
  /** Суть одной фразой. */
  plain: string;
  aspects: GuideAspect[];
  strength: string[];
  risk: string[];
}

const ASPECTS: { id: string; title: string; field: "others" | "talent" | "karma" | "sport" | "morning" | "resource" | "relax" | "work" }[] = [
  { id: "others", title: "Каким тебя видят другие", field: "others" },
  { id: "talent", title: "Таланты", field: "talent" },
  { id: "karma", title: "Главная кармическая задача души", field: "karma" },
  { id: "sport", title: "Каким спортом заниматься", field: "sport" },
  { id: "morning", title: "Как начинать утро", field: "morning" },
  { id: "resource", title: "Что даёт ресурс", field: "resource" },
  { id: "relax", title: "Что расслабляет", field: "relax" },
  { id: "work", title: "Кем и где работать", field: "work" },
];

/** Полный гайд: 22 энергии в порядке традиции. */
export function buildGeneralGuide(): GeneralEnergyGuide[] {
  const result: GeneralEnergyGuide[] = [];
  for (let arcanum = 1; arcanum <= 22; arcanum += 1) {
    const practical = getPracticalText(arcanum);
    if (!practical) continue;
    const arcana = getArcanumEntry(arcanum);

    const aspects: GuideAspect[] = ASPECTS.map((aspect) => ({
      id: aspect.id,
      title: aspect.title,
      text: practical[aspect.field],
    }));

    if (arcana?.details.money) {
      aspects.push({ id: "money", title: "Как приходят деньги", text: arcana.details.money });
    }
    if (arcana?.details.love) {
      aspects.push({ id: "love", title: "Что важно в отношениях", text: arcana.details.love });
    }

    result.push({
      arcanum,
      label: energyLabel(arcanum),
      plain: practical.plain,
      aspects,
      strength: arcana?.positive ?? [],
      risk: arcana?.shadow ?? [],
    });
  }
  return result;
}

/** Короткий текст гайда по одной энергии — для копирования и письма. */
export function generalEnergyToText(energy: GeneralEnergyGuide): string {
  const lines = [`${energy.label}: ${energy.plain}`];
  for (const aspect of energy.aspects) lines.push(`${aspect.title}: ${aspect.text}`);
  if (energy.strength.length) lines.push(`Сильные проявления: ${energy.strength.join("; ")}.`);
  if (energy.risk.length) lines.push(`Зоны внимания: ${energy.risk.join("; ")}.`);
  return lines.join("\n");
}
