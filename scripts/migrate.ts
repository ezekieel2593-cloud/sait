/**
 * Применяет схему базы данных (идемпотентно).
 * Запуск: npm run db:migrate
 */
import { createStandaloneDb } from "../src/lib/db.ts";

const file = process.env.DATABASE_PATH || "./data/app.db";
const db = createStandaloneDb(file);
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as { name: string }[];

console.log(`Схема применена: ${file}`);
console.log(`Таблиц: ${tables.length}`);
console.log(tables.map((t) => `  · ${t.name}`).join("\n"));
db.close();
