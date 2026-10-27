// T01 spike (D-API-2): read-only scope lookups. Run: node --env-file=.env scripts/spikes/composio-scopes.mjs
import { writeFileSync } from 'node:fs';
const B = 'https://backend.composio.dev/api/v3.1';
const H = { 'x-api-key': process.env.COMPOSIO_API_KEY, 'content-type': 'application/json' };
const dir = new URL('../../packages/agent/fixtures/spike/', import.meta.url);
const go = async (m, p, body) => { const r = await fetch(B + p, { method: m, headers: H, body: body && JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
const rec = await go('POST', '/toolkits/gmail/scopes/recommended', { tools: ['GMAIL_FETCH_EMAILS'] });
writeFileSync(new URL('scopes-recommended.json', dir), JSON.stringify({ request: { method: 'POST', path: '/api/v3.1/toolkits/gmail/scopes/recommended', body: { tools: ['GMAIL_FETCH_EMAILS'] } }, ...rec }, null, 2));
const gc = await go('GET', '/toolkits/gmail/scopes/grant_context');
writeFileSync(new URL('scopes-grant-context.json', dir), JSON.stringify({ request: { method: 'GET', path: '/api/v3.1/toolkits/gmail/scopes/grant_context' }, ...gc }, null, 2));
const t = await go('GET', '/tools/GMAIL_FETCH_EMAILS');
writeFileSync(new URL('tool-gmail-fetch-emails.json', dir), JSON.stringify({ request: { method: 'GET', path: '/api/v3.1/tools/GMAIL_FETCH_EMAILS' }, status: t.status, body: { slug: t.body.slug, version: t.body.version, scopes: t.body.scopes, scope_requirements: t.body.scope_requirements } }, null, 2));
console.log(rec.status, gc.status, t.status, JSON.stringify(rec.body.scopes));
