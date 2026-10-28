/**
 * Наполняет базу начальными данными: услуги, источники базы знаний,
 * записи расшифровок. Скрипт идемпотентен — можно запускать повторно.
 * Запуск: npm run db:seed
 */
import { createStandaloneDb } from "../src/lib/db.ts";
import { seedKnowledge } from "../src/lib/knowledge/seed.ts";
import { seedServices } from "../src/lib/repositories/services.ts";

const file = process.env.DATABASE_PATH || "./data/app.db";
const db = createStandaloneDb(file);

const seeded = seedServices(db);
console.log(`· услуг: ${seeded}`);

const knowledge = seedKnowledge(db);
console.log(`· источников: ${knowledge.sources}`);
console.log(`· записей базы знаний: ${knowledge.entries}`);

db.close();
console.log("Готово.");
