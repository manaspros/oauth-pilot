# Google Calendar evidence pack  (researched 2026-10-27 by sonnet worker, T05)

Access date for every source below: 2026-10-27. Docs-only research. Nothing here is "tested".

## Facts
| id | fact | source url | verbatim quote (≤400 chars) | rank |
|----|------|-----------|-----------------------------|------|
| f1 | Public apps using scopes that permit access to certain user data must complete verification. | https://developers.google.com/workspace/calendar/api/auth | "If your public application uses scopes that permit access to certain user data, it must complete a verification process." | 1 |
| f2 | Google's Calendar scope page has only Scope and Meaning columns and gives no sensitivity classification per scope; sensitivity is shown in Cloud Console. | https://developers.google.com/workspace/calendar/api/auth | (page does not contain the words "sensitive" or "restricted") | 1 |
| f3 | Google names reading Calendar events as a sensitive-scope example. | https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification | "Examples of sensitive scopes include reading events stored in Google Calendar," | 1 |
| f4 | Sensitive scopes require Google review before any account can grant access. | https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification | "Sensitive scopes require review by Google before any Google Account can grant access." | 1 |
| f5 | Sensitive-scope timeline wording: 3-5 business days. | https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification | "The sensitive scope verification process typically takes 3-5 business days to complete." | 1 |
| f6 | Sensitive-scope submission needs a published brand, a demo video (unlisted YouTube) and verified domains. | https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification | "you must have a published branding status before you can request verification for data access." / "Prepare a video that fully demonstrates how a user initiates and grants access to the requested scopes" / "Verify ownership of your project's authorized domains within the Google Search Console." | 1 |
| f7 | CASA security assessment applies to restricted data, not sensitive-only scopes; Calendar scopes are not on the Gmail restricted list (see Scope sensitivity: inferred). | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification | Apps must "go through a security assessment from Google-empanelled security assessors" if they access restricted data and can reach it through a third-party server. (fetch-summary wording, only the quoted fragment is verbatim) | 1 |
| f8 | Brand verification: automated first, manual "2-3 business days"; results valid 7 days. | https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification | "usually takes 2-3 business days." / "Compliant verification results are valid for 7 days." | 1 |
| f9 | Unverified apps are subject to a user cap; unverified screen appears when scopes aren't approved. | https://support.google.com/cloud/answer/15549945 | "100 new users in total, after the app presents the unverified app screen" / "The user cap applies over the entire lifetime of the project, and it cannot be reset or changed." | 1 |
| f10 | Testing mode: 100 test users max; authorization expires after seven days. | https://support.google.com/cloud/answer/15549945 | "are limited to up to 100 test users listed in the OAuth consent screen." / "Authorizations by a test user will expire seven days from the time of consent." | 1 |
| f11 | Testing mode refresh tokens expire in 7 days (second source). | https://developers.google.com/identity/protocols/oauth2#expiration | "is issued a refresh token expiring in 7 days" | 1 |
| f12 | Calendar "This app isn't verified" warning cause and dev workaround. | https://developers.google.com/workspace/calendar/api/troubleshoot-authentication-authorization | "your app must go through the verification process" (to remove the warning; dev workaround is Advanced then proceed to project (unsafe)) | 1 |
| f13 | Internal exemption: apps used only inside your Workspace/Cloud Identity org don't need verification. | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification | "This means the app is used only by people in your Google Workspace or Cloud Identity organization" | 1 |
| f14 | Internal user type limits authorization to org members. | https://support.google.com/cloud/answer/15549945 | "can configure Internal users to limit authorization requests to members of the organization." | 1 |
| f15 | Workspace admins can trust internal apps, trust by client ID, and block unverified apps. | https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data | "This allows internal apps built by your organization to access restricted Google Workspace APIs." / "Users might be blocked from activating unverified apps that you don't trust." | 1 |
| f16 | Narrower Calendar scopes exist (e.g. `calendar.events.owned`, `calendar.app.created`, `calendar.freebusy`); Google asks for the narrowest scope. | https://developers.google.com/workspace/calendar/api/auth | `calendar.app.created`: "Make secondary Google calendars, and see, create, change, and delete events on them." | 1 |
| f17 | Core scopes' meanings: `calendar` full access, `calendar.readonly`, `calendar.events`, `calendar.events.readonly`. | https://developers.google.com/workspace/calendar/api/auth | `calendar`: "See, edit, share, and permanently delete all the calendars you can access using Google Calendar." / `calendar.events.readonly`: "View events on all your calendars." | 1 |
| f18 | Refresh token limits: 100 per account per client; unused six months. | https://developers.google.com/identity/protocols/oauth2#expiration | "There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID." / "The refresh token has not been used for six months." | 1 |
| f19 | Per-scope sensitivity for `calendar`, `calendar.readonly`, `calendar.events`, `calendar.events.readonly`: verification required, security assessment not required (third-party table). | https://developer.nylas.com/docs/provider-guides/google/google-verification-security-assessment-guide/ | Table row: Calendar | `calendar`, `calendar.readonly`, `calendar.events`, `calendar.events.readonly` | Required | Not required (sensitive). (summary of table, not an exact string) | 5 (confidence medium) |

## Timeline facts
- Sensitive scope verification: "typically takes 3-5 business days to complete." (f5)
- Brand verification: automated "typically takes a few minutes"; manual "usually takes 2-3 business days". (f8)
- Testing-mode authorization expiry: "seven days from the time of consent." (f10)
- Nylas (rank 5): "The Google verification and security assessment processes can take several weeks or longer" (generic, not Calendar-specific; do not use as sole timeline).
- If Calendar is requested together with restricted Gmail scopes, the restricted timeline applies: "can potentially take several weeks to complete." (see gmail.md)
- Whether Calendar-only verification needs CASA: no CASA timeline applies (see inferred note below); provider gives no Calendar-specific duration other than the sensitive-scope one.

## Scope sensitivity
Google's Calendar docs do not label sensitivity per scope; the Cloud Console does. Labels below marked (inferred) rest on f3 plus Nylas (rank 5).

| scope | sensitivity | source |
|---|---|---|
| `calendar` | sensitive (inferred: f3 + Nylas) | developers.google.com/.../sensitive-scope-verification ; Nylas guide |
| `calendar.readonly` | sensitive (inferred) | Nylas guide (rank 5) |
| `calendar.events` | sensitive (inferred) | Nylas guide (rank 5) |
| `calendar.events.readonly` | sensitive (inferred; matches f3 "reading events") | Nylas guide (rank 5) |
| `calendar.freebusy`, `calendar.events.freebusy`, `calendar.settings.readonly`, `calendar.events.owned`, `calendar.events.owned.readonly`, `calendar.app.created`, `calendar.calendarlist(.readonly)`, `calendar.calendars(.readonly)`, `calendar.acls(.readonly)`, `calendar.events.public.readonly` | not stated in any source fetched; check the Cloud Console scope picker | https://developers.google.com/workspace/calendar/api/auth |
| `calendar.addons.*` | not stated; add-on scopes | same |

## Gotchas & blockers seen in the wild
| symptom / error text | cause | fix | source |
|---|---|---|---|
| "This app isn't verified" screen | App requests scopes giving access to sensitive user data | Run verification; in dev choose Advanced then proceed (unsafe); lifetime cap 100 new users | https://developers.google.com/workspace/calendar/api/troubleshoot-authentication-authorization ; https://support.google.com/cloud/answer/15549945 |
| "Token has been expired" / "Token has been revoked" | "an access token from the Google Authorization Server has either expired or has been revoked." | Page gives no specific fix; see refresh-token expiry doc | https://developers.google.com/workspace/calendar/api/troubleshoot-authentication-authorization |
| Refresh token dead after 7 days, `invalid_grant` | External + Testing publishing status | Publish and verify, or reauthorize weekly | https://developers.google.com/identity/protocols/oauth2#expiration |
| `admin_policy_enforced` | Workspace policy blocks the scope or non-trusted app | Admin trusts client ID / allows scope | https://developers.google.com/identity/protocols/oauth2/web-server |
| `org_internal` | Client belongs to an Internal project, user is outside the org | Use External type or an in-org account | https://developers.google.com/identity/protocols/oauth2/web-server |
| `origin_mismatch` / `redirect_uri_mismatch` | Registered origin or redirect URI doesn't match request | Register exact value | https://developers.google.com/workspace/calendar/api/troubleshoot-authentication-authorization ; https://developers.google.com/identity/protocols/oauth2/web-server |
| Forum report: `calendar.app.created` and `calendar.freebusy` missing from the scope picker though documented | Unknown | Not resolved | https://discuss.google.dev (via search result title only; page not fetched, rank 5) |

## Could not verify
- Per-scope sensitivity labels for Calendar from a Google page: Google's Calendar scope table and the OAuth scopes reference (first 100,000 chars read) carry no sensitivity column; only f3's example sentence is Google-sourced. Per-scope labels come from Nylas (rank 5, confidence medium).
- Whether any Calendar scope is restricted (so CASA applies): no source says so; inferred "no" from Nylas and from Google's restricted list not including Calendar. Remaining 53,461 chars of the scopes reference page were not read.
- Calendar-specific verification duration: only the generic sensitive-scope "3-5 business days" was found.
- The 100-user cap value on the brand-verification page: that page does not state it; value comes from support.google.com/cloud/answer/15549945.
- Forum thread about missing scopes in the picker: not fetched, only seen as a search result title.
- Composio managed-app verification status for Calendar: not checked (see T01).
- Verbatim cells came via fetch summaries; the fetch tool may have condensed surrounding text.
