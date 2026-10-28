import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { criticalPath } from "@oauth-pilot/core";
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

  it("raises timeToProduction to the critical path (keeping basis/label) and says so", () => {
    const g = linear();
    const cp = criticalPath(g.steps).total;
    g.verdict.timeToProduction = { ...g.verdict.timeToProduction, minHours: g.verdict.timeToFirstConnection.minHours, maxHours: cp.maxHours - 0.5, basis: "estimate", label: "stale" };
    const r = finalizeDraft(g, "r");
    expect(r.guide).not.toBeNull();
    const t = r.guide!.verdict.timeToProduction;
    expect(t.maxHours).toBe(cp.maxHours);
    expect(t.minHours).toBeGreaterThanOrEqual(cp.minHours);
    expect(t.basis).toBe("estimate");
    expect(t.label).not.toBe("stale");
    expect(t.label).toMatch(/\d/);
    expect(r.warnings.some((w) => /raised timeToProduction/.test(w))).toBe(true);
    expect(r.warnings.some((w) => /is below the critical path/.test(w))).toBe(false);
  });

  it("does not touch a timeToProduction that already covers the critical path", () => {
    const g = linear();
    const cp = criticalPath(g.steps).total;
    g.verdict.timeToProduction = { ...g.verdict.timeToProduction, minHours: cp.minHours, maxHours: cp.maxHours + 10 };
    const r = finalizeDraft(g, "r");
    expect(r.guide!.verdict.timeToProduction.maxHours).toBe(cp.maxHours + 10);
    expect(r.warnings.some((w) => /raised/.test(w))).toBe(false);
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
