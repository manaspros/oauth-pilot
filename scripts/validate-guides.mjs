// Validates every *.json in GUIDES_DIR (default guides/). Needs tsx: run via `pnpm validate:guides`.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { register } from "tsx/esm/api";

register();
const root = resolve(new URL("..", import.meta.url).pathname);
const { validateGuide } = await import(pathToFileURL(join(root, "packages/core/src/index.ts")).href);

const dir = resolve(process.env.GUIDES_DIR ?? "guides");
if (!existsSync(dir)) {
  console.error(`GUIDES_DIR not found: ${dir}`);
  process.exit(1);
}
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
let failed = 0;
for (const f of files) {
  let res;
  try {
    res = validateGuide(JSON.parse(readFileSync(join(dir, f), "utf8")));
  } catch (e) {
    res = { ok: false, errors: [`unreadable: ${e.message}`], warnings: [] };
  }
  console.log(`${res.ok ? "ok  " : "FAIL"} ${f}`);
  for (const e of res.errors) console.log(`  error: ${e}`);
  for (const w of res.warnings) console.log(`  warn:  ${w}`);
  if (!res.ok) failed++;
}
console.log(`${files.length} guide(s), ${failed} failed`);
process.exit(failed ? 1 : 0);
