// Static Vite distribution for shared hosting: generated route HTML + optimized assets.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Keep the Cloud4box-ready PHP package in sync as well; it remains the canonical deploy artifact.
execFileSync("npm", ["run", "build:php"], {
  stdio: "inherit",
  env: { ...process.env, VITE_WEB_BUILD: "0" },
});
process.env.STATIC_NO_ZIP = "1";
process.env.STATIC_API_ENABLED = "1";
process.env.VITE_WEB_BUILD = "1";
await import(pathToFileURL(`${process.cwd()}/scripts/build-static.ts`).href);
const publicDir = path.resolve(process.cwd(), ".vite-public");
fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(
  path.resolve(process.cwd(), "release/static/config.js"),
  path.join(publicDir, "config.js"),
);
execFileSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", "--config", "vite.config.ts"],
  { stdio: "inherit" },
);
