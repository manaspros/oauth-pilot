import { isIP } from "node:net";
import type { NodeFn } from "./common";
import { fakeOrThrow, log } from "./common";
import { isFake } from "../fake";
import { now } from "../events";
import type { ProbeResult } from "../state";

export type ProbeDeps = { fetch: typeof fetch };
const TIMEOUT_MS = 5000;
const MAX_BODY = 200_000;
const WELL_KNOWN = ["/.well-known/oauth-authorization-server", "/.well-known/openid-configuration"];
const MAX_HINT_URLS = 6;

/** SSRF guard: https only, no IP literals, localhost, *.local, *.internal. Returns a reason when rejected. */
export function rejectReason(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "invalid URL";
  }
  if (u.protocol !== "https:") return "not https";
  const h = u.hostname.toLowerCase().replace(/\.$/, "");
  if (isIP(h.replace(/^\[|\]$/g, "")) || /^\d+$/.test(h.split(".").pop() ?? "") || h.startsWith("[")) return "IP literal";
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return "internal host";
  if (!h.includes(".")) return "single-label host";
  return null;
}

function hostsFor(website: string): string[] {
  const u = new URL(website);
  const apex = u.hostname.replace(/^www\./, "");
  return [`https://${u.host}`, `https://api.${apex}`, `https://auth.${apex}`].filter((v, i, a) => a.indexOf(v) === i);
}

const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());

export function makeProbe(deps: ProbeDeps = { fetch }): NodeFn {
  return async (state, config) => {
    if (isFake()) return fakeOrThrow("probe", "probes", state);
    const t = state.target;
    const probes: ProbeResult[] = [];
    let n = 0;
    const add = (r: Omit<ProbeResult, "id" | "at">) => probes.push({ id: `p${++n}`, at: now(), ...r });

    const guard = (url: string, check: string) => {
      const why = rejectReason(url);
      if (why) add({ check, url, ok: false, observed: `skipped: ${why}` });
      return !why;
    };

    /** One request; timeout covers headers and body. 3xx is recorded, never followed. */
    const go = async (url: string, method: "GET" | "HEAD") => {
      const signal = AbortSignal.timeout(TIMEOUT_MS);
      try {
        const res = await deps.fetch(url, { method, redirect: "manual", signal });
        let text = "";
        if (method === "GET" && res.status >= 200 && res.status < 300) text = (await res.text()).slice(0, MAX_BODY);
        return { res, text };
      } catch (e) {
        add({ check: `${method} ${url}`, url, ok: false, observed: `request failed: ${(e as Error).name === "TimeoutError" ? "timeout" : (e as Error).message}` });
        return null;
      }
    };
    const redirectNote = (res: Response) => {
      const loc = res.headers.get("location");
      let host = "?";
      try {
        if (loc) host = new URL(loc, res.url || undefined).host;
      } catch {
        /* keep ? */
      }
      return `HTTP ${res.status} redirect to ${host} (not followed)`;
    };

    let bases: string[] = [];
    if (t?.website) {
      if (guard(t.website, "website")) bases = hostsFor(t.website);
    }
    const wk = bases.flatMap((b) => WELL_KNOWN.map((p) => b + p));
    await Promise.all(
      wk.map(async (url) => {
        const check = url.includes("openid-configuration") ? "openid-configuration well-known" : "oauth-authorization-server well-known";
        if (!guard(url, check)) return;
        const r = await go(url, "GET");
        if (!r) return;
        const { res, text } = r;
        if (res.status >= 300 && res.status < 400) return add({ check, url, ok: false, status: res.status, observed: redirectNote(res) });
        if (!res.ok) return add({ check, url, ok: false, status: res.status, observed: `HTTP ${res.status}` });
        let body: Record<string, unknown> | null = null;
        try {
          const j = JSON.parse(text);
          if (j && typeof j === "object" && !Array.isArray(j)) body = j as Record<string, unknown>;
        } catch {
          /* not JSON */
        }
        if (!body) return add({ check, url, ok: false, status: res.status, observed: `HTTP ${res.status} but body is not JSON` });
        add({ check, url, ok: true, status: res.status, observed: `HTTP ${res.status}, metadata JSON with ${Object.keys(body).length} keys` });
        const reg = body.registration_endpoint;
        if (typeof reg === "string" && reg) {
          add({ check: "registration_endpoint (dynamic client registration)", url, ok: true, status: res.status, observed: `registration_endpoint present: ${reg}` });
        }
      }),
    );

    const hintUrls = [...new Set((t?.docsHints ?? []).map((h) => h.trim()).filter(isUrl))].slice(0, MAX_HINT_URLS);
    await Promise.all(
      hintUrls.map(async (url) => {
        if (!guard(url, "HEAD docs/console URL")) return;
        const r = await go(url, "HEAD");
        if (!r) return;
        const { res } = r;
        const redirect = res.status >= 300 && res.status < 400;
        add({ check: "HEAD docs/console URL", url, ok: res.ok || redirect, status: res.status, observed: redirect ? redirectNote(res) : `HTTP ${res.status}` });
      }),
    );

    probes.sort((a, b) => a.url.localeCompare(b.url) || a.check.localeCompare(b.check));
    probes.forEach((p, i) => (p.id = `p${i + 1}`));
    log(config, "probe", `${probes.length} probes, ${probes.filter((p) => p.ok).length} ok`);
    return { probes };
  };
}

export const probe: NodeFn = makeProbe();
