/**
 * Создание и обслуживание аккаунта специалиста.
 *
 * Примеры:
 *   npm run create-specialist -- --email astrolog@example.com --name "Мария" --password 'длинный-пароль'
 *   SPECIALIST_PASSWORD='...' npm run create-specialist -- --email a@b.c --name "Мария"
 *   npm run create-specialist -- --email a@b.c --reset-password        # сгенерировать новый пароль
 *   npm run create-specialist -- --list
 *
 * Пароль никогда не хранится в открытом виде: в базе только scrypt-хеш.
 */
import { randomBytes } from "node:crypto";
import { createStandaloneDb, newId, nowIso } from "../src/lib/db.ts";
import { hashPassword } from "../src/lib/auth.ts";

const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const has = (name: string) => args.includes(`--${name}`);

const file = process.env.DATABASE_PATH || "./data/app.db";
const db = createStandaloneDb(file);

if (has("list")) {
  const users = db.prepare("SELECT id, email, name, role, is_active, last_login_at, created_at FROM users ORDER BY created_at").all();
  console.table(users);
  db.close();
  process.exit(0);
}

const email = getArg("email")?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error("Укажите корректный email: --email specialist@example.com");
  process.exit(1);
}

const name = getArg("name")?.trim() || "Специалист";
const reset = has("reset-password");
let password = getArg("password") || process.env.SPECIALIST_PASSWORD || "";
let generated = false;

if (!password) {
  password = randomBytes(15).toString("base64url");
  generated = true;
}

const existing = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email) as { id: string } | undefined;

if (existing) {
  if (!reset && !getArg("password") && !process.env.SPECIALIST_PASSWORD) {
    console.error("Пользователь уже существует. Чтобы задать новый пароль: --reset-password");
    db.close();
    process.exit(1);
  }
  db.prepare("UPDATE users SET password_hash = ?, name = ?, is_active = 1, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?").run(
    hashPassword(password),
    name,
    nowIso(),
    existing.id
  );
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
  console.log(`Пароль обновлён для ${email}.`);
} else {
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, is_active, failed_attempts, locked_until, created_at, updated_at) VALUES (?, ?, ?, ?, 'owner', 1, 0, NULL, ?, ?)"
  ).run(newId("usr"), email, name, hashPassword(password), nowIso(), nowIso());
  console.log(`Аккаунт создан: ${email}`);
}

if (generated) {
  console.log("");
  console.log("Сгенерированный пароль (сохраните его в менеджере паролей):");
  console.log(`  ${password}`);
  console.log("");
  console.log("Сменить пароль можно в кабинете: /specialist/settings");
}
db.close();
