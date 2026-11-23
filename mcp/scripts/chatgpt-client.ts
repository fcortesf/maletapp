import { loginAudienceMappers } from './keycloak/reconcile.ts';

// Print a Keycloak client representation for import into the pilot realm.
const [resource, callback] = process.argv.slice(2);
if (!resource || !callback) throw new Error('Expected the public MCP URL and exact ChatGPT callback URL.');
const endpoint = new URL(resource);
if (endpoint.protocol !== 'https:' || endpoint.origin + '/mcp' !== resource || endpoint.username || endpoint.password) {
  throw new Error('Expected a canonical HTTPS resource URL ending in /mcp.');
}
if (!/^https:\/\/chatgpt\.com\/(?:connector_platform_oauth_redirect|connector\/oauth\/[A-Za-z0-9_-]+)$/.test(callback)) {
  throw new Error('Expected the exact HTTPS callback displayed by ChatGPT.');
}

console.log(JSON.stringify({
  clientId: 'maletapp-chatgpt',
  protocol: 'openid-connect',
  enabled: true,
  publicClient: false,
  clientAuthenticatorType: 'client-secret',
  standardFlowEnabled: true,
  implicitFlowEnabled: false,
  directAccessGrantsEnabled: false,
  serviceAccountsEnabled: false,
  fullScopeAllowed: false,
  attributes: { 'pkce.code.challenge.method': 'S256' },
  redirectUris: [callback],
  defaultClientScopes: ['basic', 'email', 'profile'],
  optionalClientScopes: ['offline_access'],
  protocolMappers: loginAudienceMappers(resource),
}, null, 2));
