import { describe, expect, it } from "vitest";
import { computeNatalChart } from "@/lib/astronomy/engine";
import { computeMatrix } from "@/lib/matrix/engine";
import { buildAstrologyInterpretation } from "@/lib/interpretation/astrology";
import { buildMatrixInterpretation } from "@/lib/interpretation/matrix";
import { astrologyDetails, matrixDetails, DETAILS_LIMIT } from "../src-static/details";

/**
 * Подробный расчёт уходит вместе с заявкой в кабинет специалиста.
 * Проверяем, что там действительно всё, что нужно для разбора,
 * и что текст помещается в лимит api/lead.php.
 */

const chart = computeNatalChart({
  date: "1992-06-23",
  time: "14:30",
  timeAccuracy: "exact",
  latitude: 55.1608,
  longitude: 61.4005,
  timezone: "Asia/Yekaterinburg",
  placeName: "Челябинск, Россия",
});

describe("подробный расчёт для кабинета", () => {
  it("натальная карта: планеты, дома, аспекты и параметры", () => {
    const interpretation = buildAstrologyInterpretation(chart, { freeSections: 4, includeHouses: true });
    const text = astrologyDetails(chart, "1992-06-23, 14:30, Челябинск", interpretation);

    expect(text).toContain("НАТАЛЬНАЯ КАРТА — полный расчёт");
    expect(text).toContain("Челябинск");
    expect(text).toContain("Asia/Yekaterinburg");

    for (const position of chart.positions) {
      expect(text).toContain(`${position.name}: ${position.formatted}`);
    }

    expect(text).toContain(chart.midheaven.formatted);
    expect(text).toContain("ДОМА");
    expect(text).toContain(`АСПЕКТЫ (${chart.aspects.length})`);
    expect(text).toContain("БАЛАНС КАРТЫ");
    expect(text).toContain("Фаза Луны");

    expect(text.length).toBeLessThanOrEqual(DETAILS_LIMIT);
  });

  it("натальная карта без времени: честно говорит, что домов нет", () => {
    const unknown = computeNatalChart({
      date: "1992-06-23",
      time: null,
      timeAccuracy: "unknown",
      latitude: 55.1608,
      longitude: 61.4005,
      timezone: "Asia/Yekaterinburg",
    });
    const interpretation = buildAstrologyInterpretation(unknown, { freeSections: 4, includeHouses: true });
    const text = astrologyDetails(unknown, "1992-06-23, Челябинск", interpretation);

    expect(text).toContain("время рождения неизвестно");
    expect(text).toContain("не рассчитывался");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
  });

  it("матрица: все позиции с формулами и энергия года", () => {
    const matrix = computeMatrix({ date: "1992-06-23", currentYear: 2026 });
    const interpretation = buildMatrixInterpretation(matrix, { freeSections: 5 });
    const text = matrixDetails(matrix, "1992-06-23", interpretation);

    expect(text).toContain("МАТРИЦА СУДЬБЫ — полный расчёт");
    for (const point of matrix.points) {
      expect(text).toContain(`${point.title}: ${point.arcanum}`);
      expect(text).toContain(point.formula);
    }
    expect(text).toContain(`ЭНЕРГИЯ ГОДА`);
    expect(text).toContain(String(matrix.yearEnergy.arcanum));
    expect(text).toContain("Центр: 10");
    expect(text).not.toContain("undefined");
    expect(text.length).toBeLessThanOrEqual(DETAILS_LIMIT);
  });

  it("расчёт детерминирован: у клиента и у специалиста одни числа", () => {
    const interpretation = buildAstrologyInterpretation(chart, { freeSections: 4, includeHouses: true });
    const a = astrologyDetails(chart, "1992-06-23", interpretation);
    const b = astrologyDetails(chart, "1992-06-23", interpretation);
    expect(a).toBe(b);
  });
});
