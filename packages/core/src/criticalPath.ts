import type { Range, Step } from "./schema";

export interface CriticalPath {
  stepIds: string[];
  total: Range;
}

/** Longest path through the steps DAG by duration.maxHours, over non-optional steps. Cycle-safe. */
export function criticalPath(steps: Step[]): CriticalPath {
  const byId = new Map(steps.filter((s) => !s.optional).map((s) => [s.id, s]));
  const best = new Map<string, { max: number; prev?: string }>();
  const visiting = new Set<string>();

  const solve = (id: string): number => {
    const known = best.get(id);
    if (known) return known.max;
    const step = byId.get(id)!;
    if (visiting.has(id)) return 0; // cycle: break it (validateGuide reports it)
    visiting.add(id);
    let prev: string | undefined;
    let prevMax = 0;
    for (const d of step.dependsOn) {
      if (!byId.has(d)) continue;
      const m = solve(d);
      if (prev === undefined || m > prevMax) {
        prev = d;
        prevMax = m;
      }
    }
    visiting.delete(id);
    const max = prevMax + step.duration.maxHours;
    best.set(id, { max, prev });
    return max;
  };

  let end: string | undefined;
  let endMax = -1;
  for (const id of byId.keys()) {
    const m = solve(id);
    if (m > endMax) {
      endMax = m;
      end = id;
    }
  }

  const stepIds: string[] = [];
  const seen = new Set<string>();
  for (let cur = end; cur && !seen.has(cur); cur = best.get(cur)?.prev) {
    seen.add(cur);
    stepIds.unshift(cur);
  }

  const minH = stepIds.reduce((a, id) => a + byId.get(id)!.duration.minHours, 0);
  const maxH = stepIds.reduce((a, id) => a + byId.get(id)!.duration.maxHours, 0);
  return {
    stepIds,
    total: { minHours: minH, maxHours: maxH, label: `${minH}–${maxH} hours`, basis: "estimate", claimIds: [] },
  };
}
