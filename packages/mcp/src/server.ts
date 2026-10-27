import { randomBytes } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Guide, criticalPath, renderMarkdown } from "@oauth-pilot/core";
import { getGuide, isSafeId, listGuides, readEvents, runGuide, slugify, type RunEvent } from "@oauth-pilot/agent";
import { bundledGuides } from "./shim";

const text = (t: string, isError = false) => ({ content: [{ type: "text" as const, text: t }], ...(isError ? { isError: true } : {}) });
const webUrl = (slug: string) => (process.env.OAUTH_PILOT_URL ? `${process.env.OAUTH_PILOT_URL.replace(/\/$/, "")}/guides/${slug}` : undefined);

/** Library guides on disk, then the guides bundled at build time for any slug not found. */
async function allGuides(): Promise<{ slug: string; guide: Guide; source: string }[]> {
  const out = new Map<string, { slug: string; guide: Guide; source: string }>();
  for (const raw of bundledGuides()) {
    const p = Guide.safeParse(raw);
    if (p.success) out.set(p.data.slug, { slug: p.data.slug, guide: p.data, source: "library" });
  }
  for (const e of await listGuides()) out.set(e.slug, e);
  return [...out.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

async function findGuide(slug: string, preferGenerated = false): Promise<Guide | null> {
  return (await getGuide(slug, { preferGenerated })) ?? (await allGuides()).find((g) => g.slug === slug)?.guide ?? null;
}

const fmtEvent = (e: RunEvent): string => {
  switch (e.t) {
    case "run_started": return `${e.at} run started for ${e.input.app}`;
    case "node_started": return `${e.at} ${e.node} started`;
    case "node_finished": return `${e.at} ${e.node} finished${e.status === "degraded" ? " (degraded)" : ""}: ${e.summary}`;
    case "log": return `${e.at} [${e.level ?? "info"}] ${e.node}: ${e.msg}`;
    case "done": return `${e.at} done: ${e.slug} (tier ${e.tier})`;
    case "error": return `${e.at} error${e.node ? ` in ${e.node}` : ""}: ${e.msg}`;
  }
};

export function createServer(): McpServer {
  const server = new McpServer({ name: "oauth-pilot", version: "0.1.0" });
  const started = new Map<string, { app: string; at: number }>();

  server.registerTool(
    "oauth_guide_list",
    {
      description:
        "List the OAuth setup guides available offline (library guides plus ones generated earlier on this machine). Returns a table of slug, tier and headline. Call this first to see whether the app you need is already covered before starting a new run.",
      inputSchema: {},
    },
    async () => {
      const rows = await allGuides();
      if (!rows.length) return text("No guides yet. Use oauth_guide_start to generate one.");
      const lines = ["| slug | tier | source | headline |", "|---|---|---|---|"];
      for (const r of rows) lines.push(`| ${r.slug} | ${r.guide.verdict.tier} ${r.guide.verdict.tierLabel} | ${r.source} | ${r.guide.verdict.headline.replace(/\|/g, "\\|")} |`);
      return text(lines.join("\n"));
    },
  );

  server.registerTool(
    "oauth_guide_get",
    {
      description:
        "Get one OAuth guide as markdown (verdict, time estimates, Composio recommendation, critical path, steps, risks, and an evidence ledger). Use a slug from oauth_guide_list or a finished run.",
      inputSchema: { slug: z.string().describe("Guide slug, e.g. 'linear' or 'gmail'") },
    },
    async ({ slug }) => {
      if (!isSafeId(slug)) return text(`Invalid slug ${JSON.stringify(slug)}.`, true);
      const g = await findGuide(slug);
      if (!g) return text(`No guide named '${slug}'. Call oauth_guide_list, or oauth_guide_start to generate one.`, true);
      const url = webUrl(slug);
      return text(renderMarkdown(g) + (url ? `\n\nWeb: ${url}\n` : ""));
    },
  );

  server.registerTool(
    "oauth_guide_start",
    {
      description:
        "Start an autonomous research run that produces an OAuth setup guide for an app. Returns immediately with a run_id; the run takes a few minutes. Keep working on other things, then call oauth_guide_status with the run_id roughly every 20 seconds until it reports done.",
      inputSchema: {
        app: z.string().min(1).describe("App or provider name or website, e.g. 'Calendly'"),
        use_case: z.string().optional().describe("What the integration will do, e.g. 'read and create meetings on behalf of users'"),
        tools: z.array(z.string()).optional().describe("Specific tools/actions needed, e.g. ['list_events']"),
      },
    },
    async ({ app, use_case, tools }) => {
      const slug = slugify(app) || "app";
      const runId = `${slug}-${randomBytes(4).toString("hex")}`;
      started.set(runId, { app, at: Date.now() });
      // Fire and forget: failures are recorded as error events in the run log.
      runGuide({ app, useCase: use_case, tools }, { runId }).catch((e) => console.error(`run ${runId} failed:`, e instanceof Error ? e.message : e));
      const web = webUrl(slug);
      return text(
        JSON.stringify(
          {
            run_id: runId,
            status_url: `oauth_guide_status {"run_id":"${runId}"}`,
            ...(web ? { web_url: web } : {}),
            next: "Poll oauth_guide_status every ~20 s.",
          },
          null,
          2,
        ),
      );
    },
  );

  server.registerTool(
    "oauth_guide_status",
    {
      description:
        "Check a run started with oauth_guide_start. While running it returns the latest progress events; when finished it returns the verdict (tier, time to first connection and to production), the first three critical-path actions with who does them, blockers, and the guide's web URL. Then call oauth_guide_get for the full guide.",
      inputSchema: { run_id: z.string().describe("The run_id returned by oauth_guide_start") },
    },
    async ({ run_id }) => {
      if (!isSafeId(run_id)) return text(`Invalid run_id ${JSON.stringify(run_id)}.`, true);
      const events = await readEvents(run_id);
      if (!events.length) return text(started.has(run_id) ? "Run is starting; no events yet. Poll again in ~20 s." : `Unknown run_id '${run_id}'.`, !started.has(run_id));

      const err = [...events].reverse().find((e) => e.t === "error");
      const done = events.find((e) => e.t === "done");
      if (!done) {
        if (err) return text(`Run FAILED.\n${fmtEvent(err)}`, true);
        return text(`Running. Poll again in ~20 s. Last events:\n${events.slice(-5).map(fmtEvent).join("\n")}`);
      }
      const slug = (done as Extract<RunEvent, { t: "done" }>).slug;
      const g = await findGuide(slug, true);
      if (!g) return text(`Run finished (slug ${slug}) but the guide file was not found.`, true);
      const v = g.verdict;
      const cp = criticalPath(g.steps);
      const byId = new Map(g.steps.map((s) => [s.id, s]));
      const next = cp.stepIds.slice(0, 3).map((id, i) => {
        const s = byId.get(id)!;
        return `${i + 1}. [${s.actor}] ${s.title} (${s.duration.label})`;
      });
      const blockers = g.risks.filter((r) => r.severity === "blocker").map((r) => `- ${r.title}: ${r.fix}`);
      const url = webUrl(slug);
      return text(
        [
          `Done. ${g.app.name}: tier ${v.tier} (${v.tierLabel}). ${v.headline}`,
          `Time to first connection: ${v.timeToFirstConnection.label}. Time to production: ${v.timeToProduction.label}. Hands-on effort: ${v.activeEffort.label}. Confidence: ${v.confidence}.`,
          `Start today: ${v.startToday}`,
          `Next actions:\n${next.join("\n") || "(none)"}`,
          `Blockers:\n${blockers.join("\n") || "(none)"}`,
          `Full guide: call oauth_guide_get {"slug":"${slug}"}${url ? ` or open ${url}` : ""}`,
        ].join("\n\n"),
      );
    },
  );

  return server;
}
