import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { type Guide } from "@oauth-pilot/core";
import { buildGraph, runGuide } from "./graph";
import { now, type RunEvent, type RunInput } from "./events";
import { defaultStore, generatedDir, guidesDir } from "./store";
import { slugify } from "./fake";

const fixturesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/runs");

function parseArgs(argv: string[]) {
  const o: { app?: string; useCase?: string; tools?: string[]; out?: string; kind?: string; record: boolean } = { record: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const val = () => argv[++i];
    if (a === "--use-case") o.useCase = val();
    else if (a === "--tools") o.tools = (val() ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--out") o.out = val();
    else if (a === "--kind") o.kind = val();
    else if (a === "--record") o.record = true;
    else if (!a.startsWith("--") && !o.app) o.app = a;
  }
  return o;
}

/** Strip secrets and encrypted server-tool payloads before anything lands in a fixture. */
function scrub(value: unknown): unknown {
  const secrets = [process.env.ANTHROPIC_API_KEY, process.env.COMPOSIO_API_KEY, process.env.ANTHROPIC_BASE_URL].filter(
    (s): s is string => !!s && s.length > 8,
  );
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return secrets.reduce((s, x) => s.split(x).join("<redacted>"), v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = k === "encrypted_content" || k === "encrypted_index" ? "<trimmed>" : walk(x);
      return out;
    }
    return v;
  };
  return walk(value);
}

const NODE_ID_TO_FIXTURE: Record<string, string> = {
  intake: "intake",
  composio_lookup: "composio",
  docs_research: "research",
  probe: "probes",
};

/** Runs the graph like runGuide, but captures each node's update so it can be saved as a fixture. */
async function runRecording(input: RunInput, runId: string, outDir: string | undefined, emitOut: (e: RunEvent) => void): Promise<Guide> {
  const slug = slugify(input.app);
  const dir = path.join(fixturesRoot, slug);
  await mkdir(dir, { recursive: true });
  const emit = async (e: RunEvent) => {
    await defaultStore.appendEvent(runId, e);
    emitOut(e);
  };
  await emit({ t: "run_started", runId, input, at: now() });
  const config = { configurable: { emit, outDir }, signal: AbortSignal.timeout(300_000), streamMode: "updates" as const };
  const fixtures: Record<string, unknown> = {};
  let guide: Guide | null = null;
  const stream = await buildGraph(defaultStore).stream({ input, runId }, config);
  for await (const chunk of stream) {
    for (const [node, update] of Object.entries(chunk as Record<string, Record<string, unknown> | undefined>)) {
      if (!update) continue;
      if (node in NODE_ID_TO_FIXTURE) fixtures[NODE_ID_TO_FIXTURE[node]!] = update;
      else if (node === "draft_node" && update.draft) fixtures.draft = update.draft;
      else if (node === "verify" && update.draft) fixtures.verify = update.draft;
      else if (node === "finalize" && update.guide) guide = update.guide as Guide;
    }
  }
  if (!guide) {
    await emit({ t: "error", node: "finalize", msg: "no valid guide produced", at: now() });
    throw new Error("no valid guide produced");
  }
  // verify may degrade (no draft update); fall back to the draft so replay still works.
  fixtures.verify ??= fixtures.draft;
  for (const [name, data] of Object.entries(fixtures)) {
    await writeFile(path.join(dir, `${name}.json`), JSON.stringify(scrub(data), null, 2) + "\n");
  }
  await emit({ t: "done", slug: guide.slug, tier: guide.verdict.tier, at: now() });
  return guide;
}

function summary(guide: Guide, events: RunEvent[], total: number) {
  const dur: Record<string, number> = {};
  const starts: Record<string, number> = {};
  for (const e of events) {
    if (e.t === "node_started") starts[e.node] = Date.parse(e.at);
    if (e.t === "node_finished" && starts[e.node] !== undefined) dur[e.node] = (dur[e.node] ?? 0) + (Date.parse(e.at) - starts[e.node]!) / 1000;
  }
  const byEvidence: Record<string, number> = {};
  for (const c of guide.claims) byEvidence[c.evidence] = (byEvidence[c.evidence] ?? 0) + 1;
  console.log(`\nslug: ${guide.slug}  tier: ${guide.verdict.tier}  claims: ${guide.claims.length}`);
  console.log(`claims by evidence: ${JSON.stringify(byEvidence)}`);
  console.log(`open questions: ${guide.openQuestions.length}`);
  console.log(`node durations (s): ${Object.entries(dur).map(([k, v]) => `${k}=${v.toFixed(1)}`).join(" ")}`);
  console.log(`total: ${total.toFixed(1)} s`);
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.app) {
    console.error('usage: guide "<app or url>" [--use-case "..."] [--tools A,B] [--out <dir>] [--kind library|live] [--record]');
    process.exit(2);
  }
  if (o.kind && o.kind !== "library" && o.kind !== "live") {
    console.error("--kind must be library or live");
    process.exit(2);
  }
  const input: RunInput = { app: o.app, ...(o.useCase ? { useCase: o.useCase } : {}), ...(o.tools?.length ? { tools: o.tools } : {}) };
  const outDir = o.out ? path.resolve(o.out) : o.kind === "library" ? guidesDir() : generatedDir();
  const runId = `cli-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const events: RunEvent[] = [];
  const emit = (e: RunEvent) => {
    events.push(e);
    if (e.t === "node_started") console.log(`> ${e.node}`);
    else if (e.t === "node_finished") console.log(`< ${e.node}: ${e.summary}`);
    else if (e.t === "log") console.log(`  [${e.level ?? "info"}] ${e.node}: ${e.msg}`);
    else if (e.t === "error") console.error(`! ${e.msg}`);
  };
  const t0 = Date.now();
  const guide = o.record ? await runRecording(input, runId, outDir, emit) : await runGuide(input, { runId, emit, outDir });
  summary(guide, events, (Date.now() - t0) / 1000);
  console.log(`guide written to ${outDir}/${guide.slug}.json`);
  if (o.record) console.log(`fixtures saved to packages/agent/fixtures/runs/${slugify(input.app)}/`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
