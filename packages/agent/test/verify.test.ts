import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { MAX_FETCHES, htmlToText, makeVerify, makeWebFetch, quoteInPage } from "../src/nodes/verify";

const here = path.dirname(fileURLToPath(import.meta.url));
const linear = () => JSON.parse(readFileSync(path.join(here, "../fixtures/runs/linear/draft.json"), "utf8"));

const FILLER = `<p>${"Filler documentation sentence about unrelated settings and navigation. ".repeat(10)}</p>`;
const page = (body: string) => new Response(`<html><head><style>x{}</style></head><body>${body}${FILLER}</body></html>`, { status: 200, headers: { "content-type": "text/html" } });

function run(opts: { draft: any; pages: Record<string, string | number>; llm: any[] | (() => string); webFetch?: any }) {
  const fetchMock = vi.fn(async (url: any) => {
    const v = opts.pages[String(url)];
    if (typeof v === "number") return new Response("", { status: v });
    if (v === undefined) return new Response("", { status: 404 });
    return page(v);
  });
  const invoke = vi.fn(async () => ({ text: typeof opts.llm === "function" ? opts.llm() : JSON.stringify(opts.llm) }));
  const node = makeVerify(() => ({ fetch: fetchMock as any, invoke, webFetch: opts.webFetch }));
  return { fetchMock, invoke, webFetch: opts.webFetch, go: () => node({ input: { app: "Linear" }, draft: opts.draft } as any, { configurable: {} } as any) };
}

describe("quote helpers", () => {
  it("normalizes case, punctuation, markup and ellipses", () => {
    const text = htmlToText("<p>Create a <b>new</b> OAuth2&nbsp;Application!</p><script>var x=1</script>");
    expect(quoteInPage("create a new oauth2 application", text)).toBe(true);
    expect(quoteInPage("Create a new … Application", text)).toBe(true); // weak segment ignored
    expect(quoteInPage("Create a new SAML application", text)).toBe(false);
  });

  it("short quotes are unverifiable (null), and matching is on whole words", () => {
    expect(quoteInPage("ok", "your token is here")).toBeNull();
    expect(quoteInPage("30", "version 1300 released")).toBeNull();
    expect(quoteInPage("a tokenized value here ok", "some tokenized value here okay")).toBe(false); // "ok" vs "okay": word boundary
    expect(quoteInPage("tokenized value here", "some tokenized value here ok")).toBe(true);
  });

  it("weak quote: LLM decides but confidence is capped at medium", async () => {
    const g = linear();
    g.claims = [{ id: "c1", text: "t", evidence: "sourced", confidence: "high", sources: [{ url: "https://x.example.com/a", title: "t", quote: "OAuth2", accessedAt: "2026-10-27" }] }];
    g.steps = g.steps.map((s: any) => ({ ...s, claimIds: [] }));
    const { go } = run({ draft: g, pages: { "https://x.example.com/a": "<p>OAuth2 is here</p>" }, llm: [{ id: "c1", verdict: "supported" }] });
    const out: any = await go();
    expect(out.draft.claims[0]).toMatchObject({ confidence: "medium", evidence: "sourced" });
    expect(out.draft.claims[0].verifier.verdict).toBe("supported");
  });
});

describe("verify node", () => {
  it("quote absent from the page => inferred/low/unsupported, even if the LLM says supported", async () => {
    const g = linear();
    const c1 = g.claims.find((c: any) => c.id === "c1");
    const url = c1.sources[0].url;
    const { go, invoke } = run({
      draft: g,
      pages: {
        ...Object.fromEntries(g.claims.flatMap((c: any) => (c.sources ?? []).map((s: any) => [s.url, `<p>${s.quote}</p>`]))),
        // shared URL: serve every other claim's quote, but not c1's
        [url]: g.claims.filter((c: any) => c.id !== "c1").flatMap((c: any) => (c.sources ?? []).filter((s: any) => s.url === url).map((s: any) => `<p>${s.quote}</p>`)).join("") + "<p>billing</p>",
      },
      llm: () => JSON.stringify(g.claims.map((c: any) => ({ id: c.id, verdict: "supported", note: "ok" }))),
    });
    const out: any = await go();
    const got = out.draft.claims.find((c: any) => c.id === "c1");
    expect(got.evidence).toBe("inferred");
    expect(got.confidence).toBe("low");
    expect(got.verifier.verdict).toBe("unsupported");
    // the LLM never saw the deterministically-failed claim
    const sent = JSON.parse(((invoke.mock.calls[0] as any)[0][1] as any).content as string);
    expect(sent.claims.map((c: any) => c.id)).not.toContain("c1");
    expect(out.draft.openQuestions.some((q: string) => /Unverified/.test(q))).toBe(true);
  });

  it("quote present + LLM supported => supported, evidence kept; LLM only sees claims and sources", async () => {
    const g = linear();
    const c1 = g.claims.find((c: any) => c.id === "c1");
    const { go, invoke } = run({
      draft: g,
      pages: { [c1.sources[0].url]: `<p>${c1.sources[0].quote}</p>` },
      llm: [{ id: "c1", verdict: "supported", note: "matches" }],
    });
    const out: any = await go();
    const got = out.draft.claims.find((c: any) => c.id === "c1");
    expect(got.evidence).toBe("sourced");
    expect(got.verifier.verdict).toBe("supported");
    const sent = JSON.parse(((invoke.mock.calls[0] as any)[0][1] as any).content as string);
    expect(Object.keys(sent)).toEqual(["claims"]);
    expect(Object.keys(sent.claims[0])).toEqual(["id", "text", "sources"]);
  });

  it("contradicted with no correction removes the claim and fixes dangling refs and sourced ranges", async () => {
    const g = linear();
    const c1 = g.claims.find((c: any) => c.id === "c1");
    g.verdict.timeToFirstConnection = { ...g.verdict.timeToFirstConnection, basis: "sourced", claimIds: ["c1"] };
    g.steps[0].claimIds = ["c1"];
    const { go } = run({
      draft: g,
      pages: { [c1.sources[0].url]: `<p>${c1.sources[0].quote}</p>` },
      llm: [{ id: "c1", verdict: "contradicted", note: "says otherwise" }],
    });
    const out: any = await go();
    expect(out.draft.claims.some((c: any) => c.id === "c1")).toBe(false);
    expect(out.draft.steps[0].claimIds).not.toContain("c1");
    expect(out.draft.verdict.timeToFirstConnection.basis).toBe("estimate");
  });

  it("unfetchable source => not_checked plus an openQuestion; LLM failure never throws", async () => {
    const g = linear();
    const { go } = run({ draft: g, pages: {}, llm: () => { throw new Error("nope"); } });
    const out: any = await go();
    const c1 = out.draft.claims.find((c: any) => c.id === "c1");
    expect(c1.verifier.verdict).toBe("not_checked");
    expect(c1.evidence).toBe("sourced");
    expect(out.draft.openQuestions.some((q: string) => /Could not check/.test(q))).toBe(true);
  });

  it("SSRF guard rejects non-https sources without fetching; fetch budget is capped", async () => {
    const g = linear();
    g.claims[0].sources = [{ ...g.claims[0].sources[0], url: "http://169.254.169.254/x" }];
    const many = Array.from({ length: 15 }, (_, i) => ({ id: `x${i}`, text: "t", evidence: "sourced", confidence: "low", sources: [{ url: `https://example.com/p${i}`, title: "t", quote: "zzz", accessedAt: "2026-10-27" }] }));
    g.claims.push(...many);
    const { go, fetchMock } = run({ draft: g, pages: {}, llm: [] });
    await go();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).startsWith("http://"))).toBe(false);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(MAX_FETCHES);
  });
});

describe("web_fetch fallback", () => {
  const URL_ = "https://help.example.com/a";
  const quote = "Connected apps must be approved by an administrator before use";
  const mk = (confidence = "high") => {
    const g = linear();
    g.claims = [{ id: "c1", text: "Admin approval is required.", evidence: "sourced", confidence, sources: [{ url: URL_, title: "t", quote, accessedAt: "2026-10-27" }] }];
    g.steps = g.steps.map((s: any) => ({ ...s, claimIds: [] }));
    return g;
  };
  const shell = "<p>CSS Error</p><p>Sorry to interrupt</p>";

  it("normalizes markdown links in quotes", () => {
    expect(quoteInPage("See [the OAuth guide](https://x.com/y) for details here", "See the OAuth guide for details here and more")).toBe(true);
  });

  it("shell page + web_fetch hit => supported", async () => {
    const webFetch = vi.fn(async () => `intro ${quote}. more`);
    const { go, invoke } = run({ draft: mk(), pages: { [URL_]: shell }, llm: [{ id: "c1", verdict: "supported" }], webFetch });
    const out: any = await go();
    expect(webFetch).toHaveBeenCalledTimes(1);
    expect(out.draft.claims[0]).toMatchObject({ evidence: "sourced", confidence: "high" });
    expect(out.draft.claims[0].verifier.verdict).toBe("supported");
    expect(invoke).toHaveBeenCalled();
  });

  it("shell page + web_fetch failing => not_checked, no demotion, one question per source", async () => {
    const g = mk();
    g.claims.push({ ...g.claims[0], id: "c2" });
    const webFetch = vi.fn(async () => null);
    const { go } = run({ draft: g, pages: { [URL_]: shell }, llm: [], webFetch });
    const out: any = await go();
    for (const c of out.draft.claims) {
      expect(c.verifier.verdict).toBe("not_checked");
      expect(c.evidence).toBe("sourced");
      expect(c.confidence).toBe("medium"); // high capped at medium, never demoted to low
    }
    expect(out.draft.openQuestions.filter((q: string) => q === `Could not check: ${URL_}`)).toHaveLength(1);
    expect(out.draft.openQuestions.some((q: string) => /Unverified/.test(q))).toBe(false);
  });

  it("non-2xx plain fetch is unavailable, not absent", async () => {
    const { go } = run({ draft: mk("low"), pages: { [URL_]: 503 }, llm: [], webFetch: vi.fn(async () => null) });
    const out: any = await go();
    expect(out.draft.claims[0]).toMatchObject({ evidence: "sourced", confidence: "low" });
    expect(out.draft.claims[0].verifier.verdict).toBe("not_checked");
  });

  it("quote truly absent from a real page => unsupported (even after fallback)", async () => {
    const webFetch = vi.fn(async () => "a different page that never mentions the thing");
    const { go } = run({ draft: mk(), pages: { [URL_]: "<p>Totally unrelated content here.</p>" }, llm: [], webFetch });
    const out: any = await go();
    expect(webFetch).toHaveBeenCalledTimes(1);
    expect(out.draft.claims[0]).toMatchObject({ evidence: "inferred", confidence: "low" });
    expect(out.draft.claims[0].verifier.verdict).toBe("unsupported");
  });

  it("real page lacking the quote but web_fetch text has it => supported; fallbacks are bounded", async () => {
    const g = mk();
    const webFetch = vi.fn(async () => quote);
    const { go } = run({ draft: g, pages: { [URL_]: "<p>Truncated.</p>" }, llm: [{ id: "c1", verdict: "supported" }], webFetch });
    expect((await go() as any).draft.claims[0].verifier.verdict).toBe("supported");

    const many = mk();
    many.claims = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, text: "t", evidence: "sourced", confidence: "low", sources: [{ url: `https://help.example.com/p${i}`, title: "t", quote: `quote number ${i} is long enough`, accessedAt: "2026-10-27" }] }));
    const wf2 = vi.fn(async () => null);
    await run({ draft: many, pages: {}, llm: [], webFetch: wf2 }).go();
    expect(wf2.mock.calls.length).toBeLessThanOrEqual(6);
  });
});

describe("makeWebFetch (default fallback)", () => {
  const quote = "Connected apps must be approved by an administrator before use";
  const llmWith = (content: any[]) => ({ invoke: vi.fn(async () => ({ content })) });
  const result = (data: string) => ({ type: "web_fetch_tool_result", content: { type: "web_fetch_result", url: "u", content: { type: "document", source: { type: "text", data } } } });

  it("ignores the model's own text: an echoed quote is not evidence", async () => {
    const llm = llmWith([{ type: "text", text: quote }, result("Unrelated documentation. ".repeat(40))]);
    const text = await makeWebFetch(() => llm)("https://help.example.com/a", quote);
    expect(typeof text).toBe("string");
    expect(text).not.toContain("administrator");
    expect(JSON.stringify((llm.invoke.mock.calls[0] as any)[0])).not.toContain("administrator"); // prompt has no quote
    const g = linear();
    g.claims = [{ id: "c1", text: "t", evidence: "sourced", confidence: "high", sources: [{ url: "https://help.example.com/a", title: "t", quote, accessedAt: "2026-10-27" }] }];
    g.steps = g.steps.map((s: any) => ({ ...s, claimIds: [] }));
    const { go } = run({ draft: g, pages: { "https://help.example.com/a": "<p>CSS Error</p>" }, llm: [{ id: "c1", verdict: "supported" }], webFetch: makeWebFetch(() => llm) });
    const out: any = await go();
    expect(out.draft.claims[0].verifier.verdict).toBe("unsupported"); // page read, quote absent
  });

  it("tool error, short document or thrown error = unread (null)", async () => {
    expect(await makeWebFetch(() => llmWith([{ type: "web_fetch_tool_result", content: { type: "web_fetch_tool_result_error", error_code: "unavailable" } }]))("https://h.example.com/a", "q")).toBeNull();
    expect(await makeWebFetch(() => llmWith([result("tiny")]))("https://h.example.com/a", "q")).toBeNull();
    expect(await makeWebFetch(() => ({ invoke: async () => { throw new Error("boom"); } }))("https://h.example.com/a", "q")).toBeNull();
  });
});
