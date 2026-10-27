import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makeComposioLookup } from "../src/nodes/composio";
import type { State } from "../src/state";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

const fx = (n: string) => JSON.parse(readFileSync(new URL(`../fixtures/spike/${n}.json`, import.meta.url), "utf8"));
const toolkit = fx("toolkit-gmail");
const rec = fx("scopes-recommended");
const tool = fx("tool-gmail-fetch-emails");

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const mkFetch = (routes: Record<string, () => Response>) => {
  const calls: { url: string; method: string; key: string | null }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    const u = new URL(url).pathname;
    const method = init?.method ?? "GET";
    calls.push({ url: u, method, key: (init?.headers as Record<string, string>)["x-api-key"] ?? null });
    const r = routes[`${method} ${u}`];
    return r ? r() : json(404, {});
  }) as unknown as typeof fetch;
  return { f, calls };
};
const st = (tools?: string[]) =>
  ({ input: { app: "Gmail", tools }, runId: "r", target: { name: "Gmail", slug: "gmail", composioSlug: "gmail", docsHints: [] } }) as unknown as State;

describe("composio_lookup", () => {
  it("maps toolkit facts", async () => {
    const { f, calls } = mkFetch({ "GET /api/v3.1/toolkits/gmail": () => json(200, toolkit) });
    const r = (await makeComposioLookup(() => ({ fetch: f, apiKey: "k" }))(st(), {})) as R;
    expect(r.composio).toMatchObject({ toolkitFound: true, managedSchemes: ["OAUTH2"], authGuideUrl: null });
    expect(r.composio!.availableScopes).toContain("https://mail.google.com/");
    expect(r.composio!.availableScopes!.length).toBe(11);
    expect(calls[0]!.key).toBe("k");
  });
  it("uses scopes/recommended when tools are given", async () => {
    const { f, calls } = mkFetch({
      "GET /api/v3.1/toolkits/gmail": () => json(200, toolkit),
      "POST /api/v3.1/toolkits/gmail/scopes/recommended": () => json(200, rec.body),
    });
    const r = (await makeComposioLookup(() => ({ fetch: f, apiKey: "k" }))(st(["GMAIL_FETCH_EMAILS"]), {})) as R;
    expect(r.composio!.requiredScopes).toEqual(["https://www.googleapis.com/auth/gmail.readonly"]);
    expect(r.composio!.scopeSource).toBe("scopes/recommended");
    expect(calls.some((c) => c.url.includes("/tools/"))).toBe(false);
  });
  it("falls back to per-tool scopes when the beta endpoint fails", async () => {
    const { f } = mkFetch({
      "GET /api/v3.1/toolkits/gmail": () => json(200, toolkit),
      "POST /api/v3.1/toolkits/gmail/scopes/recommended": () => json(500, {}),
      "GET /api/v3.1/tools/GMAIL_FETCH_EMAILS": () => json(200, tool.body),
    });
    const r = (await makeComposioLookup(() => ({ fetch: f, apiKey: "k" }))(st(["GMAIL_FETCH_EMAILS"]), {})) as R;
    expect(r.composio!.requiredScopes).toContain("https://www.googleapis.com/auth/gmail.readonly");
    expect(r.composio!.scopeSource).toBe("tools/{slug}.scopes");
    expect(r.issues!.length).toBe(1);
  });
  it("404 -> toolkitFound false + issue", async () => {
    const { f } = mkFetch({});
    const r = (await makeComposioLookup(() => ({ fetch: f, apiKey: "k" }))(st(), {})) as R;
    expect(r.composio).toEqual({ toolkitFound: false });
    expect(r.issues![0]).toMatch(/not found/);
  });
  it("missing key -> skipped + issue, no network", async () => {
    const { f, calls } = mkFetch({});
    const r = (await makeComposioLookup(() => ({ fetch: f, apiKey: undefined }))(st(), {})) as R;
    expect(r.composio).toEqual({ toolkitFound: false });
    expect(r.issues![0]).toMatch(/missing/);
    expect(calls.length).toBe(0);
  });
});
