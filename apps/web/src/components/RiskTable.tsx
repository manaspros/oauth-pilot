import type { Guide } from "@oauth-pilot/core";

const ORDER = { blocker: 0, warning: 1, info: 2 } as const;
const COLOR = { blocker: "var(--tier-4)", warning: "var(--tier-2)", info: "var(--muted)" } as const;

export function RiskTable({ risks }: { risks: Guide["risks"] }) {
  if (!risks.length) return null;
  const sorted = [...risks].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  return (
    <section aria-label="Risks" className="mt-10">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">Risks</h2>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr><th className="p-3">Severity</th><th className="p-3">Risk</th><th className="p-3">Symptom</th><th className="p-3">Fix</th></tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} data-testid="risk-row" className="border-t border-line align-top">
                <td className="p-3">
                  <span className="rounded-full border px-2 py-0.5 text-xs font-medium" style={{ color: COLOR[r.severity], borderColor: COLOR[r.severity] }}>
                    {r.severity}{r.gate ? " · gate" : ""}
                  </span>
                </td>
                <td className="p-3 font-medium">{r.title}</td>
                <td className="p-3 font-mono text-xs text-muted">{r.symptom ?? "—"}</td>
                <td className="p-3">{r.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
