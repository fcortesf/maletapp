import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { type AdminApi, type JsonObject, SetupError } from '../scripts/keycloak/admin.ts';
import { contains, desiredClients, marker, reconcile, type Client } from '../scripts/keycloak/reconcile.ts';
import { saveEnvironment, updateEnvironment } from '../scripts/keycloak/local.ts';
class FakeAdmin implements AdminApi {
  clients = new Map<string, Client>([['realm-management', { id: 'realm-management', clientId: 'realm-management' }]]);
  policy: JsonObject | undefined;
  permission: JsonObject = { id: 'permission', name: 'token-exchange.permission.client.api', resources: ['api-resource'], scopes: ['token-exchange'], logic: 'POSITIVE', decisionStrategy: 'UNANIMOUS' };
  enabled = false;
  attached: JsonObject[] = [];
  writes: { method: string; path: string; body: unknown }[] = [];
  failAfterCreate = false;
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (method !== 'GET') this.writes.push({ method, path, body: structuredClone(body) });
    let value: unknown;
    if (path.startsWith('/clients?clientId=')) {
      value = [...this.clients.values()].filter(c => c.clientId === decodeURIComponent(path.split('=')[1]!));
    } else if (path === '/clients' && method === 'POST') {
      const client = structuredClone(body) as Client;
      client.id = client.clientId; this.clients.set(client.clientId, client);
      if (this.failAfterCreate) { this.failAfterCreate = false; throw new SetupError('Connection lost after server persisted client.'); }
    } else if (path === '/client-scopes') value = [{ id: 'offline-scope', name: 'offline_access' }];
    else if (path.includes('/optional-client-scopes')) {
      const client = this.clients.get(path.split('/')[2]!)!;
      if (method === 'PUT') client.optionalClientScopes = ['offline_access'];
      else if (method === 'DELETE') client.optionalClientScopes = [];
      else value = (client.optionalClientScopes as string[]).map(name => ({ id: 'offline-scope', name }));
    } else if (/^\/clients\/[^/]+$/.test(path)) {
      const id = path.split('/')[2]!;
      if (method === 'PUT') {
        const { optionalClientScopes: ignored, ...fields } = structuredClone(body as Client);
        this.clients.set(id, { ...this.clients.get(id)!, ...fields });
      }
      else value = this.clients.get(id);
    } else if (path.endsWith('/client-secret') && method === 'GET') {
      value = { value: 'test-existing-secret' };
    } else if (path.endsWith('/management/permissions')) {
      if (method === 'PUT') this.enabled = true;
      value = { enabled: this.enabled, scopePermissions: this.enabled ? { 'token-exchange': 'permission' } : {} };
    } else if (path.includes('/policy?name=')) value = this.policy ? [this.policy] : [];
    else if (path.endsWith('/policy/client') && method === 'POST') this.policy = { ...body as JsonObject, id: 'policy' };
    else if (path.endsWith('/policy/client/policy')) {
      if (method === 'PUT') this.policy = structuredClone(body) as JsonObject;
      value = this.policy;
    } else if (path.endsWith('/permission/scope/permission')) {
      if (method === 'PUT') { this.permission = structuredClone(body) as JsonObject; this.attached = [this.policy!]; }
      value = this.permission;
    } else if (path.endsWith('/associatedPolicies')) value = this.attached;
    else throw new Error(`Unexpected fixture request ${method} ${path}`);
    return structuredClone(value) as T;
  }
}
test('plan makes no admin writes; repeated apply preserves IDs and secret with zero writes', async () => {
  const api = new FakeAdmin(); const messages: string[] = [];
  await reconcile(api, false, m => messages.push(m)); assert.equal(api.writes.length, 0);
  const first = await reconcile(api, true, m => messages.push(m));
  assert.equal(first.changed, 7); assert.equal(first.secret, 'test-existing-secret');
  const count = api.writes.length;
  const second = await reconcile(api, true, m => messages.push(m));
  assert.equal(second.changed, 0); assert.equal(api.writes.length, count);
  assert.deepEqual(second.clientIds, first.clientIds); assert.equal(second.secret, first.secret);
  assert(!messages.join('\n').includes(first.secret!));
  assert(api.writes.every(w => !w.path.endsWith('/client-secret') && w.method !== 'DELETE'));
  assert.deepEqual(api.policy?.clients, ['maletapp-mcp']);
  assert.deepEqual(api.permission.policies, ['policy']);
  assert.deepEqual(api.permission.scopes, ['token-exchange']);
});
test('client name collision aborts before any write; interrupted creation recovers without duplicate', async () => {
  const collision = new FakeAdmin();
  collision.clients.set('maletapp-codex', { id: 'maletapp-codex', clientId: 'maletapp-codex' });
  await assert.rejects(reconcile(collision, true, () => {}), /ownership marker/); assert.equal(collision.writes.length, 0);
  const api = new FakeAdmin(); api.failAfterCreate = true;
  await assert.rejects(reconcile(api, true, () => {}), /Connection lost/);
  await reconcile(api, true, () => {});
  assert.equal(api.writes.filter(w => w.path === '/clients').length, 4);
  assert.equal((await reconcile(api, true, () => {})).changed, 0);
});
test('managed settings reconcile without widening permissions or modifying unrelated clients', async () => {
  const api = new FakeAdmin(); api.clients.set('unrelated', { id: 'unrelated', clientId: 'unrelated', attributes: { keep: 'value' } });
  await reconcile(api, true, () => {});
  const unrelated = structuredClone(api.clients.get('unrelated'));
  api.clients.get('maletapp-codex')!.redirectUris = ['http://wrong'];
  assert.equal((await reconcile(api, true, () => {})).changed, 1);
  assert.deepEqual(api.clients.get('unrelated'), unrelated);
  api.attached.push({ id: 'foreign-policy' });
  await assert.rejects(reconcile(api, true, () => {}), /other policies/);
});
test('existing Codex client gains offline access once, preserving identity and other clients', async () => {
  const api = new FakeAdmin();
  await reconcile(api, true, () => {});
  api.clients.get('maletapp-codex')!.optionalClientScopes = [];
  const before = structuredClone(api.clients);
  api.writes = [];
  assert.equal((await reconcile(api, false, () => {})).changed, 1);
  assert.equal(api.writes.length, 0);
  assert.deepEqual(api.clients, before);
  assert.equal((await reconcile(api, true, () => {})).changed, 1);
  assert.deepEqual(api.clients.get('maletapp-codex'), { ...before.get('maletapp-codex'), optionalClientScopes: ['offline_access'] });
  for (const [id, client] of before) if (id !== 'maletapp-codex') assert.deepEqual(api.clients.get(id), client);
  assert.equal((await reconcile(api, true, () => {})).changed, 0);
  assert.equal(api.writes.length, 1);
});
test('client definitions require S256, separate audiences and no password/service-account grants', () => {
  const clients = desiredClients();
  for (const client of clients) {
    assert.equal(client.attributes?.[marker], 'v1'); assert.equal(client.directAccessGrantsEnabled, false);
    assert.equal(client.serviceAccountsEnabled, false); assert.equal(client.fullScopeAllowed, false);
  }
  const codex = clients.find(c => c.clientId === 'maletapp-codex')!;
  assert.equal(codex.attributes?.['pkce.code.challenge.method'], 'S256');
  assert.equal(codex.protocolMappers?.[0]?.config['included.custom.audience'], 'http://localhost:5001/mcp');
  assert(contains({ scopes: ['b', 'a'], attributes: { own: 'yes', extra: 'keep' } }, { scopes: ['a', 'b'], attributes: { own: 'yes' } }));
});
test('private environment update preserves other values, is idempotent, and refuses ambiguous or symlink destinations', async () => {
  const original = '# keep comment\nKEYCLOAK_ADMIN_PASSWORD="untouched"\nEXCHANGE_CLIENT_ID=old\n';
  const next = updateEnvironment(original, { EXCHANGE_CLIENT_ID: 'maletapp-mcp', EXCHANGE_CLIENT_SECRET: 'literal$secret' });
  assert.equal(parseEnv(next).KEYCLOAK_ADMIN_PASSWORD, 'untouched'); assert(next.startsWith('# keep comment\n'));
  assert.equal(parseEnv(next).EXCHANGE_CLIENT_SECRET, 'literal$secret');
  assert.equal(updateEnvironment(next, { EXCHANGE_CLIENT_SECRET: 'literal$secret' }), next);
  assert.throws(() => updateEnvironment('EXCHANGE_CLIENT_ID=a\nEXCHANGE_CLIENT_ID=b', { EXCHANGE_CLIENT_ID: 'c' }), /Duplicate/);
  const directory = await mkdtemp(join(tmpdir(), 'maletapp-setup-test-'));
  try {
    const file = join(directory, '.env');
    assert.equal(await saveEnvironment(file, { EXCHANGE_CLIENT_SECRET: 'test-secret' }), true);
    const before = await stat(file); assert.equal(before.mode & 0o777, 0o600);
    assert.equal(await saveEnvironment(file, { EXCHANGE_CLIENT_SECRET: 'test-secret' }), false);
    assert.equal((await stat(file)).mtimeMs, before.mtimeMs);
    const link = join(directory, 'link'); await symlink(file, link);
    await assert.rejects(saveEnvironment(link, { EXCHANGE_CLIENT_SECRET: 'changed' }), /regular file/);
    assert.equal(parseEnv(await readFile(file, 'utf8')).EXCHANGE_CLIENT_SECRET, 'test-secret');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
