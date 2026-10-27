import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = 3100;
const dataDir = mkdtempSync(path.join(tmpdir(), "oauth-pilot-e2e-"));

export default defineConfig({
  testDir: "./e2e/web",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  webServer: {
    command: `pnpm --filter web build && pnpm --filter web exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      OAUTH_PILOT_FAKE: "1",
      GUIDES_DIR: path.resolve("packages/core/fixtures"),
      DATA_DIR: dataDir,
    },
  },
});
