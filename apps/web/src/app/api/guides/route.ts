import { listGuides } from "@oauth-pilot/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await listGuides();
  return Response.json(
    entries.map(({ slug, guide, source }) => ({
      slug,
      name: guide.app.name,
      tier: guide.verdict.tier,
      tierLabel: guide.verdict.tierLabel,
      headline: guide.verdict.headline,
      timeToProduction: guide.verdict.timeToProduction.label,
      source,
    })),
  );
}
