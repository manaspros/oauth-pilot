"use client";
import { useState } from "react";
import { GuideCard, type GuideSummary } from "./GuideCard";
import { TIER_LABELS, tierColor } from "@/lib/tier";

export function Library({ guides }: { guides: GuideSummary[] }) {
  const [tier, setTier] = useState<number | null>(null);
  const shown = tier === null ? guides : guides.filter((g) => g.tier === tier);
  const chip = "rounded-full border px-3 py-1 text-xs font-medium";
  return (
    <section aria-label="Guide library" className="mt-12">
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by tier">
        <button
          onClick={() => setTier(null)}
          aria-pressed={tier === null}
          className={chip}
          style={tier === null ? { background: "var(--ink)", color: "var(--paper)", borderColor: "var(--ink)" } : { borderColor: "var(--line)" }}
        >
          All ({guides.length})
        </button>
        {TIER_LABELS.map((label, t) => {
          const n = guides.filter((g) => g.tier === t).length;
          if (!n) return null;
          const on = tier === t;
          return (
            <button
              key={t}
              onClick={() => setTier(on ? null : t)}
              aria-pressed={on}
              className={chip}
              style={on ? { background: tierColor(t), color: "#fff", borderColor: tierColor(t) } : { borderColor: tierColor(t), color: tierColor(t) }}
            >
              Tier {t} · {label} ({n})
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">No guides yet. Enter an app above to generate the first one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((g) => (
            <GuideCard key={g.slug} g={g} />
          ))}
        </div>
      )}
    </section>
  );
}
