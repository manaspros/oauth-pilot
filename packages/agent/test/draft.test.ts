import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const linear = () => JSON.parse(readFileSync(path.join(here, "../fixtures/runs/linear/draft.json"), "utf8"));
const research = () => JSON.parse(readFileSync(path.join(here, "../fixtures/runs/linear/research.json"), "utf8")).research;

// Live draft + finalize, everything else stubbed; verify passes the draft through.
vi.mock("../src/nodes/intake", () => ({ intake: async () => ({ target: { name: "Linear", slug: "linear", docsHints: [] } }) }));
vi.mock("../src/nodes/composio", () => ({ composioLookup: async () => ({ composio: { toolkitFound: true, managedSchemes: ["OAUTH2"], availableScopes: ["a"] } }) }));
vi.mock("../src/nodes/research", () => ({ docsResearch: async () => ({ research: research() }) }));
vi.mock("../src/nodes/probe", () => ({
  probe: async () => ({
    probes: [
      { id: "p1", check: "oauth-authorization-server well-known", url: "https://linear.app/.well-known/x", ok: true, status: 200, observed: "HTTP 200, metadata JSON", at: "2026-10-27T00:00:00Z" },
      { id: "p2", check: "HEAD docs/console URL", url: "https://nope.example.com", ok: false, observed: "HTTP 404", at: "2026-10-27T00:00:00Z" },
    ],
  }),
}));
vi.mock("../src/nodes/verify", () => ({ verify: async () => ({}) }));

const replies: string[] = [];
const seen: string[] = [];
vi.mock("../src/llm", () => ({
  modelName: () => "test-model",
  makeLlm: () => ({
    invoke: async (messages: any[]) => {
      seen.push(messages[1].content);
      return { content: [{ type: "text", text: replies.shift()! }], response_metadata: { stop_reason: "end_turn" } };
    },
  }),
}));

import { buildGraph } from "../src/graph";
import { extractJson, premadeClaims, finishDraft } from "../src/nodes/draft";
import { validateGuide } from "@oauth-pilot/core";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "oauth-pilot-draft-"));
  process.env.DATA_DIR = dir;
  process.env.OAUTH_PILOT_FAKE = "0";
});
afterAll(() => rm(dir, { recursive: true, force: true }));

const input = { input: { app: "Linear" }, runId: "rr1" };

describe("draft + repair loop", () => {
  it("repairs once: draft runs twice, repairs increments, the second draft sees the issues", async () => {
    seen.length = 0;
    const bad = linear();
    bad.steps[0].claimIds = ["c99"]; // dangling => validateGuide error
    delete bad.generatedAt; // machine-owned fields are filled by the node
    replies.push("```json\n" + JSON.stringify(bad) + "\n```", JSON.stringify(linear()));
    const events: any[] = [];
    const out: any = await buildGraph().invoke(input, { configurable: { emit: (e: any) => events.push(e) } });
    expect(seen).toHaveLength(2);
    expect(out.repairs).toBe(1);
    expect(out.guide).not.toBeNull();
    expect(validateGuide(out.guide).ok).toBe(true);
    expect(events.filter((e) => e.t === "node_started" && e.node === "draft")).toHaveLength(2);
    const second = JSON.parse(seen[1]!);
    expect(second.repairIssues.join()).toMatch(/c99/);
    expect(second.previousDraft.steps[0].claimIds).toEqual(["c99"]);
    expect(out.guide.generator.model).toBe("test-model");
    expect(out.guide.composio.callbackUrl).toBe("https://backend.composio.dev/api/v1/auth-apps/add");
  });

  it("draft runs at most twice even when the repair is also invalid", async () => {
    seen.length = 0;
    replies.push("not json at all", "still not json");
    const out: any = await buildGraph().invoke({ ...input, runId: "rr2" }, { configurable: { emit: () => {} } });
    expect(seen).toHaveLength(2);
    expect(out.repairs).toBe(2);
    expect(out.guide).toBeNull();
    expect(out.issues.join()).toMatch(/draft: no JSON/);
  });

  it("premade claims: only ok probes and a found toolkit become tested claims", () => {
    const probes = [
      { id: "p1", check: "c", url: "https://a.example.com", ok: true, observed: "HTTP 200", at: "t" },
      { id: "p2", check: "c", url: "https://b.example.com", ok: false, observed: "HTTP 404", at: "t" },
    ];
    const claims = premadeClaims(probes, { toolkitFound: true, managedSchemes: ["OAUTH2"] }, "linear");
    expect(claims.map((c) => c.id)).toEqual(["tp1", "tc1"]);
    expect(claims.every((c) => c.evidence === "tested" && c.testedHow)).toBe(true);
    expect(premadeClaims([], { toolkitFound: false }, "x")).toEqual([]);
    const g = finishDraft({ claims: [{ id: "tp1", text: "dup" }, { id: "c1" }] }, { runId: "r", composio: { toolkitFound: true }, target: { slug: "s" } } as any, claims);
    expect(g.claims.map((c: any) => c.id)).toEqual(["tp1", "tc1", "c1"]);
  });

  it("a model-written tested claim is demoted to inferred/low, testedHow removed; code-made ones stay", () => {
    const premade = premadeClaims([{ id: "p1", check: "c", url: "https://a.example.com", ok: true, observed: "HTTP 200", at: "t" }], null, "x");
    const seenIds: string[] = [];
    const g = finishDraft(
      { claims: [{ id: "c1", text: "t", evidence: "tested", testedHow: "I ran it", confidence: "high", sources: [] }, { id: "tp1", evidence: "tested" }] },
      { runId: "r", composio: null, target: { slug: "s" } } as any,
      premade,
      (d) => seenIds.push(...d),
    );
    const c1 = g.claims.find((c: any) => c.id === "c1");
    expect(c1).toMatchObject({ evidence: "inferred", confidence: "low" });
    expect(c1.testedHow).toBeUndefined();
    expect(g.claims.find((c: any) => c.id === "tp1")).toMatchObject({ evidence: "tested", testedHow: expect.any(String) });
    expect(seenIds).toEqual(["c1"]);
  });

  it("extractJson tolerates prose and fences", () => {
    expect(extractJson('here: ```json\n{"a":1}\n```', "object")).toEqual({ a: 1 });
    expect(extractJson("nothing", "object")).toBeNull();
  });
});
