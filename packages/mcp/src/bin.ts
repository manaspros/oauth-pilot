import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { installAssetShim } from "./shim";
import { createServer } from "./server";

installAssetShim();
// stdout is the protocol channel: log to stderr only.
console.log = (...a: unknown[]) => console.error(...a);
console.info = console.log;

process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e instanceof Error ? e.stack ?? e.message : e));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e instanceof Error ? e.stack ?? e.message : e));

const server = createServer();
await server.connect(new StdioServerTransport());
console.error("oauth-pilot MCP server ready");
