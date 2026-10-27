import { getGuide, isSafeId } from "@oauth-pilot/agent";
import { criticalPath } from "@oauth-pilot/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClockTiles } from "@/components/ClockTiles";
import { CriticalPathFlow } from "@/components/CriticalPathFlow";
import { EvidenceLedger } from "@/components/EvidenceLedger";
import { RiskTable } from "@/components/RiskTable";
import { StartToday } from "@/components/StartToday";
import { TierBadge } from "@/components/TierBadge";
import { Timeline } from "@/components/Timeline";
import { Actions, CopyButton } from "./Actions";
import { PhaseChecklist } from "./PhaseChecklist";
import { ACTOR_META, ACTORS } from "./ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ generated?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = isSafeId(slug) ? await getGuide(slug) : null;
  return { title: g ? `${g.app.name} OAuth guide · oauth-pilot` : "Guide · oauth-pilot" };
}

const SENS_COLOR: Record<string, string> = {
  basic: "var(--tier-0)", sensitive: "var(--tier-2)", restricted: "var(--tier-3)", admin: "var(--tier-4)", unknown: "var(--muted)",
};
const REC: Record<string, string> = {
  use_managed: "Use Composio managed auth",
  managed_then_own: "Start managed, then register your own app",
  own_app_now: "Register your own app now",
};

export default async function GuidePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { generated } = await searchParams;
  if (!isSafeId(slug)) notFound();
  const guide = await getGuide(slug, { preferGenerated: generated === "1" });
  if (!guide) notFound();
  const cp = criticalPath(guide.steps);
  const v = guide.verdict;

  return (
    <article className="pt-10">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <TierBadge tier={v.tier} label={v.tierLabel} />
          <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted" data-testid="confidence">
            {v.confidence} confidence
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{guide.app.name}</h1>
        <p className="mt-2 max-w-3xl text-lg leading-snug text-muted">{v.headline}</p>
        <div className="mt-5"><ClockTiles verdict={v} /></div>
        <div className="mt-3 rounded-lg border border-line bg-surface p-4 text-sm" data-testid="composio-reco">
          <div className="font-semibold">Composio: {REC[guide.composio.recommendation] ?? guide.composio.recommendation}</div>
          <p className="mt-1 text-muted">{guide.composio.why}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Callback URL</span>
            <code className="break-all rounded bg-paper px-1.5 py-0.5 font-mono text-xs">{guide.composio.callbackUrl}</code>
            <CopyButton text={guide.composio.callbackUrl} />
          </div>
        </div>
      </header>

      <div className="mt-6"><StartToday text={v.startToday} /></div>
      <Timeline steps={guide.steps} pathIds={cp.stepIds} total={cp.total.maxHours >= 24 ? `${Math.round(cp.total.maxHours / 24)} days` : `${cp.total.minHours.toFixed(1)}-${cp.total.maxHours.toFixed(1)} h`} />
      <CriticalPathFlow guide={guide} pathIds={cp.stepIds} />
      <PhaseChecklist slug={slug} steps={guide.steps} />

      <section aria-label="Scopes" className="mt-10">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Scopes</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Scope</th><th className="p-3">Sensitivity</th><th className="p-3">Needed for</th></tr>
            </thead>
            <tbody>
              {guide.scopes.map((s) => (
                <tr key={s.scope} className="border-t border-line">
                  <td className="p-3 font-mono text-xs">{s.scope}</td>
                  <td className="p-3"><span className="text-xs font-medium" style={{ color: SENS_COLOR[s.sensitivity] }}>{s.sensitivity}</span></td>
                  <td className="p-3 font-mono text-xs text-muted">{s.neededFor.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Requirements" className="mt-10">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Requirements</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACTORS.map((a) => {
            const list = guide.requirements.filter((r) => r.owner === a);
            if (!list.length) return null;
            return (
              <div key={a} className="rounded-lg border border-line bg-surface p-4">
                <div className="mb-1.5 text-sm font-semibold">{ACTOR_META[a].emoji} {ACTOR_META[a].label}</div>
                <ul className="flex flex-col gap-1 text-sm">
                  {list.map((r) => (
                    <li key={r.id}>
                      {r.item} <span className="text-xs text-muted">· {r.neededFor}{r.gate ? " · gate" : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <RiskTable risks={guide.risks} />
      <EvidenceLedger claims={guide.claims} openQuestions={guide.openQuestions} />
      <Actions slug={slug} generatedAt={guide.generatedAt} model={guide.generator.model} />
    </article>
  );
}
