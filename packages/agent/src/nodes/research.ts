import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { fakeOrThrow, log } from "./common";
import type { NodeFn } from "./common";
import { isFake } from "../fake";
import { ChatAnthropic } from "@langchain/anthropic";
import { modelName } from "../llm";
import type { ResearchNote, Topic } from "../state";

export const WEB_SEARCH_MAX_USES = 8;
export const WEB_FETCH_MAX_USES = 6;
const MAX_QUOTE = 400;
const MAX_CONTINUATIONS = 2;
const TOPICS: readonly Topic[] = ["registration", "review_process", "scopes", "requirements", "limits", "gotchas", "errors"];

type Block = Record<string, any>;
export type ParsedResearch = { notes: ResearchNote[]; queries: string[]; sourceUrls: string[]; unobserved: boolean };

const clip = (s: string) => (s.length <= MAX_QUOTE ? s : s.slice(0, MAX_QUOTE - 1).trimEnd() + "…");

/** Complete top-level `{...}` objects in a (possibly truncated) JSON array, string-aware. */
function salvageObjects(text: string): unknown[] | null {
  const out: unknown[] = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let from = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") {
      if (depth++ === 0) from = i;
    } else if (ch === "}" && depth > 0 && --depth === 0) {
      try {
        out.push(JSON.parse(text.slice(from, i + 1)));
      } catch {
        /* skip a malformed object */
      }
    }
  }
  return out.length ? out : null;
}

function parseArrayFrom(text: string): unknown[] | null {
  const start = text.indexOf("[{");
  if (start < 0) return null;
  const end = text.lastIndexOf("}]");
  if (end > start) {
    try {
      const v = JSON.parse(text.slice(start, end + 2));
      if (Array.isArray(v)) return v;
    } catch {
      /* fall through to salvage */
    }
  }
  // Truncated (max_tokens) or malformed array: keep every complete object instead of losing all notes.
  return salvageObjects(text.slice(start + 1));
}

/** Last text block alone first (the final answer), then all text blocks joined with "" (JSON split across blocks). */
function extractJsonArray(texts: string[]): unknown[] | null {
  if (texts.length === 0) return null;
  return parseArrayFrom(texts[texts.length - 1]!) ?? parseArrayFrom(texts.join(""));
}

const normUrl = (u: string) => u.replace(/#.*$/, "").replace(/\/+$/, "");

/**
 * Parse an Anthropic response (content blocks incl. server_tool_use / web_search_tool_result /
 * web_fetch_tool_result) into ResearchNote[]. Primary: the model's final JSON array, keeping only
 * notes whose url was actually seen in a tool result. Fallback: citations on text blocks.
 */
export function parseResearchResponse(content: string | Block[]): ParsedResearch {
  const blocks: Block[] = typeof content === "string" ? [{ type: "text", text: content }] : content;
  const queries: string[] = [];
  const seen = new Map<string, string>(); // normalized url -> title
  const fetched: string[] = []; // fetched urls in order (for document_index citations)
  for (const b of blocks) {
    if (b.type === "server_tool_use" && b.name === "web_search" && typeof b.input?.query === "string") queries.push(b.input.query);
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      for (const r of b.content) if (typeof r?.url === "string") seen.set(normUrl(r.url), r.title ?? "");
    }
    if (b.type === "web_fetch_tool_result" && typeof b.content?.url === "string") {
      const k = normUrl(b.content.url);
      fetched.push(b.content.url);
      seen.set(k, b.content.content?.title ?? b.content.title ?? seen.get(k) ?? "");
    }
  }

  const notes: ResearchNote[] = [];
  const push = (n: Omit<ResearchNote, "id">) => notes.push({ id: `r${notes.length + 1}`, ...n });

  const texts = blocks.filter((b) => b.type === "text" && typeof b.text === "string");
  const arr = extractJsonArray(texts.map((b) => b.text as string));
  let unobserved = false;
  for (const raw of arr ?? []) {
    const n = raw as Record<string, unknown>;
    if (typeof n?.url !== "string" || typeof n.quote !== "string" || !n.quote.trim()) continue;
    if (seen.size === 0) unobserved = true;
    else if (!seen.has(normUrl(n.url))) continue; // url never retrieved: drop
    const topic = TOPICS.includes(n.topic as Topic) ? (n.topic as Topic) : "gotchas";
    push({
      topic,
      finding: typeof n.finding === "string" ? n.finding : n.quote,
      url: n.url,
      title: typeof n.title === "string" && n.title ? n.title : (seen.get(normUrl(n.url)) ?? ""),
      quote: clip(n.quote.trim()),
    });
  }

  if (notes.length === 0) {
    for (const b of texts) {
      for (const c of b.citations ?? []) {
        // char_location citations carry document_index (order of fetched documents) instead of a url.
        const url: unknown = c?.url ?? (typeof c?.document_index === "number" ? fetched[c.document_index] : undefined);
        if (typeof url === "string" && typeof c.cited_text === "string" && c.cited_text.trim()) {
          push({ topic: "gotchas", finding: String(b.text).trim().slice(0, 200), url, title: c.title ?? c.document_title ?? seen.get(normUrl(url)) ?? "", quote: clip(c.cited_text.trim()) });
        }
      }
    }
  }
  return { notes, queries, sourceUrls: [...seen.keys()], unobserved };
}

async function loadPrompt(): Promise<string> {
  const p = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../prompts/research.md");
  return fs.readFile(p, "utf8");
}

type Attempt = { notes: ResearchNote[]; queries: string[]; sourceUrls: string[]; unobserved: boolean; issues: string[]; stops: string[] };

/** Narrower second try: fewer tools, shorter quotes, JSON only. */
const NARROW_SUFFIX =
  "\n\nRETRY (the previous attempt returned no usable notes): be narrow. Use at most 3 searches and 3 fetches, official provider docs only. " +
  "Return at most 8 notes with quotes of 200 characters or fewer. Your entire final reply must be the JSON array and nothing else.";

export type MakeLlm = (opts: { maxTokens: number; searches: number; fetches: number }) => { invoke: (messages: any[], o?: any) => Promise<any> };

const defaultMakeLlm: MakeLlm = ({ maxTokens, searches, fetches }) =>
  // Not makeLlm(): it sets temperature 0, which claude-sonnet-5-5 rejects ("temperature is not supported ... non-default values").
  new ChatAnthropic({ model: modelName(), maxTokens }).bindTools([
    { type: "web_search_20250305", name: "web_search", max_uses: searches },
    { type: "web_fetch_20250910", name: "web_fetch", max_uses: fetches },
  ] as any) as any;

export const makeDocsResearch = (makeLlm: MakeLlm = defaultMakeLlm): NodeFn => async (state, config) => {
  if (isFake()) return fakeOrThrow("docs_research", "research", state);

  const target = state.target;
  const name = target?.name ?? state.input.app;
  const hints = target?.docsHints?.length ? `\nDoc search hints: ${target.docsHints.join("; ")}` : "";
  const site = target?.website ? `\nWebsite: ${target.website}` : "";
  const useCase = state.input.useCase ? `\nUse case: ${state.input.useCase}` : "";
  const tools = state.input.tools?.length ? `\nTools needed: ${state.input.tools.join(", ")}` : "";
  const system = await loadPrompt();
  const base = `Research OAuth app registration and production approval for: ${name}.${site}${hints}${useCase}${tools}`;
  const toBlocks = (c: unknown): Block[] => (typeof c === "string" ? [{ type: "text", text: c }] : (c as Block[]));

  const attempt = async (human: string, llm: ReturnType<MakeLlm>): Promise<Attempt> => {
    const messages: any[] = [
      new SystemMessage({ content: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] as any }),
      new HumanMessage(human),
    ];
    const allBlocks: Block[] = [];
    const issues: string[] = [];
    const stops: string[] = [];
    for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
      const res: any = await llm.invoke(messages, { signal: config.signal });
      allBlocks.push(...toBlocks(res.content));
      const stop = res.response_metadata?.stop_reason ?? "unknown";
      stops.push(stop);
      if (stop === "max_tokens") issues.push("docs_research: response truncated (max_tokens); notes may be incomplete");
      if (stop !== "pause_turn" || i === MAX_CONTINUATIONS) {
        if (stop === "pause_turn") issues.push("docs_research: still paused after max continuations");
        break;
      }
      messages.push(new AIMessage({ content: res.content }));
    }
    return { ...parseResearchResponse(allBlocks), issues, stops };
  };

  let a = await attempt(base, makeLlm({ maxTokens: 16_000, searches: WEB_SEARCH_MAX_USES, fetches: WEB_FETCH_MAX_USES }));
  for (const q of a.queries) await log(config, "docs_research", `searching: ${q}`);
  if (a.notes.length === 0) {
    await log(config, "docs_research", `no notes (stop_reason ${a.stops.join(",")}, ${a.sourceUrls.length} sources seen); retrying once with a narrower prompt`);
    const first = a;
    a = await attempt(base + NARROW_SUFFIX, makeLlm({ maxTokens: 16_000, searches: 3, fetches: 3 }));
    for (const q of a.queries) await log(config, "docs_research", `searching (retry): ${q}`);
    a.issues.unshift(...first.issues);
    if (a.notes.length === 0) {
      // Throwing makes graph.ts record a degraded node_finished and the issue; draft then caps confidence at low.
      throw new Error(
        `no sourced notes after retry (stop_reason ${first.stops.join(",")} then ${a.stops.join(",")}; ${first.sourceUrls.length + a.sourceUrls.length} sources seen)`,
      );
    }
    a.issues.push("docs_research: first attempt returned no notes; second, narrower attempt succeeded");
  }
  if (a.unobserved) a.issues.push("docs_research: sources were not observed in tool results");
  return { research: a.notes, ...(a.issues.length ? { issues: a.issues } : {}) };
};

export const docsResearch: NodeFn = makeDocsResearch();
