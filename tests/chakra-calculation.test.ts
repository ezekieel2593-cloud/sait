import { describe, expect, it } from "vitest";

import { computeMatrix, reduce22 } from "@/lib/matrix/engine";
import { CHAKRA_VERSION, chakrasToText, computeChakras } from "@/lib/matrix/chakras";

const chart = computeMatrix({ date: "1992-06-23", currentYear: 2026 });

describe("Расчёт чакр по дате рождения (chakra-22-v1)", () => {
  it("совпадает с контрольным примером 23.06.1992", () => {
    const values = computeChakras(chart).map((chakra) => chakra.arcanum);
    // B = 6, центр = 10, D = 5:
    // сахасрара 6, вишудха 6+10=16, аджна 6+16=22, анахата 16+10=26→8,
    // манипура 10, свадхистана 10+5=15, муладхара 5.
    expect(values).toEqual([5, 15, 10, 8, 16, 22, 6]);
    expect(CHAKRA_VERSION).toBe("chakra-22-v1");
  });

  it("семь чакр по порядку от муладхары к сахасраре", () => {
    const chakras = computeChakras(chart);
    expect(chakras).toHaveLength(7);
    expect(chakras.map((chakra) => chakra.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(chakras[0]!.sanskrit).toBe("Муладхара");
    expect(chakras[6]!.sanskrit).toBe("Сахасрара");
  });

  it("все значения в диапазоне 1–22 и с формулой", () => {
    for (const date of ["1992-06-23", "1985-12-31", "2000-01-01", "1974-07-19", "2011-11-11"]) {
      const values = computeChakras(computeMatrix({ date }));
      for (const chakra of values) {
        expect(chakra.arcanum).toBeGreaterThanOrEqual(1);
        expect(chakra.arcanum).toBeLessThanOrEqual(22);
        expect(chakra.formula.length).toBeGreaterThan(5);
        expect(chakra.label).toBe(`${chakra.arcanum}-я энергия`);
      }
    }
  });

  it("чакры выводятся из точек схемы, а не выдуманы", () => {
    const values = new Map(computeChakras(chart).map((chakra) => [chakra.id, chakra.arcanum]));
    expect(values.get("sahasrara")).toBe(chart.byKey.B.arcanum);
    expect(values.get("manipura")).toBe(chart.byKey.center.arcanum);
    expect(values.get("muladhara")).toBe(chart.byKey.D.arcanum);
    expect(values.get("vishuddha")).toBe(reduce22(chart.byKey.B.arcanum + chart.byKey.center.arcanum));
    expect(values.get("ajna")).toBe(reduce22(chart.byKey.B.arcanum + values.get("vishuddha")!));
    expect(values.get("anahata")).toBe(reduce22(values.get("vishuddha")! + chart.byKey.center.arcanum));
    expect(values.get("svadhisthana")).toBe(reduce22(chart.byKey.center.arcanum + chart.byKey.D.arcanum));
  });

  it("расчёт детерминирован: одна дата — одни значения", () => {
    const a = computeChakras(computeMatrix({ date: "1990-05-05" }));
    const b = computeChakras(computeMatrix({ date: "1990-05-05" }));
    expect(a.map((chakra) => chakra.arcanum)).toEqual(b.map((chakra) => chakra.arcanum));
  });

  it("текст для копирования перечисляет все семь чакр", () => {
    const text = chakrasToText(chart);
    for (const name of ["Муладхара", "Свадхистана", "Манипура", "Анахата", "Вишудха", "Аджна", "Сахасрара"]) {
      expect(text).toContain(name);
    }
    expect(text).toContain(CHAKRA_VERSION);
  });
});
