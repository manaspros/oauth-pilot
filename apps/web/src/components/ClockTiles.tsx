import type { Guide } from "@oauth-pilot/core";

type Range = Guide["verdict"]["timeToProduction"];

function Tile({ label, range, testid }: { label: string; range: Range; testid: string }) {
  return (
    <div data-testid={testid} className="rounded-lg border border-line bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tracking-tight">{range.label}</div>
      <div className="mt-1 text-xs text-muted">{range.basis === "sourced" ? "sourced from provider docs" : "estimate"}</div>
    </div>
  );
}

export function ClockTiles({ verdict }: { verdict: Guide["verdict"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Tile testid="tile-first" label="First connection" range={verdict.timeToFirstConnection} />
      <Tile testid="tile-prod" label="Production" range={verdict.timeToProduction} />
      <Tile testid="tile-effort" label="Hands-on effort" range={verdict.activeEffort} />
    </div>
  );
}
