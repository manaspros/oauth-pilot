import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { validateGuide } from "@oauth-pilot/core";
import { runGuide } from "../src";

// Network + LLM. Run with `pnpm --filter @oauth-pilot/agent test:live`; excluded from the default `test`.
const hasKey = !!process.env.ANTHROPIC_API_KEY;
let dir: string | undefined;
afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe.skipIf(!hasKey)("live smoke", () => {
  it("generates a valid guide for Calendly in under 300 s", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "oauth-pilot-live-"));
    process.env.DATA_DIR = dir;
    delete process.env.OAUTH_PILOT_FAKE;
    const guide = await runGuide({ app: "Calendly" }, { runId: "live1" });
    expect(validateGuide(guide).ok).toBe(true);
    expect(guide.slug).toBe("calendly");
  }, 300_000);
});
