#!/usr/bin/env node
/**
 * Создание/обновление схемы базы данных и первичное наполнение
 * (услуги, реестр источников, записи базы знаний).
 *
 *   node tools/init-db.mjs
 *
 * Безопасно запускать повторно: схема создаётся через IF NOT EXISTS,
 * наполнение использует UPSERT.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA, SEED } from "./schema.mjs";

const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");
fs.mkdirSync(path.dirname(file), { recursive: true });

const db = new DatabaseSync(file);
db.exec(SCHEMA);
db.exec(SEED);

const counts = {
  таблиц: db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").get().n,
  услуг: db.prepare("SELECT COUNT(*) AS n FROM services").get().n,
  источников: db.prepare("SELECT COUNT(*) AS n FROM knowledge_sources").get().n,
  записей: db.prepare("SELECT COUNT(*) AS n FROM knowledge_entries").get().n,
  аккаунтов: db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
};

console.log(`База: ${file}`);
for (const [key, value] of Object.entries(counts)) console.log(`  ${key}: ${value}`);
if (counts.аккаунтов === 0) {
  console.log("\nАккаунт специалиста ещё не создан:");
  console.log('  node tools/create-specialist.mjs --email owner@example.com --name "Имя" --password \'длинный-пароль\'');
}
db.close();
