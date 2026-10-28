import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

// Изолированная база для тестов: не трогаем рабочий ./data/app.db.
process.env.DATABASE_PATH = path.join(tmpdir(), `astra-test-${randomUUID()}.db`);
process.env.AUTH_SECRET = "test-secret";
if (!process.env.NODE_ENV) {
  (process.env as Record<string, string>).NODE_ENV = "test";
}
