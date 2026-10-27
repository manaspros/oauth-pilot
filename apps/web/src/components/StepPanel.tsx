"use client";
import type { Guide } from "@oauth-pilot/core";
import { ACTOR_META, EVIDENCE_COLOR, safeHref, type GStep } from "@/app/guides/[slug]/ui";

/** Minimal inline renderer: `code` spans and [label](url) links; line breaks preserved. */
export function Detail({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((p, i) => {
        if (p.startsWith("`") && p.endsWith("`") && p.length > 1)
          return <code key={i} className="rounded bg-paper px-1 font-mono text-[0.85em]">{p.slice(1, -1)}</code>;
        const m = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(p);
        if (m && safeHref(m[2])) return <a key={i} href={safeHref(m[2])!} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--accent)" }}>{m[1]}</a>;
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

export function StepPanel({ step, claims, onClose }: { step: GStep; claims: Guide["claims"]; onClose: () => void }) {
  const a = ACTOR_META[step.actor];
  const own = step.claimIds.map((id) => claims.find((c) => c.id === id)).filter((c): c is Guide["claims"][number] => !!c);
  return (
    <aside data-testid="step-panel" aria-label={`Step detail: ${step.title}`} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted">{a.emoji} {a.label} · {step.phase} · <span className="font-mono">{step.duration.label}</span></div>
          <h3 className="mt-0.5 text-base font-semibold">{step.title}</h3>
        </div>
        <button onClick={onClose} aria-label="Close panel" className="rounded border border-line px-2 py-0.5 text-sm">×</button>
      </div>
      <Detail text={step.detail} />
      {step.links.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs">
          {step.links.map((l) => {
            const href = safeHref(l.url);
            return (
              <li key={l.url}>
                {href ? <a href={href} target="_blank" rel="noreferrer" className="break-all font-mono underline" style={{ color: "var(--accent)" }}>{l.label}</a> : <span className="break-all font-mono text-muted">{l.label} ({l.url})</span>}
              </li>
            );
          })}
        </ul>
      )}
      {own.length > 0 && (
        <div className="border-t border-line pt-2">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Claims</div>
          <ul className="flex flex-col gap-1.5 text-xs">
            {own.map((c) => (
              <li key={c.id}>
                <span className="mr-1 rounded-full border px-1.5 py-0.5 font-medium" style={{ color: EVIDENCE_COLOR[c.evidence], borderColor: EVIDENCE_COLOR[c.evidence] }}>{c.evidence}</span>
                {c.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
