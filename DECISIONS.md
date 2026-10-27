# DECISIONS

### D-PROD-1 Scope-aware verdict with two clocks
Context: difficulty depends on requested scopes; developers ask "when can I test" and "when can I launch".
Decision: every guide carries tier (0–4, computed), timeToFirstConnection, timeToProduction, activeEffort.
Consequence: tools→scopes mapping via Composio is on the critical path (T01).

### D-PROD-2 Elephant–Goldfish inside the product
Context: LLM-written guides overclaim. google/elephant-goldfish-model separates drafting from fresh-context review.
Decision: `draft` sees all research; `verify` sees only claims + cited sources and downgrades unsupported ones.
Consequence: an extra LLM call per run (~30–60 s); evidence ledger becomes trustworthy enough to show.

### D-ARCH-1 TypeScript monorepo, LangGraph JS, Railway
Context: one schema shared across agent/web/MCP/plugin; runs take minutes and stream over SSE.
Decision: pnpm workspace; @langchain/langgraph; Next.js on one long-lived Node process (Railway + volume).
Consequence: no serverless deploy; filesystem storage only.

### D-PLAN-1 Plan review outcome (Goldfish)
Context: zoom-out reviewer estimated 10–12 h for the original scope; readiness reviewer found 5 blockers in task ownership/protocol.
Decision: cut-line tiers in 00_PLAN; MCP in-process + bundled; schema trimmed; 5 guides; plugin oauth-setup kept as Tier B.
Consequence: Tier A alone is a complete submission; B/C are cut by rule (CLAUDE.md step 7), not by mood.
