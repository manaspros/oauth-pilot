import { isSafeId, readEvents } from "@oauth-pilot/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_MS = 250;
const MAX_MS = 6 * 60_000;
const NOT_FOUND_MS = 5_000;

/** SSE: replay the JSONL log, then tail it until a `done` or `error` event. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSafeId(id)) return Response.json({ error: "invalid run id" }, { status: 400 });
  const enc = new TextEncoder();
  const started = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let sent = 0;
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", close);
      const send = (data: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        while (!closed) {
          const events = await readEvents(id);
          for (; sent < events.length; sent++) {
            const ev = events[sent];
            send(ev);
            if (ev.t === "done" || ev.t === "error") return close();
          }
          const waited = Date.now() - started;
          if (events.length === 0 && waited > NOT_FOUND_MS) {
            send({ t: "error", msg: "Run not found.", at: new Date().toISOString() });
            return close();
          }
          if (waited > MAX_MS) {
            send({ t: "error", msg: "Stopped following this run after 6 minutes.", at: new Date().toISOString() });
            return close();
          }
          await new Promise((r) => setTimeout(r, POLL_MS));
        }
      } catch (e) {
        if (!closed) send({ t: "error", msg: e instanceof Error ? e.message : String(e), at: new Date().toISOString() });
        close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
