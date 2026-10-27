"use client";
import type { RunEvent } from "@oauth-pilot/agent";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AgentRunFlow, RUN_NODES, type NodeState, type RunNodeName } from "@/components/AgentRunFlow";
import { RunLog, type LogLine } from "@/components/RunLog";

type Terminal = { kind: "done"; slug: string } | { kind: "error"; msg: string } | null;

function derive(events: RunEvent[]) {
  const states = Object.fromEntries(RUN_NODES.map((n) => [n, { status: "pending" } as NodeState])) as Record<RunNodeName, NodeState>;
  const lines: LogLine[] = [];
  let app = "";
  let terminal = null as Terminal;
  events.forEach((e, i) => {
    switch (e.t) {
      case "run_started": app = e.input.app; lines.push({ id: i, at: e.at, msg: `run started for "${e.input.app}"`, level: "info" }); break;
      case "node_started": states[e.node] = { status: "running" }; lines.push({ id: i, at: e.at, node: e.node, msg: "started", level: "info" }); break;
      case "node_finished":
        states[e.node] = { status: e.status === "degraded" ? "degraded" : "done", summary: e.summary };
        lines.push({ id: i, at: e.at, node: e.node, msg: `finished: ${e.summary}`, level: e.status === "degraded" ? "warn" : "info" });
        break;
      case "log": lines.push({ id: i, at: e.at, node: e.node, msg: e.msg, level: e.level === "warn" ? "warn" : "info" }); break;
      case "done": terminal = { kind: "done", slug: e.slug }; lines.push({ id: i, at: e.at, msg: `done: ${e.slug} (tier ${e.tier})`, level: "info" }); break;
      case "error": terminal = { kind: "error", msg: e.msg }; lines.push({ id: i, at: e.at, node: e.node, msg: e.msg, level: "error" }); break;
    }
  });
  return { states, lines, app, terminal };
}

export function RunView({ runId }: { runId: string }) {
  const router = useRouter();
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [lost, setLost] = useState(false);
  const { states, lines, app, terminal } = useMemo(() => derive(events), [events]);
  const finished = terminal !== null;

  useEffect(() => {
    const es = new EventSource(`/api/runs/${encodeURIComponent(runId)}/events`);
    let over = false;
    // A reconnect replays the log from the start, so reset on every open.
    es.onopen = () => { setEvents([]); setLost(false); };
    es.onmessage = (m) => {
      try {
        const ev = JSON.parse(m.data) as RunEvent;
        setEvents((prev) => [...prev, ev]);
        if (ev.t === "done" || ev.t === "error") { over = true; es.close(); }
      } catch { /* ignore malformed frame */ }
    };
    es.onerror = () => { if (!over) setLost(true); };
    return () => es.close();
  }, [runId]);

  useEffect(() => {
    if (terminal?.kind !== "done") return;
    const t = setTimeout(() => router.push(`/guides/${terminal.slug}?generated=1`), 1500);
    return () => clearTimeout(t);
  }, [terminal, router]);

  const doneCount = RUN_NODES.filter((n) => states[n].status === "done" || states[n].status === "degraded").length;

  return (
    <section className="pt-10">
      <p className="font-mono text-xs text-muted">run {runId}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{app ? `Researching ${app}` : "Starting the research agent"}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Intake fans out to three parallel researchers, the Elephant drafts the guide, then a fresh-context Goldfish checks every sourced claim.
      </p>

      {terminal?.kind === "done" && (
        <div data-testid="run-banner" role="status" className="mt-5 flex items-center justify-between rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--tier-0)" }}>
          <span><strong style={{ color: "var(--tier-0)" }}>Guide ready.</strong> Opening it now…</span>
          <Link href={`/guides/${terminal.slug}?generated=1`} className="font-semibold text-accent underline">Open guide</Link>
        </div>
      )}
      {terminal?.kind === "error" && (
        <div data-testid="run-error" role="alert" className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--tier-4)" }}>
          <strong style={{ color: "var(--tier-4)" }}>The run stopped.</strong> {terminal.msg}
          {doneCount > 0 && <span className="text-muted"> ({doneCount} of {RUN_NODES.length} stages had finished; no guide was saved.)</span>}
          <div className="mt-2"><Link href="/" className="font-semibold text-accent underline">Retry from the home page</Link></div>
        </div>
      )}
      {lost && !finished && <p role="status" className="mt-4 text-sm" style={{ color: "var(--tier-2)" }}>Connection lost, reconnecting…</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between font-mono text-xs text-muted">
            <span>agent graph</span>
            <span data-testid="run-progress">{doneCount}/{RUN_NODES.length} stages</span>
          </div>
          <AgentRunFlow states={states} />
        </div>
        <div className="min-w-0">
          <div className="mb-2 font-mono text-xs text-muted">log</div>
          <RunLog lines={lines} />
        </div>
      </div>
    </section>
  );
}
