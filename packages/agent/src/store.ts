import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Guide } from "@oauth-pilot/core";
import type { RunEvent } from "./events";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** Read env at call time so tests can point DATA_DIR at a temp dir. */
export const dataDir = () => path.resolve(process.env.DATA_DIR ?? path.join(repoRoot, "data"));
export const guidesDir = () => path.resolve(process.env.GUIDES_DIR ?? path.join(repoRoot, "guides"));
export const generatedDir = () => path.join(dataDir(), "guides");
export const runsDir = () => path.join(dataDir(), "runs");

/** Ids become file names: letters, digits, hyphens only; never a path. */
export function isSafeId(x: unknown): x is string {
  return typeof x === "string" && /^[a-z0-9][a-z0-9-]*$/i.test(x) && path.basename(x) === x;
}
export function safeId(x: string, what = "id"): string {
  if (!isSafeId(x)) throw new Error(`unsafe ${what}: ${JSON.stringify(x)}`);
  return x;
}

export interface Store {
  appendEvent(runId: string, event: RunEvent): Promise<void>;
  readEvents(runId: string): Promise<RunEvent[]>;
  saveGuide(guide: Guide, outDir?: string): Promise<string>;
}

export async function appendEvent(runId: string, event: RunEvent): Promise<void> {
  safeId(runId, "runId");
  await fs.mkdir(runsDir(), { recursive: true });
  await fs.appendFile(path.join(runsDir(), `${runId}.jsonl`), JSON.stringify(event) + "\n");
}

export async function readEvents(runId: string): Promise<RunEvent[]> {
  safeId(runId, "runId");
  try {
    const raw = await fs.readFile(path.join(runsDir(), `${runId}.jsonl`), "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as RunEvent);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

export async function saveGuide(guide: Guide, outDir: string = generatedDir()): Promise<string> {
  safeId(guide.slug, "slug");
  await fs.mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${guide.slug}.json`);
  await fs.writeFile(file, JSON.stringify(guide, null, 2) + "\n");
  return file;
}

export const defaultStore: Store = { appendEvent, readEvents, saveGuide };

async function readGuidesFrom(dir: string): Promise<Guide[]> {
  let names: string[];
  try {
    names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  const out: Guide[] = [];
  for (const n of names) {
    try {
      const parsed = Guide.safeParse(JSON.parse(await fs.readFile(path.join(dir, n), "utf8")));
      if (parsed.success) out.push(parsed.data);
    } catch {
      /* skip unreadable file */
    }
  }
  return out;
}

export type GuideEntry = { slug: string; guide: Guide; source: "library" | "generated" };

/** Library guides, plus generated ones for slugs the library lacks. */
export async function listGuides(): Promise<GuideEntry[]> {
  const lib = await readGuidesFrom(guidesDir());
  const gen = await readGuidesFrom(generatedDir());
  const map = new Map<string, GuideEntry>();
  for (const g of gen) map.set(g.slug, { slug: g.slug, guide: g, source: "generated" });
  for (const g of lib) map.set(g.slug, { slug: g.slug, guide: g, source: "library" });
  return [...map.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Library wins unless preferGenerated is set and a generated guide exists. */
export async function getGuide(slug: string, opts: { preferGenerated?: boolean } = {}): Promise<Guide | null> {
  const load = async (dir: string) => (await readGuidesFrom(dir)).find((g) => g.slug === slug) ?? null;
  const lib = () => load(guidesDir());
  const gen = () => load(generatedDir());
  return opts.preferGenerated ? ((await gen()) ?? (await lib())) : ((await lib()) ?? (await gen()));
}
