import { END, START, StateGraph } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { Guide } from "@oauth-pilot/core";
import { type Emit, type NodeName, type RunInput, now } from "./events";
import { slugify } from "./fake";
import { GraphState, type State } from "./state";
import { defaultStore, type Store } from "./store";
import { getEmit, type NodeFn } from "./nodes/common";
import { intake } from "./nodes/intake";
import { composioLookup } from "./nodes/composio";
import { docsResearch } from "./nodes/research";
import { probe } from "./nodes/probe";
import { draft } from "./nodes/draft";
import { verify } from "./nodes/verify";
import { finalizeDraft, makeFinalize } from "./nodes/finalize";

function summarize(node: NodeName, update: Record<string, unknown> | undefined): string {
  if (!update) return "done";
  const len = (k: string) => (Array.isArray(update[k]) ? (update[k] as unknown[]).length : 0);
  switch (node) {
    case "intake":
      return `target ${(update.target as { name?: string } | undefined)?.name ?? "?"}`;
    case "composio_lookup":
      return (update.composio as { toolkitFound?: boolean } | undefined)?.toolkitFound ? "toolkit found" : "toolkit not found";
    case "docs_research":
      return `${len("research")} notes`;
    case "probe":
      return `${len("probes")} probes`;
    case "finalize":
      return update.guide ? "guide valid" : `${len("issues")} validation issues`;
    default:
      return "ok";
  }
}

/** Wraps a node so it emits node_started / node_finished and reports failures. */
function instrument(node: NodeName, fn: NodeFn): NodeFn {
  return async (state, config) => {
    const emit = getEmit(config);
    await emit({ t: "node_started", node, at: now() });
    try {
      const update = await fn(state, config);
      await emit({ t: "node_finished", node, at: now(), summary: summarize(node, update as Record<string, unknown>) });
      return update;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Only draft and finalize are fatal. Everything else degrades: record an issue and continue.
      if (node === "draft" || node === "finalize") {
        await emit({ t: "error", node, msg, at: now() });
        throw Object.assign(e instanceof Error ? e : new Error(msg), { emitted: true });
      }
      await emit({ t: "log", node, level: "warn", msg: `degraded: ${msg}`, at: now() });
      const issue = `${node} failed: ${msg}`;
      await emit({ t: "node_finished", node, at: now(), summary: `degraded: ${msg}`, status: "degraded" });
      if (node === "intake") {
        // Minimal target from the raw input so the other nodes can still run.
        const name = state.input.app;
        return { issues: [issue], target: { name, slug: slugify(name) || "unknown", docsHints: [] } };
      }
      // verify failing leaves the draft's claims unverified.
      return { issues: [issue] };
    }
  };
}

// The state channel is named `draft`, and LangGraph forbids a node with the same name,
// so the draft node id is internal; events still report node "draft".
const DRAFT_ID = "draft_node";

export function buildGraph(store: Store = defaultStore) {
  return new StateGraph(GraphState)
    .addNode("intake", instrument("intake", intake))
    .addNode("composio_lookup", instrument("composio_lookup", composioLookup))
    .addNode("docs_research", instrument("docs_research", docsResearch))
    .addNode("probe", instrument("probe", probe))
    .addNode(DRAFT_ID, instrument("draft", draft))
    .addNode("verify", instrument("verify", verify))
    .addNode("finalize", instrument("finalize", makeFinalize(store)))
    .addEdge(START, "intake")
    .addEdge("intake", "composio_lookup")
    .addEdge("intake", "docs_research")
    .addEdge("intake", "probe")
    // Fan-in: draft runs once, after all three branches (03_AGENT_GRAPH wiring notes).
    .addEdge(["composio_lookup", "docs_research", "probe"], DRAFT_ID)
    .addEdge(DRAFT_ID, "verify")
    .addEdge("verify", "finalize")
    .addConditionalEdges("finalize", (s: State) => (!s.guide && s.repairs === 1 ? DRAFT_ID : END), [DRAFT_ID, END])
    .compile();
}

export type RunOptions = {
  runId: string;
  emit?: Emit;
  store?: Store;
  /** Directory for the guide file (default DATA_DIR/guides). */
  outDir?: string;
  /** Hard timeout in ms (default 300 s). */
  timeoutMs?: number;
};

/** Runs the graph. Events go to `emit` and are appended to the store's JSONL log. */
export async function runGuide(input: RunInput, opts: RunOptions): Promise<Guide> {
  const store = opts.store ?? defaultStore;
  const emit: Emit = async (ev) => {
    await store.appendEvent(opts.runId, ev);
    await opts.emit?.(ev);
  };
  await emit({ t: "run_started", runId: opts.runId, input, at: now() });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 300_000);
  const config: RunnableConfig = {
    signal: controller.signal,
    configurable: { emit, outDir: opts.outDir },
  };

  let last: Partial<State> = {};
  try {
    const stream = await buildGraph(store).stream({ input, runId: opts.runId }, { ...config, streamMode: "values" });
    for await (const state of stream) last = state as State;
  } catch (e) {
    const msg = controller.signal.aborted ? "run timed out" : e instanceof Error ? e.message : String(e);
    // On timeout, finalize an existing draft with an issue.
    if (controller.signal.aborted && last.draft) {
      const { guide } = finalizeDraft(last.draft, opts.runId);
      if (guide) {
        guide.openQuestions = [...guide.openQuestions, "Run timed out before verification finished; claims may be unverified."];
        await store.saveGuide(guide, opts.outDir);
        await emit({ t: "log", node: "finalize", msg: "timed out; finalized existing draft", at: now() });
        await emit({ t: "done", slug: guide.slug, tier: guide.verdict.tier, at: now() });
        return guide;
      }
    }
    if (!(e as { emitted?: boolean })?.emitted) await emit({ t: "error", msg, at: now() });
    throw new Error(msg);
  } finally {
    clearTimeout(timer);
  }
  if (!last.guide) {
    await emit({ t: "error", node: "finalize", msg: "no valid guide produced", at: now() });
    throw new Error("no valid guide produced: " + (last.issues ?? []).join("; "));
  }
  await emit({ t: "done", slug: last.guide.slug, tier: last.guide.verdict.tier, at: now() });
  return last.guide;
}
