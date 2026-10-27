import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { MAX_FETCHES, htmlToText, makeVerify, quoteInPage } from "../src/nodes/verify";

const here = path.dirname(fileURLToPath(import.meta.url));
const linear = () => JSON.parse(readFileSync(path.join(here, "../fixtures/runs/linear/draft.json"), "utf8"));

const page = (body: string) => new Response(`<html><head><style>x{}</style></head><body>${body}</body></html>`, { status: 200, headers: { "content-type": "text/html" } });

function run(opts: { draft: any; pages: Record<string, string | number>; llm: any[] | (() => string) }) {
  const fetchMock = vi.fn(async (url: any) => {
    const v = opts.pages[String(url)];
    if (typeof v === "number") return new Response("", { status: v });
    if (v === undefined) return new Response("", { status: 404 });
    return page(v);
  });
  const invoke = vi.fn(async () => ({ text: typeof opts.llm === "function" ? opts.llm() : JSON.stringify(opts.llm) }));
  const node = makeVerify(() => ({ fetch: fetchMock as any, invoke }));
  return { fetchMock, invoke, go: () => node({ input: { app: "Linear" }, draft: opts.draft } as any, { configurable: {} } as any) };
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
