# Verifier re-run: fixed verify node on the original (pre-audit) guides

Date: 2026-10-28. Question: how much does the D-AGENT-4 fix (web_fetch fallback, "unavailable is not absent", markdown-link normalization) change verdicts on the guides the agent originally generated, before any human audit?

## Method

- Inputs: `git show c4fb064:guides/<slug>.json` for linear, google-calendar, gmail, salesforce, shopify (original agent output, original verifier verdicts and the original, unaudited quotes).
- A throwaway script (outside the repo) loads each guide, resets claim state, and calls the CURRENT `makeVerify()` node from `packages/agent/src/nodes/verify.ts` live (real fetches, real LLM via the proxy, real `web_fetch_20250910` fallback). Nothing was written to `guides/`.
- **Reconstruction caveat.** The original pre-verify state is not stored, only the post-verify file. For every non-`tested` claim: the `verifier` field was deleted; claims whose original verdict was `unsupported`, `partially_supported` or `not_checked` were set back to `evidence: sourced`, `confidence: medium` (the original confidence before demotion is unknown; the verifier only ever caps confidence, so this is a neutral choice). Claims the original verifier had `contradicted` and removed or rewrote cannot be restored (none are known from the audit: 0 wrong claims). `tested` claims are skipped by the verifier and excluded from all counts below.
- The whole experiment was run twice (run 1 and run 2) because the verifier is an LLM and the web_fetch tool is non-deterministic. Both are reported. Run 2 also captured the verifier's own log lines (fallback counts); run 1 did not (emit hook missing), so fallback counts exist for run 2 only.
- Counts are over non-tested claims. "Before" is the verdict in the original file.

## Per-app verdict counts

Format: supported / partially / unsupported / not_checked.

| App | Non-tested claims | BEFORE (original) | AFTER run 1 | AFTER run 2 | Runtime run 1 / run 2 | web_fetch fallbacks (run 2) |
|---|---|---|---|---|---|---|
| Linear | 17 | 15 / 0 / 1 / 1 | 15 / 0 / 1 / 1 | 15 / 0 / 1 / 1 | 10.6 s / 8.7 s | 1/6 |
| Google Calendar | 24 | 17 / 1 / 1 / 5 | 19 / 4 / 0 / 1 | 17 / 3 / 0 / 4 | 18.5 s / 14.9 s | 6/6 |
| Gmail | 20 | 5 / 3 / 10 / 2 | 12 / 3 / 3 / 2 | 16 / 2 / 0 / 2 | 11.2 s / 9.4 s | 0/6 |
| Salesforce | 17 | 7 / 1 / 7 / 2 | 12 / 1 / 1 / 3 | 11 / 2 / 1 / 3 | 19.4 s / 17.2 s | 6/6 |
| Shopify | 24 | 9 / 3 / 9 / 3 | 17 / 1 / 3 / 3 | 14 / 3 / 3 / 4 | 21.9 s / 19.3 s | 6/6 |
| **Total** | 102 | 53 / 8 / 28 / 13 | 75 / 9 / 8 / 10 | 73 / 10 / 5 / 14 | 81.6 s / 69.5 s | 19 |

`unsupported`: 28 before, 8 after in run 1, 5 after in run 2.

## Cross-check against the audit

The audit's diagnosis of the 28 original `unsupported` verdicts: 20 confirmed fetch artifacts (linear 1, gmail 10, shopify 9), 7 probable artifacts (all Salesforce, help.salesforce.com JS shell), 1 merged quote (google-calendar c12). 0 wrong claims. Numbers below count an original `unsupported` that no longer comes back `unsupported`.

| Group | Original unsupported | Cleared in run 1 | Cleared in run 2 | Still unsupported (both runs) |
|---|---|---|---|---|
| Confirmed artifacts, Linear (c2) | 1 | 1 (supported) | 1 (supported) | none |
| Confirmed artifacts, Gmail | 10 | 7 (6 supported, c4 partial) | 10 (9 supported, c4 partial) | run 1 only: c11, c15, c16 |
| Confirmed artifacts, Shopify | 9 | 6 supported | 6 supported | c13, c16, c22 |
| **Confirmed artifacts total** | **20** | **14 (70%)** | **17 (85%)** | 3 (Shopify) |
| Merged quote, Google Calendar c12 | 1 | 1 (supported) | 1 (supported) | none |
| Probable artifacts, Salesforce (c2, c3, c4, c6, c7, c8, c15) | 7 | 5 supported, c15 not_checked | 4 supported, c8 partial, c15 not_checked | c2 |

Observations:

- **Gmail** went from 10 false demotions to 3 (run 1) or 0 (run 2). In run 2 no fallback was needed (0/6): the markdown-link normalization and the "unavailable is not absent" rule were enough. In run 1 the 3 that stayed unsupported are the run-to-run flakiness; with the same code they came back supported next time.
- **Shopify** is the weak spot: c13, c16 and c22 stay `unsupported` in both runs with note "cited quote not found on the fetched page", although the audit re-fetched each and found the quote verbatim (c13 and c22 on protected-customer-data, c16 on rate-limits). Page really read but quote not matched, so the fix did not cover this. The raw protected-customer-data HTML is about 520 KB. Likely causes (not investigated further): the quote lies beyond the node's 400,000-character text cap or the web_fetch document is truncated, and in run 2 the 6-fallback budget was fully spent. This is a remaining bug class: long pages produce false `unsupported`.
- **Salesforce**: help.salesforce.com pages came back readable through web_fetch for 5 of 7 claims (c3, c4, c6, c7 supported in both runs; c8 supported or partial). That upgrades the audit's "probable artifact" to "very likely artifact" for those five, with the usual caveat that the verifier's supported verdict is an LLM judgement on the fetched text, not an independent proof. c15 became `not_checked` (page unreadable, evidence kept) which is the intended behavior. c2 stays `unsupported` in both runs; the earlier ad-hoc check recorded in SUMMARY.md (quote does not match the page wording) agrees, so c2 is probably a real quote problem, not an artifact. Only 6 of 10 cited Salesforce pages were fetched directly (6/6 fallbacks used).
- **Google Calendar c12** (merged quote): now `supported`. The verifier judges the claim "Create Client, then Web application" supported from the page text; the audit's complaint was that the quote itself merged two list items. Segment-splitting on "..." does not apply here, so the fix passes the claim but does not detect the bad quote. The verdict `supported` does not mean the quote is clean.
- Former `not_checked` (Google Calendar c19-c22): run 1 resolved all four (2 supported, 2 partial); run 2 resolved only c19 and left c20-c22 `not_checked`. Fallback budget (6/6) was used up in run 2.

## New or worse verdicts (possible regressions)

Verdicts that were `supported` or better before and are worse after:

| App / claim | Before | Run 1 | Run 2 | Assessment |
|---|---|---|---|---|
| Linear c4 (`issues:create` scope description) | supported | unsupported | unsupported | Probably a true catch, not a regression. The live page today says "Allows creating and updating issues, and creating their attachments"; the guide's quote says "Allows creating new issues and their attachments". The original verifier let this through; the fixed one flags it. The audit did not mention it. Needs a human look; the claim text is probably still approximately right but the quote is off. |
| Google Calendar c16 | supported | partially | partially | Stricter judgement of an inference beyond the quote. Plausibly correct. |
| Google Calendar c6 | supported | supported | partially | Run-to-run noise (verifier saw page header/nav only in the excerpt). |
| Shopify c4 | supported | supported | partially | Run-to-run noise. |
| Shopify c21 | supported | supported | not_checked | Source unreadable in run 2; evidence kept, no demotion. |
| Shopify c20 | partially | supported | partially | Noise. |

No claim went from supported to unsupported except Linear c4. No new false demotion was introduced to a correct quote that the audit confirmed.

## Cost and time

- Wall-clock per app 9-22 s, whole 5-app sequence about 70-82 s; the verify node alone, not the full agent graph. D-AGENT-4's "up to ~1 min extra" estimate holds per run only when all 6 fallbacks fire.
- web_fetch fallbacks (run 2): 1 + 6 + 0 + 6 + 6 = 19 over 5 apps; run 1 counts were not captured, but its timings and verdicts indicate similar usage. The cap of 6 per run was hit in 3 of 5 apps (Google Calendar, Salesforce, Shopify). Some "not_checked" and the Shopify leftovers may be budget-limited.
- Token/dollar cost was not measured (no usage metadata captured from the proxy). Each app is one verifier LLM call plus up to 6 one-shot web_fetch calls.

## Conclusion

1. The fix works on its main target: original `unsupported` verdicts dropped 28 to 8 (run 1) or 5 (run 2); 14 to 17 of the 20 confirmed fetch artifacts, and 4 to 5 of the 7 probable Salesforce artifacts, now come back supported or partial, and unreadable pages become `not_checked` instead of demoting claims.
2. It did less than hoped on long pages: 3 Shopify artifacts (c13, c16, c22) still come back `unsupported`, and the merged-quote claim passes as `supported` (the verifier does not flag bad quotes the claim itself survives). Results vary between runs, so single-run counts carry roughly plus or minus 3 claims of noise.
3. One new `unsupported` (Linear c4) looks like a real quote mismatch caught by the fixed verifier, not a regression; still no wrong claims were removed or contradicted.
