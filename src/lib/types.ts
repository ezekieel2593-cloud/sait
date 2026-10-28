/* Общие типы предметной области. Используются и сервером, и клиентом. */

export type Direction = "astrology" | "matrix";

export const DIRECTIONS: Direction[] = ["astrology", "matrix"];

export const DIRECTION_LABELS: Record<Direction, string> = {
  astrology: "Астрология",
  matrix: "Матрица судьбы",
};

export type TimeAccuracy = "exact" | "approx" | "unknown";

export const TIME_ACCURACY_LABELS: Record<TimeAccuracy, string> = {
  exact: "Точное время известно",
  approx: "Время известно приблизительно",
  unknown: "Время рождения неизвестно",
};

export type ContactChannel = "telegram" | "max" | "email";

export const CONTACT_CHANNELS: ContactChannel[] = ["telegram", "max", "email"];

export const CHANNEL_LABELS: Record<ContactChannel, string> = {
  telegram: "Telegram",
  max: "MAX",
  email: "Электронная почта",
};

export type LeadStatus =
  | "new"
  | "in_progress"
  | "need_data"
  | "awaiting_client"
  | "ready"
  | "done"
  | "cancelled";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "in_progress",
  "need_data",
  "awaiting_client",
  "ready",
  "done",
  "cancelled",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  need_data: "Нужны дополнительные данные",
  awaiting_client: "Ожидает ответа клиента",
  ready: "Готова к отправке",
  done: "Завершена",
  cancelled: "Отменена",
};

export interface BirthPlace {
  name: string;
  region?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface BirthInput {
  date: string; // YYYY-MM-DD
  timeAccuracy: TimeAccuracy;
  time?: string | null; // HH:mm
  place: BirthPlace;
}

/* ------------------------------ Настройки ------------------------------ */

export interface Settings {
  site: {
    name: string;
    logoText: string;
    tagline: string;
    description: string;
    siteUrl: string;
  };
  specialist: {
    name: string;
    title: string;
    bio: string;
    photoUrl: string;
    credentials: string[];
    note: string;
  };
  contacts: {
    email: string;
    telegram: string;
    max: string;
    phone: string;
    location: string;
  };
  notifications: {
    adminEmail: string;
    telegramChatConfiguredNote: string;
    maxChatConfiguredNote: string;
  };
  services: {
    fullReadingIncludes: string[];
    fullReadingFormat: string[];
    priceNote: string;
    turnaround: string;
  };
  freeResult: {
    astrologyCardCount: number;
    matrixPointCount: number;
  };
  legal: {
    privacyUpdatedAt: string;
    dataRetentionDays: number;
    responsiblePerson: string;
  };
  methodology: {
    astrologyHouseSystem: string;
    astrologyHouseSystemKey: "placidus" | "equal" | "whole";
    astrologyZodiac: string;
    astrologyOrbs: string;
    astrologyEphemeris: string;
    matrixMethodology: string;
    matrixVersion: string;
    astrologyVersion: string;
  };
  reviews: ReviewItem[];
  faq: FaqItem[];
}

export interface ReviewItem {
  id: string;
  author: string;
  text: string;
  context?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/* ------------------------------ Заявки ------------------------------ */

export interface Lead {
  id: string;
  publicRef: string;
  name: string;
  direction: Direction;
  serviceId: string | null;
  serviceTitle?: string | null;
  channel: ContactChannel;
  contact: string;
  question: string | null;
  consent: boolean;
  status: LeadStatus;
  internalNotes: string | null;
  calculationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadEvent {
  id: string;
  leadId: string;
  type: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  actor: string;
  message: string | null;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  leadId: string;
  channel: "telegram" | "max" | "email";
  status: "pending" | "sent" | "failed" | "skipped";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

/* ------------------------------ Расчёты ------------------------------ */

export interface CalculationRecord {
  id: string;
  direction: Direction;
  input: unknown;
  result: unknown;
  methodology: string;
  algorithmVersion: string;
  birthDate: string;
  birthTime: string | null;
  birthPlace: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  timeAccuracy: TimeAccuracy | null;
  createdAt: string;
}
