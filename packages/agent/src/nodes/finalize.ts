import { Guide, computeTier, validateGuide } from "@oauth-pilot/core";
import { isSafeId, type Store } from "../store";
import type { NodeFn } from "./common";

export type FinalizeResult = { guide: Guide | null; errors: string[] };

/** safeParse -> validateGuide -> force tier = computeTier(). Pure; no I/O. */
export function finalizeDraft(draft: unknown, runId: string): FinalizeResult {
  const parsed = Guide.safeParse(draft);
  if (!parsed.success) {
    return { guide: null, errors: parsed.error.issues.map((i) => `schema: ${i.path.join(".")}: ${i.message}`) };
  }
  if (!isSafeId(parsed.data.slug)) return { guide: null, errors: [`slug is not a safe file id: ${JSON.stringify(parsed.data.slug)}`] };
  const guide: Guide = { ...parsed.data, verdict: { ...parsed.data.verdict, tier: computeTier(parsed.data) } };
  guide.generator = { ...guide.generator, runId };
  const v = validateGuide(guide);
  if (!v.ok) return { guide: null, errors: v.errors };
  return { guide, errors: [] };
}

// `done` is emitted by runGuide after node_finished so it is the last event.
// Core of finalize; T13 may extend (e.g. critical-path check on timeToProduction).
export const makeFinalize = (store: Store): NodeFn => async (state, config) => {
  const { guide, errors } = finalizeDraft(state.draft, state.runId);
  if (!guide) {
    if (state.repairs < 1) return { issues: errors.map((e) => `validation: ${e}`), repairs: state.repairs + 1 };
    // runGuide emits the single fatal `error` event when no guide results.
    return { issues: errors.map((e) => `validation: ${e}`), repairs: state.repairs + 1 };
  }
  await store.saveGuide(guide, config.configurable?.outDir as string | undefined);
  return { guide };
};
