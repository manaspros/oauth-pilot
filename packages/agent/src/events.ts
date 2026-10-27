export const NODE_NAMES = ["intake", "composio_lookup", "docs_research", "probe", "draft", "verify", "finalize"] as const;
export type NodeName = (typeof NODE_NAMES)[number];

export type RunInput = { app: string; useCase?: string; tools?: string[] };

export type RunEvent =
  | { t: "run_started"; runId: string; input: RunInput; at: string }
  | { t: "node_started"; node: NodeName; at: string }
  | { t: "node_finished"; node: NodeName; at: string; summary: string; status?: "ok" | "degraded" }
  | { t: "log"; node: NodeName; msg: string; at: string; level?: "info" | "warn" }
  | { t: "done"; slug: string; tier: number; at: string }
  | { t: "error"; node?: NodeName; msg: string; at: string };

export type Emit = (event: RunEvent) => void | Promise<void>;

export const now = () => new Date().toISOString();
