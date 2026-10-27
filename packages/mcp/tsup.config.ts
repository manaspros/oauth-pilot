import { defineConfig } from "tsup";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const agent = path.join(repo, "packages/agent");

/** Everything the agent reads from disk at runtime, keyed by repo-relative-ish path. */
function collectAssets() {
  const prompts: Record<string, string> = {};
  const pdir = path.join(agent, "src/prompts");
  for (const f of readdirSync(pdir)) if (f.endsWith(".md")) prompts[f] = readFileSync(path.join(pdir, f), "utf8");

  const fixtures: Record<string, Record<string, string>> = {};
  const froot = path.join(agent, "fixtures/runs");
  if (existsSync(froot))
    for (const slug of readdirSync(froot)) {
      fixtures[slug] = {};
      for (const f of readdirSync(path.join(froot, slug)))
        if (f.endsWith(".json")) fixtures[slug]![f] = readFileSync(path.join(froot, slug, f), "utf8");
    }

  const guides: unknown[] = [];
  const gdir = path.join(repo, "guides");
  if (existsSync(gdir))
    for (const f of readdirSync(gdir).sort()) if (f.endsWith(".json")) guides.push(JSON.parse(readFileSync(path.join(gdir, f), "utf8")));
  return { prompts, fixtures, guides };
}

export default defineConfig({
  entry: { mcp: "src/bin.ts" },
  outDir: path.join(repo, "plugin/oauth-pilot/bin"),
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: false,
  splitting: false,
  sourcemap: false,
  minify: false,
  // Installed plugins have no node_modules: inline every dependency.
  noExternal: [/.*/],
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire as __cr } from "node:module";\nconst require = __cr(import.meta.url);',
  },
  outExtension: () => ({ js: ".mjs" }),
  esbuildPlugins: [
    {
      name: "virtual-assets",
      setup(build) {
        build.onResolve({ filter: /^virtual:assets$/ }, () => ({ path: "virtual:assets", namespace: "assets" }));
        build.onLoad({ filter: /.*/, namespace: "assets" }, () => ({
          contents: `export default ${JSON.stringify(collectAssets())};`,
          loader: "js",
        }));
      },
    },
  ],
});
