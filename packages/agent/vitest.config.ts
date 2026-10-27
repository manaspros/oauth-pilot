import { defineConfig } from "vitest/config";

// live.test.ts makes network/LLM calls: only run it when named explicitly (`pnpm test:live`).
const live = process.argv.some((a) => a.includes("live.test"));

export default defineConfig({
  test: { include: ["test/**/*.test.ts"], exclude: live ? [] : ["test/live.test.ts", "node_modules/**"], testTimeout: 30000 },
});
