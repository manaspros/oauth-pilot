import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { fallbackTarget, makeIntake } from "../src/nodes/intake";
import type { State } from "../src/state";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

const llmJson = readFileSync(new URL("../fixtures/unit/intake-llm.json", import.meta.url), "utf8");
const st = (app: string) => ({ input: { app }, runId: "r" }) as unknown as State;

afterEach(() => delete process.env.OAUTH_PILOT_FAKE);

describe("intake", () => {
  it("parses LLM JSON (even fenced) into a target", async () => {
    const node = makeIntake({ llm: async () => "```json\n" + llmJson + "\n```" });
    const r = await node(st("https://pipedrive.com"), {});
    expect(r.target).toMatchObject({ name: "Pipedrive", slug: "pipedrive", composioSlug: "pipedrive" });
    expect((r.target as { docsHints: string[] }).docsHints.length).toBe(3);
    expect(r.issues).toBeUndefined();
  });
  it("falls back deterministically on junk output", async () => {
    const r = (await makeIntake({ llm: async () => "sorry" })(st("https://www.pipedrive.com/en"), {})) as R;
    expect(r.target!.slug).toBe("pipedrive");
    expect(r.target!.website).toBe("https://www.pipedrive.com");
    expect(r.issues!.length).toBe(1);
  });
  it("falls back when the LLM throws (no key)", async () => {
    const r = (await makeIntake({ llm: async () => Promise.reject(new Error("no key")) })(st("Google Calendar"), {})) as R;
    expect(r.target!.slug).toBe("google-calendar");
    expect(r.target!.composioSlug).toBe("googlecalendar");
    expect(r.issues![0]).toMatch(/no key/);
  });
  it("rejects an unsafe slug from the LLM", async () => {
    const r = (await makeIntake({ llm: async () => '{"name":"X","slug":"../x"}' })(st("x"), {})) as R;
    expect(r.target!.slug).toBe("x");
    expect(r.issues!.length).toBe(1);
  });
  it("fallbackTarget for a name", () => {
    expect(fallbackTarget("Linear")).toMatchObject({ name: "Linear", slug: "linear", website: undefined });
  });
  it("fake mode returns the fixture without calling the LLM", async () => {
    process.env.OAUTH_PILOT_FAKE = "1";
    process.env.OAUTH_PILOT_FAKE_DELAY_MS = "0";
    const r = (await makeIntake({ llm: async () => Promise.reject(new Error("must not be called")) })(st("Linear"), {})) as R;
    expect(r.target!.slug).toBe("linear");
  });
});
