# Salesforce evidence pack  (researched 2026-10-27 by sonnet worker T07)

Access note: help.salesforce.com articles returned only a JS error shell ("Sorry to interrupt / CSS Error"), and most developer.salesforce.com docs returned HTTP 403 to WebFetch. Rank-1 facts below therefore come from the pages that did load (partners.salesforce.com, trailhead.salesforce.com, developer.salesforce.com blog/doc pages as noted). Quotes are as returned by the fetch tool; WebFetch summarises pages through a small model, so a re-check against the live page is advised before publishing any quote as sourced-verbatim. Nothing here was tested; docs-only.

## Facts
| id | fact | source url | verbatim quote (≤400 chars) | rank |
|----|------|-----------|-----------------------------|------|
| f1 | External Client Apps (ECAs) are positioned as the successor to Connected Apps | https://trailhead.salesforce.com/content/learn/modules/external-client-app-basics/use-external-client-apps-when-connected-apps-wont-do | "External Client Apps pick up where Connected Apps left off." | 1 |
| f2 | Connected apps are global by default; ECAs are local and secure by default | same as f1 | "While connected apps are globally available by default, external client apps are secure and local by default." | 1 |
| f3 | ECAs are designed for secure sharing; connected apps lacked usage control | same as f1 | "there was no good way to control how they were used." / external client apps "are designed to be shared securely." | 1 |
| f4 | Role split: developer owns Settings tab, org admin owns Policies tab | same as f1 | "Admins control configurations on the Policies tab," | 1 |
| f5 | ECA distribution mode is Local (one org) or Packaged (2GP managed package) | same as f1 | External client apps can be set to Local, which limits them to their own org, or Packaged, which allows them to be added to a second-generation managed package for distribution. (fetch-tool paraphrase of unit text; not a clean verbatim) | 1 |
| f6 | The org admin's first task, if not the developer, is to download or deploy the packaged ECA; policies are then created in that org | https://trailhead.salesforce.com/content/learn/modules/external-client-app-basics/separate-developers-from-admins | "to download or deploy the packaged external client app." | 1 |
| f7 | The admin gets admin permission on the ECA to edit its policies | same as f6 | "gets admin permission for the external client app, so he can make edits to the policies." | 1 |
| f8 | OAuth plugin fields are split across Settings and Policies tabs | same as f6 | "Each OAuth plugin has some fields that show on the Settings tab and others that show up on the Policies tab." | 1 |
| f9 | 2GP managed packages are the ECA distribution vehicle | https://trailhead.salesforce.com/content/learn/modules/external-client-app-basics/package-and-distribute-external-client-apps | "the ability to distribute them with second-generation managed packages" | 1 |
| f10 | A subscriber org can share OAuth consumer credentials with the original ECA (credentials live outside the package) | same as f9 | "A subscriber org can share OAuth consumer credentials with the original external client app" | 1 |
| f11 | AppExchange security review applies to products before public listing | https://partners.salesforce.com/s/education/appinnovators/Security_Review?language=en | "The Salesforce security team conducts rigorous reviews of all products before publicly listing them on AppExchange." | 1 |
| f12 | Review fee on the partner education page: $2,700 per paid app, none for free apps; $150 annual listing fee | same as f11 | "The initial Security Review fee is $2,700 USD for each paid app submitted (no fee for free apps)." / "The annual listing fee of $150 USD" | 1 |
| f13 | A different Salesforce page quotes $999 per initial submission and per later attempt (CONFLICTS with f12) | https://trailhead.salesforce.com/content/learn/modules/isv_security_review/isv_security_review_submit | "we ask for a $999 fee payment for the initial submission" | 1 |
| f14 | Review is required before launching a managed package / Platform API solution; typically annual; Product Security can request one anytime | https://trailhead.salesforce.com/content/learn/modules/isv_security_review/isv_security_review_submit | "Typically, AgentExchange solutions are reviewed for security once a year." / "the Salesforce Product Security team can ask for your solution to be reviewed at any time" | 1 |
| f15 | New package versions generally do not need a full re-review | same as f14 | "You don’t have to go through a security review every time you release a new version of your solution." | 1 |
| f16 | Connected app creation disabled by default from Spring '26 via UI and API; existing apps keep working; temporary exception via Support (third-party doc, NOT rank 1; Salesforce's own release note was listed by search but could not be fetched) | https://striim.com/docs/en/salesforce-connected-apps-and-external-client-apps.html | "creation of new Connected Apps is disabled by default in all orgs, through both the UI and the API." / "Customers can request a temporary exception from Salesforce Support." | 3 (confidence medium) |
| f17 | ECAs do not support the username-password flow (third-party; same page as f16) | same as f16 | "External Client Apps do not support the username-password flow." | 3 (medium) |
| f18 | Composio: auth types OAUTH2 and S2S_OAUTH2; managed OAuth available; org admin must approve/install the app; max 5 active refresh tokens per user per connected app | https://docs.composio.dev/toolkits/salesforce | "Ask a Salesforce org admin to approve or install the connected app." / "Salesforce allows only five active refresh tokens per user per connected app." | 3 |

Rank-1 facts with fetched quotes: f1-f15 (15; f5 is a fetch-tool paraphrase, so effectively 14 clean).

## Timeline facts
- Security review (partners.salesforce.com page): "The review process takes about 4-6 weeks from when we receive a complete submission." (fetched 2026-10-27)
- Security review (Trailhead isv_security_review_submit): "A solution typically takes 4–5 weeks to get through the review process." (fetched 2026-10-27)
- Two Salesforce pages differ (4-6 vs 4-5 weeks) and also differ on fee. Treat as "roughly a month or more, estimate, varies". Search-result snippets (not fetched, unverified) of the 258.0 packaging guide mention 1-2 weeks completeness check + 3-4 weeks first test.
- Dev org signup/provisioning time: provider gives no duration on any page I could fetch.
- Connected-app creation restriction: "Spring '26" (per f16, third party). A single PTC source via search snippet claims connected apps end support in Winter '27; unverified, not used.

## Scope sensitivity
Salesforce has no Google-style sensitive/restricted tiers and no per-scope review. I could not fetch the official OAuth-scopes table (help article 403/shell), so values below are NOT verified from a quote. Tier should be driven by distribution model (f11-f15), not scope.
| scope | sensitivity | source |
|---|---|---|
| `api` (access/manage your data) | no provider sensitivity tier; permission is bounded by the user's profile/permission sets and the admin's ECA/connected-app policies | could not verify (official scope table not fetched) |
| `refresh_token` / `offline_access` | none; token lifetime governed by admin refresh-token policy and the 5-token cap (f18) | f18 (rank 3) |
| `full`, `web`, `id`, `openid` | none stated | could not verify |
| (all) | access gated by the "Admin approved users are pre-authorized" Permitted Users policy where set (search snippet, not fetched) | could not verify |

## Gotchas & blockers seen in the wild
| symptom / error text | cause | fix | source |
|---|---|---|---|
| Cannot create a new Connected App (UI/API) in a new org | Creation disabled by default from Spring '26 | Create an External Client App instead, or ask Salesforce Support for a temporary exception (to be removed) | f16 (rank 3); Salesforce release note listed but not fetched |
| `OAUTH_APPROVAL_ERROR_GENERIC` | App not yet approved/installed in the customer org by an admin | Ask an org admin to approve/install the app (matches f6/f7 admin-owned policies) | https://docs.composio.dev/toolkits/salesforce (rank 3) |
| `URL_NOT_RESET` | Using default `login` subdomain when the org requires its My Domain | Replace `login` with the org's My Domain subdomain | https://docs.composio.dev/toolkits/salesforce (rank 3) |
| Older connected accounts suddenly fail after a 6th connection | Only five active refresh tokens per user per connected app; the oldest is revoked | Reuse connections; limit authorizations per user | https://docs.composio.dev/toolkits/salesforce (rank 3) |
| Tokens invalidated unexpectedly | Password change, app revocation, refresh-token policy changed away from "valid until revoked", org session policies | Re-authorize; ask admin to set refresh policy to valid until revoked | https://docs.composio.dev/toolkits/salesforce (rank 3) |
| Username-password flow unavailable | ECAs don't support it (f17) | Use JWT bearer or client-credentials flow | striim.com (rank 3) |

## Could not verify
- Salesforce's own Spring '26 release note "Creation of New Connected Apps Is Disabled by Default" and support article 005228017: appeared in search, but help.salesforce.com returned only a JS error shell. The restriction is evidenced only by a third-party doc (f16). Exact support-exception wording and the end-of-exception date are unverified.
- Whether ECAs require a separate admin step per org beyond deploying the package; the Trailhead page "doesn't describe per-org approval". The exact permission name an admin needs (no "Manage External Client Apps" confirmed). Search snippets mention "Create, edit, and delete External Client Apps" and the "Admin approved users are pre-authorized" Permitted Users option; not fetched.
- Which fee is current ($999 per attempt vs $2,700 + $150/yr). The two Salesforce pages conflict; "no fee for free apps" appears in f12 only.
- Whether a private integration used only in a customer's own org (not listed on AppExchange/AgentExchange) needs security review. The fetched text says review is required to launch managed packages / before public listing; it does not state that an unlisted, locally created ECA needs none. Likely no, but marked inferred.
- Developer Edition signup: developer.salesforce.com/signup returned 403. Via search snippets only (not fetched, not quotable): form fields, MSA acceptance, "may end an org inactive for 45 days", help article "Developer Org Expiration" says 45 days. Fetch of that help article returned no body. Sign-up duration/provisioning time unverified.
- Official OAuth scope definitions and sensitivity (see scope table).
- A Winter '27 end-of-support date for connected apps (single search-snippet claim).
