import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const Range = z.object({
  minHours: z.number().nonnegative(),
  maxHours: z.number().nonnegative(),
  label: z.string(),
  basis: z.enum(["sourced", "estimate"]),
  claimIds: z.array(z.string()).default([]),
});

export const Source = z.object({
  url: z.string().url(),
  title: z.string(),
  quote: z.string().max(400).optional(),
  accessedAt: z.string(),
});

export const Claim = z.object({
  id: z.string(),
  text: z.string(),
  evidence: z.enum(["tested", "sourced", "inferred"]),
  sources: z.array(Source).default([]),
  testedHow: z.string().optional(),
  confidence: z.enum(["high", "medium", "low"]),
  verifier: z
    .object({
      verdict: z.enum(["supported", "partially_supported", "unsupported", "contradicted", "not_checked"]),
      note: z.string().optional(),
    })
    .optional(),
});

export const Actor = z.enum(["agent", "developer", "admin", "provider"]);

export const Step = z.object({
  id: z.string(),
  phase: z.enum(["prepare", "register", "configure", "connect", "review", "launch"]),
  title: z.string(),
  actor: Actor,
  detail: z.string(),
  duration: Range,
  dependsOn: z.array(z.string()).default([]),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  claimIds: z.array(z.string()).default([]),
  optional: z.boolean().default(false),
});

export const ScopeInfo = z.object({
  scope: z.string(),
  sensitivity: z.enum(["basic", "sensitive", "restricted", "admin", "unknown"]),
  neededFor: z.array(z.string()).default([]),
  claimIds: z.array(z.string()).default([]),
});

export const Guide = z.object({
  schemaVersion: z.literal(1),
  slug: z.string(),
  app: z.object({
    name: z.string(),
    website: z.string().url().optional(),
    composioToolkit: z.string().optional(),
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
    headline: z.string(),
    startToday: z.string(),
    timeToFirstConnection: Range,
    timeToProduction: Range,
    activeEffort: Range,
    confidence: z.enum(["high", "medium", "low"]),
    claimIds: z.array(z.string()).default([]),
  }),
  composio: z.object({
    toolkitFound: z.boolean(),
    managedAvailable: z.boolean(),
    recommendation: z.enum(["use_managed", "managed_then_own", "own_app_now"]),
    why: z.string(),
    callbackUrl: z.string(),
    claimIds: z.array(z.string()).default([]),
  }),
  scopes: z.array(ScopeInfo),
  requirements: z.array(
    z.object({
      id: z.string(),
      item: z.string(),
      owner: Actor,
      neededFor: z.enum(["testing", "production"]),
      gate: z.boolean().default(false),
      claimIds: z.array(z.string()).default([]),
    }),
  ),
  steps: z.array(Step),
  risks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      severity: z.enum(["info", "warning", "blocker"]),
      gate: z.boolean().default(false),
      symptom: z.string().optional(),
      fix: z.string(),
      claimIds: z.array(z.string()).default([]),
    }),
  ),
  claims: z.array(Claim),
  openQuestions: z.array(z.string()).default([]),
});

export type Range = z.infer<typeof Range>;
export type Source = z.infer<typeof Source>;
export type Claim = z.infer<typeof Claim>;
export type Actor = z.infer<typeof Actor>;
export type Step = z.infer<typeof Step>;
export type ScopeInfo = z.infer<typeof ScopeInfo>;
export type Guide = z.infer<typeof Guide>;

export const guideJsonSchema = zodToJsonSchema(Guide, "Guide");
