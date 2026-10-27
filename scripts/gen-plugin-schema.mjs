// Writes plugin/oauth-pilot/schema/guide.schema.json from packages/core (guideJsonSchema).
// `--check` exits 1 if the file on disk differs. Run via tsx loader like validate-guides.mjs.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { register } from "tsx/esm/api";

register();
const root = resolve(new URL("..", import.meta.url).pathname);
const { guideJsonSchema } = await import(pathToFileURL(join(root, "packages/core/src/index.ts")).href);
const out = join(root, "plugin/oauth-pilot/schema/guide.schema.json");
const next = JSON.stringify(guideJsonSchema, null, 2) + "\n";

if (process.argv.includes("--check")) {
  const cur = existsSync(out) ? readFileSync(out, "utf8") : null;
  if (cur !== next) {
    console.error("guide.schema.json is out of date. Run: node scripts/gen-plugin-schema.mjs");
    process.exit(1);
  }
  console.log("guide.schema.json is up to date");
} else {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, next);
  console.log(`wrote ${out}`);
}
