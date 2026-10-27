import { Guide, type Range } from "./schema";
import { computeTier } from "./tier";
import { criticalPath } from "./criticalPath";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function findCycle(guide: Guide): string[] | null {
  const deps = new Map(guide.steps.map((s) => [s.id, s.dependsOn.filter((d) => guide.steps.some((x) => x.id === d))]));
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    if (state.get(id) === 2) return null;
    if (state.get(id) === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const d of deps.get(id) ?? []) {
      const c = visit(d);
      if (c) return c;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const id of deps.keys()) {
    const c = visit(id);
    if (c) return c;
  }
  return null;
}

/** Rules beyond zod, per 02_GUIDE_SCHEMA §Validation. Never throws. */
export function validateGuide(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = Guide.safeParse(input);
  if (!parsed.success) {
    for (const i of parsed.error.issues) errors.push(`schema: ${i.path.join(".") || "(root)"}: ${i.message}`);
    return { ok: false, errors, warnings };
  }
  const g = parsed.data;
  const claims = new Map(g.claims.map((c) => [c.id, c]));
  const stepIds = new Set(g.steps.map((s) => s.id));

  // 1. dependsOn ids exist; acyclic
  for (const s of g.steps)
    for (const d of s.dependsOn) if (!stepIds.has(d)) errors.push(`step ${s.id}: dependsOn unknown step "${d}"`);
  const cycle = findCycle(g);
  if (cycle) errors.push(`steps contain a dependency cycle: ${cycle.join(" -> ")}`);

  // 2. claimIds exist
  const checkIds = (where: string, ids: string[]) => {
    for (const id of ids) if (!claims.has(id)) errors.push(`${where}: unknown claim id "${id}"`);
  };
  const checkRange = (where: string, r: Range) => {
    checkIds(`${where}.claimIds`, r.claimIds);
    // 6. sourced range needs a sourced/tested claim
    if (r.basis === "sourced") {
      const ok = r.claimIds.some((id) => {
        const c = claims.get(id);
        return c && (c.evidence === "sourced" || c.evidence === "tested");
      });
      if (!ok) errors.push(`${where}: basis "sourced" needs a claimId pointing to a sourced or tested claim`);
    }
  };
  checkIds("verdict.claimIds", g.verdict.claimIds);
  checkIds("composio.claimIds", g.composio.claimIds);
  checkRange("verdict.timeToFirstConnection", g.verdict.timeToFirstConnection);
  checkRange("verdict.timeToProduction", g.verdict.timeToProduction);
  checkRange("verdict.activeEffort", g.verdict.activeEffort);
  for (const s of g.steps) {
    checkIds(`step ${s.id}.claimIds`, s.claimIds);
    checkRange(`step ${s.id}.duration`, s.duration);
  }
  for (const s of g.scopes) checkIds(`scope ${s.scope}.claimIds`, s.claimIds);
  for (const r of g.requirements) checkIds(`requirement ${r.id}.claimIds`, r.claimIds);
  for (const r of g.risks) checkIds(`risk ${r.id}.claimIds`, r.claimIds);

  // 3. claim evidence
  for (const c of g.claims) {
    if (c.evidence === "sourced" && c.sources.length === 0) errors.push(`claim ${c.id}: sourced claim has no sources`);
    if (c.evidence === "tested" && !c.testedHow) errors.push(`claim ${c.id}: tested claim has no testedHow`);
  }

  // 4. tier (warning)
  const tier = computeTier(g);
  if (g.verdict.tier !== tier) warnings.push(`verdict.tier is ${g.verdict.tier} but computeTier gives ${tier}`);

  // 5. production >= first connection
  if (g.verdict.timeToProduction.minHours < g.verdict.timeToFirstConnection.minHours)
    errors.push("verdict.timeToProduction.minHours is less than timeToFirstConnection.minHours");

  // critical path vs timeToProduction (warning)
  if (!cycle && !g.steps.some((s) => s.dependsOn.some((d) => !stepIds.has(d)))) {
    const cp = criticalPath(g.steps);
    if (g.verdict.timeToProduction.maxHours < cp.total.maxHours)
      warnings.push(
        `timeToProduction.maxHours (${g.verdict.timeToProduction.maxHours}) is below the critical path (${cp.total.maxHours})`,
      );
  }

  return { ok: errors.length === 0, errors, warnings };
}
