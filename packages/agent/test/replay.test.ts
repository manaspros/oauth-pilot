import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateGuide } from "@oauth-pilot/core";
import { readEvents, runGuide } from "../src";

const calendly = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/runs/calendly/draft.json");
let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "oauth-pilot-replay-"));
  process.env.DATA_DIR = dir;
  process.env.OAUTH_PILOT_FAKE = "1";
  process.env.OAUTH_PILOT_FAKE_DELAY_MS = "0";
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("replay of recorded calendly run (fake mode)", () => {
  it("has recorded fixtures", () => {
    expect(existsSync(calendly)).toBe(true);
  });
  it("replays the whole run offline and yields a valid calendly guide", async () => {
    const guide = await runGuide({ app: "Calendly" }, { runId: "replay1" });
    expect(guide.slug).toBe("calendly");
    expect(validateGuide(guide).ok).toBe(true);
    const events = await readEvents("replay1");
    expect(events.at(-1)!.t).toBe("done");
    expect(events.some((e) => e.t === "error")).toBe(false);
  });
});
