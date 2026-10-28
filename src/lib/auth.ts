import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getDb, get, run, nowIso, newId } from "./db";

/**
 * Серверная авторизация специалиста.
 * - пароли: scrypt с индивидуальной солью (N=16384, r=8, p=1, 64 байта);
 * - сессии: случайный токен в httpOnly-cookie, в БД хранится только SHA-256;
 * - права проверяются на сервере для каждого защищённого маршрута.
 */

export const SESSION_COOKIE = "astra_session";
const SESSION_TTL_HOURS = 12;
const MAX_FAILED_ATTEMPTS = 6;
const LOCK_MINUTES = 15;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = scryptSync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  lockedUntil?: string;
  token?: string;
}

export function authenticate(email: string, password: string, ip: string, userAgent: string): LoginResult {
  const db = getDb();
  const user = get<{
    id: string;
    email: string;
    name: string;
    password_hash: string;
    is_active: number;
    failed_attempts: number;
    locked_until: string | null;
  }>(db, "SELECT * FROM users WHERE lower(email) = lower(?)", [email.trim()]);

  if (!user || !user.is_active) {
    return { ok: false, error: "Неверная почта или пароль." };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return {
      ok: false,
      error: "Вход временно заблокирован после нескольких неудачных попыток.",
      lockedUntil: user.locked_until,
    };
  }

  if (!verifyPassword(password, user.password_hash)) {
    const attempts = user.failed_attempts + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
      : null;
    run(db, "UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?", [
      lock ? 0 : attempts,
      lock,
      nowIso(),
      user.id,
    ]);
    return {
      ok: false,
      error: lock
        ? `Слишком много попыток. Вход заблокирован на ${LOCK_MINUTES} минут.`
        : "Неверная почта или пароль.",
      lockedUntil: lock ?? undefined,
    };
  }

  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000).toISOString();
  run(db, "INSERT INTO sessions (id, user_id, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)", [
    sha256(token),
    user.id,
    nowIso(),
    expires,
    ip,
    userAgent.slice(0, 300),
  ]);
  run(db, "UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?", [
    nowIso(),
    nowIso(),
    user.id,
  ]);
  run(db, "INSERT INTO audit_log (id, user_id, action, entity, entity_id, meta, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    newId("log"),
    user.id,
    "auth.login",
    "user",
    user.id,
    null,
    ip,
    nowIso(),
  ]);

  return { ok: true, token };
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const row = get<{ id: string; email: string; name: string; role: string; expires_at: string }>(
    db,
    `SELECT u.id, u.email, u.name, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND u.is_active = 1`,
    [sha256(token)]
  );
  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) {
    run(db, "DELETE FROM sessions WHERE id = ?", [sha256(token)]);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = getDb();
    const hash = sha256(token);
    const row = get<{ user_id: string }>(db, "SELECT user_id FROM sessions WHERE id = ?", [hash]);
    run(db, "DELETE FROM sessions WHERE id = ?", [hash]);
    if (row) {
      run(db, "INSERT INTO audit_log (id, user_id, action, entity, entity_id, meta, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        newId("log"),
        row.user_id,
        "auth.logout",
        "user",
        row.user_id,
        null,
        null,
        nowIso(),
      ]);
    }
  }
  await clearSessionCookie();
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const user = get<{ password_hash: string }>(db, "SELECT password_hash FROM users WHERE id = ?", [userId]);
  if (!user) return { ok: false, error: "Пользователь не найден." };
  if (!verifyPassword(currentPassword, user.password_hash)) {
    return { ok: false, error: "Текущий пароль указан неверно." };
  }
  if (nextPassword.length < 10) {
    return { ok: false, error: "Новый пароль должен содержать минимум 10 символов." };
  }
  run(db, "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [
    hashPassword(nextPassword),
    nowIso(),
    userId,
  ]);
  run(db, "DELETE FROM sessions WHERE user_id = ?", [userId]);
  return { ok: true };
}

/* --------------------------- Сброс пароля --------------------------- */

export function createPasswordReset(userId: string): string {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  run(db, "INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)", [
    newId("pr"),
    userId,
    sha256(token),
    new Date(Date.now() + 60 * 60_000).toISOString(),
    nowIso(),
  ]);
  return token;
}

export function consumePasswordReset(token: string, nextPassword: string): { ok: boolean; error?: string; userId?: string } {
  const db = getDb();
  const row = get<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    db,
    "SELECT * FROM password_resets WHERE token_hash = ?",
    [sha256(token)]
  );
  if (!row || row.used_at) return { ok: false, error: "Ссылка недействительна." };
  if (new Date(row.expires_at) <= new Date()) return { ok: false, error: "Ссылка истекла. Запросите новую." };
  if (nextPassword.length < 10) return { ok: false, error: "Пароль должен содержать минимум 10 символов." };

  run(db, "UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?", [
    hashPassword(nextPassword),
    nowIso(),
    row.user_id,
  ]);
  run(db, "UPDATE password_resets SET used_at = ? WHERE id = ?", [nowIso(), row.id]);
  run(db, "DELETE FROM sessions WHERE user_id = ?", [row.user_id]);
  return { ok: true, userId: row.user_id };
}

/* --------------------------- Утилиты запроса --------------------------- */

export function clientIpFrom(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip") || "unknown";
}

export async function requestMeta(): Promise<{ ip: string; userAgent: string; origin: string | null; host: string | null }> {
  const h = await headers();
  return {
    ip: clientIpFrom(h),
    userAgent: h.get("user-agent") || "unknown",
    origin: h.get("origin"),
    host: h.get("host"),
  };
}

/** Проверка same-origin для мутирующих API-запросов (защита от CSRF). */
export async function assertSameOrigin(): Promise<boolean> {
  const { origin, host } = await requestMeta();
  if (!origin) return true; // небраузерные клиенты без Origin не получают cookie автоматически
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function hashIp(ip: string): string {
  const secret = process.env.AUTH_SECRET || "dev-secret";
  return createHash("sha256").update(`${ip}:${secret}`).digest("hex").slice(0, 32);
}
