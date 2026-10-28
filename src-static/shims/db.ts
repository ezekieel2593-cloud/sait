/**
 * Заглушка слоя БД для статической (FTP) версии: браузер не умеет node:sqlite.
 * Нужна только чтобы модули базы знаний собирались в один JS-бандл.
 */
export type Db = never;

export function getDb(): never {
  throw new Error("База данных недоступна в статической версии");
}

export function createStandaloneDb(): never {
  throw new Error("База данных недоступна в статической версии");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix = ""): string {
  const raw = Math.random().toString(16).slice(2) + Date.now().toString(16);
  return prefix ? `${prefix}_${raw.slice(0, 24)}` : raw;
}

export function all<T>(): T[] {
  return [];
}

export function get<T>(): T | undefined {
  return undefined;
}

export function run(): void {
  /* нет базы — нечего выполнять */
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
