# Google Calendar guide verification (audit 2026-10-27, T21)

Inputs: `guides/google-calendar.json`, `research/apps/google-calendar.md` (T05 pack). Items not in the pack (c11-c24 partly) were checked against the verifier verdict, and the not_checked and unsupported ones against live pages with WebFetch on 2026-10-27. Nothing here is "tested" beyond tp7 and tc1.

| claim id | claim | agent said | pack / page says | outcome |
|---|---|---|---|---|
| tp7 | Console URL HEAD gives 302 | tested | code-made probe | ✅ confirmed (as recorded) |
| tc1 | Composio toolkit "googlecalendar", OAUTH2 managed | tested | code-made lookup | ✅ confirmed (as recorded) |
| c1 | Reading Calendar events is a sensitive-scope example | sourced | pack f3 | ✅ confirmed |
| c2 | Sensitive verification typically 3-5 business days | sourced | pack f5 | ✅ confirmed |
| c3 | Help page: verification might take several months | sourced | verifier supported (page 7454865; not in pack) | ✅ confirmed |
| c4 | Branding published before data-access verification | sourced | pack f6 (same sentence on sensitive-scope page) | ✅ confirmed |
| c5 | Video showing grant and scope use | sourced | pack f6 | ✅ confirmed |
| c6 | Authorized domains verified in Search Console | sourced | pack f6 | ✅ confirmed |
| c7 | Homepage describes app, links ToS and privacy policy | sourced | verifier supported | ✅ confirmed |
| c8 | Security assessment only for restricted data, so sensitive-only app needs none | sourced (partial) | pack f7: only the rule is Google-sourced; Calendar not-restricted is inferred | ✏️ corrected: text split into sourced rule plus inference; evidence now inferred/low |
| c9 | Testing: up to 100 test users | sourced | pack f10 | ✅ confirmed |
| c10 | Unverified user cap is lifetime, not resettable | sourced | pack f9 | ✅ confirmed |
| c11 | Clients created under Google Auth platform > Clients | sourced | verifier supported | ✅ confirmed |
| c12 | Web app client: Create Client then Web application | inferred/low (unsupported) | Page lists the two as separate numbered steps; guide quote merged them | ✏️ corrected: quote fixed ("Click Create Client. ... Select the Web application application type."), upgraded to sourced/high |
| c13 | "AI-powered agent" option on client creation | sourced | verifier supported; not in pack | ✅ confirmed |
| c14 | Redirect URIs HTTPS except localhost | sourced | verifier supported | ✅ confirmed |
| c15 | Get approval for new scopes before code changes | sourced | verifier supported | ✅ confirmed |
| c16 | Workspace admins can restrict scopes to trusted client IDs | sourced | pack f15 and verifier supported | ✅ confirmed |
| c17 | Adding redirect URLs or changing product name forces re-verification | sourced | verifier supported | ✅ confirmed |
| c18 | redirect_uri_mismatch condition | sourced | verifier supported | ✅ confirmed |
| c19 | rateLimitExceeded 403 or 429, exponential backoff | sourced (verifier not_checked) | WebFetch: both fragments on page | ✅ confirmed, verifier set to supported |
| c20 | Quotas per minute, sliding window | sourced (not_checked) | WebFetch: exact; page also says overage charges planned "later in 2026" | ✅ confirmed |
| c21 | calendar.events.owned exists | sourced (not_checked) | pack f16; WebFetch: row matches | ✅ confirmed |
| c22 | calendar.events.readonly is the read-only variant | sourced (not_checked) | pack f17; row matches | ✅ confirmed |
| c23 | Composio managed app suited to prototyping; verification unknown | inferred/low | pack: not checked | ❓ unverifiable, kept as inferred/low |
| c24 | org_internal for users outside the org | sourced | verifier supported; pack gotchas | ✅ confirmed |
| c25 (new) | calendar.events is sensitive, not restricted | missing (scope listed "sensitive" with c1/c22/c21 only) | pack: no Google per-scope label; inference from f3 and Nylas (rank 5) | ❓ added as inferred/low, linked to the scope, so the tier rests on a visible inference |

Other items: scope `calendar.calendars.readonly` (sensitivity unknown, cites tc1) is unverifiable, already in openQuestions. Stale openQuestions from the false unsupported and not_checked verdicts (5 entries) were removed.

## Tier check
`computeTier` returns 2. Reason: scope `calendar.events` is sensitive (inferred, c25; Google lists reading events as sensitive, c1), and steps s8 and s9 are provider steps below 168 hours (s9 max 120 h). No restricted scope appears in the pack, so tier 3 is not triggered. The tier is correct if `calendar.events` is sensitive and not restricted; that rests on rank-5 evidence plus the c1 example, which is why it is an open question to confirm in the Cloud Console scope picker. `validate:guides` passes.

## Footer

Claims by evidence: before 26 = 2 tested / 22 sourced / 2 inferred. After 27 = 2 tested / 22 sourced / 3 inferred (+c25, c8 downgraded, c12 upgraded).
Outcomes: before-audit 26 claims: 23 confirmed, 2 corrected (c8, c12), 1 unverifiable (c23), 0 removed. Plus 1 new inferred claim (c25), so after 27 claims: 23 confirmed, 2 corrected, 2 unverifiable, 0 removed.

**Systematic agent errors**
- Fetch-artifact `unsupported`: 0 of 1. The single unsupported (c12) was a bad quote: the model joined two separate list items into one sentence (type b, claim itself correct).
- `not_checked` verdicts on c19-c22: the verifier could not fetch or judge those pages although all four quotes are on them (4 fetch/verifier failures, not counted as unsupported). Their claim confidence stayed "sourced", which was right.
- Overclaiming by adding "only" and an exemption the page does not state (c8).
- Scope sensitivity asserted as a field without a claim stating it (calendar.events), tier hinges on it.

**Setup attempts**: none in this task.
