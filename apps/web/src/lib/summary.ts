import type { Guide } from "@oauth-pilot/core";
import type { GuideSummary } from "@/components/GuideCard";

export function summarize(slug: string, guide: Guide, source: "library" | "generated"): GuideSummary {
  return {
    slug,
    name: guide.app.name,
    tier: guide.verdict.tier,
    tierLabel: guide.verdict.tierLabel,
    headline: guide.verdict.headline,
    timeToFirstConnection: guide.verdict.timeToFirstConnection.label,
    timeToProduction: guide.verdict.timeToProduction.label,
    composio: guide.composio.managedAvailable ? "managed" : "own app",
    source,
  };
}
