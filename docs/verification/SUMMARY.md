# Verification summary: library guides vs evidence packs

Date: 2026-10-27. The agent generated five library guides live (`guide "<app>" --kind library`, model `claude-sonnet-5-5`). Fresh-context Sonnet auditors then checked every claim against the hand-built evidence packs in `research/apps/*.md`, and re-fetched cited pages where needed. Per-app reports: [gmail](gmail.md), [google-calendar](google-calendar.md), [linear](linear.md), [salesforce](salesforce.md), [shopify](shopify.md).

## Before and after the audit

| App | Tier (agent → audited) | Claims before (tested / sourced / inferred) | Claims after | Verifier "unsupported" before → after |
|---|---|---|---|---|
| Linear | 0 → 0 | 20 (3 / 15 / 2) | 20 (3 / 16 / 1) | 1 → 0 |
| Google Calendar | 2 → 2 | 26 (2 / 22 / 2) | 27 (2 / 22 / 3) | 1 → 0 |
| Gmail | 3 → 3 | 22 (2 / 8 / 12) | 22 (2 / 18 / 2) | 10 → 0 |
| Salesforce | **1 → 2** | 19 (2 / 9 / 8) | 21 (2 / 9 / 10) | 7 → 7 (pages unreadable, kept inferred/low) |
| Shopify | 3 → 3 | 26 (2 / 12 / 12) | 28 (2 / 21 / 5) | 9 → 0 |
| **Total** | 1 tier changed | **113 (11 / 66 / 36)** | **118 (11 / 86 / 21)** | **28 → 7** |

No claim was found to be factually wrong and removed. `tested` claims (11) come only from probes and Composio API calls the agent actually ran; the audit added none. Gmail computes to tier 3 as planned: `gmail.readonly` is a restricted scope, and CASA is a provider wait on the critical path.

## Top lessons

1. **The verifier's misses were fetch failures, not bad research.** Of the 28 `unsupported` verdicts, 20 were confirmed fetch artifacts (the quote is on the page). 7 are probable artifacts: help.salesforce.com serves a JS shell, so nobody could confirm them. 1 was a merged quote attached to a true claim. Each miss demoted a true claim to `inferred/low`. Causes: JS-rendered pages, long pages truncated (one Shopify page is 138k chars), and markdown link syntax inside quotes. Fix: the verify node now falls back to the `web_fetch` server tool, and a page it can't read is `not_checked`, not `unsupported` (D-AGENT-4). The fallback matches only the tool's own document text, never the model's prose. A live re-check of 5 of the 7 unconfirmed Salesforce claims with the fixed verifier gave 3 supported, 1 partially supported, 1 unsupported (c2, whose quote doesn't match the page wording). The guide keeps the audited inferred/low values until it is regenerated.
2. **The agent missed an admin actor.** Salesforce's org-admin approval step was absent, so the computed tier was 1. With the admin requirement, the rubric gives tier 2. Fix: a draft prompt rule that admin approval becomes an `admin` requirement and step.
3. **Small overclaims, not fabrications.** The agent asserted a Shopify Partner account and "no admin rights needed" without support. It added "only" or "exactly", merged list items into one quote, and counted two third-party blogs as `sourced`. All of these were fixed in the guides and turned into draft prompt rules.
4. **Conflicts must stay visible.** Salesforce's two official pages disagree on security-review fees ($2,700 + $150/yr vs $999/attempt) and duration (4–6 vs 4–5 weeks). The audited guide shows both values.
5. **Tiers resting on estimates are flagged.** Shopify's tier 3 comes from an estimated 1–3-week review (`basis: estimate`); without it the rubric gives 2. Linear's tier 0 assumes the managed app is enough for production. The hand-built fixture chose tier 1 (`managed_then_own`) as a product judgement. Both are consistent with the rubric.

## What we could not verify

- Salesforce: 7 claims citing help.salesforce.com, the exact admin permission name, and the Spring '26 block on new connected apps (rank-3 source only, kept inferred/low).
- Gmail: CASA cost and duration figures come only from a Google Health API page. The CASA tier naming conflict (tier-2/3 vs AL1/AL2) is unresolved.
- Shopify: whether a Partner account is required for custom distribution.
- Auditor re-fetches used WebFetch, which returns a model-extracted view of the page. Quotes upgraded to `sourced` in the audit are near-verbatim, not byte-verified.

## Setup attempts

None in this task. Real setup attempts are recorded in `setup-attempts.md` (T22).
