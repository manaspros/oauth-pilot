// T01 spike: @langchain/anthropic ChatAnthropic through the LiteLLM proxy.
// Needs @langchain/anthropic installed. In T01 it lived in a scratch sandbox:
//   LC_SANDBOX=<dir with node_modules> node --env-file=.env scripts/spikes/langchain-probe.mjs
// (If run from the repo after `pnpm --filter @oauth-pilot/agent add @langchain/anthropic`, omit LC_SANDBOX.)
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const req = createRequire((process.env.LC_SANDBOX ? process.env.LC_SANDBOX + '/' : process.cwd() + '/') + 'x.js');
const { ChatAnthropic } = await import(req.resolve('@langchain/anthropic'));
const model = new ChatAnthropic({
  model: 'claude-sonnet-5-5',
  apiKey: process.env.ANTHROPIC_API_KEY,
  anthropicApiUrl: process.env.ANTHROPIC_BASE_URL, // explicit; also tests whether env alone is enough below
  maxTokens: 1500,
});
const out = {};
async function run(label, m, tools, prompt) {
  const res = await m.bindTools(tools).invoke(prompt);
  const blocks = Array.isArray(res.content) ? res.content : [{ type: 'text', text: String(res.content) }];
  const urls = [];
  for (const b of blocks) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const r of b.content) urls.push(r.url);
    if (b.type === 'web_fetch_tool_result' && b.content?.url) urls.push(b.content.url);
  }
  out[label] = { blockTypes: blocks.map(b => b.type), urls: urls.slice(0, 5), textSample: blocks.filter(b => b.type === 'text').map(b => b.text).join('').slice(0, 200), usage: res.usage_metadata };
  console.log(label, JSON.stringify(out[label]));
}
await run('web_search', model, [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }], 'Search the web: what is the Linear OAuth2 authorization URL? One sentence.');
await run('web_fetch', model, [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 1 }], 'Fetch https://example.com and give its heading in one sentence.');
// env-only base URL check (no anthropicApiUrl)
const m2 = new ChatAnthropic({ model: 'claude-sonnet-5-5', maxTokens: 50 });
try { const r = await m2.invoke('Say ok'); out.envOnly = { ok: true, text: String(r.content).slice(0, 40) }; } catch (e) { out.envOnly = { ok: false, err: String(e.message).slice(0, 120) }; }
console.log('envOnly', JSON.stringify(out.envOnly));
writeFileSync(new URL('../../packages/agent/fixtures/spike/langchain-probe.json', import.meta.url), JSON.stringify(out, null, 2));
