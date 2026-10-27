# LOG — append-only

## 2026-10-27 planning
- Plan written: docs/plan/00–07, TASKS.md (T00–T25), CLAUDE.md orchestrator protocol.
- Context: docs/research/01_problem_framing.md. Plan reviewed by Goldfish subagents (see below).
- Goldfish review of the plan (2 fresh sonnet reviewers: zoom-out, implementation-readiness) → 27 findings.
  Adopted: cut-line tiers A/B/C; MCP runs the agent in-process and is bundled into plugin/bin; schema trimmed
  (gotchas+blockers → risks, dropped Step.kind/agentHelp, added verdict.startToday, Range.basis);
  timeline-first guide page with React Flow as an upgrade; 5 library guides (Slack = live demo);
  fixed file ownership (T10/T11/T13, T15–T17 e2e files, root scripts in T00), deps (T10←T03, T18←T14, T22←T21),
  CLI flags, LangGraph fan-in, explicit-pathspec commits, git status snapshot check, secret check exits non-zero.
  Kept against advice: plugin oauth-setup skill (user asked for Claude-driven setup) but moved to Tier B.
- 2026-10-27: .env created (gitignored). LLM = LiteLLM proxy (D-ARCH-2, web_search confirmed through it). Composio key → 401, waiting on the user (D-OPS-1).
- 2026-10-27: Composio project key (ak_) verified on /api/v3.1/toolkits/gmail (D-OPS-2). Both keys ready; T01 unblocked.

## 2026-10-27T22:30+05:30 T00 PASS
- Scaffold landed: pnpm workspace (core/agent/mcp/web), tsconfig.base, check-secrets.sh. Done by a sonnet worker (user asked for sonnet on all implementation).
- Fix round 1: TypeScript 7.0.2 → ~5.9.3. Accept: install, typecheck, check-ignore, remote all green; secret check exits 1 on a planted ak_ token.
- Hour-0 marker for the cut rule (T14 by ~02:30).

## 2026-10-27T22:45+05:30 T02 PASS
- zod v3 schema + guideJsonSchema, COMPOSIO_CALLBACK_URL (v3, unverified until D-API-1), Linear fixture 9 steps / 9 claims. 5 core tests green.
- Goldfish PASS (3 nits). Orchestrator found that the fixture said "no managed app", but /api/v3.1/toolkits/linear returns managed OAUTH2. Fix round 1 → managed_then_own; tier stays 1.

## 2026-10-27T22:50+05:30 T06 PASS
- research/apps/linear.md (14 facts, 6 error rows) + shopify.md (21 facts, 7 error rows), all rank 1.
- Goldfish spot-checked 16 quotes; all verbatim. Nits: Linear header says 12 facts (it's 14), and some quotes are narrower than their facts. Shopify Partner-account requirement left unverified.

## 2026-10-27T23:00+05:30 T05 PASS
- gmail.md 23 facts / 8 error rows; google-calendar.md 19 facts / 7 error rows. Goldfish re-fetched quotes on 5 Google pages: all match.
- Caveats: CASA cost and duration are only on a Health API page; the CASA tier naming conflict (tier-2/3 vs AL1/AL2) is unresolved; Calendar scope labels are inferred.

## 2026-10-27T23:00+05:30 T07 PASS
- salesforce.md 18 facts (15 rank 1, 3 rank 3), 6 error rows. Worker reported "partial" (about 60% of fetches blocked), but the Accept counts are met. Goldfish PASS.
- The Spring '26 block on new connected apps rests on a rank-3 source; the guide must keep it inferred or medium. The two Salesforce pages conflict on security-review fee and duration; both are recorded.

## 2026-10-27T23:10+05:30 T03 PASS
- validate/tier/criticalPath/markdown + scripts/validate-guides.mjs (tsx). 29 core tests; Linear fixture: tier 1, 0 errors/warnings.
- Goldfish PASS, nits only. Extra beyond spec: warns when timeToProduction.max < critical path total.

## 2026-10-27T23:15+05:30 T01 PASS
- D-API-1…6 all confirmed with scripts in scripts/spikes and fixtures in packages/agent/fixtures/spike. Live auth-config + connected-account create was run with FAKE creds, then deleted.
- Spec changes: callback URL is /api/v1/auth-apps/add (core constant fix sent to T02 worker); web_fetch_20250910 (not 20260209); recommendScopes is beta, so keep the per-tool scopes fallback.
- Goldfish raised a Major (D-API-2 had no recorded evidence). Fix round 1 added composio-scopes.mjs + 3 fixtures. Numbers: one web_search ≈ 21k input tokens through LangChain.

## 2026-10-27T23:20+05:30 T02 follow-up PASS
- COMPOSIO_CALLBACK_URL → https://backend.composio.dev/api/v1/auth-apps/add (D-API-1). Linear fixture updated, plus claim c10 (tested via T01). 29 tests, validate:guides ok. Orchestrator reviewed the 19-line diff directly.

## 2026-10-27T23:40+05:30 T10 PASS
- Agent skeleton: state/graph (fan-out + fan-in + repair edge), events, store, fake mode, llm factory, stub nodes, Linear run fixtures. langgraph 1.5.2, @langchain/anthropic 1.6.
- Goldfish FAIL (path traversal via slug/runId; verify failure aborted the run) → round 1 fixed both → round 2 fixed degraded nodes never emitting node_finished. 7 tests.
- Deviation: agent tsconfig.json touched (D-ORCH-1). Conventions recorded in D-AGENT-1.
