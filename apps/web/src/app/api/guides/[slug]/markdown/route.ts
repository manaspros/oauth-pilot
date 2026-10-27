import { getGuide, isSafeId } from "@oauth-pilot/agent";
import { renderMarkdown } from "@oauth-pilot/core";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSafeId(slug)) return new Response("invalid slug", { status: 400 });
  const guide = await getGuide(slug, { preferGenerated: req.nextUrl.searchParams.get("generated") === "1" });
  if (!guide) return new Response("not found", { status: 404 });
  return new Response(renderMarkdown(guide), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
