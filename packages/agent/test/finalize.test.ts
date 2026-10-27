import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { finalizeDraft } from "../src/nodes/finalize";

const here = path.dirname(fileURLToPath(import.meta.url));
const linear = () => JSON.parse(readFileSync(path.join(here, "../fixtures/runs/linear/draft.json"), "utf8"));

describe("finalizeDraft", () => {
  it("forces verdict.tier = computeTier() and stamps runId", () => {
    const g = linear();
    g.verdict.tier = 4;
    g.verdict.tierLabel = "Gated";
    const r = finalizeDraft(g, "run-x");
    expect(r.errors).toEqual([]);
    expect(r.guide!.verdict.tier).toBe(1); // linear is honest tier 1
    expect(r.guide!.generator.runId).toBe("run-x");
  });

  it("warns when timeToProduction is below the critical path", () => {
    const g = linear();
    g.verdict.timeToProduction = { ...g.verdict.timeToProduction, minHours: 0.5, maxHours: 0.1 };
    const r = finalizeDraft(g, "r");
    expect(r.guide).not.toBeNull();
    expect(r.warnings.some((w) => /critical path/.test(w))).toBe(true);
  });

  it("returns errors (no guide) for a dangling claim id", () => {
    const g = linear();
    g.steps[0].claimIds = ["c99"];
    const r = finalizeDraft(g, "r");
    expect(r.guide).toBeNull();
    expect(r.errors.join()).toMatch(/c99/);
  });

  it("returns schema errors for garbage", () => {
    expect(finalizeDraft(null, "r").errors.length).toBeGreaterThan(0);
  });
});
