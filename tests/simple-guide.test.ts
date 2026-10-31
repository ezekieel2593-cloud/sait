import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { computeMatrix } from "@/lib/matrix/engine";
import { ENERGY_PRACTICAL } from "@/lib/knowledge/practical";
import { buildSimpleGuide } from "@/lib/interpretation/simple";
import { MatrixDiagram, MATRIX_DIAGRAM_KEYS } from "@/components/charts/MatrixDiagram";

const chart = computeMatrix({ date: "1992-06-23", currentYear: 2026 });

describe("Матрица простыми словами", () => {
  it("для всех 22 энергий есть ответы на бытовые вопросы", () => {
    for (let arcanum = 1; arcanum <= 22; arcanum += 1) {
      const entry = ENERGY_PRACTICAL[arcanum];
      expect(entry, `нет текстов для энергии ${arcanum}`).toBeTruthy();
      for (const [field, value] of Object.entries(entry)) {
        expect(typeof value, `${arcanum}.${field}`).toBe("string");
        expect(value.length, `${arcanum}.${field}`).toBeGreaterThan(12);
      }
    }
  });

  it("каждый пункт привязан к точке схемы", () => {
    const items = buildSimpleGuide(chart, { freeCount: 4 });
    expect(items.length).toBeGreaterThanOrEqual(12);
    for (const item of items) {
      const exists = item.pointKey === "year" || Boolean(chart.byKey[item.pointKey]);
      expect(exists, `нет точки ${item.pointKey}`).toBe(true);
      expect(item.text.length).toBeGreaterThan(15);
      expect(item.label).toMatch(/\d+-я энергия/);
    }
  });

  it("темы совпадают с запросом", () => {
    const topics = buildSimpleGuide(chart, { freeCount: 99 }).map((item) => item.title);
    for (const title of [
      "Каким тебя видят другие",
      "Твои таланты",
      "Каким спортом заниматься",
      "Главная кармическая задача души",
      "Как начинать утро",
      "Что даёт ресурс",
      "Что расслабляет",
      "Кем и где работать",
      "Как удерживать деньги",
      "Какие отношения тебе подходят",
    ]) {
      expect(topics).toContain(title);
    }
  });

  it("гостю открыто несколько пунктов, владельцу — все", () => {
    const guest = buildSimpleGuide(chart, { freeCount: 4 });
    expect(guest.filter((item) => !item.premium)).toHaveLength(4);
    const owner = buildSimpleGuide(chart, { freeCount: 4, includePremium: true });
    expect(owner.every((item) => !item.premium)).toBe(true);
  });
});

describe("Схема матрицы", () => {
  const html = renderToStaticMarkup(React.createElement(MatrixDiagram, { chart }));

  it("на схеме все точки расчёта", () => {
    expect(MATRIX_DIAGRAM_KEYS.length).toBeGreaterThanOrEqual(16);
    for (const key of ["A", "B", "C", "D", "center", "money-entry", "love-entry", "family-force", "year"]) {
      expect(MATRIX_DIAGRAM_KEYS).toContain(key);
    }
    // Каждая точка — круг с номером энергии.
    expect((html.match(/<circle/g) ?? []).length).toBeGreaterThan(20);
  });

  it("подписи объясняют, что где читать", () => {
    for (const caption of [
      "таланты",
      "кармическая задача",
      "как тебя видят",
      "зона комфорта",
      "кем работать",
      "отношения",
      "опора рода",
    ]) {
      expect(html).toContain(caption);
    }
    expect(html).toMatch(/энергия \d{4} года/);
    expect(html).toContain("0–22 года");
  });

  it("подсветка выделяет только нужную точку", () => {
    const marked = renderToStaticMarkup(
      React.createElement(MatrixDiagram, { chart, highlight: ["A"] })
    );
    expect((marked.match(/stroke-dasharray="5 4"/g) ?? []).length).toBe(1);
    expect((marked.match(/opacity="0.32"/g) ?? []).length).toBeGreaterThan(5);
  });

  it("названий карт таро на схеме нет", () => {
    expect(html).not.toMatch(/Колесо Фортуны|Иерофант|Императрица|Жрица/);
  });
});
