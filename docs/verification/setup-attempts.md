# Setup attempts (T22)

Real attempts to set up Linear through Composio, run on 2026-10-28 in the Linear workspace `testforcontext` (the user is an admin there). The orchestrator agent ran the requests; the user was the only one who could click through Linear's consent screen. No secret values appear here. IDs are Composio object IDs, not credentials.

Guide scopes for comparison (`guides/linear.json`): `read`, `write` (claim c4 also names `issues:create`). Callback URL in the guide and D-API-1: `https://backend.composio.dev/api/v1/auth-apps/add`.

## Attempt 1: create a Linear OAuth app through the API (own-app path, step s5)

- **Date:** 2026-10-28. **Who:** agent.
- **Steps:** `POST https://api.linear.app/graphql`, mutation `oauthApplicationCreate` with input name, developer and `redirectUris=[https://backend.composio.dev/api/v1/auth-apps/add]`, authorized with a Linear personal API key. Introspection beforehand confirmed the mutation exists and that its payload returns `clientSecret` once, at creation.
- **Result:** HTTP 400, error "Invalid scope: `oauth:create` required" (FORBIDDEN). Nothing was created.
- **Doc drift / findings:**
  - A personal API key needs the `oauth:create` scope to create OAuth apps programmatically. Linear's docs, as captured in the guide, only describe the UI route (linear.app/settings/api/applications/new). Guide now has risk k7 and a note in s5 (claim t4).
  - The redirect URI we sent matches D-API-1.
- **Outcome:** failed (scope). Own-app credentials were not obtained.

## Attempt 2: Composio API_KEY path (alternative to OAuth)

- **Date:** 2026-10-28. **Who:** agent.
- **Steps:**
  1. `POST /api/v3.1/auth_configs` `{toolkit:{slug:"linear"}, auth_config:{type:"use_custom_auth", authScheme:"API_KEY", credentials:{}}}` -> 201, `ac_lRdLLROO-VLY`.
  2. `POST /api/v3.1/connected_accounts` `{auth_config:{id}, connection:{user_id:"oauth-pilot-t22", state:{authScheme:"API_KEY", val:{status:"ACTIVE", generic_api_key:<personal key>}}}}` -> 201, `ca_pOvD6nB1ne0I`, status ACTIVE immediately. The body shape was taken from the `@composio/core` 0.27.0 source (`AuthScheme.APIKey`), not from the docs.
  3. `POST /api/v3/tools/execute/LINEAR_GET_CURRENT_USER` and `LINEAR_GET_ALL_LINEAR_TEAMS` with `connected_account_id` -> `successful=true` for both.
- **Result:** pass. Connection ACTIVE and two tool calls worked.
- **Doc drift / findings:**
  - `LINEAR_LIST_LINEAR_TEAMS` failed with "missing project_id" despite its name; `LINEAR_GET_ALL_LINEAR_TEAMS` is the tool that lists teams. Not in the guide (the guide's use case names only the issue tools), noted here.
  - The API_KEY path exists for Linear and needs no OAuth app. The guide's main path does not mention it; added as claim t3 and risk k7's fallback.
- **Outcome:** tested (claim t3).

## Attempt 3: Composio managed OAuth, first try (the guide's main path, step s2)

- **Date:** 2026-10-28. **Who:** agent initiated, user to approve in the browser.
- **Steps:**
  1. `POST /auth_configs` `{type:"use_composio_managed_auth"}` -> 201, `ac__X5eChqu0_hl`, OAUTH2, managed.
  2. `POST /connected_accounts` -> INITIATED with a short redirect URL `backend.composio.dev/api/v3/s/<code>`.
  3. Opened the link in Chrome. It redirected to `linear.app/oauth/authorize` with `redirect_uri=https://backend.composio.dev/api/v1/auth-apps/add` and `scope=read write issues:create comments:create`. The consent screen said "Composio is requesting access" to the `testforcontext` workspace with Read and Write permissions.
  4. The Authorize click was left to the user and was not made in time. Two attempts both went to EXPIRED: "Authorization was started but not completed within 10 minutes". Opening the first short URL after expiry returned 404 "URL not found".
- **Result:** reached the consent screen (tested); never reached ACTIVE in this attempt. Attempt 4 completed the flow.
- **Doc drift / findings:**
  - Callback URL in the real authorize URL matches D-API-1 exactly (claim t1).
  - Requested scopes are `read write issues:create comments:create`. The guide lists `read` and `write` and says "requesting scopes read and write". The managed app requests two extra narrower scopes (`issues:create`, `comments:create`). `read`/`write` are a superset in practice, so the guide is not wrong, but it understates what the consent screen asks for. `comments:create` appears nowhere in the guide. The guide's scope list was left unchanged; t1 records the observed scope string.
  - Consent links expire after 10 minutes and an expired short link returns 404 (claim t2, risk k6). The guide's s2 now says to approve within 10 minutes.
- **Outcome:** partial.

## Attempt 4: Composio managed OAuth, completed (step s2, and the list half of s3)

- **Date:** 2026-10-28, about 12:44 IST. **Who:** orchestrator agent; the link was opened in the user's Chrome.
- **Steps:**
  1. `POST /api/v3.1/connected_accounts` `{auth_config:{id:"ac__X5eChqu0_hl"}, connection:{user_id:"oauth-pilot-t22-oauth"}}` -> INITIATED, `ca_tD6Ak9Makygc`.
  2. Opened the short link in Chrome. Linear redirected straight to Composio's "Successfully connected" page. No consent screen appeared, because the app was already authorized for the workspace.
  3. `GET /connected_accounts/ca_tD6Ak9Makygc` -> status ACTIVE, auth_scheme OAUTH2, is_composio_managed true, created 07:14:07Z, updated 07:14:20Z (about 13 s).
  4. `POST /api/v3/tools/execute/LINEAR_GET_CURRENT_USER` and `LINEAR_LIST_LINEAR_ISSUES` with that connected account -> `successful=true` for both (5,279 bytes of issue data). `LINEAR_CREATE_LINEAR_ISSUE` was not run.
- **Result:** pass. Managed OAuth reached ACTIVE and tool calls worked (claim t5).
- **Doc drift / findings:**
  - Once a workspace has authorized Composio's Linear app, re-authorizing skips the consent screen. The guide's s2 assumed a consent screen every time; s2 now notes the skip.
  - The earlier EXPIRED results in attempt 3 were the 10-minute window running out, not an error in the flow.
- **Outcome:** tested (claim t5). s3 is only half covered (list, not create), so s3 stays untested.

## Not attempted

- Own-app OAuth through the plugin's `composio-auth-config.mjs`: blocked by attempt 1 (no client id or secret).
- Google Calendar testing-mode project up to the consent screen (optional on the card).

## What remains

1. Run `LINEAR_CREATE_LINEAR_ISSUE` against the managed connection (needed before s3 can be marked tested). The managed connect and list calls are done (attempt 4).
2. Own-app path: create the Linear OAuth app in the UI (or with a personal key that has `oauth:create`), then run `composio-auth-config.mjs` with the credentials and connect.
3. Decide whether the guide should list `issues:create` and `comments:create` as managed-app scopes.
4. Optional: Google Calendar testing-mode project up to the consent screen.
5. Clean up test objects in Composio (auth configs `ac_lRdLLROO-VLY`, `ac__X5eChqu0_hl`, connected accounts `ca_pOvD6nB1ne0I` and `ca_tD6Ak9Makygc`, and the expired connections) if no longer wanted. No cleanup was done in this task.
