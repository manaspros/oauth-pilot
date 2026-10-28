# Reviewer demo script (5 minutes, local run)

There is no public URL; this runs on your machine. A recorded demo video is a next step. Fake mode needs no keys; steps marked LIVE need `.env` keys (see README).

## Setup (1 min, before the clock)

```bash
pnpm install
pnpm --filter web build
OAUTH_PILOT_FAKE=1 pnpm --filter web start      # http://localhost:3000
```

For LIVE steps, instead: `set -a; . ./.env; set +a; pnpm --filter web start`.

## 1. The library (30 s)

Open `/`. Five guides, each with a tier badge (0 to 4) and two clocks. Linear is 0, Google Calendar and Salesforce 2, Gmail and Shopify 3. Same vendor, different weeks: Calendar vs Gmail.

## 2. Gmail, the long pole (90 s)

Open `/guides/gmail`.
- Verdict box: tier 3 "Heavy review", both clocks, the "start today" line.
- Critical-path diagram: the CASA security assessment is a `provider` wait on the longest path. Tier 3 means a provider step of a week or more, or a restricted scope; `gmail.readonly` is restricted.
- Risks: error text you will see, with the fix (for example `access_denied` for an unverified app).
- Evidence ledger: each claim is tested, sourced (URL, quote, date) or inferred. Click a source. Uncertain items are marked inferred with low or medium confidence.
- Click "Copy as markdown".

## 3. Generate an unfamiliar app (90 s)

On `/`, enter **Calendly** (fake mode replays Linear and Calendly) and click "Generate guide". Watch the graph light up: intake, composio_lookup, docs_research, probe (parallel), then draft, verify, finalize. You land on the new guide. LIVE: try **Slack** (not in the library); expect a few minutes.

## 4. MCP and plugin (60 s)

MCP, any client (add `"OAUTH_PILOT_FAKE": "1"` to the server env for no keys): `oauth_guide_list`, `oauth_guide_start {app: "Linear"}`, then `oauth_guide_status` until done, then `oauth_guide_get`. Config snippet in the README.

Claude Code:
```bash
claude --plugin-dir plugin/oauth-pilot
# then: /oauth-pilot:oauth-guide notion
# and:  /oauth-pilot:oauth-setup linear   (hands off at login, 2FA, consent)
```

## 5. What was verified (30 s)

Open `docs/verification/SUMMARY.md`: 118 claims after the audit (11 tested, 86 sourced, 21 inferred; 16 tested today after T22 added 5 to Linear); 28 "unsupported" verdicts fell to 7, almost all fetch artifacts; Salesforce corrected from tier 1 to 2. Then `docs/verification/setup-attempts.md` for the Linear setup attempts: managed OAuth first expired at the consent screen, then reached ACTIVE with working list calls on a retry; the API-key path reached ACTIVE with working tool calls, and creating an OAuth app by API needs the `oauth:create` scope.

## Questions to check

- How do I run it locally? README, "Run it locally".
- What does tier 3 mean? README, "What the tiers mean".
- What was tested vs sourced? README, "How evidence works" and "Verification summary".
