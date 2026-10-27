# Gmail evidence pack  (researched 2026-10-27 by sonnet worker, T05)

Access date for every source below: 2026-10-27. Docs-only research. Nothing here is "tested".

## Facts
| id | fact | source url | verbatim quote (≤400 chars) | rank |
|----|------|-----------|-----------------------------|------|
| f1 | Gmail scopes are split into three tiers: non-sensitive (`gmail.labels`), sensitive (`gmail.send`), restricted (`gmail.readonly`, `gmail.modify`, `gmail.compose`, `gmail.metadata`, `gmail.insert`, `gmail.settings.basic`, `mail.google.com`). | https://developers.google.com/workspace/gmail/api/auth/scopes | Restricted tier intro: "These scopes provide wide access to Google user data and require restricted scope OAuth App Verification." Sensitive tier intro: "These scopes provide access to specific Google user data that users authorize for your app." | 1 |
| f2 | Any sensitive or restricted scope requires Google OAuth app verification; non-sensitive-only apps need no verification. | https://support.google.com/cloud/answer/13463073 | "must complete Google's OAuth app verification before being granted access." / "it is not mandatory for your app to complete the app verification process." | 1 |
| f3 | Restricted scopes additionally need a security assessment by an independent, Google-approved third party, using CASA (App Defense Alliance). | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification | "from an independent, third-party assessor that is approved by Google." and "the cloud application security assessment framework (CASA)" | 1 |
| f4 | CASA is the App Defense Alliance framework, based on OWASP ASVS, with risk-based tiers; assessments are done by authorized assessors. | https://appdefensealliance.dev/casa | "CASA is based 100% on the OWASP ASVS; no proprietary requirements or confusing security jargon" / "Authorized assessors to validate your application against CASA requirements" | 1 |
| f5 | Who performs it: a third-party security firm, not Google. Google does not control the process. | https://developers.google.com/health/app-verification (Google Health API page, same CASA process; not Gmail-specific) | "A third-party security firm performs this assessment." / "Google does not have control over this assessment process." | 1 |
| f6 | Cost signal: assessor fees of $500-$4,500 USD depending on app complexity (stated on a Google Health API page, not a Gmail page). An accelerator can reuse HITRUST, SOC 2 or ISO 27001 evidence. | https://developers.google.com/health/app-verification | "involves fees payable to the third-party assessor, ranging from $500 to $4,500 USD, depending on your app's complexity." | 1 |
| f7 | Renewal: restricted-scope apps are reverified and reassessed at least every 12 months. | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification | "at least every 12 months after your assessor's Letter of Assessment (LOA) approval date." | 1 |
| f8 | Renewal (second source): all applications must be revalidated yearly; passing yields a Letter of Validation. | https://support.google.com/cloud/answer/13465431 | "must undergo an annual security assessment." / "All applications must be revalidated every year." | 1 |
| f9 | Restricted-scope verification timeline wording: "several weeks". | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification | "can potentially take several weeks to complete." | 1 |
| f10 | Sensitive-scope verification timeline wording: 3-5 business days. | https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification | "The sensitive scope verification process typically takes 3-5 business days to complete." | 1 |
| f11 | Assessment duration (Google Health page): 2-3 weeks for tier-2, 4-6 weeks for tier-3. | https://developers.google.com/health/app-verification | "The security assessment can take 2-3 weeks for tier-2 applications and 4-6 weeks for tier-3 applications." | 1 |
| f12 | Brand verification is automated first; manual review "usually takes 2-3 business days". Results valid 7 days. | https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification | "The automated brand verification process typically takes a few minutes." / "usually takes 2-3 business days." / "Compliant verification results are valid for 7 days." | 1 |
| f13 | Brand verification is the lighter process for non-sensitive apps that want name/logo on the consent screen. | https://support.google.com/cloud/answer/13463073 | "a lighter-weight verification process known as "brand-verification"." | 1 |
| f14 | Testing mode: up to 100 test users listed on the consent screen. | https://support.google.com/cloud/answer/15549945 | "are limited to up to 100 test users listed in the OAuth consent screen." | 1 |
| f15 | Testing mode: authorization and refresh token expire after 7 days. | https://support.google.com/cloud/answer/15549945 | "Authorizations by a test user will expire seven days from the time of consent." / "If your OAuth client requests an offline access type and receives a refresh token, that token will also expire." | 1 |
| f16 | Refresh-token expiry in Testing, second source. | https://developers.google.com/identity/protocols/oauth2#expiration | "is issued a refresh token expiring in 7 days" (unless only basic name/email/profile scopes are requested) | 1 |
| f17 | Unverified-app 100-user cap is lifetime and not resettable; counts users after the unverified screen is shown. | https://support.google.com/cloud/answer/15549945 | "The user cap applies over the entire lifetime of the project, and it cannot be reset or changed." / "100 new users in total, after the app presents the unverified app screen" | 1 |
| f18 | Unverified app screen appears when the request includes unapproved scopes. | https://support.google.com/cloud/answer/15549945 | "it is because your OAuth request includes additional scopes that haven't been approved." | 1 |
| f19 | Internal exemption: apps used only inside your Workspace or Cloud Identity org need no verification; Internal user type limits authorization to org members. | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification ; https://support.google.com/cloud/answer/15549945 | "This means the app is used only by people in your Google Workspace or Cloud Identity organization" / "can configure Internal users to limit authorization requests to members of the organization." | 1 |
| f20 | Dev/testing/staging exemption and personal-use exemption. | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification | "if your app is in the development, testing, or staging phases, verification isn't required." / "if you are the only user of your app or if your app is used by only a few users" | 1 |
| f21 | Workspace admins can restrict Gmail high-risk scopes and trust apps by client ID; unverified apps may be blocked. | https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data | "Gmail, Google Drive, Docs, and Chat can also restrict access to a predefined list of high-risk OAuth scopes." / "Users might be blocked from activating unverified apps that you don't trust." | 1 |
| f22 | Restricted submissions need a demo video and a scope justification; privacy policy must meet Limited Use. | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification | "Prepare a video that fully demonstrates how a user initiates and grants access to the requested scopes." / "The privacy policy must comply with the Google API Services User Data Policy and the Limited Use requirements for restricted scopes." | 1 |
| f23 | Refresh tokens with Gmail scopes are invalidated by a password change; also 100 per account per client, and 6 months unused. | https://developers.google.com/identity/protocols/oauth2#expiration | "The user changed passwords and the refresh token contains Gmail scopes." / "There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID." | 1 |

## Timeline facts
Exact wording only. Do not convert.
- Restricted scope verification: "can potentially take several weeks to complete." (f9). Provider gives no fixed number for the whole restricted process.
- Sensitive scope verification: "typically takes 3-5 business days to complete." (f10)
- Brand verification: automated "typically takes a few minutes"; manual "usually takes 2-3 business days". (f12)
- CASA assessment itself: "2-3 weeks for tier-2 applications and 4-6 weeks for tier-3 applications." Source is the Google Health API page, not a Gmail page. (f11)
- Renewal cadence: "at least every 12 months after your assessor's Letter of Assessment (LOA) approval date." (f7)
- Review durations on Gmail-specific Google pages for the assessor queue itself: provider gives no duration.

## Scope sensitivity
| scope | sensitivity | source |
|---|---|---|
| `https://www.googleapis.com/auth/gmail.labels` | non-sensitive | https://developers.google.com/workspace/gmail/api/auth/scopes |
| `https://www.googleapis.com/auth/gmail.send` | sensitive | https://developers.google.com/workspace/gmail/api/auth/scopes |
| `https://www.googleapis.com/auth/gmail.addons.current.message.metadata` / `.readonly` | sensitive | same |
| `https://www.googleapis.com/auth/gmail.addons.current.action.compose` / `.message.action` | non-sensitive | same |
| `https://www.googleapis.com/auth/gmail.readonly` | restricted | same |
| `https://www.googleapis.com/auth/gmail.compose` | restricted | same |
| `https://www.googleapis.com/auth/gmail.modify` | restricted | same |
| `https://www.googleapis.com/auth/gmail.metadata` | restricted | same |
| `https://www.googleapis.com/auth/gmail.insert` | restricted | same |
| `https://www.googleapis.com/auth/gmail.settings.basic` | restricted | same |
| `https://www.googleapis.com/auth/gmail.settings.sharing` | restricted (admin use only, service account with domain-wide delegation) | same |
| `https://mail.google.com/` | restricted | same |

## Gotchas & blockers seen in the wild
| symptom / error text | cause | fix | source |
|---|---|---|---|
| "unverified app" / "This app isn't verified" screen | Request includes sensitive/restricted scopes that haven't been approved | Complete verification; during development continue via Advanced > proceed (unsafe); capped at 100 new users lifetime | https://support.google.com/cloud/answer/15549945 ; https://developers.google.com/workspace/calendar/api/troubleshoot-authentication-authorization (generic OAuth text) |
| Refresh token stops working after ~7 days (`invalid_grant`, "the token may have expired or has been invalidated") | Project is External + Testing | Publish to production (and verify) or have test users reauthorize weekly | https://developers.google.com/identity/protocols/oauth2#expiration ; https://developers.google.com/identity/protocols/oauth2/web-server |
| `admin_policy_enforced`: "The Google Account is unable to authorize one or more scopes requested due to the policies of their Google Workspace" | Workspace admin restricts high-risk Gmail scopes or non-trusted apps | Ask admin to trust the client ID / allow the scope | https://developers.google.com/identity/protocols/oauth2/web-server ; https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data |
| 403 `domainPolicy`: "The domain administrators have disabled Gmail apps." | User's domain policy blocks the app | User asks their domain admin for access | https://developers.google.com/workspace/gmail/api/guides/handle-errors |
| 401 `authError` "Invalid Credentials" | Access token expired/invalid, or scopes not authorized | Refresh token; if that fails rerun OAuth flow | https://developers.google.com/workspace/gmail/api/guides/handle-errors |
| 403 `rateLimitExceeded` / `userRateLimitExceeded`, 429 | Project or per-user limits | Exponential backoff; per-user limits cannot be raised | https://developers.google.com/workspace/gmail/api/guides/handle-errors |
| Gmail refresh token dies after password change | "The user changed passwords and the refresh token contains Gmail scopes." | Re-run consent | https://developers.google.com/identity/protocols/oauth2#expiration |
| `disallowed_useragent` | Consent shown in embedded webview | Use system browser | https://developers.google.com/identity/protocols/oauth2/web-server |

## Could not verify
- Whether CASA tier naming is "tier-2/tier-3" or "AL1/AL2": Google Health page says tier-2/tier-3, support.google.com/cloud/answer/13465431 says "AL1 or AL2" (via fetch summary). Conflicting naming; not resolved.
- Cost figure is from a Google Health API page, not a Gmail-specific page. Third-party sources give much higher figures ($15,000 to $75,000 on an Auth0 community post, rank 5, dated); not relied on.
- The 100-user cap applying to restricted Gmail scopes specifically: the help article is generic; Nylas (rank 5) says apps under 100 users skip verification.
- Total end-to-end calendar time for restricted verification + CASA: provider gives no duration beyond "several weeks".
- Whether Composio's shared (managed) OAuth client already passed CASA for Gmail: not checked in this task (see Composio docs / T01).
- Current list of authorized CASA assessors and their live prices: not fetched.
- Verbatim table cells were taken from fetch summaries of the pages; the fetch tool may have condensed surrounding text.
