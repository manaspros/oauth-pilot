import type { Guide } from "./schema";

export const TIER_LABELS = ["Instant", "Self-serve", "Light review", "Heavy review", "Gated"] as const;

/** Deterministic tier per 02_GUIDE_SCHEMA §Tier rubric. First match from 4 down to 0 wins. */
export function computeTier(guide: Guide): number {
  const providerSteps = guide.steps.filter((s) => s.actor === "provider");
  if (guide.requirements.some((r) => r.gate) || guide.risks.some((r) => r.gate)) return 4;
  if (
    providerSteps.some((s) => s.duration.maxHours >= 168) ||
    guide.scopes.some((s) => s.sensitivity === "restricted")
  )
    return 3;
  if (
    providerSteps.length > 0 ||
    guide.scopes.some((s) => s.sensitivity === "sensitive" || s.sensitivity === "admin") ||
    guide.requirements.some((r) => r.owner === "admin")
  )
    return 2;
  if (guide.composio.recommendation !== "use_managed") return 1;
  if (guide.composio.recommendation === "use_managed") return 0;
  return 1;
}

export function tierLabel(tier: number): (typeof TIER_LABELS)[number] {
  return TIER_LABELS[Math.max(0, Math.min(4, tier))];
}
