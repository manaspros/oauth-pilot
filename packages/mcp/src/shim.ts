// Bundle-only: the agent reads prompts and fake-mode fixtures with fs, relative to its own source
// files. In the single-file bundle those files do not exist, so serve them from memory.
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import assets from "virtual:assets";

const norm = (p: unknown) => String(p).replace(/\\/g, "/");
const PROMPT = /\/prompts\/([\w.-]+\.md)$/;
const FIXTURE = /\/fixtures\/runs\/([\w-]+)\/([\w.-]+\.json)$/;
const FIXTURE_DIR = /\/fixtures\/runs\/([\w-]+)\/?$/;

function lookup(p: unknown): string | undefined {
  const s = norm(p);
  const m = PROMPT.exec(s);
  if (m) return assets.prompts[m[1]!];
  const f = FIXTURE.exec(s);
  if (f) return assets.fixtures[f[1]!]?.[f[2]!];
  return undefined;
}

export function installAssetShim() {
  const p = fs.promises as any;
  const realRead = p.readFile.bind(p);
  const realAccess = p.access.bind(p);
  p.readFile = (file: unknown, ...rest: unknown[]) => {
    const hit = typeof file === "string" ? lookup(file) : undefined;
    return hit !== undefined ? Promise.resolve(hit) : realRead(file, ...rest);
  };
  p.access = (file: unknown, ...rest: unknown[]) => {
    const s = norm(file);
    const d = FIXTURE_DIR.exec(s);
    if (typeof file === "string" && ((d && assets.fixtures[d[1]!]) || lookup(file) !== undefined)) return Promise.resolve();
    return realAccess(file, ...rest);
  };
  syncBuiltinESMExports();
}

export const bundledGuides = () => assets.guides;
