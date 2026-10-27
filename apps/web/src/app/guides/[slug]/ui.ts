import type { Guide } from "@oauth-pilot/core";

export type GStep = Guide["steps"][number];
export type GClaim = Guide["claims"][number];
export type Evidence = GClaim["evidence"];

export const ACTORS = ["agent", "developer", "admin", "provider"] as const;
export const ACTOR_META: Record<GStep["actor"], { emoji: string; label: string }> = {
  agent: { emoji: "🤖", label: "Agent" },
  developer: { emoji: "🧑‍💻", label: "You" },
  admin: { emoji: "🏢", label: "Admin/Legal" },
  provider: { emoji: "⏳", label: "Provider" },
};

export const EVIDENCE_COLOR: Record<Evidence, string> = {
  tested: "var(--tier-0)",
  sourced: "var(--accent)",
  inferred: "var(--tier-2)",
};
const RANK: Evidence[] = ["inferred", "sourced", "tested"];

/** Weakest evidence among a step's claims (inferred when it has none). */
export function weakestEvidence(step: GStep, claims: GClaim[]): Evidence {
  const found = step.claimIds
    .map((id) => claims.find((c) => c.id === id)?.evidence)
    .filter((e): e is Evidence => !!e);
  if (!found.length) return "inferred";
  return found.reduce((a, b) => (RANK.indexOf(b) < RANK.indexOf(a) ? b : a));
}

/** Only http(s) URLs may become hrefs; anything else (javascript:, data:) renders as plain text. */
export function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
