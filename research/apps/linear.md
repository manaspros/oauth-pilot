# Linear evidence pack  (researched 2026-10-27 by sonnet worker T06)

Note: Linear's developer docs are short; 12 facts below, all rank 1. Quotes are taken from WebFetch extractions of the pages on 2026-10-27.

## Facts
| id | fact | source url | verbatim quote (≤400 chars) | rank |
|----|------|-----------|-----------------------------|------|
| f1 | OAuth apps are created by the developer in Linear's API settings; no approval step is described | https://linear.app/developers/oauth-2-0-authentication | "Create a new OAuth2 Application and configure the redirect callback URLs to your application." | 1 |
| f2 | Linear recommends a dedicated workspace for managing the OAuth app | https://linear.app/developers/oauth-2-0-authentication | "It is highly recommended you create a workspace for the purpose of managing the OAuth2 Application" | 1 |
| f3 | The OAuth page states no review, approval or publishing requirement (absence on the page; see Could not verify) | https://linear.app/developers/oauth-2-0-authentication | (no quote: the page has no review/approval section) | 1 |
| f4 | Authorization endpoint requires client_id, redirect_uri, response_type, scope; state is recommended | https://linear.app/developers/oauth-2-0-authentication | "(optional, recommended) Prevents CSRF attacks and should always be supplied." (state) | 1 |
| f5 | `actor` param: `user` (default) vs `app` | https://linear.app/developers/oauth-2-0-authentication | "Resources are created as the user who authorized the application." (user) / "Resources are created as the application." (app) | 1 |
| f6 | `actor=app` is intended for agents / service accounts | https://linear.app/developers/oauth-2-0-authentication | "This option should be used for agents and service accounts or agents." | 1 |
| f7 | With actor=app, mutations come from the app itself | https://linear.app/developers/oauth-actor-authorization | "In this mode, all mutations such as creating issues, comments, and status changes will be performed by the app." | 1 |
| f8 | actor=app integrations cannot also request admin scope | https://linear.app/developers/agents | "integrations using the `actor=app` mode are not able to also request `admin` scope." | 1 |
| f9 | Installing an agent app with workspace scope needs workspace admin | https://linear.app/developers/agents | "Because this will be installed with a workspace scope _admin permissions are required_ to complete the installation." | 1 |
| f10 | App users are managed by workspace admins, who can revoke access | https://linear.app/developers/agents | "The team access available to your app can be changed or revoked at any time by workspace admins." | 1 |
| f11 | Access tokens expire after 24h and must be refreshed | https://linear.app/developers/oauth-2-0-authentication | "The access token is valid for 24 hours and will need to be refreshed when it expires." | 1 |
| f12 | Client-credentials tokens last 30 days; app must refetch on 401; limit of 1000 parallel tokens | https://linear.app/developers/oauth-2-0-authentication | "your server is expected to fetch a new token if it receives a 401 error" | 1 |
| f13 | PKCE is supported (code_challenge, S256 or plain) | https://linear.app/developers/oauth-2-0-authentication | "Linear supports the PKCE flow" | 1 |
| f14 | app:assignable and app:mentionable are optional and must be requested | https://linear.app/developers/agents | "the ability to mention and assign your agent is optional and must be requested." | 1 |

## Timeline facts
- Review duration: provider gives no duration (no review is described on the OAuth pages). Guides should mark any timeline `inferred`.
- Token lifetimes: user access token 24 hours; client-credentials token 30 days (f11, f12).

## Scope sensitivity
| scope | sensitivity | source |
|-------|-------------|--------|
| read | low; "Read access for the user's account. This scope will always be present." | https://linear.app/developers/oauth-2-0-authentication |
| write | medium; "Write access for the user's account. If your application only needs to create comments, use a more targeted scope" | same |
| issues:create | low-medium; "Allows creating new issues and their attachments" | same |
| comments:create | low-medium; "Allows creating new issue comments" | same |
| admin | high; "Full access to admin level endpoints. You should never ask for this permission unless it's absolutely needed" (not combinable with actor=app, f8) | same + agents page |
| app:assignable | agent scope; "Allow the app to be assigned as a delegate on issues and made a member of projects." | https://linear.app/developers/agents |
| app:mentionable | agent scope; "Allow the app to be mentioned in issues, documents, and other editor surfaces." | https://linear.app/developers/agents |

Sensitivity labels are our own reading; Linear does not publish a sensitivity tiering (provider gives no tiering).

## Gotchas & blockers seen in the wild
| symptom / error text | cause | fix | source |
|----------------------|-------|-----|--------|
| `Client does not support the client_credentials grant type` (error_description, "error": "Error") | client_credentials not enabled on the OAuth app | enable the client credentials grant for the app | https://linear.app/developers/oauth-2-0-authentication |
| HTTP 401 from API | access token expired (24h) or revoked | refresh the token / fetch a new client-credentials token | same |
| 400 "unable to revoke token (e.g. token was already revoked)" | revoking an already-revoked token | treat as success | same |
| Installing an actor=app agent fails for non-admin | workspace-scope install needs admin | have a workspace admin authorize | https://linear.app/developers/agents |
| admin scope rejected/unavailable with actor=app | the two cannot be combined | drop admin, or use actor=user | https://linear.app/developers/agents |
| State mismatch | CSRF check failed | "If the values do not match, the request should not be trusted." | https://linear.app/developers/oauth-2-0-authentication |

## Could not verify
- Whether Linear performs any review of OAuth apps (pages are silent; only absence observed). Listing in Linear's integrations directory not researched.
- Whether a non-admin member can create an OAuth application under Settings > API (page doesn't say).
- Whether the actor=app admin requirement applies to every workspace-scope install or only agents; actor-authorization page does not state required scopes.
- Rate limits, and exact behaviour of redirect_uri mismatch errors (no section on the page).
- Quotes come from WebFetch summaries of each page, not a raw page dump; re-check before using in a user-facing quote.
