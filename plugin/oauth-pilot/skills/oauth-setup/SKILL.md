---
name: oauth-setup
description: Use when the user wants Claude to actually create or configure an OAuth app (developer console, Composio auth config, .env) for a provider.
---

# oauth-setup: do it with me

Create the OAuth app for one provider together with the user. Claude drives the browser and the Composio scripts; the user handles every human-only gate. Scripts live in `${CLAUDE_PLUGIN_ROOT}/scripts`, templates in `${CLAUDE_PLUGIN_ROOT}/templates`.

## Safety rules

- No secrets in chat, commits or logs. Check `.gitignore` contains `.env` before writing it.
- Stop at every human-only gate listed above.
- If a console page differs from the guide, say so and record it. That is a doc-drift finding.

Human-only gates: login, 2FA, CAPTCHA, payment, terms-of-service acceptance, any "submit for review" button. Never type passwords. Never accept terms on the user's behalf.

## Flow

Each phase ends with a short checkpoint message.

1. **Load the guide.** Use `./oauth-guides/<slug>.json`, or run `oauth-pilot:oauth-guide` first.
2. **Plan the split.** Print a table of steps x actor and get one confirmation from the user.
3. **Draft artifacts.** Fill the templates (`privacy-policy.md`, `scope-justification.md`, `demo-video-script.md`, `console-steps.md`) into `./oauth-guides/<slug>/`. Fill only what the guide's requirements need.
4. **Drive the console** with claude-in-chrome:
   - Open the developer console URL in a new tab.
   - Create the app with the guide's field values: name, homepage, **redirect URI = `https://backend.composio.dev/api/v1/auth-apps/add`** (the Composio callback), scopes.
   - Hand off and stop at any human-only gate. Tell the user exactly what to click, then wait for "done".
5. **Collect credentials.** Ask the user to paste client ID and secret into `.env` themselves (`<APP>_CLIENT_ID`, `<APP>_CLIENT_SECRET`; see `templates/env.example`), or read them from the page only if the user explicitly says so. Never echo the secret back in chat.
6. **Composio.** Preview, then run:
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/composio-auth-config.mjs --toolkit <slug> --env-prefix <APP> --dry-run`
   then the same without `--dry-run`. It creates the auth config (POST /api/v3.1/auth_configs) and appends `COMPOSIO_AUTH_CONFIG_<APP>=ac_...` to `.env` (only if `.gitignore` lists `.env`).
7. **Verify.** Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/composio-connect.mjs --auth-config <ac_id> --user-id test-user --wait`. The user opens the printed URL and consents. The script reports ACTIVE or the error. On error, look up `guide.blockers` by symptom and propose the fix.
8. **Record.** Append the outcome to `./oauth-guides/<slug>/setup-log.md`: what was done, by whom, and the result. Inside the OAuth Pilot repo this also feeds `docs/verification/` as `tested` evidence.

Both scripts support `--help` and `--dry-run`; dry-run prints the exact request with the API key and client secret masked and makes no network call. If the scripts or the Composio API are unavailable, print the dashboard steps from `templates/console-steps.md` for the user to do by hand.
