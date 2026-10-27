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

### D-API-1 Composio toolkit lookup and the real OAuth callback URL (confirmed 2026-10-27)
Context: `GET https://backend.composio.dev/api/v3.1/toolkits/gmail` with header `x-api-key: $COMPOSIO_API_KEY` returned 200 (fixture: packages/agent/fixtures/spike/toolkit-gmail.json). Top-level keys: name, slug, type, enabled, composio_managed_auth_schemes, composio_managed_auth, auth_config_details, auth_guide_url, is_local_toolkit, base_url, meta, deprecated.
Decision: `composio_managed_auth_schemes=["OAUTH2"]`; `composio_managed_auth=[{mode:"OAUTH2",scopes:{available:[11 scopes]}}]`; `auth_config_details[0]={name:"gmail_oauth",mode:"OAUTH2",required_scopes:[],fields:{auth_config_creation:{required:[client_id,client_secret],optional:[oauth_redirect_uri,scopes]},connected_account_initiation:{required:[],optional:[]}}}`; `auth_guide_url=null`. The **callback URL a custom app must register is `https://backend.composio.dev/api/v1/auth-apps/add`** (the default of `oauth_redirect_uri`, echoed back by GET auth_configs and as `callback_url` in the connected-account state). It is neither the v3 nor the v3.1 path; it is a v1 path.
Consequence: T02 `COMPOSIO_CALLBACK_URL` must be `https://backend.composio.dev/api/v1/auth-apps/add`, not a /v3 URL. A toolkit's `auth_config_creation.required` field names drive the custom-credentials body (D-API-3). `/api/v3/tools/{slug}` and `/api/v3.1/tools/{slug}` both return 200 and include `scopes` and `scope_requirements` (all_of/any_of) per tool, a second source for scopes (fixture tool-gmail-fetch-emails.json).

### D-API-2 Required scopes for tools: POST /toolkits/{slug}/scopes/recommended (confirmed)
Context: the docs' `recommendToolkitScopes` is SDK `composio.toolkits.recommendScopes()` in @composio/core 0.27.0, path `POST /api/v3.1/toolkits/{toolkit_slug}/scopes/recommended` (marked experimental/beta). Body: `{tools: string[] ([] = whole toolkit), auth_scheme?, toolkit_version?, grant_context?: {dim: value}, include?, exclude?, available_scopes?}`.
Decision: (fixtures scopes-recommended.json, scopes-grant-context.json via scripts/spikes/composio-scopes.mjs) ran `{"tools":["GMAIL_FETCH_EMAILS"]}` -> 200 `{auth_scheme:"OAUTH2",toolkit_version:"20261023_00",grant_context:{},scopes:{least_privilege:["https://www.googleapis.com/auth/gmail.readonly"],fewest:["https://www.googleapis.com/auth/gmail.readonly"],conditional:[]}}`. Companion `GET /api/v3.1/toolkits/gmail/scopes/grant_context` -> 200 `grant_context_dimensions:[{dimension:"account_type",values:["Google Workspace"]}]`, `default_grant_context:{}`. Use `scopes.least_privilege` for the guide's requested scopes.
Consequence: composio_lookup can map tools to scopes with one POST. Conditional scopes appear in `scopes.conditional[{scope,when,for}]`. Beta endpoint, so keep a fallback: per-tool `scopes`/`scope_requirements` on GET /tools/{slug} (confirmed 200 for GMAIL_FETCH_EMAILS, fixture tool-gmail-fetch-emails.json: any_of mail.google.com | gmail.modify | gmail.readonly).

### D-API-3 Custom OAuth credentials: POST /api/v3.1/auth_configs (confirmed by live create + delete)
Context: shape taken from @composio/core/@composio/client types (`CustomAuthConfigCreate`), then exercised with FAKE client credentials (scripts/spikes/composio-authflow.mjs). The auth config it created was deleted in the same run (DELETE -> 200 success:true).
Decision: request `{"toolkit":{"slug":"gmail"},"auth_config":{"type":"use_custom_auth","name":"...","authScheme":"OAUTH2","credentials":{"client_id":"...","client_secret":"...","scopes":"scope1,scope2" | ["scope1"]}}}` -> 201 `{toolkit:{slug},auth_config:{id:"ac_...",auth_scheme:"OAUTH2",is_composio_managed:false,restrict_to_following_tools:[]}}`. `credentials` is a free-form record; key names come from the toolkit's `auth_config_creation` fields (D-API-1); optional `oauth_redirect_uri`. Managed variant: `auth_config:{type:"use_composio_managed_auth"}`. GET /auth_configs/{id} echoes `credentials.oauth_redirect_uri="https://backend.composio.dev/api/v1/auth-apps/add"` and scopes as an array. `restrict_to_following_tools` and `tool_access_config` are deprecated: pass scopes from D-API-2 in `credentials.scopes`.
Consequence: no request in this product needs the user's real secret; it only documents the shape. Auth config id prefix `ac_`.

### D-API-4 Connected-account initiate and status poll (confirmed by live create + delete)
Context: with the fake auth config from D-API-3: `POST /api/v3.1/connected_accounts` body `{"auth_config":{"id":"ac_..."},"connection":{"user_id":"<entity id>"}}` -> 201.
Decision: response `{id:"ca_...",status:"INITIATED",redirect_url,redirect_uri,connectionData:{authScheme:"OAUTH2",val:{status:"INITIATED",redirectUrl:"https://backend.composio.dev/api/v3/s/<short>",callback_url:"https://backend.composio.dev/api/v1/auth-apps/add"}}}`. Poll: `GET /api/v3.1/connected_accounts/{id}` -> 200 with `status` ("INITIATED" until the user finishes; other states INITIALIZING/ACTIVE/FAILED/EXPIRED/INACTIVE per SDK types), `status_reason`, `requested_scopes`, `auth_config`, `test_request_endpoint`. SDK also has `GET /connected_accounts/{id}/status` and `POST /connected_accounts/link` (not run). The run did not complete OAuth (fake client), so ACTIVE is documented from the SDK types, not observed. Both created objects were deleted (`DELETE /connected_accounts/{id}` -> 200 success:true).
Consequence: the "test connection" step = initiate, hand the user `redirect_url`, poll `status` until ACTIVE or a timeout.

### D-API-5 LLM through the LiteLLM proxy (confirmed)
Context: model claude-sonnet-5-5 via ANTHROPIC_BASE_URL (scripts/spikes/langchain-probe.mjs, llm-probe.mjs; fixtures langchain-probe.json, webfetch-probe.json).
Decision: (a) `@langchain/anthropic` `ChatAnthropic` works through the proxy and honours `ANTHROPIC_BASE_URL` from env alone (call with no `anthropicApiUrl` succeeded; also fine passing `anthropicApiUrl`). `.bindTools([{type:"web_search_20250305",name:"web_search",max_uses:1}]).invoke()` returned content blocks `server_tool_use, web_search_tool_result, text...`; `web_search_tool_result.content[]` items carry `url` (5 URLs seen). (b) Web fetch tool type `web_fetch_20250910` (`name:"web_fetch"`) works through the proxy with or without the `anthropic-beta: web-fetch-2025-09-10` header: 200, blocks `server_tool_use, web_fetch_tool_result{content.type:"web_fetch_result", content.url}, text`, `usage.server_tool_use.web_fetch_requests=1`. `web_fetch_20260209` returns 400 "code_execution, web_fetch_20260209 not supported in your workspace".
Consequence: the verify node may use `web_fetch_20250910` as a server tool (no beta header needed); keep the plain `fetch()` + HTML-to-text fallback anyway for non-200 or proxy-side policy changes. @langchain/anthropic was installed only in a scratch dir, not in the repo; T11 adds it to packages/agent.

### D-API-6 Claude Code plugin facts (confirmed on claude 2.1.311)
Context: run by hand on claude 2.1.311 (no script in the repo) from a scratch plugin built outside the repo with `.claude-plugin/plugin.json`, `.mcp.json`, `skills/oauth-setup/SKILL.md`, a dependency-free stdio MCP server `bin/mcp.mjs`; results in fixtures/spike/plugin-probe.json.
Decision: `.mcp.json` format `{"mcpServers":{"oauth-pilot":{"command":"node","args":["${CLAUDE_PLUGIN_ROOT}/bin/mcp.mjs"]}}}` is correct; `${CLAUDE_PLUGIN_ROOT}` resolves in MCP `command/args/env`, hook commands and skill/command/agent markdown bodies (not in Bash-tool commands). `claude plugin validate <dir>` exits 0 on a good plugin (prints non-fatal directory-profile notes: README, LICENSE or `license`, icon; `--profile directory` makes them fatal) and exits 1 on errors; a plugin name starting `claude-` or `anthropic-` is rejected. `claude -p --plugin-dir <dir> --output-format stream-json --verbose "<prompt>"` loads it (init event: plugin `oauth-pilot@inline`, mcp server `plugin:oauth-pilot:oauth-pilot` status connected, skill and slash command `oauth-pilot:oauth-setup`); the MCP tool name is `mcp__plugin_oauth-pilot_oauth-pilot__<tool>` and a real tool call returned its result. Skills are namespaced `<plugin>:<skill>`.
Consequence: T19/T20 scaffolding can use these exact files; CI check = `claude plugin validate plugin/oauth-pilot` (add `--strict` to fail on warnings; add README and `license` in plugin.json to also satisfy `--profile directory`). MCP server must be dependency-free or bundled (D-PLAN-1).

### D-AGENT-1 Graph runtime conventions (T10)
Context: LangGraph refuses a node id equal to a state channel (`draft`); the spec says non-draft failures degrade.
Decision: draft's node id is `draft_node`, but events still report `draft`. Only draft and finalize are fatal. Other nodes log at level warn, emit `node_finished` with `status:"degraded"`, and add an issue. `done` is emitted by runGuide after the stream ends. Slugs and runIds must match `/^[a-z0-9][a-z0-9-]*$/i`. A timeout note goes into `guide.openQuestions` (the schema has no issues field).
Consequence: T13 keeps `draft_node` in graph.ts; T17 renders `status:"degraded"` as a warning state.

### D-ORCH-1 Accepted out-of-Files change in T10
Context: the T10 worker widened packages/agent/tsconfig.json `include` to cover test/ and vitest.config.ts (a T00 file).
Decision: accepted by the orchestrator instead of a FAIL; it only widens typecheck coverage.
Consequence: agent tests are typechecked by `pnpm typecheck`.

### D-AGENT-2 Probe inputs and URL safety (T11)
Context: probe runs in parallel with docs_research, so it can't use research URLs; all probe URLs are LLM-derived.
Decision: intake puts up to 2 provider https URLs (console, OAuth docs) into `target.docsHints`. Probe GETs .well-known on website/api./auth. and HEADs the URL hints. Only https is allowed: no IP literals, localhost, .local, .internal or single-label hosts, and redirects are recorded, not followed. Composio slugs drop separators (`googlecalendar`; checked: `google_calendar` → 404).
Consequence: draft turns ok probes into `tested` claims; rejected URLs show as `ok:false` "skipped: <reason>".

### D-API-7 claude-sonnet-5-5 rejects non-default temperature
Context: T12's live run through ChatAnthropic failed: "temperature is not supported for claude-sonnet-5-5 when set to non-default values".
Decision: makeLlm() sets no temperature and takes `{maxTokens?, model?}` overrides. Nodes use makeLlm().
Consequence: outputs are not temperature-pinned; determinism comes from fixtures in fake mode.

### D-AGENT-3 Evidence enforcement in draft/verify (T13)
Context: an LLM can claim "tested", and short quotes match any page.
Decision: only code-made claims (`tp*` from probes, `tc1` from the Composio lookup) may be `tested`; a model-written tested claim is demoted to inferred/low. verify uses plain fetch + HTML→text, not web_fetch. Quote segments under 12 chars and under 3 words are unverifiable (left to the LLM, confidence capped at medium). An absent strong quote → `unsupported` regardless of the LLM.
Consequence: JS-rendered pages can produce false `unsupported`; if T14/T21 show many, add a web_fetch fallback.
