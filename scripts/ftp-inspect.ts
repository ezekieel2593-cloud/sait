/**
 * Диагностика FTP: показывает, куда реально попадает загрузка.
 *
 * Запускается workflow-ом, когда проверка публикации на домене не прошла.
 * Печатает каталог FTP-входа, содержимое каталога сайта (FTP_DIR), его
 * родителя и типовые корни документов — по этому списку видно, какой путь
 * вписать в секрет FTP_DIR. Ничего не изменяет: только читает списки.
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
log(`каталог FTP-входа (pwd): ${base}`);

/** Печатает содержимое каталога, не падая на недоступных папках. */
const show = async (dir: string, label: string): Promise<boolean> => {
  try {
    const entries = await client.list(dir);
    log(`${label} «${dir}»: ${entries.length} записей`);
    for (const entry of entries.slice(0, 30)) {
      const mark = entry.isDirectory ? "d" : "-";
      const size = entry.isDirectory ? "" : ` (${entry.size} Б)`;
      console.log(`    ${mark} ${entry.name}${size}`);
    }
    if (entries.length > 30) console.log(`    … и ещё ${entries.length - 30}`);
    const hasIndex = entries.some((e) => e.name.toLowerCase() === "index.html");
    if (hasIndex) log(`${label}: найден index.html — похоже, это и есть корень домена`);
    return true;
  } catch {
    log(`${label} «${dir}»: недоступен`);
    return false;
  }
};

await show(siteDir, "каталог сайта по секрету FTP_DIR");

/* Chroot-проверка: если FTP-пользователь изолирован в своей домашней папке,
   абсолютный путь «/www/...» уходит внутрь домашнего каталога. Пытаемся
   перейти в FTP_DIR и смотрим, где сервер нас реально оставил. */
try {
  await client.cd(siteDir);
  const where = await client.pwd();
  log(`после cd «${siteDir}» сервер оставил нас в: ${where}`);
  if (where !== siteDir) {
    log("! путь FTP_DIR разрешился в другой каталог — проверьте домашнюю папку FTP-аккаунта в панели");
  }
  await client.cd(base);
} catch {
  log(`cd «${siteDir}»: не удалось — каталог не существует для этого FTP-аккаунта`);
}

// Родитель каталога сайта: рядом обычно лежит настоящий корень домена.
const cut = siteDir.lastIndexOf("/");
const parent = cut > 0 ? siteDir.slice(0, cut) : "";
if (parent) await show(parent, "родительский каталог");
if (base !== siteDir && base !== parent) await show(base, "домашний каталог FTP");

/* Типовые корни документов на shared-хостингах: если настоящий корень
   другой, он обычно называется одним из этих имён или лежит рядом. */
const domain = siteDir.split("/").pop() || "";
const candidates = [
  ...new Set(
    [
      "/www",
      "www",
      "public_html",
      "/public_html",
      "httpdocs",
      "htdocs",
      `www/${domain}`,
      `/www/${domain}`,
    ].filter((dir) => dir !== siteDir),
  ),
];
for (const dir of candidates) {
  await show(dir, "типовой путь");
}

log(
  "сравните список с корнем документов домена в панели (раздел «Сайты») и впишите этот путь в секрет FTP_DIR",
);
client.close();
