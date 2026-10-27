# Verification report: Shopify

Audit date 2026-10-27. Guide: `guides/shopify.json`. Evidence pack: `research/apps/shopify.md`. Cited pages re-fetched with WebFetch.

## Claim table

| claim id | claim | agent said | pack says | outcome |
|---|---|---|---|---|
| tp1 | api.shopify.com well-known returns 200 | tested | code probe | ✅ confirmed (probe record; relevance to merchant install unclear, already an open question) |
| tc1 | Composio `shopify` toolkit exists, no managed auth | tested | code lookup | ✅ confirmed (lookup record) |
| c1 | Redirect URI registered in Dev Dashboard or shopify.app.toml `[auth]` | inferred, verifier unsupported | f8 (related) | ✏️ corrected in guide: page says it (re-fetched); sourced/medium. The page is 138k characters, so truncation is the likely artifact |
| c2 | New public apps must use expiring offline tokens | sourced | f10 | ✅ confirmed |
| c3 | Distribution method cannot be changed | inferred, unsupported | f4 | ✏️ corrected in guide: quote verbatim on cited page; sourced/high |
| c4 | read_orders covers 60 days; read_all_orders needs approval | sourced | f12, f13 | ✅ confirmed |
| c5 | read_all_orders does nothing alone | inferred, unsupported | not in pack | ✏️ corrected in guide: quote verbatim on access-scopes page; sourced/high |
| c6 | Merchants can edit scopes at consent | sourced | f9 | ✅ confirmed |
| c7 | Orders are protected customer data; request via Partner Dashboard | sourced, partial | f14 | ✏️ corrected in guide: text narrowed to "order data relating to a single customer"; quote from page's resource list |
| c8 | Approval only for minimum data | sourced | f18 area | ✅ confirmed (verifier supported) |
| c9 | Compliance webhooks, icon, contacts required for App Store apps | sourced | not in pack | ✅ confirmed (verifier supported; not re-fetched) |
| c10 | Submission runs mandatory fields and automated tests; no turnaround time | inferred, unsupported | "no duration" | ✏️ corrected in guide: quote trimmed to "mandatory fields and automated tests" (verified); no duration stated confirmed |
| c11 | Review status by email and Partner Dashboard | inferred, unsupported | timeline facts (same wording) | ✏️ corrected in guide: sourced/high |
| c12 | PCD cannot be requested while under review | inferred, unsupported | not in pack | ✏️ corrected in guide: quote verbatim on submit-app-for-review page; sourced/medium |
| c13 | Dev-store-only apps need no review for customer data | inferred, unsupported | f15 | ✏️ corrected in guide: quote verbatim; sourced/medium |
| c14 | Unapproved fields return null, HTTP 200 plus errors | sourced, partial | f16 says "redacted" | ✏️ corrected in guide: wording aligned to "redacted" (page example is the phone field) |
| c15 | GraphQL THROTTLED code | sourced | not in pack | ✅ confirmed (page re-fetched) |
| c16 | GraphQL limits per app+store pair by plan | inferred, unsupported | not in pack | ✏️ corrected in guide: quote verbatim on cited page; sourced/medium |
| c17 | New public apps GraphQL-only since April 2026 (blog) | sourced/low, third-party | not in pack | ❓ unverifiable: demoted to inferred/low; official docs unconfirmed |
| c18 | Review plus PCD takes about 1-3 weeks | inferred | "provider gives no duration" | ❓ unverifiable, kept as inferred/low (a labelled guess) |
| c19 | Need a Composio custom auth config | inferred | tc1 backs the "no managed" part | ❓ unverifiable beyond tc1, kept inferred/low |
| c20 | read_orders suffices; Composio metadata says write_orders | sourced (partial) | f11 | ✏️ corrected in guide: split. Scope part now sourced to f11's quote; Composio-metadata part moved to new inferred claim c25 |
| c21 | Review statuses Draft/Submitted/Reviewed/Published | sourced | not in pack | ✅ confirmed (verifier supported; not re-fetched) |
| c22 | Shopify may select app for data protection review | inferred, unsupported | f18 | ✏️ corrected in guide: quote verbatim on page; sourced/medium |
| c23 | REST over-limit returns 429 | sourced | not in pack | ✅ confirmed (verifier supported) |
| c24 | read_products is needed for product reads (Composio metadata) | inferred | access-scopes lists read_products; nothing on Composio metadata | ❓ unverifiable, kept inferred/low |
| c25 | Composio metadata lists write_orders as required (new) | n/a | n/a | ❓ new inferred/low claim split from c20 |
| c26 | Dev Dashboard needs app development permissions, no Partner account named (new) | n/a | f6 | ✅ added from pack, replaces the unsupported assertion |

Non-claim fixes: q1 and s1 said "Shopify Partner account" with only c1 (a redirect-URI claim) attached. The pack lists Partner account as unconfirmed (Could not verify). q1/s1 now say "account with app development permissions", cite c26, and an open question was added. Partner Dashboard remains required for PCD requests and App Store review (f14).

## Tier

Final tier 3 (Heavy review), unchanged and computed by the validator. Protected customer data approval does not itself put Shopify at tier 3. The rubric's tier 3 triggers are a provider step of at least 168 hours or a `restricted` scope. The guide has no `restricted` scope (read_orders is `sensitive`), and PCD is a developer-filed request (requirement q3, owner developer, no `gate`). Tier 3 comes from step s7 (actor provider, maxHours 504) in the App Store review path, which f3 confirms is required for public distribution. The pack says the provider publishes no duration, so the "1-3 weeks" is a labelled guess (c18, `basis: estimate`, confidence low). If the maximum were under a week, the rubric would give tier 2 (provider step plus sensitive scope). The tier is kept because the guide is honest about the guess and review of a public app reading customer order data is widely reported as taking weeks, but it should be read as "tier 3 on an estimate". The verdict confidence is already low. A custom-distribution single-store app (f1, no review) would land at tier 1 or 2, which is an open question in the guide.

## Footer

**Counts (claims)**

| | tested | sourced | inferred | total |
|---|---|---|---|---|
| Before audit | 2 | 12 | 12 | 26 |
| After audit | 2 | 21 | 5 | 28 |

Outcomes (26 original claims): 10 confirmed (tp1, tc1, c2, c4, c6, c8, c9, c15, c21, c23), 12 corrected (c1, c3, c5, c7, c10, c11, c12, c13, c14, c16, c20, c22), 4 unverifiable (c17, c18, c19, c24), 0 removed. Added 2 claims: c25 (inferred, split from c20) and c26 (sourced, from pack f6).

**Verifier `unsupported` diagnosis (9 total)**: (a) fetch artifact 9 (c1, c3, c5, c10, c11, c12, c13, c16, c22: every cited quote exists on the cited page, verified by re-fetch; c10's quote was a longer sentence of which only "mandatory fields and automated tests" was confirmed), (b) bad quote 0, (c) wrong claim 0. The corrections were not about the claims being wrong; the claims were all true.

**Systematic agent errors**
- The pipeline demotes a claim to `inferred`/low when the plain-fetch verifier misses the quote, so correct sourced claims lose their evidence level (9 of 12 inferred claims here). This is the D-AGENT-3 risk realised: shopify.dev pages are large (the authorization-code-grant page is 138k characters) or JS-rendered. Proposed fix: add the web_fetch fallback D-AGENT-3 anticipated, and fetch with an offset for long pages; only then mark `unsupported`.
- Mixed claims: c20 combined a sourced fact with an inference about Composio metadata and was labelled `sourced` with a prefix "Inferred:". Proposed prompt rule: one fact per claim; never put "Inferred:" text in a sourced claim.
- Over-assertion of Partner account as a requirement without a source (q1, s1).
- A single third-party blog was recorded as `sourced` (c17). It was labelled honestly but the evidence level should be `inferred` unless the source is the provider.
- The pipeline appends "Unverified: ..." lines to `openQuestions` for each `unsupported` claim. These become stale after an audit; removed here.
- Not independently re-fetched: c8, c9, c21, c23 (relied on the verifier's supported verdict).

**Setup attempts**: none in this task.
