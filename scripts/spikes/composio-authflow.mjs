// T01 spike: custom OAuth auth_config -> connected account initiate -> status poll -> cleanup.
// Uses FAKE client credentials (never a real secret). Always deletes what it creates.
// Run: node --env-file=.env scripts/spikes/composio-authflow.mjs
import { writeFileSync } from 'node:fs';
const B = 'https://backend.composio.dev/api/v3.1';
const H = { 'x-api-key': process.env.COMPOSIO_API_KEY, 'content-type': 'application/json' };
const call = async (m, p, body) => {
  const r = await fetch(B + p, { method: m, headers: H, body: body && JSON.stringify(body) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t.slice(0, 300); }
  return { status: r.status, body: j };
};
const redact = (o) => JSON.parse(JSON.stringify(o, (k, v) => (/secret|token|api_?key/i.test(k) && typeof v === 'string' ? '<redacted>' : v)));
const rec = {};
let acId, caId;
try {
  const scopes = 'https://www.googleapis.com/auth/gmail.readonly';
  rec.createAuthConfig = { request: { toolkit: { slug: 'gmail' }, auth_config: { type: 'use_custom_auth', name: 'oauth-pilot-spike-DELETE-ME', authScheme: 'OAUTH2', credentials: { client_id: 'fake-client-id.apps.googleusercontent.com', client_secret: '<fake>', scopes } } } };
  const body = JSON.parse(JSON.stringify(rec.createAuthConfig.request)); body.auth_config.credentials.client_secret = 'fake-secret-for-spike';
  const c = await call('POST', '/auth_configs', body);
  rec.createAuthConfig.response = { status: c.status, body: redact(c.body) };
  acId = c.body?.auth_config?.id;
  if (acId) {
    const g = await call('GET', `/auth_configs/${acId}`); rec.getAuthConfig = { status: g.status, body: redact(g.body) };
    const ca = await call('POST', '/connected_accounts', { auth_config: { id: acId }, connection: { user_id: 'oauth-pilot-spike-user' } });
    rec.initiate = { request: { auth_config: { id: '<id>' }, connection: { user_id: 'oauth-pilot-spike-user' } }, status: ca.status, body: redact(ca.body) };
    caId = ca.body?.id;
    if (caId) {
      const s = await call('GET', `/connected_accounts/${caId}`); rec.poll = { status: s.status, body: redact(s.body) };
    }
  }
} finally {
  if (caId) rec.deleteConnectedAccount = await call('DELETE', `/connected_accounts/${caId}`);
  if (acId) rec.deleteAuthConfig = await call('DELETE', `/auth_configs/${acId}`);
  writeFileSync(new URL('../../packages/agent/fixtures/spike/composio-authflow.json', import.meta.url), JSON.stringify(rec, null, 2));
  console.log(JSON.stringify(rec, null, 1).slice(0, 6000));
}
