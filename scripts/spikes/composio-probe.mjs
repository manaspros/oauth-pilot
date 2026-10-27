// T01 spike: Composio v3.1 probes. Run: node --env-file=.env scripts/spikes/composio-probe.mjs
// Read-only GETs. Writes trimmed, secret-free fixtures to packages/agent/fixtures/spike/.
import { writeFileSync } from 'node:fs';
const B = 'https://backend.composio.dev';
const H = { 'x-api-key': process.env.COMPOSIO_API_KEY };
async function get(path) {
  const r = await fetch(B + path, { headers: H });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t.slice(0, 500); }
  return { status: r.status, body: j };
}
const out = (n, o) => writeFileSync(new URL(`../../packages/agent/fixtures/spike/${n}.json`, import.meta.url), JSON.stringify(o, null, 2));
const tk = await get('/api/v3.1/toolkits/gmail');
const b = tk.body;
out('toolkit-gmail', { status: tk.status, keys: Object.keys(b || {}), composio_managed_auth_schemes: b.composio_managed_auth_schemes, composio_managed_auth: b.composio_managed_auth, auth_config_details: b.auth_config_details, auth_guide_url: b.auth_guide_url });
console.log('toolkit', tk.status, Object.keys(b));
console.log(JSON.stringify(b.auth_config_details, null, 1).slice(0, 2500));
console.log('managed', JSON.stringify(b.composio_managed_auth_schemes), JSON.stringify(b.composio_managed_auth)?.slice(0,800));
for (const p of ['/api/v3.1/tools/GMAIL_FETCH_EMAILS', '/api/v3/tools/GMAIL_FETCH_EMAILS']) {
  const r = await get(p); console.log(p, r.status, Object.keys(r.body || {}));
}
