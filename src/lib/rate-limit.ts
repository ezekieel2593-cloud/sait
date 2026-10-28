import { getDb, get, run } from "./db";

/**
 * Простой ограничитель частоты на таблице `rate_limits`.
 * Счётчик увеличивается атомарно одним UPSERT-запросом, поэтому
 * работает и при нескольких воркерах на одной базе.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const RATE_LIMITS = {
  calculations: () => envInt("RATE_LIMIT_MAX_CALCULATIONS", 30),
  leads: () => envInt("RATE_LIMIT_MAX_LEADS", 5),
  login: () => envInt("RATE_LIMIT_MAX_LOGIN", 8),
  windowMs: () => envInt("RATE_LIMIT_WINDOW_MS", 15 * 60_000),
};

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const db = getDb();
  const now = Date.now();
  const threshold = now - windowMs;

  run(
    db,
    `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start <= ? THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start <= ? THEN ? ELSE rate_limits.window_start END`,
    [key, now, threshold, threshold, now]
  );

  const row = get<{ count: number; window_start: number }>(db, "SELECT count, window_start FROM rate_limits WHERE key = ?", [
    key,
  ]);
  const count = row?.count ?? 1;
  const windowStart = row?.window_start ?? now;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: windowStart + windowMs,
  };
}

export function cleanupRateLimits(olderThanMs = 24 * 3_600_000): void {
  const db = getDb();
  run(db, "DELETE FROM rate_limits WHERE window_start < ?", [Date.now() - olderThanMs]);
}
