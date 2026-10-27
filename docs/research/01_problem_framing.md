# 01 — Problem framing (draft, 2026-10-27)

## What an "OAuth app" is in Composio

Three layers, often confused:

| Layer | Who owns it | Example |
|---|---|---|
| **Provider OAuth app** | Whoever registered it with Google/Slack/etc. Has client_id + secret, redirect URI, scopes, brand, and an approval status. | "Acme Agent" registered in Google Cloud Console |
| **Auth config** (Composio) | The developer. Points at either Composio's managed app or the developer's own app. | `ac_123` → Gmail, OAuth2, own credentials |
| **Connected account** | Each end user. A token minted through the auth config. | Alice's Gmail token |

- **Managed** (124 toolkits): Composio's own OAuth app. No setup. Good for dev.
- **Bring your own** (258 toolkits): no managed app exists, so you must register one.
- Even managed toolkits push you to your own app in production: the consent screen says "Composio", quota is shared, scopes are fixed, polling is ≥15 min.
- Moving to your own app later only affects new connections. Existing users must reconnect. **So picking the wrong path early costs a re-auth of every user.**

Callback to register with the provider: `https://backend.composio.dev/api/v3/toolkits/auth/callback`.

Sources: docs.composio.dev/toolkits/managed-auth, /docs/auth-configuration/white-labeling, /docs/authentication/custom-app-vs-managed-app

## The real pain (not "missing docs")

1. **Difficulty depends on the scopes, not the app.** Google Calendar read = sensitive scope = brand verification. Gmail read = restricted scope = yearly third-party security audit (CASA). Same vendor, very different paths. Guides keyed only on "the app" are wrong half the time.
2. **The long pole is waiting, and people find it late.** Coding takes an hour. Review takes days to weeks. If you don't start the review on day 1, launch slips.
3. **Hidden traps nobody writes down.** Examples to verify: Google apps in "Testing" mode cap at 100 users and refresh tokens expire after 7 days; Slack apps not listed in the Marketplace got much lower rate limits on some history methods (2025); some APIs (LinkedIn, X) are gated behind partner programs or paid tiers, so "OAuth app" is not the blocker at all.
4. **Most prerequisites aren't code.** Verified domain, privacy policy URL, homepage, demo video of the scope in use, a business entity, an admin account in the provider. Often owned by someone other than the developer.
5. **The developer can't tell if a step is done.** No feedback loop until a real user hits an error.

So the job-to-be-done is: **"Tell me, for the actions my agent needs, the critical path to production auth, start the slow parts now, and do the busy-work for me."**

## Solution directions

A. **Scope-aware readiness verdict.** Input: app + the Composio tools the agent will call. Map tools → scopes → approval tier. Output: difficulty, time-to-first-user vs time-to-production, blockers, "do you even need your own app yet?".

B. **Critical-path plan, not a wall of text.** Steps tagged `agent can do` / `you do` / `someone else (admin, legal)` / `wait`. Shows what to start first. Shareable link so tasks can be handed off.

C. **Evidence ledger.** Every claim tagged: `tested` (agent actually did it), `sourced` (link + date), `inferred`. Confidence and last-checked date shown inline.

D. **Agent that does the work, not just describes it.** Probes the provider (OAuth metadata `.well-known`, dynamic client registration support, authorize-URL error messages); drafts the scope justification, privacy policy, demo-video script; drives the developer console in a browser up to login/2FA/payment, then hands off; creates the Composio auth config via API and runs a test connection.

E. **Ships as a Claude Code skill / MCP server** so the developer runs it from their terminal: "set up Gmail OAuth for my agent" → plan, browser steps, secrets into `.env`, auth config created, connection verified.

F. **Live generation for unknown apps.** Same pipeline: research agent → probe agent → verifier agent → guide, streamed to the page.

## Open questions

- Which wedge to lead with in 6–8 h: A+B+C (web library + live agent) as the core, D/E as the "wow" demo on one or two apps?
- Demo app set: one easy managed (Linear), one sensitive-scope (Google Calendar), one restricted/audit (Gmail), one marketplace/partner-gated (Salesforce or LinkedIn), one BYO-only niche app.
