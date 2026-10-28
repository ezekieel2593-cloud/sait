import type { DatabaseSync } from "node:sqlite";
import { getDb, get, all, run, newId, nowIso, parseJson } from "../db";
import type { Direction } from "../types";

export interface Service {
  id: string;
  slug: string;
  direction: Direction | "both";
  title: string;
  description: string;
  price: string | null;
  duration: string | null;
  includes: string[];
  isActive: boolean;
  sort: number;
}

interface ServiceRow {
  id: string;
  slug: string;
  direction: Direction | "both";
  title: string;
  description: string;
  price: string | null;
  duration: string | null;
  includes: string;
  is_active: number;
  sort: number;
}

function mapRow(row: ServiceRow): Service {
  return {
    id: row.id,
    slug: row.slug,
    direction: row.direction,
    title: row.title,
    description: row.description,
    price: row.price,
    duration: row.duration,
    includes: parseJson<string[]>(row.includes, []),
    isActive: Boolean(row.is_active),
    sort: row.sort,
  };
}

export function listServices(direction?: Direction): Service[] {
  const db = getDb();
  const rows = direction
    ? all<ServiceRow>(db, "SELECT * FROM services WHERE is_active = 1 AND (direction = ? OR direction = 'both') ORDER BY sort, title", [direction])
    : all<ServiceRow>(db, "SELECT * FROM services ORDER BY sort, title");
  return rows.map(mapRow);
}

export function getService(id: string): Service | null {
  const db = getDb();
  const row = get<ServiceRow>(db, "SELECT * FROM services WHERE id = ?", [id]);
  return row ? mapRow(row) : null;
}

export function getServiceBySlug(slug: string): Service | null {
  const db = getDb();
  const row = get<ServiceRow>(db, "SELECT * FROM services WHERE slug = ?", [slug]);
  return row ? mapRow(row) : null;
}

export function updateService(
  id: string,
  patch: { title?: string; description?: string; price?: string | null; duration?: string | null; isActive?: boolean }
): void {
  const db = getDb();
  const current = getService(id);
  if (!current) return;
  run(db, "UPDATE services SET title = ?, description = ?, price = ?, duration = ?, is_active = ?, updated_at = ? WHERE id = ?", [
    patch.title ?? current.title,
    patch.description ?? current.description,
    patch.price === undefined ? current.price : patch.price,
    patch.duration === undefined ? current.duration : patch.duration,
    patch.isActive === undefined ? (current.isActive ? 1 : 0) : patch.isActive ? 1 : 0,
    nowIso(),
    id,
  ]);
}

export function createService(input: {
  slug: string;
  direction: Direction | "both";
  title: string;
  description: string;
  price?: string | null;
  duration?: string | null;
  includes?: string[];
  sort?: number;
}): string {
  const db = getDb();
  const id = newId("srv");
  run(
    db,
    "INSERT INTO services (id, slug, direction, title, description, price, duration, includes, is_active, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
    [
      id,
      input.slug,
      input.direction,
      input.title,
      input.description,
      input.price ?? null,
      input.duration ?? null,
      JSON.stringify(input.includes ?? []),
      input.sort ?? 0,
      nowIso(),
      nowIso(),
    ]
  );
  return id;
}

/**
 * Стартовый набор услуг. Используется скриптом сидирования и сборкой релиза,
 * чтобы услуги можно было менять в кабинете, а не в коде.
 */
export const DEFAULT_SERVICES: {
  slug: string;
  direction: Direction | "both";
  title: string;
  description: string;
  includes: string[];
}[] = [
  {
    slug: "astrology-full",
    direction: "astrology",
    title: "Полный астрологический разбор",
    description:
      "Натальная карта целиком: все планеты и дома, асцендент, аспекты и подробные интерпретации. Ответы на ваши вопросы по карте.",
    includes: [
      "Полная натальная карта с расшифровкой",
      "Разбор характера и сильных сторон",
      "Реализация, деньги, отношения",
      "Ответы на вопросы по карте",
    ],
  },
  {
    slug: "matrix-full",
    direction: "matrix",
    title: "Полный разбор Матрицы судьбы",
    description:
      "Все позиции матрицы: личный и родовой квадрат, линии денег и отношений, кармический хвост и предназначение.",
    includes: [
      "Полная схема с расшифровкой всех 22 энергий",
      "Личный и родовой квадрат",
      "Каналы денег и отношений",
      "Предназначение и годовые энергии",
    ],
  },
  {
    slug: "consultation",
    direction: "both",
    title: "Консультация по вашему вопросу",
    description:
      "Разбор конкретной темы: отношения, выбор пути, работа и деньги. Вы сами определяете вопрос, специалист готовит ответ.",
    includes: [
      "Онлайн-встреча или развёрнутый письменный ответ",
      "Разбор выбранной темы",
      "Рекомендации и следующие шаги",
    ],
  },
];

/** Идемпотентно записывает стартовые услуги. Возвращает количество услуг. */
export function seedServices(db: DatabaseSync): number {
  const now = nowIso();
  let sort = 0;
  for (const service of DEFAULT_SERVICES) {
    const existing = get<{ id: string }>(db, "SELECT id FROM services WHERE slug = ?", [service.slug]);
    if (existing) {
      run(
        db,
        "UPDATE services SET direction = ?, title = ?, description = ?, includes = ?, sort = ?, updated_at = ? WHERE id = ?",
        [service.direction, service.title, service.description, JSON.stringify(service.includes), sort++, now, existing.id]
      );
    } else {
      run(
        db,
        "INSERT INTO services (id, slug, direction, title, description, price, duration, includes, is_active, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 1, ?, ?, ?)",
        [newId("srv"), service.slug, service.direction, service.title, service.description, JSON.stringify(service.includes), sort++, now, now]
      );
    }
  }
  return DEFAULT_SERVICES.length;
}
