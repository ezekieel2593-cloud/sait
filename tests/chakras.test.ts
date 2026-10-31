import { describe, expect, it } from "vitest";

import { CHAKRAS, CHAKRAS_INTRO, CHAKRAS_MATRIX_NOTE, getChakra } from "@/lib/knowledge/chakras";

describe("Справочник по чакрам", () => {
  it("описаны семь основных чакр по порядку", () => {
    expect(CHAKRAS).toHaveLength(7);
    expect(CHAKRAS.map((chakra) => chakra.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(CHAKRAS.map((chakra) => chakra.sanskrit)).toEqual([
      "Муладхара",
      "Свадхистана",
      "Манипура",
      "Анахата",
      "Вишудха",
      "Аджна",
      "Сахасрара",
    ]);
  });

  it("у каждой чакры заполнены все разделы", () => {
    for (const chakra of CHAKRAS) {
      expect(chakra.id.length, `${chakra.sanskrit}.id`).toBeGreaterThan(3);
      expect(chakra.title.length, `${chakra.sanskrit}.title`).toBeGreaterThan(10);
      expect(chakra.place.length, `${chakra.sanskrit}.place`).toBeGreaterThan(5);
      expect(chakra.sphere.length, `${chakra.sanskrit}.sphere`).toBeGreaterThan(10);
      expect(chakra.element.length, `${chakra.sanskrit}.element`).toBeGreaterThan(3);
      expect(chakra.color.length, `${chakra.sanskrit}.color`).toBeGreaterThan(3);
      expect(chakra.essence.length, `${chakra.sanskrit}.essence`).toBeGreaterThan(20);
      expect(chakra.balance.length, `${chakra.sanskrit}.balance`).toBeGreaterThanOrEqual(3);
      expect(chakra.imbalance.length, `${chakra.sanskrit}.imbalance`).toBeGreaterThanOrEqual(3);
      expect(chakra.practice.length, `${chakra.sanskrit}.practice`).toBeGreaterThanOrEqual(3);
      expect(chakra.matrix.length, `${chakra.sanskrit}.matrix`).toBeGreaterThan(40);
      expect(chakra.matrixPoints.length, `${chakra.sanskrit}.matrixPoints`).toBeGreaterThan(0);
    }
  });

  it("не выдаёт чакры за медицину и диагноз", () => {
    const text = JSON.stringify(CHAKRAS);
    expect(text).not.toMatch(/лечит|излеч|диагноз|гарантир|обязательно обратитесь/i);
    expect(CHAKRAS_INTRO).toMatch(/не анатомия и не диагноз/i);
  });

  it("названий карт таро в справочнике нет", () => {
    const text = JSON.stringify(CHAKRAS);
    expect(text).not.toMatch(/Колесо Фортуны|Иерофант|Императрица|Жрица|Повешенный/);
  });

  it("связь с матрицей описана честно", () => {
    expect(CHAKRAS_MATRIX_NOTE).toMatch(/можно посчитать по дате рождения/);
    // У каждой чакры указана формула — значения не берутся из воздуха.
    for (const chakra of CHAKRAS) {
      expect(chakra.formula.length, `${chakra.sanskrit}.formula`).toBeGreaterThan(5);
    }
    // Каждая чакра ссылается на реальные точки схемы.
    const known = new Set([
      "A",
      "B",
      "C",
      "D",
      "center",
      "family-top-left",
      "family-top-right",
      "family-bottom-left",
      "family-bottom-right",
      "family-force",
      "money-entry",
      "money-middle",
      "love-entry",
      "love-middle",
      "shared",
      "talent-line",
      "talent-second",
      "person-support",
      "person-experience",
    ]);
    for (const chakra of CHAKRAS) {
      for (const point of chakra.matrixPoints) {
        expect(known.has(point), `${chakra.sanskrit}: ${point}`).toBe(true);
      }
    }
  });

  it("есть поиск по номеру и по латинскому названию", () => {
    expect(getChakra(1)?.sanskrit).toBe("Муладхара");
    expect(getChakra("sahasrara")?.number).toBe(7);
    expect(getChakra("нет такой")).toBeUndefined();
  });
});
