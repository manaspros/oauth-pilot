import { TIER_LABELS, tierColor } from "@/lib/tier";

/** Tier 0-4 as a five-pip gauge plus label; the filled pips carry the colour. */
export function TierBadge({ tier, label, compact }: { tier: number; label?: string; compact?: boolean }) {
  const text = label ?? TIER_LABELS[tier] ?? `Tier ${tier}`;
  return (
    <span
      data-testid="tier-badge"
      data-tier={tier}
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ borderColor: tierColor(tier), color: tierColor(tier) }}
    >
      <span aria-hidden className="inline-flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-2.5 w-1.5 rounded-[1px]"
            style={{ background: i <= tier ? tierColor(tier) : "var(--line)" }}
          />
        ))}
      </span>
      <span>{compact ? `Tier ${tier}` : `Tier ${tier} · ${text}`}</span>
    </span>
  );
}
