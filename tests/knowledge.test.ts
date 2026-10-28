import { describe, expect, it } from "vitest";
import { loadEntries, loadSources, getEntry, updateKnowledgeEntry, knowledgeStats } from "@/lib/knowledge/queries";

describe("база знаний", () => {
  it("содержит записи по всем доменам и источники с датой проверки", () => {
    const entries = loadEntries();
    expect(entries.length).toBeGreaterThan(50);
    const domains = new Set(entries.map((entry) => entry.domain));
    for (const domain of ["sign", "planet", "house", "aspect", "arcana", "position"]) {
      expect(domains.has(domain)).toBe(true);
    }
    const sources = loadSources();
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((source) => source.title && source.accessedAt && source.publisher)).toBe(true);
    expect(knowledgeStats().entries).toBe(entries.length);
  });

  it("каждая запись имеет трактовку, методику и версию", () => {
    for (const entry of loadEntries()) {
      expect(entry.summary.length).toBeGreaterThan(20);
      expect(entry.methodology.length).toBeGreaterThan(2);
      expect(entry.version.length).toBeGreaterThan(0);
    }
  });

  it("позволяет отредактировать текст из кабинета", () => {
    const sign = getEntry("sign", "aries")!;
    expect(sign).toBeTruthy();
    const updated = updateKnowledgeEntry(sign.id, {
      summary: "Отредактированная трактовка Овна для проверки сохранения изменений.",
      positive: ["Инициативность"],
    });
    expect(updated?.summary).toContain("Отредактированная трактовка");
    expect(updated?.positive).toEqual(["Инициативность"]);
    expect(getEntry("sign", "aries")?.summary).toContain("Отредактированная трактовка");
  });

  it("возвращает null для несуществующей записи", () => {
    expect(updateKnowledgeEntry("нет:такой:записи", { summary: "x" })).toBeNull();
  });
});
