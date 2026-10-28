# OAuth Pilot: end-to-end test results

- **Date:** 2026-10-28
- **Commit:** `2795845` (working tree clean apart from `docs/screenshots/live-run.png` and this file)
- **Environment:** Linux, Node v26.11.1, pnpm 12.15.0, Claude Code CLI (headless). Model `claude-sonnet-5-5` through an Anthropic-compatible proxy (LiteLLM). Composio key from `.env`. Live outputs went to a scratch `DATA_DIR` outside the repo.
- **Not retried:** every step ran once, except F (see there).

## Summary

| # | Success criterion | Test | Result | Evidence |
|---|---|---|---|---|
| 1 | Site shows 5 guides with tier badges and both clocks | A (web e2e `library.spec.ts`), G | ✅ | 5 `guide-card`s, each with a tier badge; each card shows "First connection" and "production" clocks (checked in G HTML) |
| 2 | Gmail: CASA on the critical path, ledger with sources, uncertain items marked | A (`guide.spec.ts` test 1), G | ✅ | tier 3 badge, CASA in timeline, >= 10 claim rows, >= 3 source links on sourced claims, inferred rows and open questions present, >= 3 React Flow nodes |
| 3 | Unfamiliar app, agent graph lights up, guide in < ~3 min | C (CLI Pipedrive), D (web Slack) | ⚠️ | Pipedrive CLI 157 s, tier 3, good quality. Slack web run 71 s, but the `docs_research` node returned 0 notes (degraded) and the guide is thin, 10 claims, tier 0 (see Bugs) |
| 4a | `/oauth-pilot:oauth-guide notion` returns a verdict | F | ⚠️ | 2nd run: full verdict (Tier 0), 55 s agent time, $0.44. 1st run (no way to wait) gave up with "looks stuck", $0.24 |
| 4b | `/oauth-pilot:oauth-setup linear` setup | H (summarised, not re-run) | ✅ / ⚠️ | managed OAuth ACTIVE + 2 tool calls; API-key path ACTIVE; `oauth:create` scope blocked own-app creation |
| 5 | MCP: `oauth_guide_start` -> `oauth_guide_status` reports a summary | E | ✅ | Calendly live, 110 s, "Done. Calendly: tier 0 (Instant)..." |
| 6 | README: setup, decisions, limitations, verification link | not part of this run | n/a | README has these sections; not exercised here |
| Offline | typecheck, unit, validate, web e2e, MCP e2e | A | ✅ | 29 + 58 + mcp unit pass, 5/5 guides valid, 8/8 Playwright, 2/2 MCP, 22 s |
| Plugin smoke | headless `claude -p` | B | ✅ | pass, $0.3688, 4 turns, 10 s |

Total live cost known: about $1.05 of Claude Code usage (B $0.37 + F $0.24 + F retry $0.44). The cost of the LLM calls made by the agent runs (C, D, E and the MCP runs inside F) is billed by the proxy and is not reported by the CLI, so it is unknown.

## A. Offline suites

Command: `pnpm test:all` (typecheck, unit, validate:guides, web e2e, MCP e2e). **Exit 0, 22 s total.**

| Suite | Result |
|---|---|
| typecheck (core, agent, mcp, web) | all `Done` |
| unit: `packages/core` | 2 files, 29 tests passed |
| unit: `packages/agent` | 11 files, 58 tests passed |
| unit: `packages/mcp` | vitest run with `--passWithNoTests` (no tests reported) |
| `validate:guides` | 5 guide(s), 0 failed (gmail, google-calendar, linear, salesforce, shopify) |
| web e2e (Playwright, fake mode, `next build` included) | 8 passed (18.2 s) |
| MCP e2e | `ok: repo guides dir (403 ms)`, `ok: empty GUIDES_DIR (embedded) (81 ms)` |

Web specs that passed: gmail guide (tier 3, CASA, ledger, inferred), step detail panel, copy-as-markdown endpoint + 404, library cards with badges, tier filter, guide API, Calendly fake run lands on `/guides/calendly?generated=1`, unknown run id shows an honest error.

## B. Plugin smoke

Command: `pnpm e2e:plugin` (real `claude -p`, fake MCP, Linear from the embedded library). **Pass, 10 s, cost $0.3688, 4 turns.** Output was the Linear verdict ("Tier 0 · Instant ... First step: sign in to Linear ...") then `plugin e2e ok`.

## C. Live CLI generation (app not in library)

Command: `DATA_DIR=<scratch> pnpm --filter @oauth-pilot/agent guide "Pipedrive"`. **Exit 0, 157.3 s total (target < 180 s: met; hard limit 300 s: met).**

| Item | Value |
|---|---|
| Node times (s) | intake 2.7, composio_lookup 0.5, probe 1.2, docs_research 47.4, draft 90.5, verify 16.6, finalize 0.0 |
| Slug / tier | `pipedrive` / 3 |
| Claims | 30: tested 2, sourced 25, inferred 3; 7 open questions |
| Composio lookup | "no managed schemes, 0 required scopes" (Pipedrive has no Composio managed app) |
| Probes | 7 probes, 1 ok |
| docs_research | 29 notes |
| Verifier | fetched 9/9 cited pages; supported 24, partial 1, unsupported 0, contradicted 0, not checked 3 |
| web_fetch fallbacks | used 2/6 |
| Finalize | valid, with warning: `timeToProduction.maxHours (720) is below the critical path (722.75 h via s6 > s7 > s8 > s9)` |

Validation: copied the output to a scratch dir and ran `GUIDES_DIR=<dir> pnpm validate:guides`: `ok pipedrive.json`, 1 guide, 0 failed (same warning about maxHours 720 < 722.75).

## D. Live web run (criterion 3)

Commands: `pnpm --filter web build`; then with `.env` exported (`set -a; . ./.env; set +a`) and `DATA_DIR=<scratch>`: `pnpm --filter web exec next start -p 3217`. `POST /api/runs {"app":"Slack"}` returned `{"runId":"slack-a97f958e"}`; streamed `/api/runs/slack-a97f958e/events` to the end.

Event sequence (seconds from `run_started`):

| t (s) | Event |
|---|---|
| 0.0 | run_started, intake started |
| 1.8 | intake done; composio_lookup, docs_research, probe start in parallel |
| 2.4 | composio_lookup done ("slack: OAUTH2, 0 required scopes") |
| 2.6 | probe done ("7 probes, 3 ok") |
| 41.2 | docs_research done, **"0 notes"** (39.4 s); draft starts |
| 71.1 | draft done (29.9 s); verify done in 0.0 s ("fetched 0/0 cited pages; not checked 6"); finalize "guide valid" |
| 71.2 | `done` with slug `slack`, tier 0 |

- **Total: 71.2 s** (under the 3 min target).
- Degraded node: `docs_research` (0 notes). It was not flagged as degraded in the stream; its 4 "searching:" log lines all carry the same timestamp (07:21:05.454Z), the same instant as the node finishing, which suggests the searches failed or timed out together after about 39 s. Verify then had nothing to check.
- Guide: 10 claims (tested 4, inferred 6, sourced 0), 6 steps, 5 open questions. Headline says "no Slack documentation was available to confirm that". The tier is 0 (Instant), which is probably wrong for a public Slack app (Marketplace review exists); the guide admits it is unconfirmed.
- `GET /guides/slack?generated=1` -> **200**, contains `data-testid="tier-badge" data-tier="0"` (label "Instant") and the flow diagram.
- Screenshot: `docs/screenshots/live-run.png` (the generated guide page at 1280x900, taken with Playwright against the live server).
- Server stopped afterwards: `curl localhost:3217` -> connection refused, no `next` processes left.

## E. Live MCP (criterion 5)

Driver: a scratch script using the MCP SDK client (loaded as in `e2e/mcp.e2e.mjs`), spawning `plugin/oauth-pilot/bin/mcp.mjs` via `node --env-file=.env` with `DATA_DIR=<scratch>`.

| Call | Result |
|---|---|
| `listTools` | the 4 tools |
| `oauth_guide_list` | table of 5 library guides (gmail 3 Heavy review, google-calendar 2, linear 0, ...) |
| `oauth_guide_get gmail` | 16,484 chars; contains "Evidence": true; Tier 3 / "Heavy review": true |
| `oauth_guide_start {app:"Calendly"}` | `run_id calendly-91065680` |
| `oauth_guide_status` polled every 5 s | **Done after 110.0 s** |

Summary text begins: `Done. Calendly: tier 0 (Instant). No provider review is documented for Calendly OAuth. Composio's managed OAuth2 lets you connect today, and an own app is self-serve if you need one.` Then time to first connection 15 minutes - 1 hour, to production 1-8 hours, confidence medium, three next actions, no blockers, and a pointer to `oauth_guide_get {"slug":"calendly"}`.

## F. Claude Code plugin skill (criterion 4a)

Command (from a scratch cwd, `.env` exported, scratch `DATA_DIR`):
`claude -p --plugin-dir plugin/oauth-pilot --output-format json --max-budget-usd 2 --allowedTools "mcp__plugin_oauth-pilot_oauth-pilot__*" ... -- "/oauth-pilot:oauth-guide notion"`, all non-MCP tools disallowed as in `e2e/plugin.e2e.sh`.

- **Run 1 (MCP tools only): ended without a verdict. 39 s, $0.238, 12 turns.** It started run `notion-c928ddb5`, saw "7 probes, 0 ok" and then polled status 9 times in quick succession. With no tool that can sleep, the "poll every ~20 s" instruction in `SKILL.md` cannot be followed, so it saw the same last log line and gave up with "the run hasn't finished and looks stuck", offering options. This is a harness constraint plus a skill gap (see Bugs), not a failed MCP run.
- **Run 2 (one retry, additionally allowing `Bash(sleep:*)`): success. 189 s wall clock (CLI-reported duration 54.9 s, which presumably excludes sleeps), $0.443, 5 turns.** Verdict: "Notion OAuth: Tier 0, Instant", first connection 5-30 min, production 1-4 h, medium confidence, a "Start today" line, 3 next actions, a ledger summary (12 claims checked by the verifier, one claim "could not be found on the cited page", time estimates are guesses) and an open question about Notion's "submitted for review" wording. The skill said it saved `./oauth-guides/notion.md`; the file exists in the scratch cwd (11.9 KB), not in the repo.

## G. Library checks (criteria 1, 2)

Proven by the Playwright specs in A, plus a manual look at the fake-mode server HTML (port 3218, stopped afterwards):

- `/`: 5 `guide-card`s, tier badges (`library.spec.ts`, test 1), tier filter (test 2). Both clocks: every card contains "First connection <range> . production <range>" (for example "15-60 minutes" and "about 5-10 days typi..."). No Playwright spec asserts the clocks; this was checked by hand with `curl`.
- `/guides/gmail`: `guide.spec.ts` test 1 asserts tier 3, timeline contains CASA / security assessment, >= 10 claim rows, `ledger-counts` includes "sourced", >= 3 sourced claims with `http` links, >= 1 inferred claim, a non-zero open-question count and >= 3 React Flow nodes. `start-today`, `timeline` and `ledger-counts` test ids are present in the served HTML.
- Existing screenshots: `docs/screenshots/guide.png`, `docs/screenshots/run.png`.

## H. Linear setup (criterion 4b), summarised, not re-run

From `docs/verification/setup-attempts.md` (2026-10-28, Linear workspace `testforcontext`):

- Own-app creation through the Linear API failed: HTTP 400 "Invalid scope: `oauth:create` required". Nothing created.
- Composio API-key path: auth config and connected account reached ACTIVE immediately; `LINEAR_GET_CURRENT_USER` and `LINEAR_GET_ALL_LINEAR_TEAMS` succeeded (tested).
- Composio managed OAuth: first two attempts reached the consent screen and expired after 10 minutes (Authorize not clicked in time); the third reached ACTIVE in about 13 s and `LINEAR_GET_CURRENT_USER` and `LINEAR_LIST_LINEAR_ISSUES` succeeded (tested). `LINEAR_CREATE_LINEAR_ISSUE` was not run.
- Not covered here: the `/oauth-pilot:oauth-setup linear` skill itself was not run end to end in this pass; the record above is the manual equivalent.

## Bugs found and known gaps

1. **Web live run can finish "ok" with a degraded research step (Slack, D).** `docs_research` reported "0 notes" after 39 s, all four searches logged the same instant. The pipeline carried on, verify checked nothing ("not checked 6"), and the final guide has 0 sourced claims and an unconfirmed tier 0. Nothing in the event stream or the guide page marks the run as degraded beyond the headline sentence. Single occurrence; the CLI (Pipedrive, 29 notes) and MCP (Calendly) runs were fine, so it may be flaky search or a timeout. Not retried.
2. **Finalize warning on Pipedrive (C):** `timeToProduction.maxHours (720) is below the critical path (722.75)`. The guide validates (warning only), but the stated production range contradicts its own critical path.
3. **Skill polling cannot wait in a restricted session (F run 1).** `oauth-guide/SKILL.md` says to poll every ~20 s, yet with only the MCP tools allowed there is no way to sleep, so the model polled 9 times in a row and gave up. Suggest an `oauth_guide_status` option to block for up to N seconds, or allow `Bash(sleep:*)` in the skill's `allowed-tools`.
4. **First MCP status is not informative during a long probe/research phase** (F run 1 saw "7 probes, 0 ok" for the whole wait). Minor; consistent with bug 1 (probe 0 ok in that run, possibly sandbox networking).
5. **MCP start result hardcodes `http://localhost:3000/guides/<slug>`** (E): correct only when the web app runs there. Env var `OAUTH_PILOT_URL` exists, so this is configuration, not a code bug.
6. **No Playwright assertion covers the two clocks on library cards** (only verified by hand in G).
7. `packages/mcp` reports no unit tests (`--passWithNoTests`); it is covered only by `e2e:mcp`.

## Live-run cost and time notes

| Run | Surface | Time | Cost |
|---|---|---|---|
| Pipedrive | CLI | 157 s | proxy-billed, not reported |
| Slack | web | 71 s | proxy-billed, not reported |
| Calendly | MCP | 110 s | proxy-billed, not reported |
| Notion (run 1) | plugin skill | 39 s | $0.238 |
| Notion (run 2) | plugin skill | 189 s wall | $0.443 |
| Plugin smoke (B) | plugin, fake | 10 s | $0.369 |

Generation times for live runs ranged from 71 s to 157 s with the same agent graph; the draft node dominates (30 to 90 s), then docs_research (39 to 47 s).
