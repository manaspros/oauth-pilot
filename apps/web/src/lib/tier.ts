export const TIER_VAR = ["var(--tier-0)", "var(--tier-1)", "var(--tier-2)", "var(--tier-3)", "var(--tier-4)"];
export const TIER_LABELS = ["Instant", "Self-serve", "Light review", "Heavy review", "Gated"];
export const tierColor = (t: number) => TIER_VAR[Math.max(0, Math.min(4, t))];
