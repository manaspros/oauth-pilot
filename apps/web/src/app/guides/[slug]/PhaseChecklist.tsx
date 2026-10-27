"use client";
import type { Guide } from "@oauth-pilot/core";
import { useEffect, useState } from "react";
import { Detail } from "@/components/StepPanel";
import { ACTOR_META } from "./ui";

const PHASES = ["prepare", "register", "configure", "connect", "review", "launch"] as const;

/** Steps grouped by phase. Checkbox state is a per-slug localStorage convenience only. */
export function PhaseChecklist({ slug, steps }: { slug: string; steps: Guide["steps"] }) {
  const key = `oauth-pilot:checked:${slug}`;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch {}
  }, [key]);
  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };
  return (
    <section aria-label="Steps by phase" className="mt-10">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">All steps by phase</h2>
      <div className="flex flex-col gap-5">
        {PHASES.map((p) => {
          const list = steps.filter((s) => s.phase === p);
          if (!list.length) return null;
          return (
            <div key={p}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{p}</h3>
              <ul className="flex flex-col gap-1.5">
                {list.map((s) => (
                  <li key={s.id} className="rounded-lg border border-line bg-surface p-3">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input type="checkbox" className="mt-1" checked={done.includes(s.id)} onChange={() => toggle(s.id)} />
                      <span className="min-w-0 flex-1">
                        <span className={done.includes(s.id) ? "text-muted line-through" : "font-medium"}>{s.title}</span>
                        {s.optional && <span className="ml-2 text-xs text-muted">(optional)</span>}
                        <span className="ml-2 text-xs text-muted">{ACTOR_META[s.actor].emoji} {s.duration.label}</span>
                      </span>
                    </label>
                    <details className="ml-6 mt-1">
                      <summary className="cursor-pointer text-xs text-muted">Detail</summary>
                      <div className="mt-1.5"><Detail text={s.detail} /></div>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
