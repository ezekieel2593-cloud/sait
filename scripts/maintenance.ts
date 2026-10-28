/**
 * Плановое обслуживание базы.
 *
 *   npm run maintenance
 *
 * 1. Обезличивает заявки старше срока хранения из настроек (legal.dataRetentionDays).
 * 2. Удаляет старые записи ограничителя частоты.
 * 3. Удаляет истёкшие сессии специалиста и просроченные токены сброса пароля.
 *
 * Запускайте по cron раз в сутки, см. docs/DEPLOYMENT.md.
 */
import { createStandaloneDb, nowIso } from "../src/lib/db.ts";
import { getSettings } from "../src/lib/settings.ts";
import { anonymizeExpiredLeads } from "../src/lib/repositories/leads.ts";
import { cleanupRateLimits } from "../src/lib/rate-limit.ts";

const file = process.env.DATABASE_PATH || "./data/app.db";
const db = createStandaloneDb(file);

const settings = getSettings();
const retention = settings.legal.dataRetentionDays;

const anonymized = anonymizeExpiredLeads(retention, "maintenance");
cleanupRateLimits();

const sessions = db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(nowIso());
const resets = db.prepare("DELETE FROM password_resets WHERE expires_at < ? OR used_at IS NOT NULL").run(nowIso());

console.log(`Срок хранения: ${retention} дн.`);
console.log(`Обезличено заявок: ${anonymized}`);
console.log(`Удалено сессий: ${Number(sessions.changes)}`);
console.log(`Удалено токенов сброса: ${Number(resets.changes)}`);
db.close();
