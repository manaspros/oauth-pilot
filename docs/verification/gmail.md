# Gmail guide verification (audit 2026-10-27, T21)

Inputs: `guides/gmail.json` (agent-generated), `research/apps/gmail.md` (pack, T05). Quotes not in the pack were also checked with WebFetch on the live Google pages on 2026-10-27. Nothing here is "tested" beyond the two code-made claims (tp5, tc1).

| claim id | claim | agent said | pack / page says | outcome |
|---|---|---|---|---|
| tp5 | Console URL HEAD gives 302 to sign-in | tested | code-made probe, recorded | ✅ confirmed (as recorded) |
| tc1 | Composio toolkit "gmail" exists, OAUTH2 managed | tested | code-made lookup, recorded | ✅ confirmed (as recorded) |
| c1 | Credentials created on Cloud Console Credentials page | sourced | verifier supported | ✅ confirmed |
| c2 | Redirect URIs must use HTTPS | sourced (partial) | Page exempts localhost | ✏️ corrected: added localhost exemption, quote replaced |
| c3 | Branding must be published before requesting data-access verification | inferred/low (verifier: unsupported) | Restricted-scope page has "you must have a published branding status before you can request verification for data access" (also pack-calendar f6) | ✅ confirmed, upgraded to sourced/high (quote trimmed: "Note that" prefix not confirmed) |
| c4 | gmail.send sensitive; readonly/modify restricted; restricted data on servers needs assessment | inferred/low (unsupported) | pack f1; scopes page has the quote verbatim | ✅ confirmed, upgraded to sourced/high |
| c5 | Request narrowest scope | inferred/low (unsupported) | Restricted page: "don't request the scope that provides full access to the user's email data." | ✅ confirmed, upgraded to sourced/medium (quote extended to match page) |
| c6 | Restricted verification "can potentially take several weeks" | inferred/low (unsupported) | pack f9; exact on page | ✅ confirmed, upgraded to sourced/high |
| c7 | Brand verification 2-3 business days when branding changed | inferred/low (unsupported) | Page: "typically takes 2-3 business days, if branding information has changed since the last approved OAuth consent screen verification" (pack f12 has "usually takes 2-3 business days" on the brand page) | ✅ confirmed, upgraded to sourced/medium (quote trimmed) |
| c8 | Help page: verification "might require several months" | sourced | verifier supported; not in pack (pack f9 says "several weeks" on the Gmail page) | ✅ confirmed |
| c9 | Restricted apps reverified and reassessed at least every 12 months | inferred/low (unsupported) | pack f7, f8; page: "reverified for compliance and complete a security assessment at least every 12 months" | ✅ confirmed, upgraded to sourced/high (quote re-worded to page text) |
| c10 | Third-party server access to restricted data needs assessment from Google-empanelled assessor (CASA) | inferred/low (unsupported) | pack f3, f4; exact on page | ✅ confirmed, upgraded to sourced/medium (tier and cost text kept as unconfirmed for Gmail pages, see pack f6/f11) |
| c11 | Privacy policy must disclose access, use, storage, sharing | inferred/low (unsupported) | exact on page; pack f22 | ✅ confirmed, upgraded to sourced/high |
| c12 | Domain ownership verified before approval | sourced | verifier supported | ✅ confirmed |
| c13 | Demo video of English OAuth grant required | sourced | verifier supported; pack f22 | ✅ confirmed |
| c14 | Unverified app limited to 100 new users | sourced | verifier supported; pack f17 (lifetime cap) | ✅ confirmed |
| c15 | Gmail quotas are quota-unit based; projects created on/after 2026-05-01 get new quotas | inferred/low (unsupported) | exact on page | ✅ confirmed, upgraded to sourced/medium |
| c16 | Testing status: user cap and limited refresh token lifetime | inferred/low (unsupported) | exact on page; pack f14, f15, f16 (7 days) | ✅ confirmed, upgraded to sourced/medium |
| c17 | Scopes must match consent screen, or app shows as unverified | sourced (partial) | page says unverified-app screen | ✏️ corrected: wording softened |
| c18 | Non-matching redirect_uri gives redirect_uri_mismatch | sourced (partial) | page has no "exact" | ✏️ corrected: removed "exactly" |
| c19 | Estimate 2-14 weeks to production, 1-4 days effort | inferred/low | pack gives "several weeks" and CASA 2-3 / 4-6 weeks (Health page); no provider total | ❓ unverifiable, kept as inferred/low |
| c20 | Composio managed app suited to prototyping; verification unknown | inferred/low | pack: not checked | ❓ unverifiable, kept as inferred/low |

Other items: scope `profile.agerange.read` (sensitivity unknown, cites tc1, which does not mention it) is unverifiable and kept as `unknown`. Step s9 "1-6 weeks" (CASA): the pack's only figures are 2-3 and 4-6 weeks (Health API page); the 1-week lower bound has no source. It is an estimate and was left unchanged to keep the critical path consistent (see open issues). Stale "Unverified:" openQuestions (10 entries produced by the false unsupported verdicts) were removed; the CASA question was updated.

## Tier check
`computeTier` returns 3. Reason: scope `gmail.readonly` is restricted (pack f1, scope table; confirmed on the scopes page), and step s9 is a provider step with maxHours 1008 (>= 168). The evidence agrees with tier 3. `validate:guides` passes.

## Footer

Claims by evidence: before 22 = 2 tested / 8 sourced / 12 inferred. After 22 = 2 tested / 18 sourced / 2 inferred.
Outcomes (22): 17 confirmed (incl. 10 upgraded inferred to sourced, 2 tested as recorded), 3 corrected, 2 unverifiable, 0 removed.

**Systematic agent errors**
- Fetch-artifact `unsupported`: 10 of 10 unsupported verdicts (c3, c4, c5, c6, c7, c9, c10, c11, c15, c16). Every quote is on the live page (plain fetch + HTML-to-text on developers.google.com missed them). The demotion rule ("absent strong quote means unsupported regardless of the LLM") then forced claims to inferred/low and produced misleading "Unverified:" open questions. 0 bad quotes, 0 wrong claims among them.
- Overgeneralised normative claims (c2 "must use HTTPS" without localhost exemption; c18 added "exactly").
- Paraphrased quote prefixes ("Note that ...") that are not on the page (c3).
- Open question "CASA page was not fetched" when the pack had the CASA sources.

**Setup attempts**: none in this task.
