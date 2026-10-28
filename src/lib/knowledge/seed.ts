import type { DatabaseSync } from "node:sqlite";
import { KNOWLEDGE_SOURCES } from "./sources";
import { ASTROLOGY_ENTRIES, type KnowledgeEntryInput } from "./astrology";
import { MATRIX_ENTRIES } from "./matrix";
import { nowIso } from "../db";

/**
 * Наполнение базы знаний. Скрипт идемпотентен: записи обновляются по ключу
 * (domain + key + methodology), источники — по id.
 */

export const ALL_ENTRIES: KnowledgeEntryInput[] = [...ASTROLOGY_ENTRIES, ...MATRIX_ENTRIES];

export function seedKnowledge(db: DatabaseSync): { sources: number; entries: number } {
  const now = nowIso();

  for (const source of KNOWLEDGE_SOURCES) {
    db.prepare(
      `INSERT INTO knowledge_sources (id, title, url, publisher, accessed_at, note)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, url = excluded.url,
         publisher = excluded.publisher, accessed_at = excluded.accessed_at, note = excluded.note`
    ).run(source.id, source.title, source.url, source.publisher, source.accessedAt, source.note);
  }

  for (const entry of ALL_ENTRIES) {
    const id = `${entry.domain}:${entry.key}:${entry.methodology}`;
    db.prepare(
      `INSERT INTO knowledge_entries
        (id, domain, key, title, summary, positive, shadow, recommendations, details, methodology, source_id, verified_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(domain, key, methodology) DO UPDATE SET
         title = excluded.title, summary = excluded.summary, positive = excluded.positive,
         shadow = excluded.shadow, recommendations = excluded.recommendations,
         details = excluded.details, source_id = excluded.source_id,
         verified_at = excluded.verified_at, version = excluded.version`
    ).run(
      id,
      entry.domain,
      entry.key,
      entry.title,
      entry.summary,
      JSON.stringify(entry.positive),
      JSON.stringify(entry.shadow),
      JSON.stringify(entry.recommendations),
      JSON.stringify(entry.details),
      entry.methodology,
      entry.sourceId,
      now,
      entry.version
    );
  }

  return { sources: KNOWLEDGE_SOURCES.length, entries: ALL_ENTRIES.length };
}
