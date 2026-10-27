import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateGuide } from "@oauth-pilot/core";
import { NODE_NAMES, readEvents, runGuide, getGuide, listGuides, type RunEvent } from "../src";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "oauth-pilot-"));
  process.env.DATA_DIR = dir;
  process.env.GUIDES_DIR = path.join(dir, "no-library");
  process.env.OAUTH_PILOT_FAKE = "1";
  process.env.OAUTH_PILOT_FAKE_DELAY_MS = "0";
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("graph in fake mode", () => {
  it("runs all nodes in order, drafts once, writes a valid guide", async () => {
    const live: RunEvent[] = [];
    const guide = await runGuide({ app: "Linear" }, { runId: "r1", emit: (e) => void live.push(e) });

    expect(validateGuide(guide).ok).toBe(true);
    expect(guide.slug).toBe("linear");

    const events = await readEvents("r1");
    expect(events.length).toBe(live.length);
    expect(events[0]!.t).toBe("run_started");
    expect(events.at(-1)!.t).toBe("done");
    expect(events.some((e) => e.t === "error")).toBe(false);

    const started = events.filter((e) => e.t === "node_started").map((e) => (e as { node: string }).node);
    const finished = events.filter((e) => e.t === "node_finished").map((e) => (e as { node: string }).node);
    expect(new Set(started)).toEqual(new Set(NODE_NAMES));
    expect(started.length).toBe(7);
    expect(finished.length).toBe(7);
    expect(started.filter((n) => n === "draft").length).toBe(1);

    const idx = (n: string) => started.indexOf(n);
    expect(idx("intake")).toBe(0);
    for (const n of ["composio_lookup", "docs_research", "probe"]) expect(idx(n)).toBeLessThan(idx("draft"));
    expect(idx("draft")).toBeLessThan(idx("verify"));
    expect(idx("verify")).toBeLessThan(idx("finalize"));

    // finish events pair with their start events
    for (const n of NODE_NAMES) {
      const s = events.findIndex((e) => e.t === "node_started" && e.node === n);
      const f = events.findIndex((e) => e.t === "node_finished" && e.node === n);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(f).toBeGreaterThan(s);
    }
  });

  it("persists run log and guide under DATA_DIR", async () => {
    const jsonl = await readFile(path.join(dir, "runs", "r1.jsonl"), "utf8");
    expect(jsonl.trim().split("\n").length).toBeGreaterThan(10);
    const saved = JSON.parse(await readFile(path.join(dir, "guides", "linear.json"), "utf8"));
    expect(validateGuide(saved).ok).toBe(true);
    expect(saved.generator.runId).toBe("r1");
  });

  it("store lists and gets guides", async () => {
    expect((await listGuides()).map((g) => [g.slug, g.source])).toEqual([["linear", "generated"]]);
    expect((await getGuide("linear", { preferGenerated: true }))?.slug).toBe("linear");
    expect(await getGuide("nope")).toBeNull();
  });
});

describe("store id safety", () => {
  it("rejects a bad slug", async () => {
    const { saveGuide } = await import("../src");
    const g = (await getGuide("linear", { preferGenerated: true }))!;
    await expect(saveGuide({ ...g, slug: "../../x" }, dir)).rejects.toThrow(/unsafe slug/);
  });
  it("rejects a bad runId", async () => {
    const { appendEvent } = await import("../src");
    await expect(appendEvent("../evil", { t: "log", node: "intake", msg: "x", at: "" })).rejects.toThrow(/unsafe runId/);
    await expect(readEvents("a/b")).rejects.toThrow(/unsafe runId/);
  });
  it("finalize turns a bad slug into a validation error, not a crash", async () => {
    const { finalizeDraft } = await import("../src/nodes/finalize");
    const g = (await getGuide("linear", { preferGenerated: true }))!;
    const r = finalizeDraft({ ...g, slug: "../../x" }, "r");
    expect(r.guide).toBeNull();
    expect(r.errors.join()).toMatch(/slug/);
  });
});
