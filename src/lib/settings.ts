import { getDb, get, run, nowIso, parseJson } from "./db";
import type { Settings } from "./types";
import { DEFAULT_SETTINGS } from "./defaults";

/**
 * Настройки сайта. Хранятся в таблице `settings` как JSON-значения по ключам
 * и накладываются на значения по умолчанию из `src/lib/defaults.ts`.
 * Всё, что владелец может менять без правки кода, живёт здесь.
 */

export function getSettings(): Settings {
  const db = getDb();
  let overrides: Partial<Record<keyof Settings, unknown>> = {};
  try {
    const rows = db.prepare("SELECT key, value FROM settings").all() as {
      key: string;
      value: string;
    }[];
    overrides = rows.reduce<Record<string, unknown>>((acc, row) => {
      acc[row.key] = parseJson<unknown>(row.value, null);
      return acc;
    }, {});
  } catch {
    overrides = {};
  }

  const merged = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined) continue;
    const base = merged[key];
    if (base && typeof base === "object" && !Array.isArray(base) && typeof value === "object") {
      merged[key] = { ...(base as object), ...(value as object) };
    } else {
      merged[key] = value;
    }
  }
  return merged as unknown as Settings;
}

export function saveSettings(patch: Partial<Settings>, updatedBy = "owner"): Settings {
  const db = getDb();
  const current = getSettings();
  const next = { ...current } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const base = next[key];
    if (base && typeof base === "object" && !Array.isArray(base) && typeof value === "object") {
      next[key] = { ...(base as object), ...(value as object) };
    } else {
      next[key] = value;
    }
    run(db, "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", [
      key,
      JSON.stringify(next[key]),
      nowIso(),
    ]);
  }
  run(db, "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", [
    "__updated_by",
    JSON.stringify(updatedBy),
    nowIso(),
  ]);
  return next as unknown as Settings;
}

export function getSetting<K extends keyof Settings>(key: K): Settings[K] {
  return getSettings()[key];
}

export interface SettingRow {
  key: string;
  updated_at: string;
}

export function listSettingRows(): SettingRow[] {
  const db = getDb();
  return db.prepare("SELECT key, updated_at FROM settings ORDER BY key").all() as unknown as SettingRow[];
}

export function getSettingUpdatedAt(key: string): string | undefined {
  const db = getDb();
  const row = get<{ updated_at: string }>(db, "SELECT updated_at FROM settings WHERE key = ?", [key]);
  return row?.updated_at;
}
