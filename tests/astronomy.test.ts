import { describe, expect, it } from "vitest";
import { computeNatalChart } from "@/lib/astronomy/engine";

const london = computeNatalChart({
  date: "2000-01-01",
  time: "12:00",
  timeAccuracy: "exact",
  latitude: 51.5072,
  longitude: -0.1276,
  timezone: "Europe/London",
});

describe("натальная карта (astro-v1)", () => {
  it("даёт проверенные положения для Лондона 2000-01-01 12:00 UT", () => {
    const sun = london.positions.find((position) => position.key === "sun")!;
    const moon = london.positions.find((position) => position.key === "moon")!;
    const saturn = london.positions.find((position) => position.key === "saturn")!;

    expect(sun.longitude).toBeCloseTo(280.3687, 2);
    expect(sun.sign).toBe("Козерог");
    expect(sun.signIndex).toBe(9);
    expect(moon.longitude).toBeCloseTo(223.3239, 2);
    expect(moon.sign).toBe("Скорпион");
    expect(saturn.retrograde).toBe(true);
    expect(london.meta.algorithmVersion).toBe("astro-v1");
  });

  it("строит асцендент, MC и 12 домов", () => {
    expect(london.ascendant).not.toBeNull();
    expect(london.ascendant!.longitude).toBeCloseTo(24.0166, 1);
    expect(london.ascendant!.signIndex).toBe(0);
    expect(london.ascendant!.sign).toBe("Овен");
    expect(london.midheaven.sign).toBe("Козерог");
    expect(london.houses).toHaveLength(12);
    expect(london.houses![0]!.number).toBe(1);
    expect(london.houses![3]!.sign).toBe("Рак");
    expect(london.warnings).toHaveLength(0);
  });

  it("не выдаёт дома и асцендент как достоверные при неизвестном времени", () => {
    const unknown = computeNatalChart(
      {
        date: "1990-05-05",
        time: null,
        timeAccuracy: "unknown",
        latitude: 55.7558,
        longitude: 37.6173,
        timezone: "Europe/Moscow",
      },
      "placidus"
    );
    expect(unknown.ascendant).toBeNull();
    expect(unknown.houses).toBeNull();
    expect(unknown.warnings.length).toBeGreaterThan(0);
    expect(unknown.positions.every((position) => position.house === null)).toBe(true);
  });

  it("учитывает исторический декретный час в Москве", () => {
    const summer = computeNatalChart({
      date: "1985-07-14",
      time: "03:40",
      timeAccuracy: "exact",
      latitude: 55.7558,
      longitude: 37.6173,
      timezone: "Europe/Moscow",
    });
    // 1985-07-14 в Москве действовало летнее время: UTC+4, значит 03:40 => 23:40 UT предыдущего дня
    expect(summer.birth.utcOffset).toContain("+04");
    expect(summer.birth.utcIso.startsWith("1985-07-13T23:40")).toBe(true);
    expect(summer.ascendant).not.toBeNull();
  });

  it("поддерживает три системы домов", () => {
    const base = {
      date: "1992-06-23",
      time: "14:30",
      timeAccuracy: "exact" as const,
      latitude: 55.7558,
      longitude: 37.6173,
      timezone: "Europe/Moscow",
    };
    const placidus = computeNatalChart(base, "placidus");
    const equal = computeNatalChart(base, "equal");
    const whole = computeNatalChart(base, "whole");
    expect(placidus.houses![0]!.cusp).toBeCloseTo(equal.houses![0]!.cusp, 5);
    expect(whole.houses![0]!.cusp % 30).toBeCloseTo(0, 5);
    expect(placidus.houses![1]!.cusp).not.toBeCloseTo(equal.houses![1]!.cusp, 1);
  });
});
