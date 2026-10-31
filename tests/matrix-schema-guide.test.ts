import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { computeMatrix, reduce22 } from "@/lib/matrix/engine";
import { ENERGY_PRACTICAL } from "@/lib/knowledge/practical";
import { buildSimpleGuide } from "@/lib/interpretation/simple";
import { MatrixDiagram, MATRIX_DIAGRAM_KEYS } from "@/components/charts/MatrixDiagram";
import { buildGeneralGuide, generalEnergyToText } from "@/lib/interpretation/general-guide";

const chart = computeMatrix({ date: "1992-06-23", currentYear: 2026 });

describe("Матрица простыми словами", () => {
  it("для всех 22 энергий есть ответы на бытовые вопросы", () => {
    for (let arcanum = 1; arcanum <= 22; arcanum += 1) {
      const entry = ENERGY_PRACTICAL[arcanum];
      expect(entry, `нет текстов для энергии ${arcanum}`).toBeTruthy();
      for (const [field, value] of Object.entries(entry)) {
        if (field === "why") continue;
        expect(typeof value, `${arcanum}.${field}`).toBe("string");
        expect(value.length, `${arcanum}.${field}`).toBeGreaterThan(12);
      }
    }
  });

  it("у каждой энергии объяснено, почему совет именно такой", () => {
    const reasons = ["others", "talent", "karma", "sport", "morning", "resource", "relax", "work", "money", "love"];
    for (let arcanum = 1; arcanum <= 22; arcanum += 1) {
      const entry = ENERGY_PRACTICAL[arcanum];
      expect(entry.logic.length, `${arcanum}.logic`).toBeGreaterThan(60);
      for (const key of reasons) {
        const value = entry.why[key as keyof typeof entry.why];
        expect(typeof value, `${arcanum}.why.${key}`).toBe("string");
        expect(value.length, `${arcanum}.why.${key}`).toBeGreaterThan(40);
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

describe("Страница гайда по 22 энергиям", () => {
  const guide = buildGeneralGuide();

  it("на странице все 22 энергии", () => {
    expect(guide).toHaveLength(22);
    expect(guide.map((item) => item.arcanum)).toEqual(Array.from({ length: 22 }, (_, index) => index + 1));
  });

  it("у каждой энергии все аспекты простыми словами", () => {
    for (const energy of guide) {
      const titles = energy.aspects.map((aspect) => aspect.title);
      for (const title of [
        "Каким тебя видят другие",
        "Таланты",
        "Главная кармическая задача души",
        "Каким спортом заниматься",
        "Как начинать утро",
        "Что даёт ресурс",
        "Что расслабляет",
        "Кем и где работать",
      ]) {
        expect(titles, `${energy.arcanum}: ${title}`).toContain(title);
      }
      for (const aspect of energy.aspects) {
        expect(aspect.text.length, `${energy.arcanum}.${aspect.id}`).toBeGreaterThan(12);
        expect(aspect.why?.length ?? 0, `${energy.arcanum}.${aspect.id}.why`).toBeGreaterThan(40);
      }
      expect(energy.plain.length).toBeGreaterThan(10);
      expect(energy.logic.length, `${energy.arcanum}.logic`).toBeGreaterThan(60);
    }
  });

  it("в тексте гайда видно объяснение «почему так»", () => {
    const text = generalEnergyToText(guide[9]);
    expect(text).toContain("Почему советы такие");
    expect(text).toContain("Почему так:");
  });

  it("гайд не выдаёт трактовку за персональный расчёт", () => {
    const text = guide.map(generalEnergyToText).join("\n");
    expect(text).not.toMatch(/ваша карта|ваш асцендент/i);
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
      "вход в деньги",
      "отношения",
      "сила рода",
      "род: линия отца",
    ]) {
      expect(html).toContain(caption);
    }
    expect(html).toMatch(/энергия \d{4} года/);
  });

  it("по кругу идёт линия жизни: возраст от 0 до 75 лет", () => {
    for (const age of ["0 лет", "5 лет", "15 лет", "25 лет", "45 лет", "65 лет", "75 лет"]) {
      expect(html).toContain(age);
    }
    expect(chart.lifeLine).toHaveLength(32);
    expect(chart.lifeLine[0]).toMatchObject({ age: 0, kind: "vertex", arcanum: chart.byKey.A.arcanum });
    // Четверть десятилетия — сумма угла и середины.
    const a = chart.byKey.A.arcanum;
    const f = chart.byKey["family-top-left"].arcanum;
    const middle = chart.lifeLine.find((point) => point.age === 5)!;
    const quarterStart = chart.lifeLine.find((point) => point.age === 2.5)!;
    const quarterEnd = chart.lifeLine.find((point) => point.age === 7.5)!;
    expect(middle.arcanum).toBe(reduce22(a + f));
    expect(quarterStart.arcanum).toBe(reduce22(a + middle.arcanum));
    expect(quarterEnd.arcanum).toBe(reduce22(middle.arcanum + f));
  });

  it("внутри восьмиугольника подписаны точки каналов и опоры", () => {
    for (const label of ["личные таланты", "развитие таланта", "удержание денег", "личная опора", "опыт личности"]) {
      expect(html).toContain(label);
    }
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
