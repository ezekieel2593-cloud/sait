import { getDb, get, run, newId, nowIso } from "../db";
import type { CalculationRecord, Direction, TimeAccuracy } from "../types";

interface CalculationRow {
  id: string;
  direction: Direction;
  input: string;
  result: string;
  methodology: string;
  algorithm_version: string;
  birth_date: string;
  birth_time: string | null;
  birth_place: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  time_accuracy: TimeAccuracy | null;
  created_at: string;
}

function mapRow(row: CalculationRow): CalculationRecord {
  return {
    id: row.id,
    direction: row.direction,
    input: JSON.parse(row.input),
    result: JSON.parse(row.result),
    methodology: row.methodology,
    algorithmVersion: row.algorithm_version,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthPlace: row.birth_place,
    timezone: row.timezone,
    latitude: row.latitude,
    longitude: row.longitude,
    timeAccuracy: row.time_accuracy,
    createdAt: row.created_at,
  };
}

export interface SaveCalculationInput {
  direction: Direction;
  input: unknown;
  result: unknown;
  methodology: string;
  algorithmVersion: string;
  birthDate: string;
  birthTime?: string | null;
  birthPlace?: string | null;
  timezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timeAccuracy?: TimeAccuracy | null;
  ipHash?: string | null;
}

export function saveCalculation(data: SaveCalculationInput): string {
  const db = getDb();
  const id = newId("calc");
  run(
    db,
    `INSERT INTO calculations (id, direction, input, result, methodology, algorithm_version, birth_date, birth_time,
      birth_place, timezone, latitude, longitude, time_accuracy, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.direction,
      JSON.stringify(data.input),
      JSON.stringify(data.result),
      data.methodology,
      data.algorithmVersion,
      data.birthDate,
      data.birthTime ?? null,
      data.birthPlace ?? null,
      data.timezone ?? null,
      data.latitude ?? null,
      data.longitude ?? null,
      data.timeAccuracy ?? null,
      data.ipHash ?? null,
      nowIso(),
    ]
  );
  return id;
}

export function getCalculation(id: string): CalculationRecord | null {
  const db = getDb();
  const row = get<CalculationRow>(db, "SELECT * FROM calculations WHERE id = ?", [id]);
  return row ? mapRow(row) : null;
}

export function countRecentCalculations(ipHash: string, windowMs: number): number {
  const db = getDb();
  const since = new Date(Date.now() - windowMs).toISOString();
  const row = get<{ count: number }>(
    db,
    "SELECT COUNT(*) AS count FROM calculations WHERE ip_hash = ? AND created_at > ?",
    [ipHash, since]
  );
  return row?.count ?? 0;
}

/** Удаление расчёта вместе со связью в заявке (используется в политике хранения). */
export function deleteCalculation(id: string): void {
  const db = getDb();
  run(db, "UPDATE leads SET calculation_id = NULL WHERE calculation_id = ?", [id]);
  run(db, "DELETE FROM calculations WHERE id = ?", [id]);
}
