import { Guide, computeTier, criticalPath, validateGuide } from "@oauth-pilot/core";
import { isSafeId, type Store } from "../store";
import type { NodeFn } from "./common";
import { log } from "./common";

export type FinalizeResult = { guide: Guide | null; errors: string[]; warnings: string[] };

/** safeParse -> validateGuide -> force tier = computeTier() -> critical-path check. Pure; no I/O. */
export function finalizeDraft(draft: unknown, runId: string): FinalizeResult {
  const parsed = Guide.safeParse(draft);
  if (!parsed.success) {
    return { guide: null, errors: parsed.error.issues.map((i) => `schema: ${i.path.join(".")}: ${i.message}`), warnings: [] };
  }
  if (!isSafeId(parsed.data.slug)) return { guide: null, errors: [`slug is not a safe file id: ${JSON.stringify(parsed.data.slug)}`], warnings: [] };
  const guide: Guide = { ...parsed.data, verdict: { ...parsed.data.verdict, tier: computeTier(parsed.data) } };
  guide.generator = { ...guide.generator, runId };
  const v = validateGuide(guide);
  if (!v.ok) return { guide: null, errors: v.errors, warnings: v.warnings };
  const warnings = [...v.warnings];
  const cp = criticalPath(guide.steps);
  if (cp.stepIds.length && guide.verdict.timeToProduction.maxHours < cp.total.maxHours) {
    warnings.push(
      `timeToProduction.maxHours (${guide.verdict.timeToProduction.maxHours}) is below the critical path (${cp.total.maxHours} h via ${cp.stepIds.join(" > ")})`,
    );
  }
  return { guide, errors: [], warnings };
}

// `done` is emitted by runGuide after node_finished so it is the last event.
// Validation errors become issues; the graph's conditional edge repairs once (repairs 0 -> 1).
export const makeFinalize = (store: Store): NodeFn => async (state, config) => {
  const { guide, errors, warnings } = finalizeDraft(state.draft, state.runId);
  if (!guide) {
    // runGuide emits the single fatal `error` event when no guide results after the repair.
    return { issues: errors.map((e) => `validation: ${e}`), repairs: state.repairs + 1 };
  }
  for (const w of warnings) await log(config, "finalize", `warning: ${w}`);
  await store.saveGuide(guide, config.configurable?.outDir as string | undefined);
  return { guide };
};
