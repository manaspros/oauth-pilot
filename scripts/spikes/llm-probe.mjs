// T01 spike: LLM via LiteLLM proxy. Raw fetch probes of web_fetch tool type strings.
// Run: node --env-file=.env scripts/spikes/llm-probe.mjs   (never prints URL/keys)
import { writeFileSync } from 'node:fs';
const base = process.env.ANTHROPIC_BASE_URL.replace(/\/$/, '');
const model = process.env.OAUTH_PILOT_MODEL && process.env.OAUTH_PILOT_MODEL.startsWith('claude') ? process.env.OAUTH_PILOT_MODEL : 'claude-sonnet-5-5';
const variants = [
  { type: 'web_fetch_20250910', beta: 'web-fetch-2025-09-10' },
  { type: 'web_fetch_20250910', beta: null },
  { type: 'web_fetch_20260209', beta: null },
  { type: 'web_fetch_20260209', beta: 'web-fetch-2025-09-10' },
];
const rec = [];
for (const v of variants) {
  const headers = { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (v.beta) headers['anthropic-beta'] = v.beta;
  const r = await fetch(base + '/v1/messages', { method: 'POST', headers, body: JSON.stringify({
    model, max_tokens: 600,
    tools: [{ type: v.type, name: 'web_fetch', max_uses: 1 }],
    messages: [{ role: 'user', content: 'Fetch https://example.com and tell me its heading in one short sentence.' }] }) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  const blocks = Array.isArray(j.content) ? j.content.map(b => ({ type: b.type, name: b.name, err: b.content?.error_code || b.content?.type })) : undefined;
  const e = { variant: v, status: r.status, blocks, error: j.error?.message?.slice(0, 300) || j.error?.type, usage: j.usage?.server_tool_use };
  rec.push(e); console.log(JSON.stringify(e));
}
writeFileSync(new URL('../../packages/agent/fixtures/spike/webfetch-probe.json', import.meta.url), JSON.stringify(rec, null, 2));
