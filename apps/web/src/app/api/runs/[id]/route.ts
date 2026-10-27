import { isSafeId, readEvents } from "@oauth-pilot/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSafeId(id)) return Response.json({ error: "invalid run id" }, { status: 400 });
  const events = await readEvents(id);
  if (events.length === 0) return Response.json({ error: "not found" }, { status: 404 });
  const done = events.find((e) => e.t === "done");
  const failed = events.find((e) => e.t === "error");
  const status = done ? "done" : failed ? "error" : "running";
  return Response.json({ status, events, ...(done && done.t === "done" ? { slug: done.slug } : {}) });
}
