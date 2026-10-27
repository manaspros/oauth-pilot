# Verification report: Linear

Audit date 2026-10-27. Guide: `guides/linear.json`. Evidence pack: `research/apps/linear.md`. Pages re-fetched with WebFetch where the pack was silent (rate-limiting, integration directory, manifests, agents).

## Claim table

| claim id | claim | agent said | pack says | outcome |
|---|---|---|---|---|
| tp1 | OAuth well-known metadata returns 200 | tested | code probe, not in pack | ✅ confirmed (probe record) |
| tp7 | Console URL HEAD 200 | tested | code probe | ✅ confirmed (probe record) |
| tc1 | Composio toolkit `linear` exists, OAUTH2 managed, 5 scopes | tested | code lookup (D-API-1 shape) | ✅ confirmed (lookup record) |
| c1 | Create OAuth2 app, configure redirect URLs | sourced | f1 | ✅ confirmed |
| c2 | Other-workspace agents go through the integration directory | inferred/low, verifier unsupported | not in pack | ✏️ corrected in guide: quote is on the agents page (verified by re-fetch); upgraded to sourced/medium. Original quote had markdown link syntax |
| c3 | No documented review gate (absence) | inferred | f3 + Could not verify | ❓ unverifiable, kept as inferred/low |
| c4 | Scopes read/write/issues:create | sourced | scope table | ✅ confirmed |
| c5 | actor=app cannot request admin | sourced | f8 | ✅ confirmed |
| c6 | actor=app install needs workspace admin | sourced | f9 says agent app with workspace scope; "could not verify" whether it holds for every actor=app install | ✏️ corrected in guide: narrowed to the agent workspace-scope install |
| c7 | OAuth app 5,000 req/hour | sourced | not in pack | ✅ confirmed (page re-fetched) |
| c8 | Access token 24h | sourced | f11 | ✅ confirmed |
| c9 | 10,000 complexity cap | sourced | not in pack | ✅ confirmed (page re-fetched) |
| c10 | Polling discouraged, set `first` | sourced | not in pack | ✅ confirmed (polling quote re-fetched; 50-default part per verifier) |
| c11 | Different-scope client-credentials token revokes app tokens | sourced | f12 area | ✅ confirmed (verifier supported; not re-fetched) |
| c12 | HTTP 429 plus Retry-After | sourced | not in pack | ✅ confirmed (Retry-After re-fetched; 429 sentence per verifier) |
| c13 | OAuth manifest distribution private/public | sourced | not in pack | ✅ confirmed (page re-fetched) |
| c14 | Dedicated workspace recommended | sourced | f2 | ✅ confirmed |
| c15 | Directory generally rejects scripts/hobbyist apps | sourced | not in pack | ✏️ corrected in guide: quote trimmed to the portion verified verbatim |
| c16 | client_credentials error text | sourced | gotchas table | ✅ confirmed |
| c17 | Rate limits raised for workspace OAuth apps with actor auth | sourced/medium | not in pack | ✅ confirmed (page re-fetched; the page ties the increase to paid-user count, not stated in the guide) |

Non-claim prose fixes: s1 said "default user-mode OAuth needs no admin rights". Neither the pack nor the page says non-admins can create apps or authorise (pack "Could not verify"), so it was reworded to what f5 supports. k1 title narrowed to match c6. One open question added (non-admin app creation).

## Tier

Guide tier 0 (Instant, `use_managed`) is kept. The rubric says tier 0 when `composio.recommendation = use_managed` with no review for the use case. Evidence: tc1 (tested) shows a managed OAUTH2 toolkit exists, and f1/f3 show app creation is self-serve with no documented review. No provider step, admin requirement or gate exists, so tiers 4 to 1 cannot match. The hand-built fixture `packages/core/fixtures/linear.json` is tier 1 because it recommends `managed_then_own` ("register your own app before production for branding"). That is a product judgement, not an evidence finding: with `managed_then_own` the rubric's rule 1 yields tier 1. The agent's `use_managed` is consistent with the rubric. The weak point is the claim that the managed app suffices for production, which rests on c3 (absence of evidence) and open questions about Composio's managed app limits. Verdict confidence stays medium. If the team wants branding on the consent screen, `managed_then_own` is the better recommendation, which would make it tier 1. The fixture was not edited.

## Footer

**Counts (claims)**

| | tested | sourced | inferred | total |
|---|---|---|---|---|
| Before audit | 3 | 15 | 2 | 20 |
| After audit | 3 | 16 | 1 | 20 |

Outcomes: 16 confirmed (incl. 3 probe/lookup records), 3 corrected (c2, c6, c15), 1 unverifiable (c3), 0 removed.

**Verifier `unsupported` diagnosis (1 total)**: (a) fetch artifact 1 (c2: the cited quote contains markdown link syntax `[submit](url)`, which a plain-text match cannot find; the sentence is on the page), (b) bad quote 0, (c) wrong claim 0.

**Systematic agent errors**
- Quotes copied from a markdown-rendered fetch keep link/emphasis syntax (`[text](url)`, `*...*`), which the verifier's plain-text match misses. Fix idea: strip markdown syntax from quotes before comparing (and in the draft prompt: "quote visible text only").
- A claim that the page states for one case (agent install with workspace scope) was generalised to all `actor=app` installs (c6).
- Prose "no admin rights needed" asserted beyond the evidence (s1).
- Honest handling of absence: c3 correctly labelled inferred/low. Good.
- Most Linear claims (c7, c9, c10, c12, c13, c15, c17) were beyond the pack and still checked out against the pages.

**Setup attempts**: none in this task.
