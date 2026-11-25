import fs from "node:fs";
import path from "node:path";
import { createLogger, defineConfig, type Plugin } from "vite";

const project = process.cwd();
const source = path.resolve(project, "release/static");
const output = path.resolve(project, "dist");

function staticBrowserAliases(): Plugin {
  return {
    name: "static-browser-aliases",
    enforce: "pre",
    resolveId(specifier, importer) {
      let absolute: string | null = null;
      if (specifier.startsWith("@/"))
        absolute = path.resolve(project, "src", specifier.slice(2));
      else if (importer && specifier.startsWith("."))
        absolute = path.resolve(path.dirname(importer), specifier);
      if (!absolute) return null;
      const normalized = absolute
        .replaceAll("\\", "/")
        .replace(/\.(tsx?|jsx?)$/, "");
      if (normalized.endsWith("/lib/knowledge/queries"))
        return path.resolve(project, "src-static/shims/knowledge.ts");
      if (normalized.endsWith("/lib/db") || normalized.endsWith("/db"))
        return path.resolve(project, "src-static/shims/db.ts");
      return null;
    },
  };
}

function copySharedHostingFiles(): Plugin {
  return {
    name: "copy-shared-hosting-static-files",
    closeBundle() {
      for (const name of ["images", "fonts"]) {
        const from = path.join(source, name);
        if (fs.existsSync(from))
          fs.cpSync(from, path.join(output, name), { recursive: true });
      }
      for (const name of [".htaccess", "robots.txt", "sitemap.xml"]) {
        const from = path.join(source, name);
        if (fs.existsSync(from)) fs.copyFileSync(from, path.join(output, name));
      }
      // Small PHP endpoints keep forms/notifications usable on shared hosting without Node.
      const php = path.resolve(project, "release/php");
      for (const name of ["api", "cabinet", "inc", "data"]) {
        const from = path.join(php, name);
        if (fs.existsSync(from))
          fs.cpSync(from, path.join(output, name), { recursive: true });
      }
      for (const name of [
        "setup.php",
        "check.php",
        "config.example.php",
        ".htaccess",
      ]) {
        const from = path.join(php, name);
        if (fs.existsSync(from)) fs.copyFileSync(from, path.join(output, name));
      }
      fs.writeFileSync(
        path.join(output, "README.txt"),
        `ЖЕМЧУЖИНА · cosmorox.ru\n\nРАЗМЕЩЕНИЕ НА CLOUD4BOX\n1. Загрузите содержимое этой папки в public_html, сохраняя структуру папок.\n2. Откройте https://ваш-домен/setup.php и выполните первичную настройку.\n3. Проверьте сайт и PHP через https://ваш-домен/check.php.\n4. Для FTP-деплоя используйте download/astra-pearl-php.zip из репозитория.\n\nNode.js на хостинге не требуется. Формы используют PHP endpoint; уведомления зависят от настройки канала связи на сервере. Профили и сохранённая история расчётов хранятся локально в браузере этого устройства. ЮKassa пока не подключена: кнопки витрины не создают платёж и не списывают деньги.\n`,
      );
    },
  };
}
const input = fs.existsSync(source)
  ? Object.fromEntries(
      fs
        .readdirSync(source)
        .filter((file) => file.endsWith(".html"))
        .map((file) => [
          file.replace(/\.html$/, "") || "home",
          path.join(source, file),
        ]),
    )
  : {};
// config.js is copied verbatim by the host-static plugin so customers can edit settings in-place.
// Ignore only Vite's expected warning for that intentionally classic script.
const logger = createLogger();
const isExpectedConfigNotice = (message: string) =>
  message.includes('script src="config.js"') &&
  message.includes('can\'t be bundled without type="module"');
const originalWarn = logger.warn.bind(logger);
const originalWarnOnce = logger.warnOnce.bind(logger);
logger.warn = (message, options) => {
  if (!isExpectedConfigNotice(message)) originalWarn(message, options);
};
logger.warnOnce = (message, options) => {
  if (!isExpectedConfigNotice(message)) originalWarnOnce(message, options);
};

export default defineConfig({
  customLogger: logger,
  root: source,
  base: "./",
  preview: { host: "0.0.0.0", allowedHosts: true },
  server: { host: "0.0.0.0", allowedHosts: true },
  publicDir: path.resolve(project, ".vite-public"),
  plugins: [staticBrowserAliases(), copySharedHostingFiles()],
  resolve: { alias: { "@": path.resolve(project, "src") } },
  build: {
    outDir: output,
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: { input },
  },
});
