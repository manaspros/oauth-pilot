import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Guide, computeTier, criticalPath, validateGuide, renderMarkdown, type Step } from "../src/index";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/linear.json", import.meta.url), "utf8"));
const base = (): any => structuredClone(fixture);
const rng = (max: number, min = max) => ({ minHours: min, maxHours: max, label: `${max}h`, basis: "estimate", claimIds: [] });
const step = (id: string, max: number, dependsOn: string[] = [], optional = false): Step =>
  ({ id, phase: "prepare", title: id, actor: "developer", detail: "", duration: rng(max), dependsOn, links: [], claimIds: [], optional }) as Step;

describe("fixture", () => {
  it("validates with no errors", () => {
    const r = validateGuide(fixture);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it("is tier 1", () => {
    expect(computeTier(Guide.parse(fixture))).toBe(1);
  });
});

describe("computeTier", () => {
  const cases: [string, (g: any) => void, number][] = [
    ["0 instant", (g) => { g.composio.recommendation = "use_managed"; }, 0],
    ["1 self-serve", () => {}, 1],
    ["fall-through to 1", (g) => { g.composio.recommendation = "own_app_now"; }, 1],
    ["2 provider step", (g) => { g.steps[0].actor = "provider"; g.steps[0].duration.maxHours = 24; }, 2],
    ["2 sensitive scope", (g) => { g.scopes[0].sensitivity = "sensitive"; }, 2],
    ["2 admin requirement", (g) => { g.requirements[0].owner = "admin"; }, 2],
    ["3 long provider wait", (g) => { g.steps[0].actor = "provider"; g.steps[0].duration.maxHours = 168; }, 3],
    ["3 restricted scope", (g) => { g.scopes[0].sensitivity = "restricted"; }, 3],
    ["4 gate requirement", (g) => { g.requirements[0].gate = true; }, 4],
    ["4 gate risk", (g) => { g.risks[0].gate = true; }, 4],
    ["4 beats restricted", (g) => { g.scopes[0].sensitivity = "restricted"; g.risks[0].gate = true; }, 4],
  ];
  it.each(cases)("%s", (_n, mut, tier) => {
    const g = base();
    mut(g);
    expect(computeTier(Guide.parse(g))).toBe(tier);
  });
});

describe("validateGuide", () => {
  it("sourced range without supporting claim is an error", () => {
    const g = base();
    g.verdict.timeToFirstConnection.basis = "sourced";
    g.verdict.timeToFirstConnection.claimIds = [];
    expect(validateGuide(g).errors.join()).toMatch(/sourced/);
  });
  it("missing claim id is an error", () => {
    const g = base();
    g.steps[0].claimIds = ["nope"];
    const r = validateGuide(g);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/nope/);
  });
  it("sourced claim without sources is an error", () => {
    const g = base();
    const c = g.claims.find((x: any) => x.evidence === "sourced");
    c.sources = [];
    expect(validateGuide(g).errors.join()).toMatch(/no sources/);
  });
  it("tested claim without testedHow is an error", () => {
    const g = base();
    const c = g.claims.find((x: any) => x.evidence === "tested");
    if (c) {
      delete c.testedHow;
      expect(validateGuide(g).errors.join()).toMatch(/testedHow/);
    }
  });
  it("dependency cycle is reported", () => {
    const g = base();
    g.steps[0].dependsOn = [g.steps[1].id];
    g.steps[1].dependsOn = [g.steps[0].id];
    expect(validateGuide(g).errors.join()).toMatch(/cycle/);
  });
  it("tier mismatch is only a warning", () => {
    const g = base();
    g.verdict.tier = 3;
    const r = validateGuide(g);
    expect(r.warnings.join()).toMatch(/computeTier/);
    expect(r.ok).toBe(true);
  });
  it("garbage input does not throw", () => {
    expect(validateGuide({}).ok).toBe(false);
  });
});

describe("criticalPath", () => {
  it("diamond picks the longer branch", () => {
    const cp = criticalPath([step("a", 1), step("b", 10, ["a"]), step("c", 2, ["a"]), step("d", 1, ["b", "c"])]);
    expect(cp.stepIds).toEqual(["a", "b", "d"]);
    expect(cp.total.maxHours).toBe(12);
  });
  it("excludes optional steps", () => {
    const cp = criticalPath([step("a", 1), step("b", 100, ["a"], true), step("c", 2, ["a"])]);
    expect(cp.stepIds).toEqual(["a", "c"]);
  });
  it("terminates on a cycle", () => {
    const cp = criticalPath([step("a", 1, ["b"]), step("b", 1, ["a"])]);
    expect(cp.stepIds.length).toBeGreaterThan(0);
  });
});

describe("renderMarkdown", () => {
  it("contains verdict, every step title, every claim footnote", () => {
    const g = Guide.parse(fixture);
    const md = renderMarkdown(g);
    expect(md).toContain(g.verdict.headline);
    expect(md).toContain(g.verdict.startToday);
    for (const s of g.steps) expect(md).toContain(s.title);
    for (const c of g.claims) expect(md).toContain(`[^${c.id}]`);
  });
});
