import { getDb, get, all, run, newId, nowIso } from "../db";
import type { ContactChannel, Direction, Lead, LeadEvent, LeadStatus } from "../types";

interface LeadRow {
  id: string;
  public_ref: string;
  name: string;
  direction: Direction;
  service_id: string | null;
  service_title: string | null;
  channel: ContactChannel;
  contact: string;
  question: string | null;
  consent: number;
  status: LeadStatus;
  internal_notes: string | null;
  calculation_id: string | null;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  lead_id: string;
  type: string;
  from_status: LeadStatus | null;
  to_status: LeadStatus | null;
  actor: string;
  message: string | null;
  created_at: string;
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    publicRef: row.public_ref,
    name: row.name,
    direction: row.direction,
    serviceId: row.service_id,
    serviceTitle: row.service_title,
    channel: row.channel,
    contact: row.contact,
    question: row.question,
    consent: Boolean(row.consent),
    status: row.status,
    internalNotes: row.internal_notes,
    calculationId: row.calculation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: EventRow): LeadEvent {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actor: row.actor,
    message: row.message,
    createdAt: row.created_at,
  };
}

const LEAD_SELECT = `SELECT l.*, s.title AS service_title FROM leads l LEFT JOIN services s ON s.id = l.service_id`;

function nextPublicRef(): string {
  const db = getDb();
  const year = new Date().getFullYear();
  const row = get<{ count: number }>(db, "SELECT COUNT(*) AS count FROM leads WHERE public_ref LIKE ?", [`AP-${year}-%`]);
  const next = (row?.count ?? 0) + 1;
  return `AP-${year}-${String(next).padStart(3, "0")}`;
}

export interface CreateLeadInput {
  name: string;
  direction: Direction;
  serviceId?: string | null;
  channel: ContactChannel;
  contact: string;
  question?: string | null;
  consent: boolean;
  calculationId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
}

export function createLead(input: CreateLeadInput): Lead {
  const db = getDb();
  const id = newId("lead");
  const now = nowIso();
  const ref = nextPublicRef();

  run(
    db,
    `INSERT INTO leads (id, public_ref, name, direction, service_id, channel, contact, question, consent,
      status, internal_notes, calculation_id, ip_hash, user_agent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, ?, ?, ?, ?)`,
    [
      id,
      ref,
      input.name.trim(),
      input.direction,
      input.serviceId ?? null,
      input.channel,
      input.contact.trim(),
      input.question?.trim() || null,
      input.consent ? 1 : 0,
      input.calculationId ?? null,
      input.ipHash ?? null,
      input.userAgent ?? null,
      now,
      now,
    ]
  );

  addEvent({ leadId: id, type: "created", actor: "client", message: "Заявка создана на сайте" });
  return getLead(id)!;
}

export function getLead(id: string): Lead | null {
  const db = getDb();
  const row = get<LeadRow>(db, `${LEAD_SELECT} WHERE l.id = ?`, [id]);
  return row ? mapLead(row) : null;
}

export function getLeadByRef(ref: string): Lead | null {
  const db = getDb();
  const row = get<LeadRow>(db, `${LEAD_SELECT} WHERE l.public_ref = ?`, [ref]);
  return row ? mapLead(row) : null;
}

export interface LeadFilters {
  status?: LeadStatus | "all";
  direction?: Direction | "all";
  search?: string;
  limit?: number;
  offset?: number;
  sort?: "new" | "old";
}

export function listLeads(filters: LeadFilters = {}): { items: Lead[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.status && filters.status !== "all") {
    conditions.push("l.status = ?");
    params.push(filters.status);
  }
  if (filters.direction && filters.direction !== "all") {
    conditions.push("l.direction = ?");
    params.push(filters.direction);
  }
  if (filters.search && filters.search.trim().length > 0) {
    conditions.push("(ru_lower(l.name) LIKE ? OR ru_lower(l.contact) LIKE ? OR ru_lower(l.public_ref) LIKE ?)");
    const needle = `%${filters.search.trim().toLocaleLowerCase("ru-RU")}%`;
    params.push(needle, needle, needle);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const order = filters.sort === "old" ? "ASC" : "DESC";
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);

  const totalRow = get<{ count: number }>(db, `SELECT COUNT(*) AS count FROM leads l ${where}`, params);
  const rows = all<LeadRow>(db, `${LEAD_SELECT} ${where} ORDER BY l.created_at ${order} LIMIT ? OFFSET ?`, [
    ...params,
    limit,
    offset,
  ]);

  return { items: rows.map(mapLead), total: totalRow?.count ?? 0 };
}

export interface LeadCounters {
  new: number;
  in_progress: number;
  awaiting_client: number;
  done: number;
  total: number;
}

export function leadCounters(): LeadCounters {
  const db = getDb();
  const rows = all<{ status: string; count: number }>(db, "SELECT status, COUNT(*) AS count FROM leads GROUP BY status");
  const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});
  return {
    new: byStatus.new ?? 0,
    in_progress: byStatus.in_progress ?? 0,
    awaiting_client: byStatus.awaiting_client ?? 0,
    done: byStatus.done ?? 0,
    total: rows.reduce((sum, row) => sum + row.count, 0),
  };
}

export function updateLeadStatus(id: string, status: LeadStatus, actor: string, message?: string): Lead | null {
  const db = getDb();
  const current = getLead(id);
  if (!current) return null;
  if (current.status === status) return current;

  run(db, "UPDATE leads SET status = ?, updated_at = ? WHERE id = ?", [status, nowIso(), id]);
  addEvent({
    leadId: id,
    type: "status_changed",
    fromStatus: current.status,
    toStatus: status,
    actor,
    message: message ?? null,
  });
  return getLead(id);
}

export function updateLeadNotes(id: string, notes: string, actor: string): Lead | null {
  const db = getDb();
  const current = getLead(id);
  if (!current) return null;
  run(db, "UPDATE leads SET internal_notes = ?, updated_at = ? WHERE id = ?", [notes, nowIso(), id]);
  addEvent({
    leadId: id,
    type: "note_updated",
    actor,
    message: notes.length > 0 ? "Внутренняя заметка обновлена" : "Заметка очищена",
  });
  return getLead(id);
}

export interface AddEventInput {
  leadId: string;
  type: string;
  actor: string;
  fromStatus?: LeadStatus | null;
  toStatus?: LeadStatus | null;
  message?: string | null;
}

export function addEvent(input: AddEventInput): void {
  const db = getDb();
  run(
    db,
    "INSERT INTO lead_events (id, lead_id, type, from_status, to_status, actor, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      newId("evt"),
      input.leadId,
      input.type,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      input.actor,
      input.message ?? null,
      nowIso(),
    ]
  );
}

export function listLeadEvents(leadId: string): LeadEvent[] {
  const db = getDb();
  const rows = all<EventRow>(db, "SELECT * FROM lead_events WHERE lead_id = ? ORDER BY created_at DESC", [leadId]);
  return rows.map(mapEvent);
}

export function recentLeads(limit = 6): Lead[] {
  return listLeads({ limit }).items;
}

export function countRecentLeadsByIp(ipHash: string, windowMs: number): number {
  const db = getDb();
  const since = new Date(Date.now() - windowMs).toISOString();
  const row = get<{ count: number }>(db, "SELECT COUNT(*) AS count FROM leads WHERE ip_hash = ? AND created_at > ?", [
    ipHash,
    since,
  ]);
  return row?.count ?? 0;
}

/** Удаление персональных данных заявки по запросу клиента. */
export function anonymizeLead(id: string, actor: string): void {
  const db = getDb();
  run(
    db,
    "UPDATE leads SET name = 'Удалено по запросу', contact = '', question = NULL, internal_notes = NULL, calculation_id = NULL, updated_at = ? WHERE id = ?",
    [nowIso(), id]
  );
  addEvent({ leadId: id, type: "anonymized", actor, message: "Персональные данные удалены по запросу клиента" });
}

/**
 * Плановая чистка: обезличивает заявки старше срока хранения из настроек.
 * Возвращает количество обезличенных заявок. Запускается скриптом обслуживания
 * (npm run maintenance) по расписанию, см. docs/DEPLOYMENT.md.
 */
export function anonymizeExpiredLeads(olderThanDays: number, actor = "maintenance"): number {
  const db = getDb();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 3_600_000).toISOString();
  const rows = all<{ id: string }>(
    db,
    "SELECT id FROM leads WHERE created_at < ? AND (contact <> '' OR question IS NOT NULL OR calculation_id IS NOT NULL)",
    [cutoff]
  );
  for (const row of rows) {
    anonymizeLead(row.id, actor);
  }
  return rows.length;
}
