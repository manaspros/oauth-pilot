# Salesforce guide verification (audit 2026-10-27)

Ground truth: `research/apps/salesforce.md` (T07). Most help.salesforce.com pages are JS shells and developer.salesforce.com returns 403 to plain fetch; re-fetch attempts in this audit (packaging guide: 403; help OAuth-settings article: "CSS Error" shell) confirmed that. No page was worked around.

| claim id | claim | agent said | pack says | outcome |
|---|---|---|---|---|
| tp1 | well-known metadata probe HTTP 200 | tested | code-made probe, not in pack | ✅ confirmed (code probe, kept) |
| tc1 | Composio toolkit exists, managed OAUTH2 | tested | f18 consistent (OAUTH2 + S2S_OAUTH2 listed) | ✅ confirmed |
| c1 | New clients via Setup > App Manager > New External Client App | sourced | f1 (ECA successor) consistent; dev doc not in pack, verifier supported | ✅ confirmed |
| c2 | Enable OAuth then callback URL | inferred/low, verifier unsupported | not in pack; help page shell | ❓ unverifiable, kept inferred/low (fetch artifact) |
| c3 | New Connected Apps blocked at Spring '26; Support can't re-enable later | inferred/low, unsupported | f16: only rank-3 (Striim), medium; Salesforce release note unfetched; "no future exception" not in pack | ❓ unverifiable, kept inferred/low; added the Striim quote as second source. Wording in s2/risk1 softened to "reportedly" |
| c4 | Scopes selected on the ECA, granted as tokens | inferred/low, unsupported | not in pack | ❓ unverifiable, kept inferred/low (fetch artifact) |
| c5 | Mobile SDK: refresh_token, web, api sufficient; Composio lists api as required | sourced, partially_supported | Composio sentence not in pack (f18 gives no scope list); scope table says official scopes unverified | ✏️ corrected in guide (dropped Composio sentence; Mobile SDK quote kept) |
| c6 | Security review guidance: least privilege, no device/implicit/username-password | inferred/low, unsupported | not in pack; f17 (rank 3) says ECAs lack username-password | ❓ unverifiable, kept inferred/low (fetch artifact) |
| c7 | Enforce Refresh Token IP Allowlist restricts IPs | inferred/low, unsupported | not in pack | ❓ unverifiable, kept inferred/low (fetch artifact) |
| c8 | Expired/revoked refresh token gives invalid_grant | inferred/low, unsupported | pack gotcha "tokens invalidated" (rank 3) consistent, no error string | ❓ unverifiable, kept inferred/low (fetch artifact) |
| c9 | Third-party (Clientell): idle refresh tokens expire from 4 Nov 2026 | sourced/medium | not in pack; rank-3 third-party blog | ✏️ corrected in guide (downgraded to inferred/low; source kept) |
| c10 | API limits aggregate per org, not per user | sourced/high | not in pack; verifier supported | ✅ confirmed (verifier) |
| c11 | Enterprise starts at 100,000 requests/24h | sourced/high | not in pack; verifier supported | ✅ confirmed (verifier) |
| c12 | Fewer than 25 long-running requests in production | sourced/high | not in pack; verifier supported | ✅ confirmed (verifier) |
| c13 | Managed package / Platform API solutions must pass security review | sourced/high | f11, f14 consistent | ✅ confirmed |
| c14 | Review time frames: 1-2 + 3-4 + 2-3 weeks | sourced/high | Two Salesforce pages: 4-6 weeks (partners) vs 4-5 weeks (Trailhead) | ✏️ corrected in guide (conflict stated, both quotes added, confidence medium) |
| c15 | Local ECAs not copied to sandbox | inferred/low, unsupported | not in pack; help page shell | ❓ unverifiable, kept inferred/low (fetch artifact) |
| c16 | redirect_uri_mismatch from PTC page | sourced/medium, not_checked | not in pack; source never judged | ✏️ corrected in guide (downgraded sourced to inferred/low; kept source) |
| c17 | No provider review for own ECA; admin policies might add steps | inferred/low | "Likely no, marked inferred" | ✅ confirmed (stays inferred/low) |
| (missing) | Security review fee | absent | f12 $2,700 + $150/yr vs f13 $999 conflict | ✏️ added c18, presented as conflict; risk5 cites both fee and duration conflicts |
| (missing) | Org admin must approve/install; 5-refresh-token cap | absent | f6, f7, f18 | ✏️ added c19 (sourced, rank 3 for Composio), req4 (owner admin), step s7 (actor admin), risk8 |

Other notes
- Callback URL `https://backend.composio.dev/api/v1/auth-apps/add` is not in the pack; it is cited via c2/c16 (neither supports the specific URL). Left unchanged as a Composio constant; flagged, not verified here.
- No claim was removed. Scopes `full`/`web` "skip" advice rests on c5/c6 (least privilege); sensitivity values are the agent's own labels, since Salesforce has no sensitivity tiers (pack scope note).
- Spring '26 block: kept inferred/low (a rank-3 source only), never raised above low.

## Tier decision
Before: tier 1 (Self-serve). After: **tier 2 (Light review)**. Rubric: "any requirement with `owner=admin`" gives tier 2. The customer org's admin must approve or install the app and own its policies (pack f4, f6, f7, f18), and the original guide had no admin requirement, so it computed tier 1 wrongly. There is no provider step, no `gate`, and no provider review for own-org use, so tier 3/4 do not apply. `verdict.tier`/`tierLabel`, headline, startToday and `timeToProduction` (now 1.5h to ~28h, estimate, admin wait unbounded by provider) were updated.

## Footer
**Claims by evidence**
- Before (17): tested 2, sourced 9, inferred 8.
- After (21): tested 2, sourced 9, inferred 10.

**Outcomes** (21 claims after audit, including 2 added): confirmed 8 (tp1, tc1, c1, c10, c11, c12, c13, c17), corrected 6 (c5, c9, c14, c16, plus added c18, c19), unverifiable 7 (c2, c3, c4, c6, c7, c8, c15), removed 0.

**Verifier `unsupported` diagnosis (7 total: c2, c3, c4, c6, c7, c8, c15)**: (a) fetch artifact 7, (b) bad/paraphrased quote 0, (c) wrong claim 0. Caveat: every one cites a help.salesforce.com article, which returns only a JS error shell to plain fetch, and re-fetch confirmed the shell; the quotes read like genuine help text but this audit could not confirm them, so they are "probably artifact", kept inferred/low. The one verifier `not_checked` (c16) is a fetch failure too.

**Systematic agent errors**
1. Fetch artifacts: 7 of 17 claims (41%) were marked unsupported only because help.salesforce.com is JS-rendered. D-AGENT-3's fallback (web_fetch / rendered fetch for help.salesforce.com) is warranted.
2. Generated the tier from claims it had, missing the admin-approval requirement the pack documents (f4/f6/f7/f18), which inflated confidence in tier 1.
3. Cost of the review omitted, and the duration given as one set of figures; the pack's two-source conflict (fee and 4-6 vs 4-5 weeks) was not surfaced.
4. Added a Composio fact ("api is the required scope") to a Mobile SDK-sourced claim that the source does not state.
5. A `sourced` claim whose source was never judged (c16) was kept sourced.

**Setup attempts**: none in this task.
