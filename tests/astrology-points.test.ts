import { describe, expect, it } from "vitest";

import { chironLongitude, meanLilith, meanLunarNode, partOfFortune } from "@/lib/astronomy/points";
import { computeNatalChart } from "@/lib/astronomy/engine";
import { computeProgressions, computeSolarReturn, computeSynastry, computeTransits } from "@/lib/astronomy/forecast";
import { dignityOf } from "@/lib/astronomy/constants";

const chart = computeNatalChart({
  date: "1992-06-23",
  time: "14:30",
  timeAccuracy: "exact",
  latitude: 55.75,
  longitude: 37.62,
  timezone: "Europe/Moscow",
  placeName: "Москва",
});

describe("Дополнительные точки карты", () => {
  it("средний Северный узел в июне 1992 — около 0° Козерога", () => {
    // 0° Козерога = 270° эклиптической долготы.
    const node = meanLunarNode(2448798.5);
    expect(Math.abs(node - 270)).toBeLessThan(2);
  });

  it("Южный узел ровно напротив Северного", () => {
    const north = chart.points.find((point) => point.key === "north-node")!;
    const south = chart.points.find((point) => point.key === "south-node")!;
    const distance = (((north.longitude - south.longitude) % 360) + 360) % 360;
    expect(Math.abs(distance - 180)).toBeLessThan(0.001);
  });

  it("Лилит — средний апогей: значение в диапазоне и стабильно", () => {
    const lilith = meanLilith(2448798.5);
    expect(lilith).toBeGreaterThanOrEqual(0);
    expect(lilith).toBeLessThan(360);
    expect(meanLilith(2448798.5)).toBeCloseTo(lilith, 6);
  });

  it("Хирон в июне 1992 — в Льве (сверено с эфемеридой)", () => {
    const value = chironLongitude(2448798.5);
    expect(value).toBeGreaterThan(120);
    expect(value).toBeLessThan(150);
  });

  it("Парс Фортуны считается по дневной и ночной формуле", () => {
    expect(partOfFortune(180, 90, 0, true)).toBe(90);
    expect(partOfFortune(180, 90, 0, false)).toBe(270);
  });

  it("в карте все пять точек с формулой и знаком", () => {
    expect(chart.points).toHaveLength(5);
    for (const point of chart.points) {
      expect(point.formatted.length).toBeGreaterThan(5);
      expect(point.formula.length).toBeGreaterThan(10);
      expect(point.note.length).toBeGreaterThan(10);
      expect(point.house).toBeGreaterThanOrEqual(1);
      expect(point.house).toBeLessThanOrEqual(12);
    }
  });
});

describe("Достоинства планет", () => {
  it("таблица достоинств соответствует традиции", () => {
    expect(dignityOf("sun", 4)).toBe("rulership"); // Солнце в Льве
    expect(dignityOf("sun", 0)).toBe("exaltation"); // Солнце в Овне
    expect(dignityOf("sun", 10)).toBe("detriment"); // Солнце в Водолее
    expect(dignityOf("moon", 3)).toBe("rulership"); // Луна в Раке
    expect(dignityOf("mars", 9)).toBe("exaltation"); // Марс в Козероге
    expect(dignityOf("mercury", 2)).toBe("rulership"); // Меркурий в Близнецах
    expect(dignityOf("pluto", 7)).toBe("rulership"); // Плутон в Скорпионе
    expect(dignityOf("neptune", 5)).toBe("detriment");
    expect(dignityOf("jupiter", 0)).toBeNull();
  });

  it("у каждой планеты посчитано достоинство и балл", () => {
    expect(chart.dignities).toHaveLength(10);
    for (const item of chart.dignities) {
      expect(typeof item.note).toBe("string");
      expect(item.note.length).toBeGreaterThan(20);
      expect(Number.isInteger(item.score)).toBe(true);
    }
  });

  it("доминанты отсортированы по баллам", () => {
    expect(chart.dominants.length).toBe(10);
    const scores = chart.dominants.map((item) => item.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(chart.dominants[0]!.reasons.length).toBeGreaterThan(0);
  });
});

describe("Транзиты и прогрессии", () => {
  const now = new Date("2026-11-07T12:00:00Z");

  it("транзиты считаются на дату и дают аспекты к натальной карте", () => {
    const transits = computeTransits(chart, now);
    expect(transits.strip).toHaveLength(10);
    expect(transits.aspects.length).toBeGreaterThan(0);
    for (const aspect of transits.aspects) {
      expect(aspect.orb).toBeLessThanOrEqual(3);
      expect(aspect.formatted).toMatch(/Транзитный/);
    }
    expect(transits.slow.every((aspect) => ["jupiter", "saturn", "uranus", "neptune", "pluto"].includes(aspect.transitKey))).toBe(true);
  });

  it("транзиты детерминированы для одной даты", () => {
    const a = computeTransits(chart, now).aspects.map((aspect) => `${aspect.transitKey}-${aspect.natalKey}-${aspect.orb}`);
    const b = computeTransits(chart, now).aspects.map((aspect) => `${aspect.transitKey}-${aspect.natalKey}-${aspect.orb}`);
    expect(a).toEqual(b);
  });

  it("прогрессии идут по правилу «день за год»", () => {
    const progressions = computeProgressions(chart, now);
    expect(progressions.age).toBeGreaterThan(34);
    expect(progressions.age).toBeLessThan(35);
    // 34 года жизни = 34 дня после рождения.
    expect(progressions.date).toBe("1992-07-27");
    expect(progressions.chart.ascendant).toBeTruthy();
    expect(progressions.aspects.length).toBeGreaterThanOrEqual(0);
  });
});

describe("Соляр и синастрия", () => {
  it("соляр ставит Солнце точно в натальную долготу", () => {
    const solar = computeSolarReturn(chart, 2026);
    const natalSun = chart.positions.find((position) => position.key === "sun")!.longitude;
    const solarSun = solar.chart.positions.find((position) => position.key === "sun")!.longitude;
    let delta = Math.abs(solarSun - natalSun);
    if (delta > 180) delta = 360 - delta;
    expect(delta).toBeLessThan(0.02);
    expect(solar.date.startsWith("2026-06")).toBe(true);
    expect(solar.chart.ascendant).toBeTruthy();
    expect(solar.note).toMatch(/место рождения/);
  });

  it("соляр на разные годы даёт разные даты", () => {
    const a = computeSolarReturn(chart, 2026);
    const b = computeSolarReturn(chart, 2027);
    expect(a.date).not.toBe(b.date);
    expect(b.year).toBe(2027);
  });

  it("синастрия считает аспекты между двумя картами и наложение домов", () => {
    const partner = computeNatalChart({
      date: "1990-03-15",
      time: "08:10",
      timeAccuracy: "exact",
      latitude: 59.9343,
      longitude: 30.3351,
      timezone: "Europe/Moscow",
      placeName: "Санкт-Петербург",
    });
    const synastry = computeSynastry(chart, partner);
    expect(synastry.aspects.length).toBeGreaterThan(0);
    expect(synastry.harmonious + synastry.tense + synastry.neutral).toBe(synastry.aspects.length);
    expect(synastry.overlay).toHaveLength(10);
    for (const hit of synastry.overlay) {
      expect(hit.house).toBeGreaterThanOrEqual(1);
      expect(hit.house).toBeLessThanOrEqual(12);
    }
    expect(synastry.summary.length).toBeGreaterThan(30);
  });

  it("транзиты помечают попятные планеты", () => {
    const transits = computeTransits(chart, new Date("2026-11-07T12:00:00Z"));
    expect(transits.strip.some((item) => item.retrograde)).toBe(true);
  });
});
