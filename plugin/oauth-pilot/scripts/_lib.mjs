// Shared helpers: dependency-free, Node >= 22.
import { readFileSync, existsSync } from 'node:fs';

export const BASE = 'https://backend.composio.dev/api/v3.1';

export function parseEnvFile(path) {
  const out = {};
  if (!path || !existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

export function parseArgs(argv, spec) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`Unexpected argument: ${a}`);
    const k = a.slice(2);
    if (!(k in spec)) throw new Error(`Unknown flag: ${a}`);
    if (spec[k] === 'bool') o[k] = true;
    else { o[k] = argv[++i]; if (o[k] === undefined) throw new Error(`Flag ${a} needs a value`); }
  }
  return o;
}

export const mask = (v) => (!v ? '(unset)' : v.length < 16 ? `****${v.slice(-2)}` : `${v.slice(0, 3)}****${v.slice(-4)}`);

// Replace every occurrence (raw and JSON-escaped) of each secret with ****.
export function redact(text, secrets) {
  let t = String(text);
  for (const s of secrets.filter(Boolean)) {
    t = t.replaceAll(s, '****').replaceAll(JSON.stringify(s).slice(1, -1), '****');
  }
  return t;
}

// Secrets never leave this function unmasked.
export function maskApiKey(v) { return v ? `ak_****${v.slice(-4)}` : 'ak_****(unset)'; }

export function printRequest({ method, url, headers, body }) {
  console.log(`${method} ${url}`);
  for (const [k, v] of Object.entries(headers)) console.log(`${k}: ${v}`);
  if (body !== undefined) console.log(JSON.stringify(body, null, 2));
}

export async function call(method, path, apiKey, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  return { status: r.status, body: j };
}

export function loadEnv(envPath) {
  return { ...parseEnvFile(envPath), ...process.env };
}
