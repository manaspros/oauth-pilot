"use client";
import { useEffect, useRef } from "react";

export type LogLine = { id: number; at: string; node?: string; msg: string; level: "info" | "warn" | "error" };

export function RunLog({ lines }: { lines: LogLine[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);
  return (
    <div data-testid="run-log" aria-live="polite" className="h-[360px] overflow-y-auto rounded-lg border border-line bg-surface p-3 font-mono text-[11.5px] leading-relaxed">
      {lines.length === 0 && <p className="text-muted">Waiting for the first event…</p>}
      {lines.map((l) => (
        <div key={l.id} data-testid="log-line" className="break-words">
          <span className="text-muted">{l.at.slice(11, 19)} </span>
          {l.node && <span style={{ color: "var(--accent)" }}>{l.node} </span>}
          <span style={{ color: l.level === "warn" ? "var(--tier-2)" : l.level === "error" ? "var(--tier-4)" : undefined }}>{l.msg}</span>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}
