/**
 * Чакры по дате рождения — версия `chakra-22-v1`.
 *
 * Формулы в школе Матрицы судьбы расходятся: разные авторы берут для одной
 * и той же чакры разные точки. Мы фиксируем один вариант — цепочкой от верхнего
 * угла, центра и нижнего угла. Он выбран потому, что:
 *   1) использует только уже посчитанные точки схемы (B, центр, D);
 *   2) совпадает с описанием «сверху вниз \ сверху вверх» в распространённом
 *      изложении: сахасрара — вершина, вишудха = сахасрара + центр,
 *      аджна = сахасрара + вишудха, анахата = вишудха + манипура,
 *      манипура = центр, свадхистана = центр + муладхара, муладхара — нижний угол;
 *   3) даёт устойчивый результат: значение каждой чакры выводится из предыдущей,
 *      а не подбирается.
 *
 * Другая версия (через «земную» и «небесную» линии) требует точек, которых
 * в нашей схеме нет, — поэтому она не подмешивается.
 */

import { energyLabel, reduce22, type MatrixChart } from "./engine";
import { getArcanumEntry } from "../knowledge/queries";

export const CHAKRA_VERSION = "chakra-22-v1";

export interface ChakraValue {
  /** 1 — муладхара … 7 — сахасрара. */
  number: number;
  id: string;
  sanskrit: string;
  /** Сфера жизни — коротко. */
  sphere: string;
  /** Значение 1–22. */
  arcanum: number;
  /** «16-я энергия». */
  label: string;
  /** Как посчитано — формула словами. */
  formula: string;
  /** Ключи точек схемы, из которых сложилась чакра. */
  points: string[];
  /** Сильные проявления энергии (из базы знаний). */
  strength: string;
  /** Зона внимания (из базы знаний). */
  risk: string;
}

const ORDER: {
  number: number;
  id: string;
  sanskrit: string;
  sphere: string;
}[] = [
  { number: 1, id: "muladhara", sanskrit: "Муладхара", sphere: "опора, тело, род" },
  { number: 2, id: "svadhisthana", sanskrit: "Свадхистана", sphere: "желания, творчество, близость" },
  { number: 3, id: "manipura", sanskrit: "Манипура", sphere: "воля, границы, деньги" },
  { number: 4, id: "anahata", sanskrit: "Анахата", sphere: "любовь, доверие, прощение" },
  { number: 5, id: "vishuddha", sanskrit: "Вишудха", sphere: "голос, честность, самовыражение" },
  { number: 6, id: "ajna", sanskrit: "Аджна", sphere: "ясность, интуиция, видение" },
  { number: 7, id: "sahasrara", sanskrit: "Сахасрара", sphere: "смысл, целостность" },
];

/**
 * Считает семь чакр по схеме.
 *
 * Порядок расчёта важен: аджна и анахата опираются на уже найденную вишудху,
 * поэтому считаем снизу вверх по цепочке, а не в порядке номеров.
 */
export function computeChakras(chart: MatrixChart): ChakraValue[] {
  const sahasrara = chart.byKey.B.arcanum;
  const manipura = reduce22(chart.byKey.center.arcanum);
  const muladhara = chart.byKey.D.arcanum;
  const vishuddha = reduce22(sahasrara + manipura);
  const ajna = reduce22(sahasrara + vishuddha);
  const anahata = reduce22(vishuddha + manipura);
  const svadhisthana = reduce22(manipura + muladhara);

  const values: Record<string, { arcanum: number; formula: string; points: string[] }> = {
    muladhara: { arcanum: muladhara, formula: "нижний угол личного квадрата (D)", points: ["D"] },
    svadhisthana: { arcanum: svadhisthana, formula: "центр + нижний угол (D)", points: ["center", "D"] },
    manipura: { arcanum: manipura, formula: "центр схемы", points: ["center"] },
    anahata: { arcanum: anahata, formula: "вишудха + центр", points: ["B", "center"] },
    vishuddha: { arcanum: vishuddha, formula: "сахасрара + центр", points: ["B", "center"] },
    ajna: { arcanum: ajna, formula: "сахасрара + вишудха", points: ["B", "center"] },
    sahasrara: { arcanum: sahasrara, formula: "верхний угол личного квадрата (B)", points: ["B"] },
  };

  return ORDER.map((chakra) => {
    const value = values[chakra.id]!;
    const entry = getArcanumEntry(value.arcanum);
    return {
      ...chakra,
      arcanum: value.arcanum,
      label: energyLabel(value.arcanum),
      formula: value.formula,
      points: value.points,
      strength: entry?.positive[0] ?? "",
      risk: entry?.shadow[0] ?? "",
    };
  });
}

/** Текст для копирования или письма. */
export function chakrasToText(chart: MatrixChart): string {
  const lines = [`Чакры по дате рождения (${CHAKRA_VERSION})`];
  for (const chakra of computeChakras(chart)) {
    lines.push(`${chakra.number}. ${chakra.sanskrit} — ${chakra.label} (${chakra.formula})`);
  }
  return lines.join("\n");
}
