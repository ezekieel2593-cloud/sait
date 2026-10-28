/**
 * База знаний для статической версии: только встроенный набор записей
 * (без правок из кабинета — кабинет существует лишь серверной версии).
 */
import type { EntryDetails, KnowledgeEntryInput } from "@/lib/knowledge/astrology";
import { ALL_ENTRIES } from "@/lib/knowledge/seed";
import { KNOWLEDGE_SOURCES, type KnowledgeSource } from "@/lib/knowledge/sources";

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

const STATIC_ENTRIES = ALL_ENTRIES.map(fromStatic);
const BY_DOMAIN_KEY = new Map(STATIC_ENTRIES.map((entry) => [`${entry.domain}:${entry.key}`, entry]));

export function getEntry(domain: string, key: string): KnowledgeEntry | undefined {
  return BY_DOMAIN_KEY.get(`${domain}:${key}`);
}

export function loadEntries(domain?: string): KnowledgeEntry[] {
  return domain ? STATIC_ENTRIES.filter((entry) => entry.domain === domain) : STATIC_ENTRIES;
}

export function loadSources(): KnowledgeSource[] {
  return KNOWLEDGE_SOURCES;
}

const SIGN_KEYS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
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
  const byDomain = STATIC_ENTRIES.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.domain] = (acc[entry.domain] ?? 0) + 1;
    return acc;
  }, {});
  return { entries: STATIC_ENTRIES.length, sources: KNOWLEDGE_SOURCES.length, byDomain };
}
