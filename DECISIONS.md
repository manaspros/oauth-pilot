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

### D-ARCH-2 LLM through a LiteLLM proxy (Anthropic-compatible)
Context: the user's LiteLLM key is used instead of a direct Anthropic key. Probe on 2026-10-27: the proxy lists claude-sonnet-5-5 / opus-5-5 / haiku-5-5; POST /v1/messages with web_search_20250305 returned server_tool_use + web_search_tool_result + text (1 search request).
Decision: keep the Anthropic SDK path; set ANTHROPIC_BASE_URL + ANTHROPIC_API_KEY in .env. The proxy URL is never committed.
Consequence: no code changes vs the plan; T01 still confirms the LangChain client and web fetch through the proxy.

### D-OPS-1 Composio key status
2026-10-27: the key the user supplied returned 401 "Invalid API key" on /api/v3.1 and /api/v3 (both x-api-key and x-user-api-key). T01 items 1–4 stay blocked until a valid key is in .env; composio_lookup degrades gracefully without it.

### D-OPS-2 Composio project key works (supersedes D-OPS-1)
2026-10-27: the earlier `ck_` key is a consumer MCP key (x-consumer-api-key), not a platform key. A project key (`ak_…`, in .env) returns 200 on GET /api/v3.1/toolkits/gmail with x-api-key: composio_managed_auth_schemes=["OAUTH2"], auth_config_details modes ["OAUTH2"] with required_scopes [], managed scope ceiling of 11 scopes, auth_guide_url null.
Consequence: T01 items 1–4 are unblocked. Don't rely on auth_guide_url (null for gmail).
