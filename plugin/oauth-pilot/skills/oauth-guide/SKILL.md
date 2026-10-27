---
name: oauth-guide
description: Use when the user asks how to set up, register, verify or get approval for an OAuth app for a provider (Gmail, Slack, Salesforce, ...), or asks how long or how hard it is to connect an app to their agent or Composio.
---

# oauth-guide: how hard is it, and what do I do next

Produce a source-cited OAuth setup guide for one app and tell the user what to do today.

## 1. Understand the ask

Get the app name (or URL) and, if given, the use case. If the user's repo uses Composio, grep it for tool slugs (`GMAIL_`, `SLACK_`, ...) and pass them as `tools`.

## 2. Preferred path: MCP tools

The tools are named `mcp__plugin_oauth-pilot_oauth-pilot__<tool>`. Use them if they are available.

1. `oauth_guide_list`. If the app is already listed, call `oauth_guide_get` with its slug and skip to step 4.
2. Otherwise `oauth_guide_start` with `app`, and `use_case` / `tools` when known. It returns a `run_id` at once; the run takes a few minutes.
3. Poll `oauth_guide_status` about every 20 seconds until it reports done (or FAILED: tell the user and switch to the fallback). Then `oauth_guide_get` for the full guide.

Save the markdown to `./oauth-guides/<slug>.md`. A run needs `ANTHROPIC_API_KEY` in the environment of the MCP server; if it is missing, say so and use the fallback.

## 3. Fallback: no MCP server

Do the Elephant-Goldfish flow in-session. You are the Elephant; the verifier is a fresh-context agent.

1. **Research** with WebSearch and WebFetch. Budget: about 8 searches and 6 fetches.
   - Rank sources: official provider docs and policy pages, then the provider's changelog or blog, then Composio docs, then third parties (only for gotchas, never as the sole source for timelines or requirements).
   - Look for: registration (console URL, field names, callback rules), review process and timeline (copy the exact wording; "can take several weeks" is not "4-6 weeks"), scopes and their sensitivity tiers, non-code requirements (privacy policy, domain verification, security assessment, demo video), limits (rate, unverified-app user caps), gotchas and error text.
   - Every note needs a URL you actually fetched and a verbatim quote of 400 characters or fewer from that page. Never invent quotes; omit a note you cannot quote.
   - Write the notes to `./oauth-guides/<slug>.notes.md`.
2. **Draft** the guide as JSON, following `${CLAUDE_PLUGIN_ROOT}/schema/guide.schema.json` (read it first). Every claim cites a source from your notes. Mark a claim as sourced only if its quote backs it.
3. **Verify.** Spawn the `oauth-goldfish` agent (`oauth-pilot:oauth-goldfish`). Give it ONLY the numbered claims, each with its cited URL and quote. No conversation history, no draft. Apply its verdicts: fix or remove `contradicted` and `unsupported` claims, soften `partially_supported` ones. Never override a verdict because you are sure.
4. **Render** to `./oauth-guides/<slug>.md` (verdict, time estimates, critical path, steps, risks, sources) and keep the JSON beside it as `./oauth-guides/<slug>.json`.

## 4. Reply in chat

Keep it short:
- the verdict box: tier, headline, time to first connection, time to production, hands-on effort, confidence
- the **Start today** line
- the 3 next actions on the critical path, and which steps have `actor=agent`
- the path of the saved guide

Then offer to continue with `/oauth-pilot:oauth-setup`.

## Rules

- State the confidence honestly. Say which claims were verified by the goldfish and which were not.
- Never put secrets (client secrets, API keys) in the guide, notes or chat.
- Never describe a step or claim as tested or verified unless you ran it in this session or the goldfish verified its source; otherwise say sourced or inferred.
