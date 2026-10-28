import { Guide, computeTier, criticalPath, validateGuide } from "@oauth-pilot/core";
import { isSafeId, type Store } from "../store";
import type { NodeFn } from "./common";
import { log } from "./common";

export type FinalizeResult = { guide: Guide | null; errors: string[]; warnings: string[] };

const r1 = (n: number) => String(Math.round(n * 10) / 10);
function hoursLabel(min: number, max: number): string {
  if (max < 48) return `${r1(min)}–${r1(max)} h`;
  if (max < 24 * 14) return `${r1(min / 24)}–${r1(max / 24)} days`;
  return `${r1(min / 168)}–${r1(max / 168)} weeks`;
}

/** safeParse -> validateGuide -> force tier = computeTier() -> critical-path check. Pure; no I/O. */
export function finalizeDraft(draft: unknown, runId: string): FinalizeResult {
  const parsed = Guide.safeParse(draft);
  if (!parsed.success) {
    return { guide: null, errors: parsed.error.issues.map((i) => `schema: ${i.path.join(".")}: ${i.message}`), warnings: [] };
  }
  if (!isSafeId(parsed.data.slug)) return { guide: null, errors: [`slug is not a safe file id: ${JSON.stringify(parsed.data.slug)}`], warnings: [] };
  const guide: Guide = { ...parsed.data, verdict: { ...parsed.data.verdict, tier: computeTier(parsed.data) } };
  guide.generator = { ...guide.generator, runId };
  // The production range may not contradict its own critical path: raise it (basis and label are kept).
  const clamps: string[] = [];
  const cp = criticalPath(guide.steps);
  if (cp.stepIds.length) {
    const ttp = guide.verdict.timeToProduction;
    const next = { ...ttp };
    let changed = false;
    if (ttp.maxHours < cp.total.maxHours) { next.maxHours = cp.total.maxHours; changed = true; }
    if (ttp.minHours < cp.total.minHours) { next.minHours = cp.total.minHours; changed = true; }
    if (changed) {
      next.label = hoursLabel(next.minHours, next.maxHours);
      clamps.push(
        `raised timeToProduction from ${ttp.minHours}-${ttp.maxHours} h to ${next.minHours}-${next.maxHours} h to match the critical path (${cp.stepIds.join(" > ")})`,
      );
      guide.verdict = { ...guide.verdict, timeToProduction: next };
    }
  }
  const v = validateGuide(guide);
  if (!v.ok) return { guide: null, errors: v.errors, warnings: v.warnings };
  return { guide, errors: [], warnings: [...clamps, ...v.warnings] };
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
