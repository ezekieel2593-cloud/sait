import { z } from "zod";
import { LEAD_STATUSES, type ContactChannel } from "./types";
import { isValidTimeZone } from "./astronomy/timezone";

/** Схемы валидации. Используются и на сервере, и в клиентских формах. */

export const birthPlaceSchema = z.object({
  name: z.string().trim().min(2, "Укажите место рождения").max(120),
  region: z.string().trim().max(120).optional(),
  country: z.string().trim().min(2, "Укажите страну").max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z
    .string()
    .trim()
    .min(3)
    .refine((value) => isValidTimeZone(value), "Неизвестный часовой пояс"),
});

export const birthSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате ГГГГ-ММ-ДД")
      .refine((value) => {
        const [y, m, d] = value.split("-").map(Number);
        const date = new Date(Date.UTC(y!, m! - 1, d!));
        return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
      }, "Такой даты не существует")
      .refine((value) => {
        const year = Number(value.slice(0, 4));
        return year >= 1900 && year <= new Date().getFullYear();
      }, "Поддерживаются годы с 1900 по текущий")
      .refine((value) => new Date(value) <= new Date(), "Дата рождения не может быть в будущем"),
    timeAccuracy: z.enum(["exact", "approx", "unknown"]),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Время в формате ЧЧ:ММ")
      .nullish(),
    place: birthPlaceSchema,
  })
  .refine((data) => data.timeAccuracy === "unknown" || Boolean(data.time), {
    message: "Укажите время рождения или выберите «время неизвестно»",
    path: ["time"],
  });

export type BirthPayload = z.infer<typeof birthSchema>;

export const directionSchema = z.enum(["astrology", "matrix"]);

export const contactChannelSchema = z.enum(["telegram", "max", "email"]);

const phoneRegex = /^\+?[0-9\s()-]{7,20}$/;
const telegramRegex = /^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export function validateContact(channel: ContactChannel, value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Укажите контакт для связи";

  if (channel === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) ? null : "Проверьте адрес электронной почты";
  }
  if (channel === "telegram") {
    if (telegramRegex.test(trimmed)) return null;
    if (phoneRegex.test(trimmed)) return null;
    return "Укажите @username в Telegram или номер телефона";
  }
  // MAX: телефон или username
  if (phoneRegex.test(trimmed) || telegramRegex.test(trimmed)) return null;
  return "Укажите номер телефона или username в MAX";
}

export const leadSchema = z
  .object({
    name: z.string().trim().min(2, "Укажите имя").max(80),
    direction: directionSchema,
    serviceId: z.string().trim().max(64).nullable().optional(),
    channel: contactChannelSchema,
    contact: z.string().trim().min(3, "Укажите контакт").max(120),
    question: z.string().trim().max(1000, "Слишком длинный текст").optional().nullable(),
    consent: z.boolean().refine((value) => value, "Без согласия на обработку данных заявку принять нельзя"),
    calculationId: z.string().trim().max(64).nullable().optional(),
    locale: z.string().max(10).optional(),
  })
  .superRefine((data, ctx) => {
    const error = validateContact(data.channel, data.contact);
    if (error) {
      ctx.addIssue({ code: "custom", message: error, path: ["contact"] });
    }
  });

export type LeadPayload = z.infer<typeof leadSchema>;

export const leadStatusSchema = z.enum(LEAD_STATUSES as [string, ...string[]]);

export const loginSchema = z.object({
  email: z.string().trim().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const settingsPatchSchema = z.object({
  site: z
    .object({
      name: z.string().trim().min(1).max(80),
      logoText: z.string().trim().min(1).max(80),
      tagline: z.string().trim().max(160),
      description: z.string().trim().max(400),
      siteUrl: z.string().trim().url("Укажите полный URL"),
    })
    .partial()
    .optional(),
  specialist: z
    .object({
      name: z.string().trim().max(120),
      title: z.string().trim().max(160),
      bio: z.string().trim().max(2000),
      photoUrl: z.string().trim().max(300),
      note: z.string().trim().max(400),
      credentials: z.array(z.string().trim().max(200)).max(20),
    })
    .partial()
    .optional(),
  contacts: z
    .object({
      email: z.string().trim().max(120),
      telegram: z.string().trim().max(200),
      max: z.string().trim().max(200),
      phone: z.string().trim().max(40),
      location: z.string().trim().max(120),
    })
    .partial()
    .optional(),
  notifications: z
    .object({
      adminEmail: z.string().trim().max(120),
    })
    .partial()
    .optional(),
  services: z
    .object({
      fullReadingIncludes: z.array(z.string().trim().max(300)).max(20),
      fullReadingFormat: z.array(z.string().trim().max(300)).max(20),
      priceNote: z.string().trim().max(300),
      turnaround: z.string().trim().max(300),
    })
    .partial()
    .optional(),
  freeResult: z
    .object({
      astrologyCardCount: z.number().int().min(3).max(20),
      matrixPointCount: z.number().int().min(3).max(20),
    })
    .partial()
    .optional(),
  legal: z
    .object({
      privacyUpdatedAt: z.string().trim().max(40),
      dataRetentionDays: z.number().int().min(30).max(3650),
      responsiblePerson: z.string().trim().max(160),
    })
    .partial()
    .optional(),
  methodology: z
    .object({
      astrologyHouseSystem: z.string().trim().max(120),
      astrologyHouseSystemKey: z.enum(["placidus", "equal", "whole"]),
      astrologyZodiac: z.string().trim().max(120),
      astrologyOrbs: z.string().trim().max(200),
      astrologyEphemeris: z.string().trim().max(200),
      matrixMethodology: z.string().trim().max(200),
      matrixVersion: z.string().trim().max(60),
      astrologyVersion: z.string().trim().max(60),
    })
    .partial()
    .optional(),
  reviews: z
    .array(
      z.object({
        id: z.string().trim().max(40),
        author: z.string().trim().min(1).max(80),
        text: z.string().trim().min(1).max(800),
        context: z.string().trim().max(120).optional(),
      })
    )
    .max(12)
    .optional(),
  faq: z
    .array(
      z.object({
        id: z.string().trim().max(40),
        question: z.string().trim().min(1).max(200),
        answer: z.string().trim().min(1).max(1200),
      })
    )
    .max(30)
    .optional(),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: z.string().min(10, "Минимум 10 символов").max(200),
    repeatPassword: z.string().min(10).max(200),
  })
  .refine((data) => data.newPassword === data.repeatPassword, {
    message: "Пароли не совпадают",
    path: ["repeatPassword"],
  });

export function formatZodError(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    if (!result[path]) result[path] = issue.message;
  }
  return result;
}
