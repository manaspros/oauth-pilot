// Spawns the built plugin bundle in fake mode and drives it with the MCP SDK client over stdio.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The SDK is a dependency of packages/mcp, not of the repo root.
const req = createRequire(path.join(root, "packages/mcp/package.json"));
const load = (spec) => import(pathToFileURL(req.resolve(spec)).href);
const { Client } = await load("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = await load("@modelcontextprotocol/sdk/client/stdio.js");
const bin = process.env.MCP_BIN ?? path.join(root, "plugin/oauth-pilot/bin/mcp.mjs");

async function run(label, guidesDir, check) {
  const dataDir = mkdtempSync(path.join(tmpdir(), "oauth-pilot-mcp-"));
  const t0 = Date.now();
  const transport = new StdioClientTransport({
    command: "node",
    args: [bin],
    env: { PATH: process.env.PATH, OAUTH_PILOT_FAKE: "1", OAUTH_PILOT_FAKE_DELAY_MS: "0", GUIDES_DIR: guidesDir, DATA_DIR: dataDir },
    stderr: "pipe",
  });
  const client = new Client({ name: "e2e", version: "0.0.0" });
  const out = (r) => r.content.map((c) => c.text).join("\n");
  try {
    await client.connect(transport);
    await check(client, out);
    console.log(`mcp e2e ok: ${label} (${Date.now() - t0} ms)`);
  } finally {
    await client.close().catch(() => {});
    rmSync(dataDir, { recursive: true, force: true });
  }
}

await run("repo guides dir", path.join(root, "guides"), async (client, out) => {
  const tools = (await client.listTools()).tools.map((t) => t.name).sort();
  assert.deepEqual(tools, ["oauth_guide_get", "oauth_guide_list", "oauth_guide_start", "oauth_guide_status"]);

  const list = out(await client.callTool({ name: "oauth_guide_list", arguments: {} }));
  assert.match(list, /gmail/, "list includes gmail");

  const got = await client.callTool({ name: "oauth_guide_get", arguments: { slug: "gmail" } });
  assert.ok(!got.isError);
  assert.match(out(got), /Evidence/, "get gmail contains Evidence");

  const started = JSON.parse(out(await client.callTool({ name: "oauth_guide_start", arguments: { app: "calendly" } })));
  assert.ok(started.run_id, "start returns run_id");
  assert.ok(!("web_url" in started), "no web_url without OAUTH_PILOT_URL");

  let status = "";
  let calls = 0;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    calls++;
    status = out(await client.callTool({ name: "oauth_guide_status", arguments: { run_id: started.run_id, wait_seconds: 20 } }));
    if (/^Done\./.test(status) || /FAILED/.test(status)) break;
  }
  assert.ok(calls <= 3, `done within 3 status calls, took ${calls}`);
  assert.match(status, /^Done\./, "run reaches done within 30 s: " + status);
  assert.match(status, /tier/i, "status contains tier");

  const bad = await client.callTool({ name: "oauth_guide_get", arguments: { slug: "../etc" } });
  assert.ok(bad.isError, "unsafe slug rejected");

});

// Installed-plugin path: no guides on disk, so list/get must come from the embedded guides.
const emptyDir = mkdtempSync(path.join(tmpdir(), "oauth-pilot-empty-"));
try {
  await run("empty GUIDES_DIR (embedded)", emptyDir, async (client, out) => {
    assert.match(out(await client.callTool({ name: "oauth_guide_list", arguments: {} })), /gmail/, "embedded list includes gmail");
    const got = await client.callTool({ name: "oauth_guide_get", arguments: { slug: "gmail" } });
    assert.ok(!got.isError, "embedded get gmail ok");
    assert.match(out(got), /Evidence/);
  });
} finally {
  rmSync(emptyDir, { recursive: true, force: true });
}
