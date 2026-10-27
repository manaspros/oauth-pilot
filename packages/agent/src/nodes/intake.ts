import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NodeFn } from "./common";
import { fakeOrThrow, log } from "./common";
import { isFake, slugify } from "../fake";
import type { Target } from "../state";
import { makeLlm } from "../llm";

export type IntakeDeps = { llm: (system: string, user: string) => Promise<string> };

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

async function loadPrompt(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return readFile(path.join(here, "../prompts/intake.md"), "utf8");
}

const defaultDeps: IntakeDeps = {
  async llm(system, user) {
    const res = await makeLlm({ maxTokens: 1024 }).invoke([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const c = res.content;
    return typeof c === "string" ? c : c.map((b) => ("text" in b ? String(b.text) : "")).join("");
  },
};

const looksLikeUrl = (s: string) => /^https?:\/\//i.test(s) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(s);

/** Deterministic target used when the LLM is unavailable or returns junk. */
export function fallbackTarget(app: string): Target {
  const raw = app.trim();
  const slug = slugify(raw) || "app";
  let website: string | undefined;
  if (looksLikeUrl(raw)) {
    try {
      website = new URL(/^https?:/i.test(raw) ? raw : `https://${raw}`).origin;
    } catch {
      /* ignore */
    }
  }
  const name = looksLikeUrl(raw) ? slug.charAt(0).toUpperCase() + slug.slice(1) : raw;
  return {
    name,
    slug,
    website,
    composioSlug: slug.replace(/-/g, ""),
    docsHints: [`${name} oauth2 app registration`, `${name} api scopes`, `${name} app review verification requirements`],
  };
}

export function parseTarget(text: string, app: string): Target | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const name = str(o.name);
  const slug = str(o.slug)?.toLowerCase();
  if (!name || !slug || !SLUG_RE.test(slug)) return null;
  const hints = Array.isArray(o.docsHints) ? o.docsHints.filter((h): h is string => typeof h === "string" && !!h.trim()) : [];
  const fb = fallbackTarget(app);
  return {
    name,
    slug,
    website: str(o.website),
    composioSlug: str(o.composioSlug),
    docsHints: hints.length ? hints.slice(0, 6) : fb.docsHints,
  };
}

export function makeIntake(deps: IntakeDeps = defaultDeps): NodeFn {
  return async (state, config) => {
    if (isFake()) return fakeOrThrow("intake", "intake", state);
    const app = state.input.app;
    try {
      const text = await deps.llm(await loadPrompt(), `App: ${app}${state.input.useCase ? `\nUse case: ${state.input.useCase}` : ""}`);
      const target = parseTarget(text, app);
      if (target) {
        log(config, "intake", `target ${target.name} (${target.slug})`);
        return { target };
      }
      log(config, "intake", "LLM output unparseable, using deterministic fallback");
      return { target: fallbackTarget(app), issues: ["intake: LLM output unparseable; used deterministic fallback"] };
    } catch (e) {
      log(config, "intake", `LLM failed (${(e as Error).message}), using deterministic fallback`);
      return { target: fallbackTarget(app), issues: [`intake: LLM failed (${(e as Error).message}); used deterministic fallback`] };
    }
  };
}

export const intake: NodeFn = makeIntake();
