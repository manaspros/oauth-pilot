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

## 2026-10-27T22:24+05:30 T00 PASS
- Scaffold landed: pnpm workspace (core/agent/mcp/web), tsconfig.base, check-secrets.sh. Done by a sonnet worker (user asked for sonnet on all implementation).
- Fix round 1: TypeScript 7.0.2 → ~5.9.3. Accept: install, typecheck, check-ignore, remote all green; secret check exits 1 on a planted ak_ token.
- Hour-0 marker for the cut rule: 22:23 (T14 due by ~02:23).

## 2026-10-27T22:27+05:30 T02 PASS
- zod v3 schema + guideJsonSchema, COMPOSIO_CALLBACK_URL (v3, unverified until D-API-1), Linear fixture 9 steps / 9 claims. 5 core tests green.
- Goldfish PASS (3 nits). Orchestrator found that the fixture said "no managed app", but /api/v3.1/toolkits/linear returns managed OAUTH2. Fix round 1 → managed_then_own; tier stays 1.

## 2026-10-27T22:28+05:30 T06 PASS
- research/apps/linear.md (14 facts, 6 error rows) + shopify.md (21 facts, 7 error rows), all rank 1.
- Goldfish spot-checked 16 quotes; all verbatim. Nits: Linear header says 12 facts (it's 14), and some quotes are narrower than their facts. Shopify Partner-account requirement left unverified.

## 2026-10-27T22:29+05:30 T05 PASS
- gmail.md 23 facts / 8 error rows; google-calendar.md 19 facts / 7 error rows. Goldfish re-fetched quotes on 5 Google pages: all match.
- Caveats: CASA cost and duration are only on a Health API page; the CASA tier naming conflict (tier-2/3 vs AL1/AL2) is unresolved; Calendar scope labels are inferred.

## 2026-10-27T22:29+05:30 T07 PASS
- salesforce.md 18 facts (15 rank 1, 3 rank 3), 6 error rows. Worker reported "partial" (about 60% of fetches blocked), but the Accept counts are met. Goldfish PASS.
- The Spring '26 block on new connected apps rests on a rank-3 source; the guide must keep it inferred or medium. The two Salesforce pages conflict on security-review fee and duration; both are recorded.

## 2026-10-27T22:30+05:30 T03 PASS
- validate/tier/criticalPath/markdown + scripts/validate-guides.mjs (tsx). 29 core tests; Linear fixture: tier 1, 0 errors/warnings.
- Goldfish PASS, nits only. Extra beyond spec: warns when timeToProduction.max < critical path total.

## 2026-10-27T22:30+05:30 T01 PASS
- D-API-1…6 all confirmed with scripts in scripts/spikes and fixtures in packages/agent/fixtures/spike. Live auth-config + connected-account create was run with FAKE creds, then deleted.
- Spec changes: callback URL is /api/v1/auth-apps/add (core constant fix sent to T02 worker); web_fetch_20250910 (not 20260209); recommendScopes is beta, so keep the per-tool scopes fallback.
- Goldfish raised a Major (D-API-2 had no recorded evidence). Fix round 1 added composio-scopes.mjs + 3 fixtures. Numbers: one web_search ≈ 21k input tokens through LangChain.

## 2026-10-27T22:31+05:30 T02 follow-up PASS
- COMPOSIO_CALLBACK_URL → https://backend.composio.dev/api/v1/auth-apps/add (D-API-1). Linear fixture updated, plus claim c10 (tested via T01). 29 tests, validate:guides ok. Orchestrator reviewed the 19-line diff directly.

## 2026-10-27T22:35+05:30 T10 PASS
- Agent skeleton: state/graph (fan-out + fan-in + repair edge), events, store, fake mode, llm factory, stub nodes, Linear run fixtures. langgraph 1.5.2, @langchain/anthropic 1.6.
- Goldfish FAIL (path traversal via slug/runId; verify failure aborted the run) → round 1 fixed both → round 2 fixed degraded nodes never emitting node_finished. 7 tests.
- Deviation: agent tsconfig.json touched (D-ORCH-1). Conventions recorded in D-AGENT-1.

## 2026-10-27T22:40+05:30 T11 PASS
- intake (LLM with a deterministic fallback), composio_lookup (v3.1 toolkit + recommended scopes, with per-tool fallback), probe (well-known + HEAD). 15 tests, no network.
- Goldfish FAIL → round 1: probe topology bug (read research in a parallel branch), SSRF guard, capped body read, Composio slug format (orchestrator verified googlecalendar). D-AGENT-2.

## 2026-10-27T22:41+05:30 T12 PASS
- docs_research: web_search (max 8) + web_fetch_20250910 (max 6), parser → ResearchNote[], one log per query, pause_turn handling. 8 research tests incl. a LIVE recorded Linear response.
- Live numbers: 23 s, 170k input tokens (69k cache write, 101k cache read), 2.6k output, 13 notes. Watch the cost in T14/T21.
- Goldfish FAIL → round 1 PASS. Found D-API-7 (temperature). The llm.ts fix landed as a T10 follow-up (31 agent tests).

## 2026-10-27T22:41+05:30 T15 PASS
- Web scaffold: Next 15.5 / React 19 / Tailwind 4; /api/guides, /api/guides/:slug(+markdown), /api/runs (+:id, SSE); library page with tier filter; Playwright (build + next start, fake mode). Build ~9 s; e2e 3/3 in 8 s.
- Orchestrator ran Accept 5b by hand: POST /api/runs {Linear} → SSE ended with `done`. Goldfish PASS. Chore: *.tsbuildinfo added to .gitignore.

## 2026-10-27T22:50+05:30 T16 PASS
- Guide page: verdict, 3 clock tiles, Start today, timeline, React Flow swimlane diagram (shipped, under budget), phase checklist, scopes, requirements, risks, evidence ledger, copy-as-markdown. e2e 6/6; screenshot checked by orchestrator.
- Goldfish PASS; polish round: safeHref against javascript: links in LLM guides, fitView so the diagram isn't cropped. Open: ?regenerate isn't wired (T15 SubmitBox).

## 2026-10-27T22:50+05:30 T13 PASS
- draft (Elephant, tool-free JSON, probes→tested claims), verify (Goldfish: claims+sources only), finalize (tier forced, critical-path warning), repair loop ≤ 2 drafts. 48 agent tests.
- Goldfish PASS with 1 Major (model-written `tested` slipped past verify) → round 1 enforced it in code, plus quote-match hardening. D-AGENT-3.
- Live dry run (Linear, recorded research): draft 54 s, verify 13–16 s, 5/5 pages fetched, 0 unsupported.

## 2026-10-27T22:51+05:30 LOG correction
- The orchestrator had written estimated timestamps (23:00–01:00) on the earlier entries; they are now replaced with the real commit times from `git log`. Real elapsed time at T13 is about 27 min.

## 2026-10-27T22:56+05:30 T14 PASS
- CLI (`guide <app> [--use-case --tools --out --kind --record]`), Calendly recorded live, replay + live tests. 50 agent tests.
- Live Calendly: 96.3 s (worker), 97.8 s (orchestrator re-run, no --record). Per node: research 26 s, draft 60 s, verify 8 s. Tier 0 (Composio managed). 22–23 claims: 6 tested / 12–15 sourced / 2–4 inferred. Verifier: 1 unsupported, 2 partial.
- Cut rule: T14 done at 22:56, well before the hour-4 mark (02:23). T20/T22 stay in. Goldfish PASS (nits: record path lacks runGuide's timeout degrade). Token usage not surfaced by nodes.

## 2026-10-27T23:00+05:30 T17 PASS
- /runs/[runId]: EventSource → AgentRunFlow (7 nodes, fan-out/fan-in, degraded = amber) + RunLog; banner and redirect on done; honest error state. run.spec 2 cases; e2e 8/8 in 18.5 s.
- Goldfish PASS (nits). Note: guide.spec rewrites docs/screenshots/guide.png on every e2e run, so the orchestrator restores it before commits.

## 2026-10-27T23:03+05:30 T18 PASS
- MCP stdio server: oauth_guide_list/get/start/status, in-process runGuide, shared DATA_DIR. Bundle 3.6 MB, build ~90 ms. e2e: repo dir and embedded-only cases.
- Goldfish PASS; round 1: live proof from a standalone copy (Linear, 90 s, tier 0), unhandled-rejection handlers, embedded-guides e2e. D-MCP-1.
- Committed bundle embeds un-audited linear+gmail from in-flight T21; rebuild after the audit.

## 2026-10-27T23:06+05:30 T19 PASS
- Plugin manifest + marketplace, oauth-guide skill (MCP first, in-session EGM fallback), oauth-goldfish agent, generated schema + --check. validate passes; live -p load: MCP connected, skill/agent registered.
- Goldfish PASS. Orchestrator checked the SDK: an empty ANTHROPIC_BASE_URL falls back to api.anthropic.com (`baseURL || default`). Open: root README needs an install line (T25).

## 2026-10-27T23:09+05:30 T20 PASS
- oauth-setup skill + composio-auth-config.mjs / composio-connect.mjs (D-API-3/4 shapes, dry-run masks secrets) + templates (env, privacy policy, scope justification, demo script, console steps). validate passes.
- Goldfish PASS; round 1: redact-before-slice incl. JSON-escaped secrets, short-secret mask, no duplicate .env keys. Live create path left for T22.

## 2026-10-27T23:14+05:30 T21 audit landed (card stays in_progress)
- 3 Sonnet auditors corrected the 5 guides against the evidence packs and wrote docs/verification/<app>.md. Claims 113 → 118; sourced 66 → 86, inferred 36 → 21, tested 11 (unchanged, none added). Salesforce tier 1 → 2 (missed admin approval). Gmail = 3 as planned.
- Unsupported verdicts: 28 → 7. 20 confirmed fetch artifacts, 7 probable (help.salesforce.com JS shell), 1 merged quote, 0 wrong claims. Goldfish spot-checked 14 upgraded quotes: all found. Verify fallback and prompt fixes are in progress.

## 2026-10-27T23:17+05:30 T21 PASS
- Verify fallback (D-AGENT-4): Goldfish caught a Blocker, where the fallback matched the model's own prose (echo → false supported). Fixed: tool-result text only, quote not in the prompt, 30 s timeout. 58 agent tests.
- Live re-check of 5 unconfirmed Salesforce claims: 3 supported / 1 partial / 1 unsupported / 0 not_checked (identical before and after the Blocker fix, now on document text only). 13 s.
- docs/verification/SUMMARY.md written. The MCP bundle is rebuilt with the audited guides and new prompts.
