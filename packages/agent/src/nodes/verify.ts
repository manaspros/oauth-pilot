import { promises as fs } from "node:fs";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { NodeFn } from "./common";
import { log } from "./common";
import { defaultInvoke, extractJson, promptPath, type InvokeText } from "./draft";
import { rejectReason } from "./probe";
import { fakeDelay, isFake, loadFixture } from "../fake";

type Json = Record<string, any>;
export type VerifyDeps = { fetch: typeof fetch; invoke: InvokeText };

export const MAX_FETCHES = 10;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_TEXT = 400_000;
const EXCERPT = 3500;
const VERDICTS = ["supported", "partially_supported", "unsupported", "contradicted"] as const;

/** Crude HTML to text: drop script/style, strip tags, decode common entities, collapse whitespace. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(#39|apos);/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase, unify quotes/dashes, keep only letters and digits separated by single spaces. */
export const normalize = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const MIN_SEG_CHARS = 12;
const MIN_SEG_WORDS = 3;
const strongSeg = (seg: string) => seg.length >= MIN_SEG_CHARS || seg.split(" ").length >= MIN_SEG_WORDS;

/**
 * Deterministic: is the quote on the page? "..." / "…" splits a quote into segments. Segments shorter than
 * 12 normalized chars and under 3 words are too weak to prove anything and are ignored. Returns null
 * (unverifiable, LLM decides) when no segment is strong; otherwise every strong segment must appear as whole words.
 */
export function quoteInPage(quote: string, pageText: string): boolean | null {
  const page = ` ${normalize(pageText)} `;
  const segs = quote.split(/…|\.{3}/).map(normalize).filter(strongSeg);
  if (segs.length === 0) return null;
  return segs.every((s) => page.includes(` ${s} `));
}

type Page = { ok: true; text: string } | { ok: false; reason: string };

/** GET with manual redirects (max 3), SSRF guard on every hop, 10 s timeout. */
export async function fetchPageText(url: string, f: typeof fetch): Promise<Page> {
  let cur = url;
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const why = rejectReason(cur);
      if (why) return { ok: false, reason: `skipped: ${why}` };
      const res = await f(cur, { redirect: "manual", signal, headers: { accept: "text/html,text/plain,application/json;q=0.9", "user-agent": "oauth-pilot-verify/1.0" } });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return { ok: false, reason: `HTTP ${res.status} without location` };
        cur = new URL(loc, cur).toString();
        continue;
      }
      if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
      const body = (await res.text()).slice(0, 1_500_000);
      const ct = res.headers.get("content-type") ?? "";
      const text = /html|xml/i.test(ct) || /^\s*</.test(body) ? htmlToText(body) : body.replace(/\s+/g, " ");
      return { ok: true, text: text.slice(0, MAX_TEXT) };
    }
    return { ok: false, reason: "too many redirects" };
  } catch (e) {
    return { ok: false, reason: (e as Error).name === "TimeoutError" ? "timeout" : (e as Error).message };
  }
}

function excerptFor(text: string, quote: string | undefined): string {
  if (quote) {
    const seg = quote.split(/…|\.{3}/).map(normalize).sort((x, y) => y.length - x.length)[0];
    if (seg) {
      // Match the longest segment on the original text, allowing any punctuation/whitespace between words.
      const re = new RegExp(seg.split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^\\p{L}\\p{N}]+"), "iu");
      const i = text.search(re);
      if (i >= 0) return text.slice(Math.max(0, i - EXCERPT / 2), i + EXCERPT / 2);
    }
  }
  return text.slice(0, EXCERPT);
}

const LEVELS = ["low", "medium", "high"] as const;
const capConfidence = (c: unknown, max: (typeof LEVELS)[number]) =>
  LEVELS.indexOf(c as any) > LEVELS.indexOf(max) || !LEVELS.includes(c as any) ? max : c;

/** After claims change, keep Ranges honest: drop dangling ids; a "sourced" Range needs a sourced/tested claim. */
function repairReferences(g: Json, removed: Set<string>) {
  const byId = new Map<string, Json>((g.claims as Json[]).map((c) => [c.id, c]));
  const fixIds = (o: Json) => {
    if (Array.isArray(o?.claimIds)) o.claimIds = o.claimIds.filter((id: string) => !removed.has(id));
  };
  const fixRange = (r: Json | undefined) => {
    if (!r || typeof r !== "object") return;
    fixIds(r);
    if (r.basis === "sourced" && !(r.claimIds ?? []).some((id: string) => ["sourced", "tested"].includes(byId.get(id)?.evidence))) r.basis = "estimate";
  };
  fixIds(g.verdict ?? {});
  fixIds(g.composio ?? {});
  for (const k of ["scopes", "requirements", "risks"]) for (const x of g[k] ?? []) fixIds(x);
  for (const s of g.steps ?? []) {
    fixIds(s);
    fixRange(s.duration);
  }
  for (const k of ["timeToFirstConnection", "timeToProduction", "activeEffort"]) fixRange(g.verdict?.[k]);
}

export function makeVerify(getDeps: () => VerifyDeps = () => ({ fetch, invoke: defaultInvoke(8000) })): NodeFn {
  return async (state, config) => {
    if (isFake()) {
      await fakeDelay();
      return { draft: await loadFixture(state.input.app, "verify") };
    }
    const d = getDeps();
    const g = state.draft as Json | null;
    if (!g || typeof g !== "object" || !Array.isArray(g.claims)) return {}; // nothing to verify; finalize reports it
    const guide: Json = structuredClone(g);
    const claims: Json[] = guide.claims;
    const open: string[] = [];

    // 1. Fetch each distinct cited URL once (cache per run, max 10).
    const urls: string[] = [];
    for (const c of claims) {
      if (c?.evidence === "tested") continue;
      for (const s of Array.isArray(c?.sources) ? c.sources : []) if (typeof s?.url === "string" && !urls.includes(s.url)) urls.push(s.url);
    }
    const fetched = urls.slice(0, MAX_FETCHES);
    const pages = new Map<string, Page>();
    await Promise.all(fetched.map(async (u) => void pages.set(u, await fetchPageText(u, d.fetch))));
    for (const u of urls.slice(MAX_FETCHES)) pages.set(u, { ok: false, reason: "fetch budget exceeded" });
    log(config, "verify", `fetched ${fetched.filter((u) => pages.get(u)?.ok).length}/${fetched.length} cited pages`);

    // 2. Deterministic quote check. Absent from every fetched source = unsupported, whatever the LLM says.
    type Check = { claim: Json; sources: { url: string; quote?: string; found: boolean | null; weak: boolean; text?: string }[]; absent: boolean };
    const checks: Check[] = [];
    for (const c of claims) {
      if (!c || c.evidence === "tested") continue;
      const srcs = (Array.isArray(c.sources) ? c.sources : []).filter((s: Json) => typeof s?.url === "string").map((s: Json) => {
        const p = pages.get(s.url);
        const quote = typeof s.quote === "string" && s.quote.trim() ? s.quote : undefined;
        const found = p?.ok && quote ? quoteInPage(quote, p.text) : null;
        return { url: s.url as string, quote, found, weak: !!(p?.ok && quote && found === null), text: p?.ok ? p.text : undefined };
      });
      const absent = srcs.length > 0 && srcs.every((s: { found: boolean | null }) => s.found === false);
      checks.push({ claim: c, sources: srcs, absent });
    }

    // 3. Fresh-context LLM judgement: ONLY claims + fetched source text. Skipped for deterministic failures.
    const judged = checks.filter((k) => !k.absent && k.sources.some((s) => s.text));
    const verdicts = new Map<string, Json>();
    if (judged.length) {
      try {
        const payload = judged.map((k) => ({
          id: k.claim.id,
          text: k.claim.text,
          sources: k.sources.filter((s) => s.text).map((s) => ({ url: s.url, quote: s.quote, quoteFoundInPage: s.found, excerpt: excerptFor(s.text!, s.quote) })),
        }));
        const system = await fs.readFile(promptPath("verify.md"), "utf8");
        const { text } = await d.invoke(
          [new SystemMessage({ content: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] as any }), new HumanMessage(JSON.stringify({ claims: payload }))],
          config.signal,
        );
        const arr = extractJson(text, "array");
        if (Array.isArray(arr)) {
          for (const v of arr as Json[]) if (v && typeof v.id === "string" && VERDICTS.includes(v.verdict)) verdicts.set(v.id, v);
        } else open.push("Verifier returned no parsable verdicts; claims are unchecked.");
      } catch (e) {
        if (config.signal?.aborted) throw e;
        open.push(`Verifier call failed (${(e as Error).message}); claims are unchecked.`);
      }
    }

    // 4. Apply verdicts.
    const removed = new Set<string>();
    const stats = { supported: 0, partial: 0, unsupported: 0, contradicted: 0, notChecked: 0 };
    const short = (s: string) => (s.length > 100 ? s.slice(0, 97) + "..." : s);
    for (const k of checks) {
      const c = k.claim;
      const downgrade = (verdict: "unsupported", note: string) => {
        c.evidence = "inferred";
        c.confidence = "low";
        c.verifier = { verdict, note };
        stats.unsupported++;
        open.push(`Unverified: ${short(String(c.text))} (${note})`);
      };
      if (k.absent) {
        downgrade("unsupported", "cited quote not found on the fetched page");
        continue;
      }
      const v = verdicts.get(c.id);
      if (!v) {
        c.verifier = { verdict: "not_checked", note: k.sources.length ? "source could not be fetched or judged" : "no source cited" };
        stats.notChecked++;
        if (c.evidence === "sourced") open.push(`Could not check: ${short(String(c.text))}`);
        continue;
      }
      const note = typeof v.note === "string" ? v.note : undefined;
      // A too-short quote proves nothing: the LLM decides, but confidence is capped at medium.
      if (k.sources.some((x) => x.weak) && !k.sources.some((x) => x.found === true)) c.confidence = capConfidence(c.confidence, "medium");
      if (v.verdict === "supported") {
        c.verifier = { verdict: "supported", ...(note ? { note } : {}) };
        stats.supported++;
      } else if (v.verdict === "partially_supported") {
        c.verifier = { verdict: "partially_supported", ...(note ? { note } : {}) };
        c.confidence = capConfidence(c.confidence, "medium");
        stats.partial++;
      } else if (v.verdict === "unsupported") {
        downgrade("unsupported", note ?? "page does not support the claim");
      } else if (typeof v.correctedText === "string" && v.correctedText.trim()) {
        c.text = v.correctedText.trim();
        c.evidence = "inferred";
        c.confidence = "low";
        c.verifier = { verdict: "contradicted", note: `Corrected by verifier${note ? `: ${note}` : ""}` };
        stats.contradicted++;
      } else {
        removed.add(c.id);
        stats.contradicted++;
        open.push(`Removed contradicted claim: ${short(String(c.text))}${note ? ` (${note})` : ""}`);
      }
    }
    if (removed.size) {
      guide.claims = claims.filter((c) => !removed.has(c.id));
    }
    repairReferences(guide, removed); // also fixes "sourced" Ranges whose claims were downgraded
    guide.openQuestions = [...(Array.isArray(guide.openQuestions) ? guide.openQuestions : []), ...open];
    log(config, "verify", `supported ${stats.supported}, partial ${stats.partial}, unsupported ${stats.unsupported}, contradicted ${stats.contradicted}, not checked ${stats.notChecked}`);
    return { draft: guide };
  };
}

export const verify: NodeFn = makeVerify();
