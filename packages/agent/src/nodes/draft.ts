import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { COMPOSIO_CALLBACK_URL } from "@oauth-pilot/core";
import type { NodeFn } from "./common";
import { fakeOrThrow, log } from "./common";
import { fakeDelay, isFake, loadFixture } from "../fake";
import { now } from "../events";
import { makeLlm, modelName } from "../llm";
import type { ComposioFacts, ProbeResult, State } from "../state";

type Json = Record<string, any>;

/** One LLM round trip: messages in, concatenated text out. Injectable for tests. */
export type InvokeText = (messages: any[], signal?: AbortSignal) => Promise<{ text: string; stopReason?: string }>;

export const promptPath = (name: string) => path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../prompts", name);

export function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((b: any) => b?.type === "text" && typeof b.text === "string").map((b: any) => b.text).join("");
}

export const defaultInvoke = (maxTokens: number): InvokeText => async (messages, signal) => {
  const res: any = await makeLlm({ maxTokens }).invoke(messages, { signal });
  return { text: contentText(res.content), stopReason: res.response_metadata?.stop_reason };
};

/** Parse the first top-level JSON object or array out of model text (tolerates a code fence or prose). */
export function extractJson(text: string, kind: "object" | "array"): unknown | null {
  const [open, close] = kind === "object" ? ["{", "}"] : ["[", "]"];
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Claims the code can vouch for: ok probes and a found Composio toolkit. Ran for real, so `tested`. */
export function premadeClaims(probes: ProbeResult[], composio: ComposioFacts | null, composioSlug: string | undefined): Json[] {
  const claims: Json[] = [];
  for (const p of probes) {
    if (!p.ok) continue;
    claims.push({
      id: `t${p.id}`,
      text: `${p.check}: ${p.observed} (${p.url})`,
      evidence: "tested",
      sources: [],
      testedHow: `${p.check} against ${p.url} at ${p.at}: ${p.observed}`,
      confidence: "high",
    });
  }
  if (composio?.toolkitFound) {
    const schemes = composio.managedSchemes?.join(", ") || "none listed";
    const n = composio.availableScopes?.length ?? 0;
    claims.push({
      id: "tc1",
      text: `Composio toolkit "${composioSlug ?? "?"}" exists; managed auth schemes: ${schemes}; ${n} managed scopes available.`,
      evidence: "tested",
      sources: [],
      testedHow: `GET /api/v3.1/toolkits/${composioSlug ?? "?"} on the Composio API at ${now()}: toolkit found`,
      confidence: "high",
    });
  }
  return claims;
}

export const NO_RESEARCH_QUESTION = "Research found no sources, so none of this guide is documentation-backed; re-run it before relying on any timeline or tier.";

/** Fill the machine-owned fields and merge premade claims (premade ids win on collision). */
export function finishDraft(raw: Json, state: State, premade: Json[], onDemote?: (ids: string[]) => void): Json {
  const g: Json = { ...raw };
  const t = state.target;
  g.schemaVersion = 1;
  if (!g.slug && t?.slug) g.slug = t.slug;
  g.generatedAt = now();
  g.generator = { kind: "live", model: modelName(), runId: state.runId };
  g.composio = {
    ...(g.composio ?? {}),
    toolkitFound: !!state.composio?.toolkitFound,
    callbackUrl: COMPOSIO_CALLBACK_URL,
  };
  const ids = new Set(premade.map((c) => c.id));
  // Only code creates `tested` claims. Any `tested` claim from the model is a fake: demote it.
  const demoted: string[] = [];
  const own = (Array.isArray(g.claims) ? g.claims : []).filter((c: Json) => !ids.has(c?.id)).map((c: Json) => {
    if (c?.evidence !== "tested") return c;
    demoted.push(String(c.id));
    const { testedHow: _drop, ...rest } = c;
    return { ...rest, evidence: "inferred", confidence: "low" };
  });
  if (demoted.length) onDemote?.(demoted);
  g.claims = [...premade, ...own];
  // Deterministic degraded-research rule: with no research notes, nothing is sourced, so confidence is at most low.
  if (Array.isArray(state.research) && state.research.length === 0) {
    g.verdict = { ...(g.verdict ?? {}), confidence: "low" };
    const q = NO_RESEARCH_QUESTION;
    const oq: unknown[] = Array.isArray(g.openQuestions) ? g.openQuestions : [];
    g.openQuestions = oq.includes(q) ? oq : [...oq, q];
  }
  return g;
}

export function makeDraft(invoke: InvokeText = defaultInvoke(16_000)): NodeFn {
  return async (state, config) => {
    if (isFake()) {
      await fakeDelay();
      return { draft: await loadFixture(state.input.app, "draft") };
    }
    const system = await fs.readFile(promptPath("draft.md"), "utf8");
    const premade = premadeClaims(state.probes, state.composio, state.target?.composioSlug ?? state.target?.slug);
    const repairIssues = state.issues.filter((i) => i.startsWith("validation:") || i.startsWith("draft:"));
    const isRepair = state.repairs > 0 && repairIssues.length > 0;
    const payload: Json = {
      target: state.target,
      input: state.input,
      composio: state.composio,
      research: state.research,
      probes: state.probes,
      premadeClaims: premade,
      ...(state.research.length === 0 ? { researchDegraded: "No research sources were found. Assert nothing as sourced; set verdict.confidence to low and say so in openQuestions." } : {}),
    };
    if (isRepair) {
      payload.previousDraft = state.draft;
      payload.repairIssues = repairIssues;
    }
    const messages = [
      new SystemMessage({ content: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] as any }),
      new HumanMessage(JSON.stringify(payload)),
    ];
    log(config, "draft", isRepair ? `repairing draft (${repairIssues.length} issues)` : `drafting from ${state.research.length} notes, ${premade.length} premade claims`);
    const { text, stopReason } = await invoke(messages, config.signal);
    const raw = extractJson(text, "object");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      // Not fatal here: finalize reports a schema error and the graph repairs once.
      const why = stopReason === "max_tokens" ? "response truncated (max_tokens)" : "no JSON object in response";
      return { draft: null, issues: [`draft: ${why}`] };
    }
    const demoted: string[] = [];
    const finished = finishDraft(raw as Json, state, premade, (d) => demoted.push(...d));
    if (demoted.length) {
      log(config, "draft", `demoted model-written "tested" claims to inferred: ${demoted.join(", ")}`);
      return { draft: finished, issues: [`draft: model labelled claims tested without running anything (${demoted.join(", ")}); demoted to inferred`] };
    }
    return { draft: finished };
  };
}

export const draft: NodeFn = makeDraft();
