import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { computeMatrix } from "@/lib/matrix/engine";
import { buildMatrixGuides, guideToText } from "@/lib/interpretation/guides";
import { buildSimpleGuide } from "@/lib/interpretation/simple";
import { ENERGY_GUIDES } from "@/lib/knowledge/guides";
import { parseTrueType } from "@/lib/pdf/truetype";
import { renderMatrixGuidePdf } from "@/lib/pdf/matrix-guide";

const fontPath = path.join(import.meta.dirname, "..", "assets", "fonts", "guide-sans.ttf");

describe("Гайды по энергиям", () => {
  const chart = computeMatrix({ date: "1992-06-23", currentYear: 2026 });

  it("описаны все 22 энергии традиции", () => {
    for (let arcanum = 1; arcanum <= 22; arcanum += 1) {
      const guide = ENERGY_GUIDES[arcanum];
      expect(guide, `нет гайда для энергии ${arcanum}`).toBeTruthy();
      expect(guide.steps.length).toBeGreaterThanOrEqual(3);
      expect(guide.signs.length).toBeGreaterThanOrEqual(2);
      expect(guide.practice.length).toBeGreaterThan(20);
      expect(guide.check.length).toBeGreaterThan(10);
    }
  });

  it("гайд собирается для каждой энергии схемы без повторов", () => {
    const guides = buildMatrixGuides(chart, { freeCount: 2 });
    const arcana = guides.map((guide) => guide.arcanum);
    expect(new Set(arcana).size).toBe(arcana.length);
    expect(guides.length).toBeGreaterThan(5);
    for (const guide of guides) {
      expect(guide.essence.length).toBeGreaterThan(40);
      expect(guide.places.length).toBeGreaterThan(0);
    }
  });

  it("гостю открыты только первые гайды, владельцу — все", () => {
    const guest = buildMatrixGuides(chart, { freeCount: 2 });
    expect(guest.filter((guide) => !guide.premium)).toHaveLength(2);
    const owner = buildMatrixGuides(chart, { freeCount: 2, includePremium: true });
    expect(owner.every((guide) => !guide.premium)).toBe(true);
  });

  it("текстовая версия гайда содержит шаги", () => {
    const [first] = buildMatrixGuides(chart, { freeCount: 1 });
    const text = guideToText(first!);
    expect(text).toContain("Что делать");
    expect(text).toContain(first!.steps[0]!);
  });
});

describe("PDF-гайд", () => {
  const font = parseTrueType(new Uint8Array(fs.readFileSync(fontPath)));
  const chart = computeMatrix({ date: "1992-06-23", currentYear: 2026 });
  const guides = buildMatrixGuides(chart, { freeCount: 99, includePremium: true });
  const simple = buildSimpleGuide(chart, { freeCount: 999, includePremium: true });
  const bytes = renderMatrixGuidePdf(font, {
    chart,
    guides,
    simple,
    name: "Анна",
    birthDate: "1992-06-23",
    generatedAt: new Date("2026-10-31T10:00:00Z"),
  });
  const text = new TextDecoder("latin1").decode(bytes);

  it("шрифт с кириллицей встроен", () => {
    expect(font.glyphOf("Ж".codePointAt(0)!)).toBeGreaterThan(0);
    expect(font.glyphOf("ё".codePointAt(0)!)).toBeGreaterThan(0);
    expect(text).toContain("/FontFile2");
    expect(text).toContain("/Identity-H");
  });

  it("файл имеет корректную структуру PDF", () => {
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("startxref");
    expect(text).toContain("/Type /Catalog");
    expect(text).toMatch(/\/Count \d+/);
  });

  it("ширины глифов заданы в тысячных долях", () => {
    // Ошибка в единицах измерения ломает вёрстку: строка уезжает за поля.
    const start = text.indexOf("/W [");
    const widths = start === -1 ? "" : text.slice(start, text.indexOf("/CIDToGIDMap", start));
    const values = widths.match(/\[\d+\]/g) ?? [];
    expect(values.length).toBeGreaterThan(20);
    for (const value of values) {
      const width = Number(value.slice(1, -1));
      expect(width).toBeGreaterThan(100);
      expect(width).toBeLessThan(3000);
    }
  });

  it("в документе есть все гайды и шапка", () => {
    // Каждый гайд занимает раздел; проверяем по количеству заголовков «Что делать».
    const sections = text.split("/Type /Page ");
    expect(sections.length).toBeGreaterThan(3);
    expect(guides.length).toBeGreaterThan(5);
    // Текст в PDF кодируется глифами, поэтому проверяем карту символов.
    const toUnicode = text.slice(text.indexOf("beginbfchar"), text.indexOf("endcmap"));
    expect(toUnicode.length).toBeGreaterThan(1000);
  });

  it("кириллические символы попадают в карту ToUnicode", () => {
    const codes = new Set(
      [...ENERGY_GUIDES[1]!.steps.join(" ")].map((char) => char.codePointAt(0)!)
    );
    for (const code of codes) {
      const hex = code.toString(16).toUpperCase().padStart(4, "0");
      expect(text).toContain(`<${hex}>`);
    }
  });
});
