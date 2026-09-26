import { isDeepStrictEqual } from 'node:util';
import { type AdminApi, type JsonObject, SetupError } from './admin.ts';
export const marker = 'maletapp-mcp.setup';
const markerValue = 'v1';
const policyName = 'maletapp-mcp:exchange-to-api';
export interface Mapper { id?: string; name: string; protocol: string; protocolMapper: string; config: Record<string, string> }
export interface Client extends JsonObject { id?: string; clientId: string; attributes?: Record<string, string>; protocolMappers?: Mapper[] }
export interface Settings { resource: string; apiAudience: string; cliCallback: string; codexCallback: string }
export const localSettings: Settings = {
  resource: 'http://localhost:5001/mcp', apiAudience: 'api://maletapp',
  cliCallback: 'http://127.0.0.1:49152/callback', codexCallback: 'http://127.0.0.1:49153/callback',
};
function mapper(name: string, audience: string, client = false): Mapper {
  return { name: `maletapp-mcp:${name}`, protocol: 'openid-connect', protocolMapper: 'oidc-audience-mapper',
    config: { [client ? 'included.client.audience' : 'included.custom.audience']: audience, 'access.token.claim': 'true', 'id.token.claim': 'false', 'introspection.token.claim': 'true' } };
}
export function desiredClients(settings = localSettings): Client[] {
  const base = { protocol: 'openid-connect', enabled: true, bearerOnly: false, clientAuthenticatorType: 'client-secret',
    implicitFlowEnabled: false, directAccessGrantsEnabled: false, serviceAccountsEnabled: false, fullScopeAllowed: false,
    redirectUris: [], webOrigins: [], defaultClientScopes: ['basic', 'email', 'profile'], optionalClientScopes: [], attributes: { [marker]: markerValue } };
  return [
    { ...base, clientId: 'maletapp-mcp', name: 'Maletapp MCP token exchange', publicClient: false, standardFlowEnabled: false },
    { ...base, clientId: 'maletapp-api', name: 'Maletapp gateway API target', publicClient: false, standardFlowEnabled: false,
      protocolMappers: [mapper('api-audience', settings.apiAudience)] },
    ...[['maletapp-mcp-cli', settings.cliCallback], ['maletapp-codex', settings.codexCallback]].map(([clientId, callback]) => ({
      ...base, clientId: clientId!, name: clientId!, publicClient: true, standardFlowEnabled: true,
      optionalClientScopes: clientId === 'maletapp-codex' ? ['offline_access'] : [],
      redirectUris: [callback!], attributes: { [marker]: markerValue, 'pkce.code.challenge.method': 'S256' },
      protocolMappers: [mapper('resource-audience', settings.resource), mapper('exchange-client-audience', 'maletapp-mcp', true)],
    })),
  ];
}
function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, normalized(v)]));
  return value;
}
export function contains(actual: unknown, expected: unknown): boolean {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    return Boolean(actual && typeof actual === 'object') && Object.entries(expected).every(([key, value]) => contains((actual as JsonObject)[key], value));
  }
  return isDeepStrictEqual(normalized(actual), normalized(expected));
}
async function findClient(api: AdminApi, clientId: string) {
  const matches = (await api.request<Client[]>('GET', `/clients?clientId=${encodeURIComponent(clientId)}`)).filter(c => c.clientId === clientId);
  if (matches.length > 1) throw new SetupError(`Ambiguous client ${clientId}.`);
  const found = matches[0];
  return found?.id ? api.request<Client>('GET', `/clients/${found.id}`) : undefined;
}
export async function preflight(api: AdminApi, settings = localSettings) {
  const found = new Map<string, Client>();
  // Inspect all target names before any write. Never adopt an unrelated client.
  for (const desired of desiredClients(settings)) {
    const existing = await findClient(api, desired.clientId);
    if (existing && existing.attributes?.[marker] !== markerValue) throw new SetupError(`Client ${desired.clientId} already exists without the setup ownership marker. Resolve the name collision manually; nothing was adopted.`);
    if (existing) found.set(desired.clientId, existing);
  }
  return found;
}
export interface ReconcileResult { changed: number; secret?: string; clientIds: Record<string, string> }
export async function reconcile(api: AdminApi, apply: boolean, report: (message: string) => void, settings = localSettings): Promise<ReconcileResult> {
  const found = await preflight(api, settings);
  let changed = 0;
  const write = async (method: string, path: string, body: unknown, message: string) => {
    report(`${apply ? 'Apply' : 'Plan'}: ${message}`); changed++;
    if (apply) await api.request(method, path, body);
  };
  for (const desired of desiredClients(settings)) {
    let existing = found.get(desired.clientId);
    const { protocolMappers = [], optionalClientScopes = [], ...fields } = desired;
    if (!existing) {
      await write('POST', '/clients', desired, `create ${desired.clientId}`);
      if (!apply) continue;
      existing = await findClient(api, desired.clientId);
      if (!existing?.id) throw new SetupError(`Created client ${desired.clientId} could not be read back.`);
      found.set(desired.clientId, existing);
    } else if (!contains(existing, fields)) {
      await write('PUT', `/clients/${existing.id}`, { ...fields, attributes: { ...existing.attributes, ...fields.attributes } }, `update managed settings for ${desired.clientId}`);
    }
    // Updating ClientRepresentation does not reconcile scope assignments in Keycloak 25.
    const assigned = await api.request<{ id: string; name: string }[]>('GET', `/clients/${existing.id}/optional-client-scopes`);
    const expectedScopes = optionalClientScopes as string[];
    const missingScopes = expectedScopes.filter(name => !assigned.some(scope => scope.name === name));
    if (missingScopes.length) {
      const available = await api.request<{ id: string; name: string }[]>('GET', '/client-scopes');
      for (const name of missingScopes) {
        const scope = available.find(scope => scope.name === name);
        if (!scope) throw new SetupError(`Required realm client scope ${name} is missing.`);
        await write('PUT', `/clients/${existing.id}/optional-client-scopes/${scope.id}`, undefined, `assign optional ${name} to ${desired.clientId}`);
      }
    }
    for (const scope of assigned.filter(scope => !expectedScopes.includes(scope.name))) {
      await write('DELETE', `/clients/${existing.id}/optional-client-scopes/${scope.id}`, undefined, `remove unexpected optional ${scope.name} from ${desired.clientId}`);
    }
    for (const desiredMapper of protocolMappers) {
      const matches = (existing.protocolMappers ?? []).filter(m => m.name === desiredMapper.name);
      if (matches.length > 1) throw new SetupError(`Duplicate managed mapper on ${desired.clientId}.`);
      const current = matches[0];
      if (!current) await write('POST', `/clients/${existing.id}/protocol-mappers/models`, desiredMapper, `add ${desiredMapper.name} to ${desired.clientId}`);
      else if (!contains(current, desiredMapper)) await write('PUT', `/clients/${existing.id}/protocol-mappers/models/${current.id}`, { ...desiredMapper, id: current.id }, `update ${desiredMapper.name} on ${desired.clientId}`);
    }
  }
  const requester = found.get('maletapp-mcp'); const target = found.get('maletapp-api');
  if (!target?.id || !requester?.id) {
    report('Plan: enable target-client permissions and allow only maletapp-mcp to exchange to maletapp-api.');
    return { changed, clientIds: {} };
  }
  type Permissions = { enabled: boolean; scopePermissions?: Record<string, string> };
  let permissions = await api.request<Permissions>('GET', `/clients/${target.id}/management/permissions`);
  if (!permissions.enabled) {
    await write('PUT', `/clients/${target.id}/management/permissions`, { enabled: true }, 'enable API target management permissions');
    if (!apply) { report('Plan: attach restricted token-exchange policy after permissions are enabled.'); return { changed, clientIds: {} }; }
    permissions = await api.request<Permissions>('GET', `/clients/${target.id}/management/permissions`);
  }
  const permissionId = permissions.scopePermissions?.['token-exchange'];
  if (!permissionId) throw new SetupError('Keycloak token-exchange permission is unavailable. Enable token-exchange and admin-fine-grained-authz.');
  const realmManagement = await findClient(api, 'realm-management');
  if (!realmManagement?.id) throw new SetupError('realm-management client is missing.');
  const authz = `/clients/${realmManagement.id}/authz/resource-server`;
  interface Policy extends JsonObject { id: string; name: string; description?: string; clients?: string[] }
  const description = 'Managed by maletapp-mcp.setup v1; only the MCP client may exchange to its API target.';
  const policySettings = { name: policyName, description, type: 'client', logic: 'POSITIVE', decisionStrategy: 'UNANIMOUS', clients: [requester.id] };
  const policies = (await api.request<Policy[]>('GET', `${authz}/policy?name=${encodeURIComponent(policyName)}`)).filter(p => p.name === policyName);
  if (policies.length > 1) throw new SetupError('Duplicate exchange policy.');
  let policy = policies[0];
  if (policy) {
    policy = await api.request<Policy>('GET', `${authz}/policy/client/${policy.id}`);
    if (policy.description !== description) throw new SetupError('Exchange policy name belongs to an unmanaged policy.');
    if (!contains(policy, policySettings)) await write('PUT', `${authz}/policy/client/${policy.id}`, { ...policySettings, id: policy.id }, 'restrict MCP exchange client policy');
  } else {
    await write('POST', `${authz}/policy/client`, policySettings, 'create restricted MCP exchange client policy');
    if (!apply) return { changed, clientIds: {} };
    policy = (await api.request<Policy[]>('GET', `${authz}/policy?name=${encodeURIComponent(policyName)}`)).find(p => p.name === policyName);
    if (!policy) throw new SetupError('Created policy could not be read back.');
  }
  const permission = await api.request<JsonObject>('GET', `${authz}/permission/scope/${permissionId}`);
  const attached = await api.request<Policy[]>('GET', `${authz}/policy/${permissionId}/associatedPolicies`);
  if (attached.some(p => p.id !== policy.id)) throw new SetupError('API token-exchange permission has other policies. Review them manually; they were not overwritten.');
  if (attached.length !== 1 || permission.decisionStrategy !== 'UNANIMOUS' || permission.logic !== 'POSITIVE') {
    await write('PUT', `${authz}/permission/scope/${permissionId}`, { ...permission, policies: [policy.id], decisionStrategy: 'UNANIMOUS', logic: 'POSITIVE' }, 'attach only the MCP policy to the API token-exchange permission');
  }
  // GET retrieves the existing secret; POST would rotate it and is never used.
  const secret = await api.request<{ value?: string }>('GET', `/clients/${requester.id}/client-secret`);
  if (!secret.value) throw new SetupError('MCP client secret is missing; refusing to rotate or generate one implicitly.');
  if (!changed) report('Keycloak clients, mappers and exchange permission already match.');
  return { changed, secret: secret.value, clientIds: Object.fromEntries([...found].map(([name, c]) => [name, c.id!])) };
}
