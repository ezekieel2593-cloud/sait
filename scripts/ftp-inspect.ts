/**
 * Диагностика FTP: показывает, куда реально попадает загрузка.
 *
 * Запускается workflow-ом, когда проверка публикации на домене не прошла.
 * Печатает каталог FTP-входа, содержимое каталога сайта (FTP_DIR) и его
 * родителя — по этому списку сразу видно, какой путь вписать в секрет
 * FTP_DIR, чтобы файлы оказались в корне документов домена.
 *
 * Ничего не изменяет: только читает списки каталогов.
 */
import { Client } from "basic-ftp";

const log = (message: string) => console.log(`· ${message}`);

const env = (...names: string[]): string => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
};

const host = env("FTP_HOST", "FTP_SERVER");
const user = env("FTP_USER", "FTP_USERNAME", "FTP_LOGIN");
const password = process.env.FTP_PASSWORD ?? process.env.FTP_PASS ?? "";
const secure = ["1", "true", "yes", "on"].includes(
  (process.env.FTP_SECURE ?? "").trim().toLowerCase(),
);
const port = Number(env("FTP_PORT") || 21);
const siteDir = (env("FTP_DIR", "FTP_DIRECTORY", "FTP_REMOTE") || "public_html")
  .replace(/\/+$/g, "");

if (!host || !user || !password) {
  throw new Error(
    "не заданы FTP_HOST / FTP_USER / FTP_PASSWORD — диагностика берёт те же секреты, что и деплой",
  );
}

const client = new Client(30_000);
await client.access({ host, user, password, port, secure: secure ? "implicit" : false });

const base = await client.pwd();
log(`подключение к ${host}:${port}${secure ? " (FTPS)" : ""}`);
log(`каталог FTP-входа: ${base}`);

/** Печатает содержимое каталога, не падая на недоступных папках. */
const show = async (dir: string, label: string) => {
  try {
    const entries = await client.list(dir);
    log(`${label} «${dir}»: ${entries.length} записей`);
    for (const entry of entries.slice(0, 40)) {
      const mark = entry.isDirectory ? "d" : "-";
      const size = entry.isDirectory ? "" : ` (${entry.size} Б)`;
      console.log(`    ${mark} ${entry.name}${size}`);
    }
    if (entries.length > 40) console.log(`    … и ещё ${entries.length - 40}`);
  } catch {
    log(`${label} «${dir}»: недоступен`);
  }
};

await show(siteDir, "каталог сайта по секрету FTP_DIR");

// Родитель каталога сайта: рядом обычно лежит настоящий корень домена.
const cut = siteDir.lastIndexOf("/");
const parent = cut > 0 ? siteDir.slice(0, cut) : base;
if (parent !== siteDir && parent !== base) {
  await show(parent, "родительский каталог");
}
if (base !== siteDir && base !== parent) {
  await show(base, "домашний каталог FTP");
}

log(
  "сравните список с корнем документов домена в панели (раздел «Сайты») и впишите этот путь в секрет FTP_DIR",
);
client.close();
