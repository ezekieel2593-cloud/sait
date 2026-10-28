#!/usr/bin/env node
/**
 * Создание аккаунта специалиста в готовой сборке (без TypeScript и tsx).
 *
 *   node tools/create-specialist.mjs --email owner@example.com --name "Имя" --password 'длинный-пароль'
 *   node tools/create-specialist.mjs --email owner@example.com --reset-password
 *   node tools/create-specialist.mjs --list
 *
 * Пароль хранится только как scrypt-хеш.
 */
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import path from "node:path";

const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");
const args = process.argv.slice(2);
const arg = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

const db = new DatabaseSync(file);
db.exec("PRAGMA foreign_keys = ON");

const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
if (!table) {
  console.error(`В файле ${file} нет схемы. Запустите сначала: node tools/init-db.mjs`);
  process.exit(1);
}

const now = new Date().toISOString();

if (has("list")) {
  const users = db.prepare("SELECT id, email, name, role, is_active, last_login_at, created_at FROM users ORDER BY created_at").all();
  console.table(users);
  db.close();
  process.exit(0);
}

const email = (arg("email") || "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error("Укажите корректный email: --email specialist@example.com");
  process.exit(1);
}

const hashPassword = (password) => {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
};

const existing = db.prepare("SELECT id, email FROM users WHERE lower(email) = lower(?)").get(email);
const password = arg("password") || process.env.SPECIALIST_PASSWORD;
const reset = has("reset-password");

if (existing && !reset) {
  console.error(`Аккаунт ${email} уже существует. Для смены пароля: --reset-password`);
  process.exit(1);
}

if (!reset && (!password || password.length < 10)) {
  console.error("Пароль должен быть не короче 10 символов: --password '…' или SPECIALIST_PASSWORD");
  process.exit(1);
}

if (existing) {
  const generated = password && password.length >= 10 ? password : randomBytes(12).toString("base64url");
  db.prepare("UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?").run(
    hashPassword(generated),
    now,
    existing.id
  );
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
  console.log(`Пароль обновлён для ${email}`);
  if (!password) console.log(`Новый пароль: ${generated}`);
} else {
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, is_active, failed_attempts, locked_until, last_login_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'specialist', 1, 0, NULL, NULL, ?, ?)"
  ).run(`user_${randomUUID().replace(/-/g, "").slice(0, 24)}`, email, (arg("name") || "Специалист").trim(), hashPassword(password), now, now);
  console.log(`Аккаунт создан: ${email}`);
}

db.close();
