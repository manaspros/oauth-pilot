import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makeProbe, rejectReason } from "../src/nodes/probe";
import type { ProbeResult, State } from "../src/state";

const meta = readFileSync(new URL("../fixtures/unit/probe-oauth-metadata.json", import.meta.url), "utf8");
const st = (docsHints: string[] = [], website: string = "https://example.test") =>
  ({ input: { app: "Ex" }, runId: "r", research: [], target: { name: "Ex", slug: "ex", website, docsHints } }) as unknown as State;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

describe("probe", () => {
  it("records registration_endpoint, failures, and HEADs URL hints from target", async () => {
    const seen: { m?: string; url: string; redirect?: string }[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      seen.push({ m: init?.method, url, redirect: init?.redirect });
      if (url === "https://example.test/.well-known/oauth-authorization-server") return new Response(meta, { status: 200 });
      if (url.startsWith("https://api.example.test")) throw Object.assign(new Error("x"), { name: "TimeoutError" });
      if (url === "https://example.test/console") return new Response(null, { status: 302, headers: { location: "https://login.example.test/x" } });
      return new Response("nf", { status: 404 });
    }) as unknown as typeof fetch;
    const r = (await makeProbe({ fetch: f })(st(["example oauth app registration", "https://example.test/docs/oauth", "https://example.test/console"]), {})) as R;
    const probes = r.probes as ProbeResult[];
    const reg = probes.find((p) => p.check.startsWith("registration_endpoint"))!;
    expect(reg.ok).toBe(true);
    expect(reg.observed).toContain("https://example.test/oauth/register");
    expect(probes.find((p) => p.url === "https://example.test/.well-known/openid-configuration")!.ok).toBe(false);
    expect(probes.some((p) => p.observed.includes("timeout"))).toBe(true);
    expect(seen.find((s) => s.url === "https://example.test/docs/oauth")!.m).toBe("HEAD");
    expect(seen.some((s) => s.url.includes("search") || s.url.includes("registration "))).toBe(false);
    expect(seen.every((s) => s.redirect === "manual")).toBe(true);
    const c = probes.find((p) => p.url === "https://example.test/console")!;
    expect(c.observed).toContain("login.example.test");
    expect(c.observed).toContain("not followed");
    expect(new Set(probes.map((p) => p.id)).size).toBe(probes.length);
  });
  it("rejects unsafe URLs without fetching them", async () => {
    const seen: string[] = [];
    const f = (async (url: string) => {
      seen.push(url);
      return new Response("nf", { status: 404 });
    }) as unknown as typeof fetch;
    const hints = ["http://example.test/a", "https://127.0.0.1/a", "https://169.254.169.254/latest", "https://localhost/a", "https://db.internal/a", "https://printer.local/a"];
    const r = (await makeProbe({ fetch: f })(st(hints, "https://10.0.0.5"), {})) as R;
    expect(seen).toEqual([]);
    const probes = r.probes as ProbeResult[];
    expect(probes.length).toBe(hints.length + 1);
    expect(probes.every((p) => !p.ok && p.observed.startsWith("skipped"))).toBe(true);
  });
  it("rejectReason", () => {
    expect(rejectReason("https://linear.app/docs")).toBeNull();
    expect(rejectReason("https://192.168.1.1/")).toBe("IP literal");
    expect(rejectReason("ftp://x.com")).toBe("not https");
    expect(rejectReason("https://[::1]/a")).toBe("IP literal");
  });
  it("no website and no URL hints -> no probes, no throw", async () => {
    const r = (await makeProbe({ fetch: (async () => { throw new Error("no"); }) as unknown as typeof fetch })(st(["a search phrase"], ""), {})) as R;
    expect(r.probes).toEqual([]);
  });
});
