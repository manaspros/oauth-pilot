import type { Guide } from "@oauth-pilot/core";
import { EVIDENCE_COLOR, safeHref } from "@/app/guides/[slug]/ui";

export function EvidenceLedger({ claims, openQuestions }: { claims: Guide["claims"]; openQuestions: string[] }) {
  const n = (e: string) => claims.filter((c) => c.evidence === e).length;
  return (
    <section aria-label="Evidence ledger" className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">Evidence ledger</h2>
      <p data-testid="ledger-counts" className="mt-1 text-sm text-muted">
        {n("sourced")} sourced · {n("tested")} tested · {n("inferred")} inferred · {openQuestions.length} open question
        {openQuestions.length === 1 ? "" : "s"}
      </p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr><th className="p-3">Claim</th><th className="p-3">Evidence</th><th className="p-3">Confidence</th><th className="p-3">Verifier</th><th className="p-3">Sources</th></tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} data-testid="claim-row" data-evidence={c.evidence} className="border-t border-line align-top">
                <td className="p-3">
                  <span className="mr-1.5 font-mono text-xs text-muted">{c.id}</span>
                  {c.text}
                  {c.testedHow && <div className="mt-1 text-xs text-muted">Tested: {c.testedHow}</div>}
                </td>
                <td className="p-3">
                  <span className="rounded-full border px-2 py-0.5 text-xs font-medium" style={{ color: EVIDENCE_COLOR[c.evidence], borderColor: EVIDENCE_COLOR[c.evidence] }}>
                    {c.evidence}
                  </span>
                </td>
                <td className="p-3 text-xs">{c.confidence}</td>
                <td className="p-3 text-xs" title={c.verifier?.note}>{(c.verifier?.verdict ?? "not_checked").replace(/_/g, " ")}</td>
                <td className="p-3 text-xs">
                  {c.sources.length === 0 ? <span className="text-muted">—</span> : (
                    <ul className="flex flex-col gap-1">
                      {c.sources.map((s, i) => {
                        const href = safeHref(s.url);
                        return (
                        <li key={i}>
                          {!href ? <span className="break-all font-mono text-muted">{s.title || s.url}</span> : <a href={href} target="_blank" rel="noreferrer" title={s.quote ?? s.title} className="break-all font-mono underline decoration-dotted underline-offset-2" style={{ color: "var(--accent)" }}>
                            {s.title || s.url}
                          </a>}
                        </li>
                        );
                      })}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openQuestions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Open questions</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">
            {openQuestions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
