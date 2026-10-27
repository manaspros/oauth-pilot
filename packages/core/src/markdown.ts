import type { Guide, Range, Step, Claim } from "./schema";
import { criticalPath } from "./criticalPath";

const ACTOR: Record<string, string> = {
  agent: "🤖 Agent can do this",
  developer: "🧑‍💻 Developer",
  admin: "🏢 Admin",
  provider: "⏳ Provider",
};
const EMOJI: Record<string, string> = { agent: "🤖", developer: "🧑‍💻", admin: "🏢", provider: "⏳" };
const PHASES = ["prepare", "register", "configure", "connect", "review", "launch"] as const;
const BADGE: Record<Claim["evidence"], string> = { tested: "✅ tested", sourced: "📄 sourced", inferred: "💭 inferred" };

const fn = (ids: string[]) => (ids.length ? " " + ids.map((i) => `[^${i}]`).join("") : "");
const range = (r: Range) => `${r.label} (${r.basis})${fn(r.claimIds)}`;
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function renderMarkdown(guide: Guide): string {
  const g = guide;
  const out: string[] = [];
  const byId = new Map(g.steps.map((s) => [s.id, s]));

  out.push(`# ${g.app.name} OAuth guide`, "");
  out.push(`> **Tier ${g.verdict.tier} · ${g.verdict.tierLabel}**: ${g.verdict.headline}${fn(g.verdict.claimIds)}`);
  out.push(">");
  out.push(`> - First connection: ${range(g.verdict.timeToFirstConnection)}`);
  out.push(`> - Production: ${range(g.verdict.timeToProduction)}`);
  out.push(`> - Hands-on effort: ${range(g.verdict.activeEffort)}`);
  out.push(`> - Confidence: ${g.verdict.confidence}`, "");
  out.push(`Use case: ${g.useCase.summary}`, "");

  out.push("## Composio recommendation", "");
  out.push(`**${g.composio.recommendation}**${fn(g.composio.claimIds)}: ${g.composio.why}`, "");
  out.push(`Toolkit found: ${g.composio.toolkitFound ? "yes" : "no"}; managed auth available: ${g.composio.managedAvailable ? "yes" : "no"}. Callback URL: \`${g.composio.callbackUrl}\``, "");

  out.push(`## Start today`, "", `**Start today:** ${g.verdict.startToday}`, "");

  const cp = criticalPath(g.steps);
  out.push("## Critical path", "");
  cp.stepIds.forEach((id, i) => {
    const s = byId.get(id)!;
    out.push(`${i + 1}. ${EMOJI[s.actor]} ${s.title} (${s.duration.label})${fn(s.claimIds)}`);
  });
  out.push("", `Total: ${cp.total.label}`, "");

  out.push("## Steps", "");
  const step = (s: Step) => {
    out.push(`#### ${s.title}${s.optional ? " (optional)" : ""}`, "");
    out.push(`${ACTOR[s.actor]} · ${s.duration.label} (${s.duration.basis})${s.dependsOn.length ? ` · after ${s.dependsOn.join(", ")}` : ""}${fn(s.claimIds)}`, "");
    out.push(s.detail, "");
    for (const l of s.links) out.push(`- [${l.label}](${l.url})`);
    if (s.links.length) out.push("");
  };
  for (const p of PHASES) {
    const ss = g.steps.filter((s) => s.phase === p);
    if (!ss.length) continue;
    out.push(`### ${p[0].toUpperCase()}${p.slice(1)}`, "");
    ss.forEach(step);
  }

  out.push("## Requirements", "");
  if (g.requirements.length === 0) out.push("None.", "");
  else {
    out.push("| Item | Owner | Needed for | Gate |", "|---|---|---|---|");
    for (const r of g.requirements)
      out.push(`| ${cell(r.item)}${fn(r.claimIds)} | ${EMOJI[r.owner]} ${r.owner} | ${r.neededFor} | ${r.gate ? "yes" : "no"} |`);
    out.push("");
  }

  out.push("## Risks", "");
  if (g.risks.length === 0) out.push("None.", "");
  else {
    out.push("| Severity | Risk | Symptom | Fix |", "|---|---|---|---|");
    for (const r of g.risks)
      out.push(`| ${r.severity}${r.gate ? " (gate)" : ""} | ${cell(r.title)}${fn(r.claimIds)} | ${cell(r.symptom ?? "")} | ${cell(r.fix)} |`);
    out.push("");
  }

  out.push("## Scopes", "");
  if (g.scopes.length === 0) out.push("None.", "");
  else {
    out.push("| Scope | Sensitivity | Needed for |", "|---|---|---|");
    for (const s of g.scopes)
      out.push(`| \`${cell(s.scope)}\`${fn(s.claimIds)} | ${s.sensitivity} | ${cell(s.neededFor.join(", "))} |`);
    out.push("");
  }

  out.push("## Evidence ledger", "");
  for (const c of g.claims) {
    const links = c.sources.map((s) => `[${s.title}](${s.url})`).join(", ");
    const how = c.testedHow ? ` Tested: ${c.testedHow}` : "";
    const v = c.verifier ? ` Verifier: ${c.verifier.verdict}.` : "";
    out.push(`[^${c.id}]: ${BADGE[c.evidence]} (${c.confidence}) ${c.text}${how}${v}${links ? " Sources: " + links : ""}`);
  }
  out.push("");

  out.push("## Open questions", "");
  if (g.openQuestions.length === 0) out.push("None.");
  else for (const q of g.openQuestions) out.push(`- ${q}`);
  out.push("");
  return out.join("\n");
}
