import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: class {
    bindTools() {
      return { invoke: invokeMock };
    }
  },
}));

import { docsResearch, parseResearchResponse } from "../src/nodes/research";

const load = async (n: string) =>
  JSON.parse(await readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/unit", n), "utf8")) as { content: any[] };

const runNode = async () => {
  const events: any[] = [];
  const out = await docsResearch({ input: { app: "Linear" }, target: null } as any, { configurable: { emit: (e: any) => events.push(e) } } as any);
  return { out, events };
};

describe("parseResearchResponse", () => {
  it("parses server-tool blocks into notes with url + quote and lists queries", async () => {
    const { notes, queries, sourceUrls } = parseResearchResponse((await load("research-linear.json")).content);
    expect(queries).toEqual(["Linear OAuth 2.0 app registration", "Linear OAuth app scopes admin actor"]);
    expect(sourceUrls).toHaveLength(3);
    expect(notes).toHaveLength(2); // hallucinated url dropped
    for (const n of notes) {
      expect(n.url).toMatch(/^https:\/\//);
      expect(n.quote.length).toBeGreaterThan(0);
      expect(n.quote.length).toBeLessThanOrEqual(400);
    }
    expect(notes[0]).toMatchObject({ id: "r1", topic: "registration", title: "OAuth 2.0 authentication" });
    expect(notes[1]!.title).toBe("OAuth actor authorization");
  });

  it("falls back to text-block citations", async () => {
    const { notes } = parseResearchResponse((await load("research-citations.json")).content);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.quote).toContain("Read access");
  });

  it("parses a live recorded response into at least 3 notes", async () => {
    const { notes, queries } = parseResearchResponse((await load("research-live-linear.json")).content);
    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(queries.length).toBeGreaterThan(0);
    for (const n of notes) expect(n.quote.length).toBeLessThanOrEqual(400);
  });

  it("joins JSON split across text blocks, tolerates preamble with brackets, and normalizes urls", () => {
    const content = [
      { type: "web_search_tool_result", content: [{ type: "web_search_result", url: "https://a.dev/docs/", title: "A" }] },
      { type: "text", text: "Here [is] the result: " },
      { type: "text", text: '[{"topic":"limits","finding":"f","url":"https://a.dev/docs#x","quote":"q' },
      { type: "text", text: 'uote"}]' },
    ];
    const { notes } = parseResearchResponse(content);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ topic: "limits", quote: "quote", title: "A" });
  });

  it("keeps notes but flags unobserved when no tool results exist; empty text gives no notes", () => {
    const r = parseResearchResponse([{ type: "text", text: '[{"topic":"scopes","finding":"f","url":"https://a.dev","quote":"q"}]' }]);
    expect(r.notes).toHaveLength(1);
    expect(r.unobserved).toBe(true);
    expect(parseResearchResponse([{ type: "text", text: "nothing found" }]).notes).toEqual([]);
  });
});

describe("docsResearch node", () => {
  it("emits one log event per search query and returns notes (mocked llm, no network)", async () => {
    const fx = await load("research-linear.json");
    invokeMock.mockReset().mockResolvedValue({ content: fx.content, response_metadata: { stop_reason: "end_turn" } });
    const { out, events } = await runNode();
    expect(out.research).toHaveLength(2);
    expect(out.issues).toBeUndefined();
    const logs = events.filter((e) => e.t === "log");
    expect(logs.map((l) => l.msg)).toEqual(["searching: Linear OAuth 2.0 app registration", "searching: Linear OAuth app scopes admin actor"]);
    expect(logs.every((l) => l.node === "docs_research")).toBe(true);
  });

  it("continues on pause_turn (max 2) and merges blocks", async () => {
    const fx = await load("research-linear.json");
    invokeMock
      .mockReset()
      .mockResolvedValueOnce({ content: fx.content.slice(0, 5), response_metadata: { stop_reason: "pause_turn" } })
      .mockResolvedValueOnce({ content: fx.content.slice(5), response_metadata: { stop_reason: "end_turn" } });
    const { out } = await runNode();
    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(out.research).toHaveLength(2);
  });

  it("caps continuations and reports max_tokens and empty-notes issues", async () => {
    invokeMock.mockReset().mockResolvedValue({ content: [{ type: "text", text: "nope" }], response_metadata: { stop_reason: "pause_turn" } });
    const capped = await runNode();
    expect(invokeMock).toHaveBeenCalledTimes(3);
    expect(capped.out.research).toEqual([]);
    expect((capped.out.issues as string[]).join("|")).toContain("no sourced notes");

    invokeMock.mockReset().mockResolvedValue({ content: "nope", response_metadata: { stop_reason: "max_tokens" } });
    const trunc = await runNode();
    expect((trunc.out.issues as string[]).join("|")).toContain("max_tokens");
  });
});
