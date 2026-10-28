import { describe, expect, it } from "vitest";
import { computeMatrix, reduce22, MATRIX_VERSION } from "@/lib/matrix/engine";

describe("Матрица судьбы (matrix-22-v1)", () => {
  it("совпадает с проверенным примером 23.06.1992", () => {
    const chart = computeMatrix({ date: "1992-06-23", currentYear: 2026 });
    expect(chart.meta.version).toBe(MATRIX_VERSION);
    expect(chart.byKey.A.arcanum).toBe(5);
    expect(chart.byKey.B.arcanum).toBe(6);
    expect(chart.byKey.C.arcanum).toBe(21);
    expect(chart.byKey.D.arcanum).toBe(5);
    expect(chart.byKey.center.arcanum).toBe(10);
    expect(chart.byKey["family-top-left"].arcanum).toBe(11);
    expect(chart.byKey["family-top-right"].arcanum).toBe(9);
    expect(chart.byKey["family-bottom-right"].arcanum).toBe(8);
    expect(chart.byKey["family-bottom-left"].arcanum).toBe(10);
    expect(chart.byKey["family-force"].arcanum).toBe(11);
    expect(chart.byKey["money-entry"].arcanum).toBe(4);
    expect(chart.byKey["money-middle"].arcanum).toBe(5);
    expect(chart.byKey["love-entry"].arcanum).toBe(15);
    expect(chart.byKey["love-middle"].arcanum).toBe(7);
    expect(chart.byKey.shared.arcanum).toBe(19);
  });

  it("редукция сохраняет 22 и переводит 0 в 22", () => {
    expect(reduce22(22)).toBe(22);
    expect(reduce22(0)).toBe(22);
    expect(reduce22(23)).toBe(5);
    expect(reduce22(44)).toBe(8);
    expect(reduce22(1992)).toBe(21);
  });

  it("детерминирована и не использует случайные числа", () => {
    const a = computeMatrix({ date: "1994-03-17", currentYear: 2026 });
    const b = computeMatrix({ date: "1994-03-17", currentYear: 2026 });
    expect(a.points.map((point) => point.arcanum)).toEqual(b.points.map((point) => point.arcanum));
    expect(a.byKey.A.arcanum).toBe(17);
    expect(a.byKey.B.arcanum).toBe(3);
    expect(a.byKey.C.arcanum).toBe(5);
    expect(a.byKey.center.arcanum).toBe(5);
  });

  it("считает энергию года", () => {
    const chart = computeMatrix({ date: "1992-06-23", currentYear: 2026 });
    expect(chart.yearEnergy.arcanum).toBeGreaterThanOrEqual(1);
    expect(chart.yearEnergy.arcanum).toBeLessThanOrEqual(22);
    expect(chart.yearEnergy.title.length).toBeGreaterThan(0);
  });

  it("все позиции в диапазоне 1–22 и имеют название аркана", () => {
    for (const point of computeMatrix({ date: "1985-12-31" }).points) {
      expect(point.arcanum).toBeGreaterThanOrEqual(1);
      expect(point.arcanum).toBeLessThanOrEqual(22);
      expect(point.arcanumTitle.length).toBeGreaterThan(0);
      expect(point.formula.length).toBeGreaterThan(0);
    }
  });
});
