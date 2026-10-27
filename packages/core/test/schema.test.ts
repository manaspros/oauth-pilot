import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Guide, guideJsonSchema, COMPOSIO_CALLBACK_URL } from "../src/index";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/linear.json", import.meta.url), "utf8"));

describe("schema", () => {
  it("fixture parses", () => {
    const g = Guide.parse(fixture);
    expect(g.slug).toBe("linear");
    expect(g.steps.length).toBeGreaterThanOrEqual(7);
    expect(g.claims.length).toBeGreaterThanOrEqual(6);
  });
  it("fixture is honest: tested claims have testedHow, sourced claims have sources", () => {
    const g = Guide.parse(fixture);
    for (const c of g.claims) {
      if (c.evidence === "tested") expect(c.testedHow).toBeTruthy();
      if (c.evidence === "sourced") expect(c.sources.length).toBeGreaterThan(0);
    }
  });
  it("fixture claimIds all resolve", () => {
    const g = Guide.parse(fixture);
    const ids = new Set(g.claims.map((c) => c.id));
    const refs = JSON.stringify(g).match(/"claimIds":\[[^\]]*\]/g) ?? [];
    for (const r of refs) for (const id of JSON.parse(r.slice(11))) expect(ids.has(id)).toBe(true);
  });
  it("rejects wrong schemaVersion", () => {
    expect(Guide.safeParse({ ...fixture, schemaVersion: 2 }).success).toBe(false);
  });
  it("exports json schema and callback url", () => {
    expect(guideJsonSchema).toBeTruthy();
    expect(COMPOSIO_CALLBACK_URL).toMatch(/^https:\/\//);
  });
});
