import Link from "next/link";
import { TierBadge } from "./TierBadge";
import { tierColor } from "@/lib/tier";

export type GuideSummary = {
  slug: string;
  name: string;
  tier: number;
  tierLabel: string;
  headline: string;
  timeToFirstConnection: string;
  timeToProduction: string;
  composio: "managed" | "own app";
  source: "library" | "generated";
};

export function GuideCard({ g }: { g: GuideSummary }) {
  return (
    <Link
      href={`/guides/${g.slug}`}
      data-testid="guide-card"
      data-tier={g.tier}
      className="group flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-accent"
      style={{ borderLeft: `4px solid ${tierColor(g.tier)}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-md bg-ink font-mono text-sm font-semibold text-paper"
          >
            {g.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-base font-semibold">{g.name}</span>
        </div>
        <TierBadge tier={g.tier} label={g.tierLabel} compact />
      </div>
      <p className="text-sm leading-relaxed text-muted">{g.headline}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          First connection <b className="font-mono text-ink">{g.timeToFirstConnection}</b> · production{" "}
          <b className="font-mono text-ink">{g.timeToProduction}</b>
        </span>
        <span className="rounded border border-line px-1.5 py-0.5">Composio {g.composio}</span>
      </div>
    </Link>
  );
}
