import { getDb, all, run, parseJson } from "../db";
import type { EntryDetails, KnowledgeEntryInput } from "./astrology";
import { ALL_ENTRIES } from "./seed";
import { KNOWLEDGE_SOURCES, type KnowledgeSource } from "./sources";

/**
 * Доступ к базе знаний.
 * Читаем из базы (чтобы тексты можно было править в кабинете), а если запись
 * отсутствует — используем исходный набор из кода. Это защищает интерфейс
 * от пустых мест при первом запуске без сидирования.
 */

export interface KnowledgeEntry {
  id: string;
  domain: string;
  key: string;
  title: string;
  summary: string;
  positive: string[];
  shadow: string[];
  recommendations: string[];
  details: EntryDetails;
  methodology: string;
  sourceId: string | null;
  verifiedAt: string;
  version: string;
  source?: KnowledgeSource;
}

interface Row {
  id: string;
  domain: string;
  key: string;
  title: string;
  summary: string;
  positive: string;
  shadow: string;
  recommendations: string;
  details: string;
  methodology: string;
  source_id: string | null;
  verified_at: string;
  version: string;
}

function fromRow(row: Row): KnowledgeEntry {
  return {
    id: row.id,
    domain: row.domain,
    key: row.key,
    title: row.title,
    summary: row.summary,
    positive: parseJson<string[]>(row.positive, []),
    shadow: parseJson<string[]>(row.shadow, []),
    recommendations: parseJson<string[]>(row.recommendations, []),
    details: parseJson<EntryDetails>(row.details, {}),
    methodology: row.methodology,
    sourceId: row.source_id,
    verifiedAt: row.verified_at,
    version: row.version,
    source: KNOWLEDGE_SOURCES.find((source) => source.id === row.source_id),
  };
}

function fromStatic(entry: KnowledgeEntryInput): KnowledgeEntry {
  return {
    id: `${entry.domain}:${entry.key}:${entry.methodology}`,
    domain: entry.domain,
    key: entry.key,
    title: entry.title,
    summary: entry.summary,
    positive: entry.positive,
    shadow: entry.shadow,
    recommendations: entry.recommendations,
    details: entry.details,
    methodology: entry.methodology,
    sourceId: entry.sourceId,
    verifiedAt: "",
    version: entry.version,
    source: KNOWLEDGE_SOURCES.find((source) => source.id === entry.sourceId),
  };
}

export function loadEntries(domain?: string): KnowledgeEntry[] {
  try {
    const db = getDb();
    const rows = domain
      ? all<Row>(db, "SELECT * FROM knowledge_entries WHERE domain = ? ORDER BY domain, key", [domain])
      : all<Row>(db, "SELECT * FROM knowledge_entries ORDER BY domain, key");
    if (rows.length > 0) return rows.map(fromRow);
  } catch {
    // база недоступна — работаем со статическим набором
  }
  return ALL_ENTRIES.filter((entry) => !domain || entry.domain === domain).map(fromStatic);
}

export function loadSources(): KnowledgeSource[] {
  try {
    const db = getDb();
    const rows = all<{
      id: string;
      title: string;
      url: string | null;
      publisher: string;
      accessed_at: string;
      note: string;
    }>(db, "SELECT * FROM knowledge_sources ORDER BY id");
    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        publisher: row.publisher,
        accessedAt: row.accessed_at,
        note: row.note ?? "",
      }));
    }
  } catch {
    // игнорируем
  }
  return KNOWLEDGE_SOURCES;
}

const cache = new Map<string, KnowledgeEntry | undefined>();

export function getEntry(domain: string, key: string): KnowledgeEntry | undefined {
  const cacheKey = `${domain}:${key}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const db = getDb();
  let result: KnowledgeEntry | undefined;
  try {
    const row = db
      .prepare("SELECT * FROM knowledge_entries WHERE domain = ? AND key = ? ORDER BY verified_at DESC LIMIT 1")
      .get(domain, key) as Row | undefined;
    if (row) result = fromRow(row);
  } catch {
    result = undefined;
  }

  if (!result) {
    const fallback = ALL_ENTRIES.find((entry) => entry.domain === domain && entry.key === key);
    if (fallback) result = fromStatic(fallback);
  }

  cache.set(cacheKey, result);
  return result;
}

const SIGN_KEYS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export function signKeyByIndex(index: number): string {
  return SIGN_KEYS[((index % 12) + 12) % 12]!;
}

export function getSignEntry(index: number): KnowledgeEntry | undefined {
  return getEntry("sign", signKeyByIndex(index));
}

export function getArcanumEntry(arcanum: number): KnowledgeEntry | undefined {
  return getEntry("arcana", String(arcanum));
}

export function getPositionEntry(key: string): KnowledgeEntry | undefined {
  return getEntry("position", key);
}

export function knowledgeStats(): { entries: number; sources: number; byDomain: Record<string, number> } {
  const entries = loadEntries();
  const byDomain = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.domain] = (acc[entry.domain] ?? 0) + 1;
    return acc;
  }, {});
  return { entries: entries.length, sources: loadSources().length, byDomain };
}

/** Сброс кэша после правки записей в кабинете. */
export function clearKnowledgeCache(): void {
  cache.clear();
}

/** Гарантирует, что внешний ключ источника существует (важно при пустой базе). */
function ensureSourceRow(sourceId: string | null): string | null {
  if (!sourceId) return null;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM knowledge_sources WHERE id = ?").get(sourceId) as { id: string } | undefined;
  if (existing) return sourceId;
  const source = KNOWLEDGE_SOURCES.find((item) => item.id === sourceId);
  if (!source) return null;
  run(
    db,
    "INSERT INTO knowledge_sources (id, title, url, publisher, accessed_at, note) VALUES (?, ?, ?, ?, ?, ?)",
    [source.id, source.title, source.url, source.publisher, source.accessedAt, source.note]
  );
  return source.id;
}

export interface KnowledgePatch {
  summary?: string;
  positive?: string[];
  shadow?: string[];
  recommendations?: string[];
  methodology?: string;
  sourceId?: string | null;
  version?: string;
}

/**
 * Правка записи базы знаний из кабинета. Если запись существует только в коде
 * (без сидирования), она создаётся в базе — так изменения сохраняются.
 */
export function updateKnowledgeEntry(id: string, patch: KnowledgePatch): KnowledgeEntry | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM knowledge_entries WHERE id = ?").get(id) as Row | undefined;

  if (existing) {
    run(
      db,
      `UPDATE knowledge_entries SET summary = ?, positive = ?, shadow = ?, recommendations = ?,
        methodology = ?, source_id = ?, version = ?, verified_at = ? WHERE id = ?`,
      [
        patch.summary ?? existing.summary,
        JSON.stringify(patch.positive ?? parseJson<string[]>(existing.positive, [])),
        JSON.stringify(patch.shadow ?? parseJson<string[]>(existing.shadow, [])),
        JSON.stringify(patch.recommendations ?? parseJson<string[]>(existing.recommendations, [])),
        patch.methodology ?? existing.methodology,
        patch.sourceId === undefined ? existing.source_id : ensureSourceRow(patch.sourceId),
        patch.version ?? existing.version,
        new Date().toISOString().slice(0, 10),
        id,
      ]
    );
    clearKnowledgeCache();
    return loadEntries().find((entry) => entry.id === id) ?? null;
  }

  const fallback = ALL_ENTRIES.map((entry) => ({ entry, id: `${entry.domain}:${entry.key}:${entry.methodology}` })).find(
    (item) => item.id === id
  );
  if (!fallback) return null;

  const entry = fallback.entry;
  run(
    db,
    `INSERT INTO knowledge_entries (id, domain, key, title, summary, positive, shadow, recommendations, details,
      methodology, source_id, verified_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.domain,
      entry.key,
      entry.title,
      patch.summary ?? entry.summary,
      JSON.stringify(patch.positive ?? entry.positive),
      JSON.stringify(patch.shadow ?? entry.shadow),
      JSON.stringify(patch.recommendations ?? entry.recommendations),
      JSON.stringify(entry.details),
      patch.methodology ?? entry.methodology,
      patch.sourceId === undefined ? ensureSourceRow(entry.sourceId) : ensureSourceRow(patch.sourceId),
      new Date().toISOString().slice(0, 10),
      patch.version ?? entry.version,
    ]
  );
  clearKnowledgeCache();
  return loadEntries().find((item) => item.id === id) ?? null;
}
