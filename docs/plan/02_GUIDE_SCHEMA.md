# 02 — Guide schema (the contract between every component)

Implemented in `packages/core/src/schema.ts` with zod. Export the TS types via `z.infer`. Version the schema with `schemaVersion: 1`.

```ts
const Range = z.object({
  minHours: z.number().nonnegative(),
  maxHours: z.number().nonnegative(),
  label: z.string(),            // human text, e.g. "1–2 hours", "2–6 weeks"
  basis: z.enum(["sourced", "estimate"]),  // "sourced" only if a claim quotes a provider duration
  claimIds: z.array(z.string()).default([]),
});

const Source = z.object({
  url: z.string().url(),
  title: z.string(),
  quote: z.string().max(400).optional(),   // short verbatim excerpt supporting the claim
  accessedAt: z.string(),                  // ISO date
});

const Claim = z.object({
  id: z.string(),                          // "c1", "c2", ...
  text: z.string(),
  evidence: z.enum(["tested", "sourced", "inferred"]),
  sources: z.array(Source).default([]),    // required non-empty when evidence = "sourced"
  testedHow: z.string().optional(),        // required when evidence = "tested": what ran, when, result
  confidence: z.enum(["high", "medium", "low"]),
  verifier: z.object({                     // filled by the Goldfish verify node
    verdict: z.enum(["supported", "partially_supported", "unsupported", "contradicted", "not_checked"]),
    note: z.string().optional(),
  }).optional(),
});

const Actor = z.enum(["agent", "developer", "admin", "provider"]);
// agent    = our agent/plugin can do it end-to-end
// developer= the person reading the guide must do it (login, click, decide)
// admin    = someone else in their org (Workspace admin, Salesforce admin, legal)
// provider = waiting on the provider (review, verification)

const Step = z.object({
  id: z.string(),                          // "s1"...
  phase: z.enum(["prepare", "register", "configure", "connect", "review", "launch"]),
  title: z.string(),
  actor: Actor,
  detail: z.string(),                      // markdown, concrete: URLs, button names, field values
  duration: Range,
  dependsOn: z.array(z.string()).default([]),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  claimIds: z.array(z.string()).default([]),
  optional: z.boolean().default(false),    // e.g. only needed for production / public distribution
});
// A step with actor="provider" IS a wait. No separate kind field.
// actor="agent" means the plugin/agent can do it end-to-end; the UI and markdown label it "🤖 Agent can do this".

const ScopeInfo = z.object({
  scope: z.string(),
  sensitivity: z.enum(["basic", "sensitive", "restricted", "admin", "unknown"]),
  neededFor: z.array(z.string()).default([]),   // Composio tool slugs or plain use-case words
  claimIds: z.array(z.string()).default([]),
});

export const Guide = z.object({
  schemaVersion: z.literal(1),
  slug: z.string(),                        // kebab-case app name, e.g. "google-calendar"
  app: z.object({
    name: z.string(),
    website: z.string().url().optional(),
    composioToolkit: z.string().optional(),   // composio slug if exists
    developerConsoleUrl: z.string().url().optional(),
  }),
  generatedAt: z.string(),
  generator: z.object({
    kind: z.enum(["library", "live", "plugin"]),
    model: z.string(),
    runId: z.string().optional(),
  }),
  useCase: z.object({ summary: z.string(), tools: z.array(z.string()).default([]) }),

  verdict: z.object({
    tier: z.number().int().min(0).max(4),
    tierLabel: z.enum(["Instant", "Self-serve", "Light review", "Heavy review", "Gated"]),
    headline: z.string(),                  // one sentence a developer can repeat to their manager
    startToday: z.string(),                // THE most important line: the slowest step to kick off now, and why
    timeToFirstConnection: Range,          // developer testing with own account
    timeToProduction: Range,               // any external user, includes review waits
    activeEffort: Range,                   // hands-on hours, excluding waits
    confidence: z.enum(["high", "medium", "low"]),
    claimIds: z.array(z.string()).default([]),
  }),

  composio: z.object({
    toolkitFound: z.boolean(),
    managedAvailable: z.boolean(),
    recommendation: z.enum(["use_managed", "managed_then_own", "own_app_now"]),
    why: z.string(),
    callbackUrl: z.string(),               // value confirmed in DECISIONS D-API-1 (v3 vs v3.1); a constant in core
    claimIds: z.array(z.string()).default([]),
  }),

  scopes: z.array(ScopeInfo),
  requirements: z.array(z.object({         // non-code prerequisites
    id: z.string(), item: z.string(), owner: Actor, neededFor: z.enum(["testing", "production"]),
    gate: z.boolean().default(false),      // true = partner program / contract / paid tier needed for API access
    claimIds: z.array(z.string()).default([]),
  })),
  steps: z.array(Step),                    // a DAG via dependsOn
  risks: z.array(z.object({                // gotchas + "how to proceed when you hit a blocker", one list
    id: z.string(),
    title: z.string(),                     // "Testing-mode refresh tokens expire after 7 days"
    severity: z.enum(["info", "warning", "blocker"]),
    gate: z.boolean().default(false),      // true = partner program / contract / paid tier needed for API access
    symptom: z.string().optional(),        // exact error text the developer will see, if known
    fix: z.string(),                       // what to do about it
    claimIds: z.array(z.string()).default([]),
  })),
  claims: z.array(Claim),
  openQuestions: z.array(z.string()).default([]),
});
```

## Validation rules beyond zod (`validateGuide()` in core)

1. All `dependsOn` ids exist and the steps graph is acyclic.
2. Every `claimIds` entry exists in `claims`.
3. `sourced` claims have at least 1 source. `tested` claims have `testedHow`.
4. `verdict.tier` equals `computeTier(guide)` (below). If not, it's a validation **warning**, and the computed tier wins in `finalize`.
5. `timeToProduction.minHours >= timeToFirstConnection.minHours`.
6. A Range with `basis: "sourced"` must have ≥ 1 claimId pointing to a `sourced` or `tested` claim; otherwise it's an error.
7. Return `{ ok, errors[], warnings[] }`. Never throw on warnings.

## Tier rubric (`computeTier(guide)` — deterministic)

| Tier | Label | Rule (first match from the top wins, evaluated 4 → 0) |
|---|---|---|
| 4 | Gated | Any requirement or risk has `gate: true` (partner program, contract, sales contact or paid API tier needed for API access at all) |
| 3 | Heavy review | Any step with `actor=provider` and `duration.maxHours >= 168` (≥ 1 week), or any `restricted` scope |
| 2 | Light review | Any step with `actor=provider`, or any `sensitive`/`admin` scope, or any `requirement` with `owner=admin` |
| 1 | Self-serve | Own app needed (`composio.recommendation != use_managed`) with no review |
| 0 | Instant | `composio.recommendation = use_managed` and no review for the stated use case |
| — | fall-through | If nothing above matched, tier 1 |

## Critical path (`criticalPath(steps)`)

Longest path through the DAG by `duration.maxHours`, over non-optional steps. Returns ordered step ids plus a total Range (sum of mins, sum of maxes). The web highlights these edges. `timeToProduction` should be at least this total; `finalize` warns if not.

## Markdown renderer (`renderMarkdown(guide)`)

Used by the plugin, the MCP `oauth_guide_get` tool, and the "copy as markdown" button. Sections in order:

1. Verdict box: tier, headline, both clocks, effort, confidence
2. Composio recommendation
3. **Start today** line
4. Critical path as a numbered list with actor emoji (🤖 agent, 🧑‍💻 developer, 🏢 admin, ⏳ provider)
5. All steps by phase
6. Requirements
7. Risks table (severity, symptom → fix)
8. Scopes table
9. Evidence ledger: claims with evidence badge and source links
10. Open questions

Each claim reference renders as a footnote `[^c3]`.

## Example (fixture)

`packages/core/fixtures/linear.json` is written in T02. It's a full valid guide used by unit tests and the UI.
It must be honest tier 1: no `provider` steps, no `admin` requirement owners, no `gate`. `computeTier(fixture) === fixture.verdict.tier`.
