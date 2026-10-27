import { randomBytes } from "node:crypto";
import { runGuide, slugify } from "@oauth-pilot/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CONCURRENT = 2;
const g = globalThis as unknown as { __oauthPilotActive?: number };

export async function POST(req: Request) {
  let body: { app?: unknown; useCase?: unknown; tools?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  const app = typeof body.app === "string" ? body.app.trim() : "";
  if (!app || app.length > 200) return Response.json({ error: "app is required (max 200 chars)" }, { status: 400 });
  const useCase = typeof body.useCase === "string" && body.useCase.trim() ? body.useCase.trim().slice(0, 1000) : undefined;
  const tools = Array.isArray(body.tools) ? body.tools.filter((t): t is string => typeof t === "string").slice(0, 50) : undefined;

  if ((g.__oauthPilotActive ?? 0) >= MAX_CONCURRENT) {
    return Response.json({ error: "Two runs are already in progress. Try again in a minute." }, { status: 429 });
  }
  const runId = `${(slugify(app) || "run").slice(0, 40)}-${randomBytes(4).toString("hex")}`.replace(/^-+/, "r");
  g.__oauthPilotActive = (g.__oauthPilotActive ?? 0) + 1;
  // Not awaited: the client follows progress through the events endpoint.
  runGuide({ app, useCase, tools }, { runId })
    .catch(() => {
      /* failure is already recorded as an error event */
    })
    .finally(() => {
      g.__oauthPilotActive = Math.max(0, (g.__oauthPilotActive ?? 1) - 1);
    });
  return Response.json({ runId }, { status: 202 });
}
