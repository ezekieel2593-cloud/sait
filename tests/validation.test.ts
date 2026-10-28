import { describe, expect, it } from "vitest";
import { birthSchema, leadSchema, loginSchema, settingsPatchSchema, validateContact } from "@/lib/validation";

const validBirth = {
  date: "1990-05-05",
  timeAccuracy: "exact" as const,
  time: "10:15",
  place: {
    name: "Казань",
    country: "Россия",
    latitude: 55.7963,
    longitude: 49.1088,
    timezone: "Europe/Moscow",
  },
};

describe("валидация данных рождения", () => {
  it("принимает корректные данные", () => {
    expect(birthSchema.safeParse(validBirth).success).toBe(true);
  });

  it("отклоняет несуществующую, будущую и слишком старую дату", () => {
    expect(birthSchema.safeParse({ ...validBirth, date: "1990-02-31" }).success).toBe(false);
    expect(birthSchema.safeParse({ ...validBirth, date: "2999-01-01" }).success).toBe(false);
    expect(birthSchema.safeParse({ ...validBirth, date: "1850-01-01" }).success).toBe(false);
  });

  it("требует время, если точность не «неизвестно»", () => {
    const result = birthSchema.safeParse({ ...validBirth, time: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("time"))).toBe(true);
    }
  });

  it("проверяет часовой пояс и координаты", () => {
    expect(birthSchema.safeParse({ ...validBirth, place: { ...validBirth.place, timezone: "Mars/Olympus" } }).success).toBe(false);
    expect(birthSchema.safeParse({ ...validBirth, place: { ...validBirth.place, latitude: 120 } }).success).toBe(false);
  });
});

describe("валидация контактов", () => {
  it("различает каналы", () => {
    expect(validateContact("email", "client@example.com")).toBeNull();
    expect(validateContact("email", "@nickname")).not.toBeNull();
    expect(validateContact("telegram", "@client_name")).toBeNull();
    expect(validateContact("telegram", "+7 999 123-45-67")).toBeNull();
    expect(validateContact("telegram", "просто текст")).not.toBeNull();
    expect(validateContact("max", "+79991234567")).toBeNull();
  });

  it("заявка без согласия не проходит", () => {
    const result = leadSchema.safeParse({
      name: "Клиент",
      direction: "matrix",
      channel: "telegram",
      contact: "@client_name",
      consent: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("валидация настроек и входа", () => {
  it("проверяет URL сайта", () => {
    expect(settingsPatchSchema.safeParse({ site: { siteUrl: "https://example.com" } }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ site: { siteUrl: "не-url" } }).success).toBe(false);
  });

  it("не принимает короткий пароль в форме входа", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "secret" }).success).toBe(true);
  });
});
