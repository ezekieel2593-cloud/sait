import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Слой доступа к базе данных.
 *
 * Первый релиз работает на встроенном модуле Node.js `node:sqlite`
 * (SQLite, режим WAL). Провайдер БД изолирован в этом файле: чтобы перейти на
 * PostgreSQL, достаточно заменить реализацию `getDb()` на пул `pg`/Drizzle и
 * перенести SQL из `src/lib/repositories/*`. Остальной код работает через
 * репозитории и не знает, какая СУБД используется.
 */

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'specialist',
  is_active INTEGER NOT NULL DEFAULT 1,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT,
  duration TEXT,
  includes TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calculations (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL,
  input TEXT NOT NULL,
  result TEXT NOT NULL,
  methodology TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  birth_time TEXT,
  birth_place TEXT,
  timezone TEXT,
  latitude REAL,
  longitude REAL,
  time_accuracy TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calculations_created ON calculations(created_at);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  public_ref TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  direction TEXT NOT NULL,
  service_id TEXT REFERENCES services(id),
  channel TEXT NOT NULL,
  contact TEXT NOT NULL,
  question TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  internal_notes TEXT,
  calculation_id TEXT REFERENCES calculations(id),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

CREATE TABLE IF NOT EXISTS lead_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  payload TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_lead ON notifications(lead_id);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  publisher TEXT,
  accessed_at TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  positive TEXT NOT NULL DEFAULT '[]',
  shadow TEXT NOT NULL DEFAULT '[]',
  recommendations TEXT NOT NULL DEFAULT '[]',
  details TEXT NOT NULL DEFAULT '{}',
  methodology TEXT NOT NULL,
  source_id TEXT REFERENCES knowledge_sources(id),
  verified_at TEXT NOT NULL,
  version TEXT NOT NULL,
  UNIQUE(domain, key, methodology)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  meta TEXT,
  ip TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);
`;

export type Db = DatabaseSync;

declare global {
  // eslint-disable-next-line no-var
  var __astraDb: DatabaseSync | undefined;
}

function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured === ":memory:") return ":memory:";
  const target = configured && configured.length > 0 ? configured : "./data/app.db";
  const resolved = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

/**
 * Встроенный SQLite `lower()` не понимает кириллицу без ICU, поэтому
 * регистрируем собственную функцию — поиск по заявкам должен работать
 * без учёта регистра в русских именах и названиях.
 */
function registerFunctions(db: DatabaseSync): void {
  db.function("ru_lower", { deterministic: true }, (value: unknown) =>
    typeof value === "string" ? value.toLocaleLowerCase("ru-RU") : value === null || value === undefined ? "" : String(value).toLocaleLowerCase("ru-RU")
  );
}

function createDb(): DatabaseSync {
  const file = resolveDbPath();
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  registerFunctions(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__astraDb) {
    globalThis.__astraDb = createDb();
  }
  return globalThis.__astraDb;
}

/** Отдельное подключение — используется скриптами миграции/сидирования и тестами. */
export function createStandaloneDb(file = resolveDbPath()): DatabaseSync {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  registerFunctions(db);
  return db;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix = ""): string {
  const raw = crypto.randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${raw.slice(0, 24)}` : raw;
}

export type Row = Record<string, unknown>;

export function all<T = Row>(db: Db, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(...(params as never[])) as T[];
}

export function get<T = Row>(db: Db, sql: string, params: unknown[] = []): T | undefined {
  const stmt = db.prepare(sql);
  return stmt.get(...(params as never[])) as T | undefined;
}

export function run(db: Db, sql: string, params: unknown[] = []): void {
  const stmt = db.prepare(sql);
  stmt.run(...(params as never[]));
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
