# 06 — Research & evidence protocol

Applies to: evidence packs (`research/apps/*.md`), agent prompts, plugin researcher, and verification reports.

## Source ranking

1. Official provider developer docs, help center or policy pages
2. Official provider changelog or blog
3. Composio docs and API responses
4. Our own tests (probes, console walk-throughs, connection attempts)
5. Third-party (blogs, Stack Overflow, GitHub issues). Allowed only for gotchas and blockers, never as the sole source for timelines or requirements. Mark confidence `medium` at most.

## Evidence pack format (`research/apps/<slug>.md`)

```md
# <App> evidence pack  (researched YYYY-MM-DD by <agent/human>)

## Facts
| id | fact | source url | verbatim quote (≤400 chars) | rank |
|----|------|-----------|-----------------------------|------|
| f1 | ... | ... | "..." | 1 |

## Timeline facts
(review durations, with exact wording: "can take several weeks" ≠ "takes 4–6 weeks")

## Scope sensitivity
| scope | sensitivity | source |

## Gotchas & blockers seen in the wild
| symptom / error text | cause | fix | source |

## Could not verify
- ...
```

Rules:
- Quote, don't paraphrase, for any duration or requirement.
- If the provider gives no duration, write "provider gives no duration". Don't invent one. Guides then mark the time range `inferred`.
- Record the access date. Docs drift.

## Verification report (`docs/verification/<slug>.md`)

For each library guide, compare every guide claim with the evidence pack and any tests:

| claim id | claim | agent said | pack says | outcome |
|---|---|---|---|---|
| c4 | Gmail read needs CASA | sourced | f7 confirms | ✅ confirmed |
| c9 | Review takes 3–5 days | sourced | f12: "several weeks" | ✏️ corrected in guide |
| c11 | ... | inferred | no source found | ❓ unverifiable, kept as inferred/low |

Footer per app: counts, **systematic agent errors** (fed back into prompts in T21), and **setup attempts** (what we actually clicked or ran, with the date and result).

`docs/verification/SUMMARY.md` aggregates all apps: accuracy before and after the audit, and the top lessons. The README links it.

## Honesty rules (hard)

- `tested` only when an action really ran in this project. Record the command or browser steps, date and result.
- Never present a guess as fact. Uncertain → `inferred` + `confidence: low` + an `openQuestions` entry.
- When a guide was corrected by a human or audit, keep it `sourced` but note `verifier.note: "corrected in audit YYYY-MM-DD"`.
