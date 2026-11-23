import { readFileSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { KeycloakAdmin } from './keycloak/admin.ts';
import { localSettings, reconcile } from './keycloak/reconcile.ts';

const dir = '/etc/maletapp/secrets';
const password = readFileSync(dir + '/admin-password', 'utf8').trim();
const api = await KeycloakAdmin.login('http://127.0.0.1:18080', 'maletapp', 'pilot-admin', password);
const result = await reconcile(api, true, console.info, {
  ...localSettings, includeLocalClients: false, resource: process.env.MCP_RESOURCE_URL!,
});
if (!result.secret || !/^[a-zA-Z0-9._-]+$/.test(result.secret)) throw Error('Invalid exchange credential');
writeFileSync(dir + '/exchange-secret.next', result.secret + '\n', { mode: 0o600 });
// The host directory is root-only. The MCP container reads the bind-mounted file as node.
chmodSync(dir + '/exchange-secret.next', 0o444);
renameSync(dir + '/exchange-secret.next', dir + '/exchange-secret');
