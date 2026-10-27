#!/usr/bin/env node
// Initiate a Composio connected account for an auth config and optionally poll its status (D-API-4).
import { BASE, parseArgs, loadEnv, maskApiKey, printRequest, call, redact } from './_lib.mjs';

const HELP = `composio-connect.mjs: start a connection test for a Composio auth config.

Usage:
  node composio-connect.mjs --auth-config <ac_id> --user-id <id> [options]

Options:
  --auth-config <id>   auth config id (ac_...)                                (required)
  --user-id <id>       Composio user/entity id (e.g. test-user)               (required)
  --wait               poll GET /connected_accounts/{id} until ACTIVE, FAILED, EXPIRED or timeout
  --timeout <sec>      polling timeout (default 300)
  --env <path>         .env file to read COMPOSIO_API_KEY from (default: ./.env)
  --dry-run            print the exact requests with the API key masked; make no network call
  --help               show this help

POST ${BASE}/connected_accounts -> redirect_url (open it and consent), status INITIATED.
Exit code: 0 ACTIVE (or initiated without --wait), 1 error/FAILED/EXPIRED/timeout.`;

let a;
try { a = parseArgs(process.argv.slice(2), { 'auth-config': 's', 'user-id': 's', wait: 'bool', timeout: 's', env: 's', 'dry-run': 'bool', help: 'bool' }); }
catch (e) { console.error(e.message + '\n\n' + HELP); process.exit(2); }
if (a.help) { console.log(HELP); process.exit(0); }
if (!a['auth-config'] || !a['user-id']) { console.error('--auth-config and --user-id are required\n\n' + HELP); process.exit(2); }

const env = loadEnv(a.env ?? '.env');
const apiKey = env.COMPOSIO_API_KEY;
if (!apiKey) { console.error('Missing COMPOSIO_API_KEY in env or .env'); process.exit(1); }

const body = { auth_config: { id: a['auth-config'] }, connection: { user_id: a['user-id'] } };
const headers = { 'x-api-key': maskApiKey(apiKey), 'content-type': 'application/json' };

if (a['dry-run']) {
  console.log('# dry run: no network call');
  printRequest({ method: 'POST', url: `${BASE}/connected_accounts`, headers, body });
  if (a.wait) {
    console.log('# then, with --wait, every 3s until ACTIVE/FAILED/EXPIRED or timeout:');
    printRequest({ method: 'GET', url: `${BASE}/connected_accounts/<ca_id>`, headers });
  }
  process.exit(0);
}

const r = await call('POST', '/connected_accounts', apiKey, body);
if (r.status !== 201 && r.status !== 200) { console.error(`Composio returned ${r.status}: ${redact(JSON.stringify(r.body), [apiKey]).slice(0, 400)}`); process.exit(1); }
const id = r.body?.id;
const url = r.body?.redirect_url ?? r.body?.redirect_uri;
console.log(`Connected account ${id} status ${r.body?.status}`);
console.log(`Open this URL and consent: ${url}`);
if (!a.wait) process.exit(0);

const deadline = Date.now() + Number(a.timeout ?? 300) * 1000;
let last = '';
while (Date.now() < deadline) {
  await new Promise((res) => setTimeout(res, 3000));
  const s = await call('GET', `/connected_accounts/${id}`, apiKey);
  const st = s.body?.status;
  if (st !== last) { console.log(`status: ${st}${s.body?.status_reason ? ` (${s.body.status_reason})` : ''}`); last = st; }
  if (st === 'ACTIVE') { console.log('ACTIVE: connection works.'); process.exit(0); }
  if (st === 'FAILED' || st === 'EXPIRED') { console.error(`${st}: ${s.body?.status_reason ?? 'no reason given'}. Look up guide.blockers by this symptom.`); process.exit(1); }
}
console.error(`Timed out waiting for ACTIVE (last status ${last || r.body?.status}).`);
process.exit(1);
