#!/usr/bin/env node
/**
 * Плановое обслуживание базы в готовой сборке (чистый Node, без tsx).
 *
 *   node tools/maintenance.mjs
 *
 * 1. Обезличивает заявки старше срока хранения из настроек (legal.dataRetentionDays).
 * 2. Удаляет старые записи ограничителя частоты.
 * 3. Удаляет истёкшие сессии и использованные/просроченные токены сброса пароля.
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { randomUUID } from "node:crypto";

const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");
const db = new DatabaseSync(file);
db.exec("PRAGMA foreign_keys = ON");

const now = new Date().toISOString();
const hasTable = (name) =>
  Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));

if (!hasTable("leads")) {
  console.error(`В ${file} нет схемы. Запустите: node tools/init-db.mjs`);
  process.exit(1);
}

let retention = 365;
try {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'legal'").get();
  if (row?.value) {
    const parsed = JSON.parse(row.value);
    if (Number.isFinite(parsed?.dataRetentionDays)) retention = parsed.dataRetentionDays;
  }
} catch {
  // настройки недоступны — используем срок по умолчанию
}

const cutoff = new Date(Date.now() - retention * 24 * 3_600_000).toISOString();
const expired = db
  .prepare(
    "SELECT id FROM leads WHERE created_at < ? AND (contact <> '' OR question IS NOT NULL OR calculation_id IS NOT NULL)"
  )
  .all(cutoff);

const anonymize = db.prepare(
  "UPDATE leads SET name = 'Удалено по сроку хранения', contact = '', question = NULL, internal_notes = NULL, calculation_id = NULL, updated_at = ? WHERE id = ?"
);
const addEvent = db.prepare(
  "INSERT INTO lead_events (id, lead_id, type, actor, message, from_status, to_status, created_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)"
);

for (const lead of expired) {
  anonymize.run(now, lead.id);
  addEvent.run(
    `evt_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
    lead.id,
    "anonymized",
    "maintenance",
    `Срок хранения (${retention} дн.) истёк — персональные данные обезличены`,
    now
  );
}

const rate = db.prepare("DELETE FROM rate_limits WHERE window_start < ?").run(Date.now() - 24 * 3_600_000);
const sessions = db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
const resets = db.prepare("DELETE FROM password_resets WHERE expires_at < ? OR used_at IS NOT NULL").run(now);

console.log(`Срок хранения: ${retention} дн.`);
console.log(`Обезличено заявок: ${expired.length}`);
console.log(`Удалено записей лимитов: ${Number(rate.changes)}`);
console.log(`Удалено сессий: ${Number(sessions.changes)}`);
console.log(`Удалено токенов сброса: ${Number(resets.changes)}`);
db.close();
