import { ACTOR_META, type GStep } from "@/app/guides/[slug]/ui";

export function Timeline({ steps, pathIds, total }: { steps: GStep[]; pathIds: string[]; total: string }) {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const items = pathIds.map((id) => byId.get(id)).filter((s): s is GStep => !!s);
  return (
    <section aria-label="Critical path" className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Critical path</h2>
        <span className="text-sm text-muted">
          {items.length} steps · about <b className="font-mono text-ink">{total}</b> end to end
        </span>
      </div>
      <ol data-testid="timeline" className="relative flex flex-col gap-2">
        {items.map((s, i) => {
          const wait = s.actor === "provider";
          const a = ACTOR_META[s.actor];
          return (
            <li
              key={s.id}
              data-testid="timeline-item"
              data-wait={wait}
              className="flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5"
              style={{
                borderColor: wait ? "var(--tier-2)" : "var(--line)",
                borderStyle: wait ? "dashed" : "solid",
                background: wait ? "color-mix(in srgb, var(--tier-2) 10%, var(--surface))" : undefined,
              }}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-mono text-xs font-semibold text-paper">
                {i + 1}
              </span>
              <span aria-hidden className="text-lg" title={a.label}>{a.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-muted">
                  {a.label}
                  {wait ? " · waiting on the provider" : ""}
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm">{s.duration.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

