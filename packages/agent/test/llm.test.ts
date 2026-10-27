import { expect, it } from "vitest";
import { makeLlm } from "../src/llm";

it("makeLlm does not set a temperature", () => {
  process.env.ANTHROPIC_API_KEY ??= "test-key";
  const llm = makeLlm({ maxTokens: 100 });
  expect(llm.temperature).toBeUndefined();
  expect(llm.maxTokens).toBe(100);
});
