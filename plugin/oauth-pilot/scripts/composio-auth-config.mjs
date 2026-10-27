#!/usr/bin/env node
// Create a Composio auth config with the user's custom OAuth app credentials (D-API-3).
import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { BASE, parseArgs, loadEnv, maskApiKey, mask, redact, printRequest, call } from './_lib.mjs';

const HELP = `composio-auth-config.mjs: create a Composio auth config from your own OAuth app credentials.

Usage:
  node composio-auth-config.mjs --toolkit <slug> --env-prefix <APP> [options]

Options:
  --toolkit <slug>     Composio toolkit slug (e.g. gmail, linear)            (required)
  --env-prefix <APP>   reads <APP>_CLIENT_ID and <APP>_CLIENT_SECRET;
                       writes COMPOSIO_AUTH_CONFIG_<APP>=ac_...              (required)
  --scopes <list>      comma-separated scopes (default: env <APP>_SCOPES, else none)
  --name <text>        auth config name (default: oauth-pilot-<toolkit>)
  --env <path>         .env file to read credentials from and append the ac_ id to (default: ./.env)
  --dry-run            print the exact request with secrets masked; make no network call
  --help               show this help

Environment: COMPOSIO_API_KEY (from env or the .env file). Secrets are never printed.
POST ${BASE}/auth_configs -> 201 {auth_config:{id:"ac_..."}}. The ac_ id is not a secret.
The id is appended to the .env file only if the .gitignore next to it lists .env,
and only if COMPOSIO_AUTH_CONFIG_<APP> is not already set there.
Credential key names follow D-API-3: credentials {client_id, client_secret, scopes}.
On a 4xx error, follow templates/console-steps.md to finish the setup by hand.`;

let a;
try { a = parseArgs(process.argv.slice(2), { toolkit: 's', 'env-prefix': 's', scopes: 's', name: 's', env: 's', 'dry-run': 'bool', help: 'bool' }); }
catch (e) { console.error(e.message + '\n\n' + HELP); process.exit(2); }
if (a.help) { console.log(HELP); process.exit(0); }
if (!a.toolkit || !a['env-prefix']) { console.error('--toolkit and --env-prefix are required\n\n' + HELP); process.exit(2); }

const envPath = a.env ?? '.env';
const env = loadEnv(envPath);
const prefix = a['env-prefix'].toUpperCase().replace(/[^A-Z0-9_]/g, '_');
const apiKey = env.COMPOSIO_API_KEY;
const clientId = env[`${prefix}_CLIENT_ID`];
const clientSecret = env[`${prefix}_CLIENT_SECRET`];
const scopes = (a.scopes ?? env[`${prefix}_SCOPES`] ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const missing = [];
if (!apiKey) missing.push('COMPOSIO_API_KEY');
if (!clientId) missing.push(`${prefix}_CLIENT_ID`);
if (!clientSecret) missing.push(`${prefix}_CLIENT_SECRET`);
if (missing.length) { console.error(`Missing in env or ${envPath}: ${missing.join(', ')}`); process.exit(1); }

const body = {
  toolkit: { slug: a.toolkit },
  auth_config: {
    type: 'use_custom_auth',
    name: a.name ?? `oauth-pilot-${a.toolkit}`,
    authScheme: 'OAUTH2',
    credentials: { client_id: clientId, client_secret: clientSecret, scopes },
  },
};
const shown = JSON.parse(JSON.stringify(body));
shown.auth_config.credentials.client_secret = mask(clientSecret);
const headers = { 'x-api-key': maskApiKey(apiKey), 'content-type': 'application/json' };

if (a['dry-run']) {
  console.log('# dry run: no network call, no file written');
  printRequest({ method: 'POST', url: `${BASE}/auth_configs`, headers, body: shown });
  console.log(`# on 201 would append COMPOSIO_AUTH_CONFIG_${prefix}=<ac_id> to ${envPath}`);
  process.exit(0);
}

const r = await call('POST', '/auth_configs', apiKey, body);
if (r.status !== 201 && r.status !== 200) {
  console.error(`Composio returned ${r.status}: ${redact(JSON.stringify(r.body), [clientSecret, apiKey]).slice(0, 400)}`);
  process.exit(1);
}
const id = r.body?.auth_config?.id;
if (!id) { console.error('No auth_config.id in response'); process.exit(1); }
console.log(`Created auth config ${id}`);

const envAbs = resolve(envPath);
const giPath = join(dirname(envAbs), '.gitignore');
const gi = existsSync(giPath) ? readFileSync(giPath, 'utf8').split(/\r?\n/).map((l) => l.trim()) : [];
const key = `COMPOSIO_AUTH_CONFIG_${prefix}`;
const existing = existsSync(envAbs) && new RegExp(`^\\s*(export\\s+)?${key}=`, 'm').test(readFileSync(envAbs, 'utf8'));
if (existing) {
  console.log(`${key} already exists in ${envPath}; left unchanged. New id: ${id}`);
} else if (gi.some((l) => l === '.env' || l === '/.env' || l === '.env*' || l === '*.env')) {
  appendFileSync(envAbs, `\n${key}=${id}\n`);
  console.log(`Appended ${key} to ${envPath}`);
} else {
  console.log(`.gitignore next to ${envPath} does not list .env, so nothing was written. Add it, then set ${key}=${id} yourself.`);
}
