# 07 — Testing (unit → e2e)

All commands are runnable from the repo root. Each task's acceptance criteria reference these.

| Layer | Tool | Command | Needs keys? |
|---|---|---|---|
| Typecheck | tsc | `pnpm typecheck` | no |
| Core unit | vitest | `pnpm --filter @oauth-pilot/core test` | no |
| Agent unit + graph replay (fake mode) | vitest | `pnpm --filter @oauth-pilot/agent test` | no |
| Agent live smoke | vitest, tagged | `pnpm --filter @oauth-pilot/agent test:live` (skips without `ANTHROPIC_API_KEY`) | yes |
| Library validity | script | `pnpm validate:guides`: every `guides/*.json` passes `Guide` + `validateGuide` with no errors | no |
| Web e2e | Playwright | `pnpm e2e:web` (config `playwright.config.ts`, specs `e2e/web/*.spec.ts`; webServer = `next build && next start` with `OAUTH_PILOT_FAKE=1`) | no |
| MCP e2e | node + SDK client | `pnpm e2e:mcp` (builds the bundle, spawns `node plugin/oauth-pilot/bin/mcp.mjs` with `OAUTH_PILOT_FAKE=1`, calls all 4 tools; no web needed) | no |
| Plugin smoke | claude CLI headless | `pnpm e2e:plugin` (see below) | Claude CLI login |
| Everything offline | — | `pnpm test:all` = typecheck + unit + validate + e2e:web + e2e:mcp | no |

## Required test cases

**Core**
- The Linear fixture parses and validates with no errors.
- `computeTier`: one table-driven case per tier (0–4), the fall-through to 1, plus precedence (restricted scope and gate → 4).
- `validateGuide`: a Range with `basis: "sourced"` and no supporting claim → error.
- `criticalPath`: diamond DAG picks the longer branch; optional steps are excluded; a cycle is reported by `validateGuide`.
- `validateGuide`: missing claim id → error; sourced claim without sources → error.
- `renderMarkdown`: contains the verdict, every step title and every claim id footnote.

**Agent (fake mode)**
- `runGuide({app:"Linear"})` emits events in a valid order (`run_started` → … → `done`). All 6 node names appear. The result validates.
- `finalize` repair loop: an injected invalid draft goes back to draft once, then succeeds or fails cleanly.
- Probe parser: given a fixture `.well-known` JSON with `registration_endpoint`, it produces a `tested` claim.
- A node failure in `probe` still yields a guide with an issue recorded.
- Fan-in: `draft` runs exactly once per pass (count node_started events).

**Web e2e (Playwright, fake mode)**
1. `/` shows ≥ 5 guide cards with tier badges (≥ 1 when `GUIDES_DIR=packages/core/fixtures`, used before T21).
2. `/guides/<slug>` renders the "Start today" callout, the timeline (≥ 3 items), the evidence ledger rows and, if React Flow shipped, ≥ 3 `.react-flow__node`. After T21 the slug is `gmail` and the tier text is "Heavy review" (T21 must make the Gmail guide compute to tier 3, or record why not).
3. Clicking a step node opens a panel with detail text.
4. "Copy as markdown" endpoint returns text containing "## " headings.
5. Submit "Calendly" → `/runs/:id` shows agent nodes changing state → lands on `/guides/calendly?generated=1`.

**MCP e2e:** `oauth_guide_list` includes `gmail`. `oauth_guide_get gmail` contains "Evidence". `start calendly`, then poll `status` until done (≤ 30 s in fake mode); the report contains "tier".

**Plugin smoke:**
```
claude -p --plugin-dir ./plugin/oauth-pilot --model sonnet \
  --allowedTools "mcp__oauth-pilot__*,Read,Write,Bash(node:*)" \
  "/oauth-pilot:oauth-guide linear — save the guide file and print its path"
```
Assert `./oauth-guides/linear.md` exists and contains "Critical path". Run with `OAUTH_PILOT_FAKE=1` in the env so the bundled MCP replays the recording. A second run with the server stopped exercises the fallback path. That one is live and optional.

## Live acceptance (manual, recorded in LOG.md)

- One live web run for an app not in the library (target < 3 min). Record the runId, duration, tier, and the verifier's unsupported count.
- One live `oauth-setup` walk-through on Linear (HUMAN task T22).
