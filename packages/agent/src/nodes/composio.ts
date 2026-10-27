import type { NodeFn } from "./common";
import { fakeOrThrow, log } from "./common";
import { isFake } from "../fake";
import type { ComposioFacts } from "../state";

export type ComposioDeps = { fetch: typeof fetch; apiKey: string | undefined; baseUrl?: string };

const BASE = "https://backend.composio.dev";
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const uniq = (a: string[]) => [...new Set(a)];

type Json = Record<string, unknown>;
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

export function makeComposioLookup(getDeps: () => ComposioDeps = () => ({ fetch, apiKey: process.env.COMPOSIO_API_KEY })): NodeFn {
  return async (state, config) => {
    if (isFake()) return fakeOrThrow("composio_lookup", "composio", state);
    const d = getDeps();
    const slug = state.target?.composioSlug ?? state.target?.slug;
    if (!d.apiKey) {
      log(config, "composio_lookup", "COMPOSIO_API_KEY missing, skipping");
      return { composio: { toolkitFound: false }, issues: ["composio_lookup: COMPOSIO_API_KEY missing; skipped"] };
    }
    if (!slug) return { composio: { toolkitFound: false }, issues: ["composio_lookup: no toolkit slug"] };

    const base = d.baseUrl ?? BASE;
    const headers = { "x-api-key": d.apiKey, "content-type": "application/json" };
    const call = (p: string, init?: RequestInit) =>
      d.fetch(`${base}/api/v3.1${p}`, { ...init, headers, signal: AbortSignal.timeout(10_000) });
    const issues: string[] = [];

    let tk: Json;
    try {
      const res = await call(`/toolkits/${encodeURIComponent(slug)}`);
      if (res.status === 404) {
        log(config, "composio_lookup", `toolkit ${slug} not found`);
        return { composio: { toolkitFound: false }, issues: [`composio_lookup: toolkit "${slug}" not found (404)`] };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      tk = (await res.json()) as Json;
    } catch (e) {
      return { composio: { toolkitFound: false }, issues: [`composio_lookup: toolkit request failed (${(e as Error).message})`] };
    }

    const managed = arr(tk.composio_managed_auth);
    const details = arr(tk.auth_config_details);
    const facts: ComposioFacts = {
      toolkitFound: true,
      managedSchemes: strs(tk.composio_managed_auth_schemes),
      availableScopes: uniq(managed.flatMap((m) => strs(((m.scopes as Json | undefined) ?? {}).available))),
      requiredScopes: uniq(details.flatMap((x) => strs(x.required_scopes))),
      authGuideUrl: typeof tk.auth_guide_url === "string" ? tk.auth_guide_url : null,
    };

    const tools = state.input.tools ?? [];
    if (tools.length) {
      let scopes: string[] | null = null;
      try {
        const res = await call(`/toolkits/${encodeURIComponent(slug)}/scopes/recommended`, {
          method: "POST",
          body: JSON.stringify({ tools }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as Json;
        const s = (body.scopes ?? {}) as Json;
        scopes = strs(s.least_privilege);
        facts.conditionalScopes = s.conditional ?? [];
        facts.scopeSource = "scopes/recommended";
      } catch (e) {
        issues.push(`composio_lookup: scopes/recommended failed (${(e as Error).message}); fell back to per-tool scopes`);
      }
      if (scopes === null) {
        const all: string[] = [];
        for (const t of tools) {
          try {
            const res = await call(`/tools/${encodeURIComponent(t)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            all.push(...strs(((await res.json()) as Json).scopes));
          } catch (e) {
            issues.push(`composio_lookup: tool ${t} scopes unavailable (${(e as Error).message})`);
          }
        }
        scopes = uniq(all);
        facts.scopeSource = "tools/{slug}.scopes";
      }
      facts.requiredScopes = uniq(scopes);
    }

    log(config, "composio_lookup", `toolkit ${slug}: ${facts.managedSchemes?.join(",") || "no managed schemes"}, ${facts.requiredScopes?.length ?? 0} required scopes`);
    return { composio: facts, issues };
  };
}

export const composioLookup: NodeFn = makeComposioLookup();
