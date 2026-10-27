import { getGuide, isSafeId } from "@oauth-pilot/agent";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSafeId(slug)) return Response.json({ error: "invalid slug" }, { status: 400 });
  const guide = await getGuide(slug, { preferGenerated: req.nextUrl.searchParams.get("generated") === "1" });
  if (!guide) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(guide);
}
