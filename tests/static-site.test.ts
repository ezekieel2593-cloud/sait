import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, getConfig, mailtoLink, telegramLink } from "../src-static/config";

describe("конфигурация статической версии", () => {
  it("мержит настройки из config.js поверх значений по умолчанию", () => {
    (globalThis as unknown as { ASTRA_CONFIG?: unknown }).ASTRA_CONFIG = {
      siteName: "Мой сайт",
      contacts: { telegram: "@my_nick", email: "me@example.com" },
      freeResult: { astrologyCardCount: 6 },
    };
    const config = getConfig();
    expect(config.siteName).toBe("Мой сайт");
    expect(config.contacts.telegram).toBe("@my_nick");
    expect(config.contacts.email).toBe("me@example.com");
    // Незаполненные поля сохраняют значения по умолчанию
    expect(config.freeResult.astrologyCardCount).toBe(6);
    expect(config.freeResult.matrixPointCount).toBe(DEFAULT_CONFIG.freeResult.matrixPointCount);
    expect(config.faq.length).toBe(DEFAULT_CONFIG.faq.length);
    (globalThis as unknown as { ASTRA_CONFIG?: unknown }).ASTRA_CONFIG = undefined;
  });

  it("собирает ссылку Telegram из ника или полной ссылки", () => {
    const config = { ...DEFAULT_CONFIG, contacts: { ...DEFAULT_CONFIG.contacts, telegram: "@my_nick" } };
    expect(telegramLink(config, "привет")).toBe("https://t.me/my_nick?text=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82");
    const withUrl = { ...config, contacts: { ...config.contacts, telegram: "https://t.me/other_nick/" } };
    expect(telegramLink(withUrl, "text")).toBe("https://t.me/other_nick?text=text");
    expect(telegramLink({ ...config, contacts: { ...config.contacts, telegram: "" } }, "x")).toBeNull();
  });

  it("собирает mailto-ссылку и не ломается без почты", () => {
    const config = { ...DEFAULT_CONFIG, contacts: { ...DEFAULT_CONFIG.contacts, email: "me@example.com" } };
    expect(mailtoLink(config, "текст", "Заявка")).toContain("mailto:me@example.com?subject=");
    expect(mailtoLink({ ...config, contacts: { ...config.contacts, email: "" } }, "x", "y")).toBeNull();
  });

  it("не использует случайные данные и подставляет плейсхолдеры вместо выдуманных отзывов", () => {
    expect(DEFAULT_CONFIG.reviews).toEqual([]);
    expect(DEFAULT_CONFIG.specialist.name).toBe("Ваше имя");
    expect(DEFAULT_CONFIG.services.priceNote).toBe("");
  });
});
