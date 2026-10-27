import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixturesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/runs");

export const isFake = () => process.env.OAUTH_PILOT_FAKE === "1";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/.]/)[0]!
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Fixture slug for an app name; falls back to linear when no recording exists. */
export async function fixtureSlug(app: string): Promise<string> {
  const slug = slugify(app);
  if (!slug) return "linear";
  try {
    await fs.access(path.join(fixturesRoot, slug));
    return slug;
  } catch {
    return "linear";
  }
}

export async function loadFixture<T = unknown>(app: string, name: string): Promise<T> {
  const slug = await fixtureSlug(app);
  return JSON.parse(await fs.readFile(path.join(fixturesRoot, slug, `${name}.json`), "utf8")) as T;
}

/** 300-800 ms by default; OAUTH_PILOT_FAKE_DELAY_MS overrides (tests set 0). */
export async function fakeDelay(): Promise<void> {
  const o = process.env.OAUTH_PILOT_FAKE_DELAY_MS;
  const ms = o !== undefined ? Number(o) : 300 + Math.random() * 500;
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}
