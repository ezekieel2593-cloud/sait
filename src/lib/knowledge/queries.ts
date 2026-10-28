import { getDb, all, parseJson } from "../db";
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
