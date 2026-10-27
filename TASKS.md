# TASKS — board

Status values: `todo` · `in_progress` · `done` · `blocked` · `human` (needs the user, see CLAUDE.md §Human gates) · `cut` (dropped per 00_PLAN cut-line)
Only the orchestrator edits this file. Update a card's **Status** and **Notes** lines only. If acceptance criteria are wrong, add a DECISIONS.md entry, then edit them.

Legend:
- **Deps** must all be `done` (or `cut`) before start.
- **Files** = the only paths the worker may create or modify. A worker may always also touch its own package's `package.json` and `pnpm-lock.yaml` (via `pnpm --filter`).
- **Spec** = docs to read first.
- **Tier** = cut-line tier from 00_PLAN (A must ship, B showpiece, C optional).

Critical path: T00 → T01, T02 → T03 → T10 → T11, T12 → T13 → T14 → T15 → T16, T17, T18 → T19 → T21 → T23 → T25. T05–T07 run alongside anything.

---

## Phase 0 — Setup

### T00 · Repo scaffold + GitHub remote
- **Status:** done · **Tier:** A · **Deps:** — · **Est:** 20 min · **Agent:** orchestrator itself (no subagent)
- **Files:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.prettierrc`, `.gitignore`, `.env.example`, `packages/{core,agent,mcp}/{package.json,tsconfig.json,src/index.ts}`, `apps/web/package.json`, `scripts/check-secrets.sh`
- **Spec:** 01_ARCHITECTURE §Repo layout, §How packages consume each other
- **Do:**
  - Use package names `@oauth-pilot/core`, `@oauth-pilot/agent`, `@oauth-pilot/mcp`, `web`. Core and agent export `./src/index.ts` and have `typecheck` (`tsc --noEmit`) and `test` (`vitest run --passWithNoTests`) scripts. Add `vitest` + `typescript` as root devDeps.
  - Root scripts:
    - `"typecheck": "pnpm -r --if-present typecheck"`
    - `"test": "pnpm -r --if-present test"`
    - `"validate:guides": "node scripts/validate-guides.mjs"` (T03 creates the script)
    - `"e2e:web": "playwright test"`
    - `"e2e:mcp": "pnpm --filter @oauth-pilot/mcp build && node e2e/mcp.e2e.mjs"`
    - `"e2e:plugin": "bash e2e/plugin.e2e.sh"`
    - `"test:all": "pnpm typecheck && pnpm test && pnpm validate:guides && pnpm e2e:web && pnpm e2e:mcp"`
  - `scripts/check-secrets.sh`: exits 1 if `git diff --cached` matches the secret regex in CLAUDE.md §Commits.
  - The remote `origin` should already exist (created by the user, see README). If `git remote get-url origin` fails, set this card to `human` and ask the user to run `gh repo create manaspros/oauth-pilot --private --source=. --remote=origin --push`. Keep committing locally meanwhile.
- **Accept:** `pnpm install` ok; `pnpm typecheck` exit 0; `git check-ignore .env data/x` prints both; `git remote get-url origin` succeeds.
- **Notes:** agent:a89c92c7113fde0dc (sonnet worker, per user request). TS pinned ~5.9.3 (7.x lacks the JS API Next needs); vitest 5, Node 26, pnpm 12.15. check-secrets.sh exit-1 path tested.

### T01 · Spike: verify external APIs (gate for T11–T13, T20)
- **Status:** done · **Tier:** A · **Deps:** T00 · **Est:** 30 min · **Agent:** sonnet
- **Files:** `DECISIONS.md` (append only), `scripts/spikes/*.mjs`, `packages/agent/fixtures/spike/*.json` (recorded responses, secrets stripped)
- **Spec:** 03_AGENT_GRAPH, 04_PLUGIN
- **Do:** confirm each item and record the exact request and response shape (trimmed) as DECISIONS entries:
  1. **D-API-1** `GET https://backend.composio.dev/api/v3.1/toolkits/gmail` with `COMPOSIO_API_KEY`: fields `composio_managed_auth_schemes`, `composio_managed_auth`, `auth_config_details`. Also confirm the OAuth callback URL a custom app must register (v3 vs v3.1 path).
  2. **D-API-2** The "required scopes for tools" endpoint (docs name `recommendToolkitScopes`): find the path and try it for `GMAIL_FETCH_EMAILS`.
  3. **D-API-3** `POST /api/v3.1/auth_configs` body for **custom OAuth credentials**. Get it from the API reference or the `@composio/core` npm source; do not guess.
  4. **D-API-4** Connected-account initiate and status poll (v3.1).
  5. **D-API-5** LLM goes through the LiteLLM proxy (`ANTHROPIC_BASE_URL`, see D-ARCH-2). Raw `/v1/messages` + `web_search_20250305` is already confirmed. Still to confirm: (a) `@langchain/anthropic` `ChatAnthropic` honours the base URL from env and returns `server_tool_use` / `web_search_tool_result` blocks with URLs; (b) the web fetch server tool type string works through the proxy (check the claude-api skill). If (b) fails, the verify node fetches URLs with plain `fetch()` + HTML-to-text and passes the text in; record that.
  6. **D-API-6** Claude Code plugin facts: `.mcp.json` format and `${CLAUDE_PLUGIN_ROOT}`, `claude -p --plugin-dir`, and `claude plugin validate` (or the equivalent check command).
- **Accept:** DECISIONS.md has D-API-1…6, each "confirmed" with evidence or "not possible → fallback". If keys are missing: do 5–6 and the doc-only parts of 1–4, mark the rest "unverified", and the orchestrator sets the card to `human`.
- **Notes:** agent:aa0a4098f8084ff73. All 6 confirmed. Callback = https://backend.composio.dev/api/v1/auth-apps/add (not v3). Scopes: POST /api/v3.1/toolkits/{slug}/scopes/recommended (beta; fallback GET /tools/{slug}.scopes). web_fetch_20250910 OK through the proxy, 20260209 → 400. Fix 1: D-API-2 fixtures recorded.

## Phase 1 — Core

### T02 · Core schema + Linear fixture
- **Status:** done · **Tier:** A · **Deps:** T00 · **Est:** 40 min · **Agent:** sonnet
- **Files:** `packages/core/src/{schema,constants,index}.ts`, `packages/core/fixtures/linear.json`, `packages/core/test/schema.test.ts`
- **Spec:** 02_GUIDE_SCHEMA (whole doc)
- **Do:**
  - `schema.ts` exactly as specified (zod v3) plus `guideJsonSchema` via `zod-to-json-schema`.
  - `constants.ts`: `COMPOSIO_CALLBACK_URL`. Use the v3 URL until D-API-1 says otherwise.
  - `fixtures/linear.json`: a realistic, complete, **honest tier-1** Linear guide (rules in 02 §Example). ≥ 7 steps, ≥ 6 claims. A claim is `sourced` only if you fetched the URL in this task. Otherwise it's `inferred`.
- **Accept:** `pnpm --filter @oauth-pilot/core test` passes, including "fixture parses".
- **Notes:** agent:a3d2b26c8851f086d. Goldfish PASS (nits only). Fix 1: Composio has managed Linear OAuth (API-checked) → managed_then_own, c7 tested; tier still 1. 9 steps, 9 claims (5 sourced/1 tested/3 inferred). Follow-up: callback → /api/v1/auth-apps/add (D-API-1), claim c10 tested.

### T03 · Core logic: validate, tier, critical path, markdown
- **Status:** done · **Tier:** A · **Deps:** T02 · **Est:** 40 min · **Agent:** sonnet
- **Files:** `packages/core/src/{validate,tier,criticalPath,markdown}.ts`, `packages/core/src/index.ts`, `packages/core/test/**`, `scripts/validate-guides.mjs`
- **Spec:** 02_GUIDE_SCHEMA §Validation, §Tier rubric, §Critical path, §Markdown; 07_TESTING §Core
- **Do:** `validate-guides.mjs` validates every `*.json` in `GUIDES_DIR` (default `guides/`). Run it with `tsx` or import the source via `tsx/esm`; add `tsx` as a root devDep (root `package.json` devDeps only).
- **Accept:** all Core cases in 07_TESTING pass; `computeTier(linear fixture) === 1`; `GUIDES_DIR=packages/core/fixtures pnpm validate:guides` exits 0.
- **Notes:** agent:a4f5e01d75bd00aee. 29 core tests; computeTier(linear)=1; validate-guides via tsx/esm/api. Goldfish PASS (nits: one conditional test, dead fall-through).

## Phase 2 — Evidence packs (ground truth; parallel with everything)

### T05 · Evidence packs: Gmail + Google Calendar
- **Status:** done · **Tier:** A · **Deps:** T00 · **Est:** 30 min · **Agent:** sonnet (WebSearch, WebFetch)
- **Files:** `research/apps/gmail.md`, `research/apps/google-calendar.md`
- **Spec:** 06_RESEARCH_PROTOCOL (format exactly)
- **Must answer:**
  - sensitive vs restricted scopes, and which Gmail/Calendar scopes fall where
  - brand verification vs CASA security assessment: who performs it, cost signals, renewal
  - testing-mode limits: test-user cap and refresh-token expiry
  - the unverified-app screen and the 100-user cap
  - any official timeline wording
  - the internal-app / Workspace-admin exemption
- **Accept:** each pack has ≥ 10 facts with rank-1 sources and quotes, a scope table, ≥ 3 error/blocker rows, and "Could not verify".
- **Notes:** agent:a7c91db8f95109056. Gmail 23 facts / Calendar 19 (18 rank 1). Goldfish PASS: quotes on 5 pages checked. CASA cost $500–4,500 and 2–6 wk come from a Google Health API page, not a Gmail one (flagged). Calendar per-scope sensitivity is inferred (Nylas, rank 5).

### T06 · Evidence packs: Linear + Shopify
- **Status:** done · **Tier:** A · **Deps:** T00 · **Est:** 30 min · **Agent:** sonnet
- **Files:** `research/apps/linear.md`, `research/apps/shopify.md`
- **Spec:** 06_RESEARCH_PROTOCOL
- **Must answer:**
  - Linear: OAuth app creation steps, any review, actor=app vs user tokens, scopes.
  - Shopify: custom vs public app, Partner account, app review requirements, protected customer data access, timeline wording.
- **Accept:** same bar as T05 (Linear may have < 10 facts if the docs are short; say so).
- **Notes:** agent:a135199e653331826. Linear 14 facts / Shopify 21, all rank 1. Goldfish PASS: 16 quotes checked against the pages; nits = some quotes narrower than their facts. Review durations: neither provider gives one.

### T07 · Evidence pack: Salesforce
- **Status:** done · **Tier:** A · **Deps:** T00 · **Est:** 30 min · **Agent:** sonnet
- **Files:** `research/apps/salesforce.md`
- **Spec:** 06_RESEARCH_PROTOCOL
- **Must answer:**
  - connected app vs External Client App, and any 2025+ restriction on creating new connected apps
  - the org admin role and installing or approving apps per org
  - AppExchange security review: when it's needed, cost, duration wording
  - dev org signup
- **Accept:** same bar as T05.
- **Notes:** agent:a1dac67d6eb1688c2. 18 facts (14 clean rank 1). Goldfish PASS: 5 pages checked. help.salesforce.com/dev docs mostly 403 or a JS shell. Spring '26 connected-app block is rank 3 only → keep it inferred/medium. Security review: $2,700+$150/yr vs $999/attempt, 4–6 vs 4–5 wk (both recorded).

## Phase 3 — Agent

### T10 · Agent skeleton: state, graph wiring, events, store, fake mode
- **Status:** done · **Tier:** A · **Deps:** T02, T03 · **Est:** 40 min · **Agent:** sonnet
- **Files:** `packages/agent/src/{index,graph,state,events,store,fake,llm}.ts`, `packages/agent/src/nodes/*.ts` (**stubs only**: each returns its fake-mode fixture), `packages/agent/fixtures/runs/linear/**`, `packages/agent/test/graph.test.ts`, `packages/agent/vitest.config.ts`
- **Spec:** 03_AGENT_GRAPH §Graph, §State, §Wiring notes, §Events, §Fake mode, §Budgets
- **Do:**
  - `package.json` scripts: `test`, `test:live` (`vitest run test/live.test.ts`), `guide` (`tsx --env-file-if-exists=../../.env src/cli.ts`).
  - `store.ts`: read and write guides and run events (`DATA_DIR`, `GUIDES_DIR`), plus `listGuides()` and `getGuide(slug, {preferGenerated})`.
  - `llm.ts`: a ChatAnthropic factory with the model from env.
  - Hand-make `fixtures/runs/linear/` from the core fixture.
- **Accept:** the fake-mode test passes: valid event order, all 6 node names, `draft` started exactly once, the result passes `validateGuide`. The store writes `data/runs/<id>.jsonl` and `data/guides/linear.json` (under a temp `DATA_DIR` in the test).
- **Notes:** agent:ae3a1d6677628bc23. 7 tests. Goldfish FAIL→PASS after 2 rounds (slug/runId path safety; non-draft nodes degrade with warn log + node_finished status:"degraded"). Draft node id is `draft_node` (state channel clash), events still say `draft`. Deviation: agent tsconfig include widened (D-ORCH-1).

### T11 · Nodes: intake, composio_lookup, probe
- **Status:** done · **Tier:** A · **Deps:** T10, T01 · **Est:** 30 min · **Agent:** sonnet
- **Files:** `packages/agent/src/nodes/{intake,composio,probe}.ts`, `packages/agent/src/prompts/intake.md`, `packages/agent/test/{intake,composio,probe}.test.ts`, `packages/agent/fixtures/unit/**`
- **Spec:** 03_AGENT_GRAPH §Nodes; DECISIONS D-API-1/2
- **Accept:** unit tests with recorded fixtures pass: probe `registration_endpoint` → tested claim; composio 404 → `toolkitFound:false` + issue; missing key → skipped + issue.
- **Notes:** agent:a8b49097c6a2368e2. 15 node tests. Goldfish FAIL→PASS: probe read state.research (always empty in parallel fan-out) → now uses target.website + URL docsHints; SSRF guard (https only, no IPs/local/internal, manual redirects). Composio slug fallback strips hyphens (googlecalendar).

### T12 · Node: docs_research
- **Status:** done · **Tier:** A · **Deps:** T10, T01 · **Est:** 30 min · **Agent:** sonnet
- **Files:** `packages/agent/src/nodes/research.ts`, `packages/agent/src/prompts/research.md`, `packages/agent/test/research.test.ts`, `packages/agent/fixtures/unit/research-*.json`
- **Spec:** 03_AGENT_GRAPH; 06_RESEARCH_PROTOCOL §Source ranking; DECISIONS D-API-5
- **Accept:** parses a recorded server-tool response fixture into `ResearchNote[]` with url + quote; emits one `log` event per search query.
- **Notes:** agent:a085424ad911165b4. Goldfish FAIL→PASS: robust JSON extraction, pause_turn continuations, URL normalization. Live Linear recording: 23 s, 170k input tok (mostly cache), 13 notes. Found the llm.ts temperature bug (fixed as a T10 follow-up).

### T13 · Nodes: draft (Elephant), verify (Goldfish), finalize + repair loop
- **Status:** done · **Tier:** A · **Deps:** T11, T12 · **Est:** 45 min · **Agent:** sonnet
- **Files:** `packages/agent/src/nodes/{draft,verify,finalize}.ts`, `packages/agent/src/prompts/{draft,verify}.md`, `packages/agent/test/{draft,verify,finalize}.test.ts`
- **Spec:** 03_AGENT_GRAPH §Nodes (verify gets ONLY claims + sources); 02_GUIDE_SCHEMA
- **Accept:**
  - Repair-loop test passes: draft runs at most twice, and `repairs` increments.
  - Verify test passes: a claim whose quote is absent from the fetched page becomes `inferred`/`low` with verdict `unsupported`.
  - Finalize forces `verdict.tier = computeTier()`.
- **Notes:** agent:a4d80433a4380cc3f. 48 agent tests. verify = plain fetch + HTML→text (SSRF guard per hop), deterministic word-boundary quote check (≥12 chars/3 words) then an LLM that sees claims+sources only. Round 1: code demotes model-written `tested`. Live Linear draft+verify ≈65 s, 0 unsupported, 3–4 partial.

### T14 · CLI + live smoke + record Calendly
- **Status:** done · **Tier:** A · **Deps:** T13 · **Est:** 30 min · **Agent:** sonnet (needs `ANTHROPIC_API_KEY`; if missing → `human`)
- **Files:** `packages/agent/src/cli.ts`, `packages/agent/fixtures/runs/calendly/**`, `packages/agent/test/live.test.ts`, `packages/agent/test/replay.test.ts`
- **Spec:** 03_AGENT_GRAPH §CLI flags, §Fake mode; 07_TESTING
- **Accept:** `pnpm --filter @oauth-pilot/agent guide "Calendly" --record` finishes in under 300 s with a valid guide; fixtures are saved; `replay.test.ts` replays calendly in fake mode and passes. Runtime and the verifier's unsupported count go in the task report for LOG.md.
- **Notes:** agent:a3b33ddb00ece42d4. Live Calendly 96 s (worker) / 98 s (orchestrator re-run): draft 60 s, research 26 s, verify 8 s. Tier 0 (managed). Verify: 1 unsupported, 2 partial. Replay test green; 50 agent tests. vitest.config excludes live.test via argv (D-ORCH-2).

## Phase 4 — Web

### T15 · Web scaffold, library page, API routes, Playwright setup
- **Status:** done · **Tier:** A · **Deps:** T10 · **Est:** 40 min · **Agent:** sonnet (use the frontend-design skill)
- **Files:** `apps/web/**` except `apps/web/src/app/{guides,runs}/**` and the components owned by T16/T17; `playwright.config.ts`, `e2e/web/library.spec.ts`
- **Spec:** 05_WEB §`/`, §Data access, §Visual direction; 03_AGENT_GRAPH §HTTP API; 01_ARCHITECTURE §How packages consume each other
- **Do:** install all web deps up front: next, react, tailwind, `@xyflow/react`, `@dagrejs/dagre`, `@playwright/test` (root devDep allowed). Add all `/api/*` routes, `GuideCard`, `TierBadge` and `SubmitBox`. SubmitBox posts and navigates to `/runs/<id>`; the page itself comes in T17.
- **Accept:** `pnpm --filter web build` passes; with `GUIDES_DIR=packages/core/fixtures OAUTH_PILOT_FAKE=1`, `/api/guides` lists linear, and POST `/api/runs {app:"Linear"}` returns a runId whose SSE ends with `done`; `pnpm e2e:web` (library.spec) passes.
- **Notes:** agent:aa9c9a3909813959b. Next 15.5, React 19, Tailwind 4. 6 API routes, library + filters, SubmitBox. e2e 3/3. Orchestrator ran POST /api/runs → SSE ends `done`. Goldfish PASS (nits). Max 2 concurrent runs (429).

### T16 · Guide page: verdict, Start today, timeline, React Flow, evidence ledger
- **Status:** done · **Tier:** A (React Flow part is B) · **Deps:** T15 · **Est:** 60 min · **Agent:** sonnet (frontend-design skill)
- **Files:** `apps/web/src/app/guides/**`, `apps/web/src/components/{ClockTiles,StartToday,Timeline,CriticalPathFlow,StepNode,LaneNode,StepPanel,EvidenceLedger,RiskTable}.tsx`, `e2e/web/guide.spec.ts`, `docs/screenshots/guide.png`
- **Spec:** 05_WEB §`/guides/[slug]`
- **Do:** build the timeline and ledger first and get the spec green. Then React Flow. If React Flow runs past 75 min, ship timeline-only and report it.
- **Accept:** `guide.spec.ts` (07_TESTING web cases 2–4 against `linear`) passes; screenshot saved.
- **Notes:** agent:aef5278205bedafb9. React Flow shipped (swimlanes by actor, dagre, fitView). e2e 6/6. Goldfish PASS; round 1 added safeHref (http/https only) + fitView. Open: Regenerate link does not start a run (needs SubmitBox ?regenerate, a T15 file).

### T17 · Live run page (agent graph animation)
- **Status:** done · **Tier:** B · **Deps:** T15, T14 · **Est:** 40 min · **Agent:** sonnet
- **Files:** `apps/web/src/app/runs/**`, `apps/web/src/components/{AgentRunFlow,RunLog}.tsx`, `e2e/web/run.spec.ts`, `docs/screenshots/run.png`
- **Spec:** 05_WEB §`/runs/[runId]`
- **Accept:** `run.spec.ts` (web case 5, Calendly in fake mode) passes; screenshot saved.
- **Notes:** agent:a4ce4978910556cc5. React Flow agent graph (pending/running/done/degraded) + streaming log; done → /guides/<slug>?generated=1. e2e 8/8. Goldfish PASS. No partial-guide link (finalize saves nothing on error).

## Phase 5 — MCP + plugin

### T18 · MCP server (in-process agent, bundled into the plugin)
- **Status:** done · **Tier:** A · **Deps:** T14 · **Est:** 35 min · **Agent:** sonnet
- **Files:** `packages/mcp/**`, `plugin/oauth-pilot/bin/mcp.mjs`, `e2e/mcp.e2e.mjs`
- **Spec:** 03_AGENT_GRAPH §MCP server
- **Accept:** `pnpm e2e:mcp` passes with these interim asserts: list includes `linear`; `get linear` contains "Evidence"; start `calendly` → status reaches done in ≤ 30 s (fake mode) and contains "tier". T23 switches the asserts to `gmail`.
- **Notes:** agent:a1910cab9d440618b. 4 tools; tsup bundles everything (3.6 MB) and inlines prompts, fixtures and library guides via an fs shim (D-MCP-1). e2e: repo dir + empty GUIDES_DIR (embedded). Live standalone Linear run 90 s → Done. MUST rebuild the bundle after T21.

### T19 · Plugin: manifest, marketplace, oauth-guide skill, goldfish agent
- **Status:** done · **Tier:** A · **Deps:** T18 · **Est:** 40 min · **Agent:** sonnet
- **Files:** `.claude-plugin/marketplace.json`, `plugin/oauth-pilot/{.claude-plugin/plugin.json,.mcp.json,skills/oauth-guide/**,agents/oauth-goldfish.md,schema/guide.schema.json}`, `scripts/gen-plugin-schema.mjs`
- **Spec:** 04_PLUGIN; `docs/research/egm-notes.md`; DECISIONS D-API-6
- **Accept:** the D-API-6 validate command passes; `node scripts/gen-plugin-schema.mjs --check` exits 0 (the schema file matches core).
- **Notes:** agent:a1d71ef7a4638ad95. validate passes (plugin + marketplace); schema --check ok. `claude -p --plugin-dir` showed MCP connected, skill + agent loaded ($0.0055). .mcp.json DATA_DIR=${CLAUDE_PLUGIN_DATA} (expansion not directly observed). Goldfish PASS; added never-claim-tested rule.

### T20 · Plugin: oauth-setup skill, templates, Composio scripts
- **Status:** in_progress · **Tier:** B · **Deps:** T19, T01 · **Est:** 40 min · **Agent:** sonnet
- **Files:** `plugin/oauth-pilot/{skills/oauth-setup,templates,scripts}/**`
- **Spec:** 04_PLUGIN §oauth-setup; DECISIONS D-API-3/4
- **Accept:** both scripts support `--help` and `--dry-run` (prints the exact request with the secret masked); SKILL.md contains the safety rules verbatim. If D-API-3 is unconfirmed, the scripts are replaced by printed manual steps and this is noted.
- **Notes:** agent:ab445692c6286417c

## Phase 6 — Library + verification

### T21 · Generate the 5 library guides + audit against evidence packs
- **Status:** in_progress · **Tier:** A · **Deps:** T14, T05, T06, T07 · **Est:** 60 min · **Agent:** orchestrator generates; 3 sonnet auditors (gmail+google-calendar, linear+shopify, salesforce); orchestrator writes SUMMARY
- **Files:** `guides/{linear,google-calendar,gmail,salesforce,shopify}.json`, `docs/verification/{linear,google-calendar,gmail,salesforce,shopify}.md` (auditors), `docs/verification/SUMMARY.md` (orchestrator), `packages/agent/src/prompts/*.md` (systematic fixes only, each logged in DECISIONS)
- **Spec:** 06_RESEARCH_PROTOCOL §Verification report
- **Do:**
  - Generate with `guide "<app>" --out guides --kind library` (needs the key; otherwise `human`).
  - Each auditor corrects only its own apps' JSON and writes its reports.
  - The Gmail guide must compute to tier 3; if the evidence disagrees, record why.
- **Accept:** `pnpm validate:guides` passes on 5 guides; 6 verification files exist; each report has counts and ≥ 1 corrected/unverifiable entry, or says explicitly that there were none.
- **Notes:** agent:abcbf9560a3fef986 (generation) Generated 5 guides (validate ok): linear t0, google-calendar t2, gmail t3, salesforce t1, shopify t3; 113 claims (11 tested/66 sourced/36 inferred); ~10 min wall.

### T22 · HUMAN: real setup attempt via the plugin
- **Status:** human · **Tier:** B · **Deps:** T20, T21 · **Est:** 30 min with the user
- **Files:** `docs/verification/setup-attempts.md`, `guides/linear.json` (claims upgraded to `tested`)
- **Do:**
  - With the user at the keyboard, run `/oauth-pilot:oauth-setup linear` end to end: Linear OAuth app → Composio auth config → connect → ACTIVE.
  - Optional: a Google Cloud testing-mode project for Calendar, up to the consent screen.
- **Accept:** setup-attempts.md lists each attempt with date, steps, result and doc drift.
- **Notes:**

## Phase 7 — Ship

### T23 · E2E suites green from a clean clone
- **Status:** todo · **Tier:** A · **Deps:** T16, T18, T19, T21 (and T17 unless cut) · **Est:** 30 min · **Agent:** sonnet
- **Files:** `e2e/**` (fixes only), `e2e/plugin.e2e.sh`, `playwright.config.ts`
- **Accept:** in a fresh `git worktree` of HEAD: `pnpm install && pnpm test:all` passes, with web case 2 now on `gmail` and MCP asserts on `gmail`. `pnpm e2e:plugin` passes or is documented as needing a Claude login (Tier C).
- **Notes:**

### T24 · Deploy — HUMAN approval
- **Status:** human · **Tier:** C · **Deps:** T23
- **Do:** Dockerfile; the user creates the service and sets env vars on the host (never committed). Smoke test: one live run on the deployed URL.
- **Accept:** a public URL serves `/` and one live generation succeeds; the URL is recorded in the README. If skipped: `docs/DEMO.md` links a recorded demo video instead.
- **Notes:**

### T25 · README + DEMO + final Goldfish read
- **Status:** todo · **Tier:** A · **Deps:** T23 · **Est:** 30 min · **Agent:** sonnet writes; separate fresh sonnet Goldfish reads
- **Files:** `README.md`, `docs/DEMO.md`
- **Do:** README sections:
  - what it is (3 lines)
  - URL or local run
  - 60-second tour with screenshots
  - setup: local, fake mode, live mode, plugin install, MCP config snippet
  - key decisions (link 00_PLAN)
  - how evidence works
  - verification summary (link)
  - limitations and next steps: 100 guides, re-verification cron, doc-drift detection, community-reported durations
  - credits (EGM, Apache-2.0)

  DEMO.md: a 5-minute reviewer script.
- **Accept:** the Goldfish, given only README.md, correctly answers: how to run locally, what tier 3 means, what was tested vs sourced. The Q&A goes in LOG.md.
- **Notes:**
