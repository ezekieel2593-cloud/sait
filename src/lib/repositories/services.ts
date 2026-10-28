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
