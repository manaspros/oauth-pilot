import { Annotation } from "@langchain/langgraph";
import type { Guide } from "@oauth-pilot/core";
import type { RunInput } from "./events";

export type Topic = "registration" | "review_process" | "scopes" | "requirements" | "limits" | "gotchas" | "errors";
export type ResearchNote = { id: string; topic: Topic; finding: string; url: string; title: string; quote: string };
export type ProbeResult = { id: string; check: string; url: string; ok: boolean; status?: number; observed: string; at: string };
export type Target = { name: string; slug: string; website?: string; composioSlug?: string; docsHints: string[] };
export type ComposioFacts = {
  toolkitFound: boolean;
  managedSchemes?: string[];
  availableScopes?: string[];
  requiredScopes?: string[];
  authGuideUrl?: string | null;
  [k: string]: unknown;
};

const concat = <T>(a: T[], b: T[]) => a.concat(b);

export const GraphState = Annotation.Root({
  input: Annotation<RunInput>(),
  runId: Annotation<string>(),
  target: Annotation<Target | null>({ reducer: (_a, b) => b, default: () => null }),
  composio: Annotation<ComposioFacts | null>({ reducer: (_a, b) => b, default: () => null }),
  research: Annotation<ResearchNote[]>({ reducer: concat, default: () => [] }),
  probes: Annotation<ProbeResult[]>({ reducer: concat, default: () => [] }),
  draft: Annotation<unknown | null>({ reducer: (_a, b) => b, default: () => null }),
  guide: Annotation<Guide | null>({ reducer: (_a, b) => b, default: () => null }),
  issues: Annotation<string[]>({ reducer: concat, default: () => [] }),
  repairs: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
});

export type State = typeof GraphState.State;
export type StateUpdate = typeof GraphState.Update;
