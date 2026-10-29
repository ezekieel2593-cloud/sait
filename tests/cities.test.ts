import { describe, expect, it } from "vitest";
import { CITIES, searchCities } from "@/lib/astronomy/cities";

describe("справочник городов", () => {
  it("во всех записях корректные координаты и часовой пояс", () => {
    expect(CITIES.length).toBeGreaterThan(250);
    for (const city of CITIES) {
      expect(Math.abs(city.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(city.longitude)).toBeLessThanOrEqual(180);
      expect(() => new Intl.DateTimeFormat("ru-RU", { timeZone: city.timezone })).not.toThrow();
    }
  });

  it("находит малые города России", () => {
    for (const name of ["Тутаев", "Скопин", "Борзя", "Корсаков", "Белебей"]) {
      expect(searchCities(name, 5)[0]?.name).toBe(name);
    }
  });

  it("находит город по части названия и по региону", () => {
    expect(searchCities("старый оск", 5)[0]?.name).toBe("Старый Оскол");
    expect(searchCities("сердобск", 5)[0]?.name).toBe("Сердобск");
  });
});
