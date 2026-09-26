import assert from 'node:assert/strict';
import { auth, type OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
const serverUrl = new URL(process.env.MCP_RESOURCE_URL ?? 'http://localhost:5001/mcp');
const issuer = process.env.KEYCLOAK_AUTHORITY ?? 'http://localhost:8080/realms/maletapp';
let authorization: URL | undefined;
let verifier = '';
const provider: OAuthClientProvider = {
  redirectUrl: 'http://127.0.0.1:49152/callback',
  clientMetadata: { redirect_uris: ['http://127.0.0.1:49152/callback'], token_endpoint_auth_method: 'none', grant_types: ['authorization_code'], response_types: ['code'], scope: 'openid email profile' },
  clientInformation: () => ({ client_id: 'maletapp-mcp-cli' }), tokens: () => undefined, saveTokens: () => { throw new Error('No token request expected'); },
  saveCodeVerifier: value => { verifier = value; }, codeVerifier: () => verifier,
  state: () => 'discovery-test-only', redirectToAuthorization: url => { authorization = url; },
};
const missing = await fetch(serverUrl); assert.equal(missing.status, 401);
const metadataUrl = /resource_metadata="([^"]+)"/.exec(missing.headers.get('www-authenticate')!)?.[1]; assert(metadataUrl);
const metadata = await (await fetch(metadataUrl)).json(); assert.equal(metadata.resource, serverUrl.href); assert.deepEqual(metadata.authorization_servers, [issuer]);
assert.equal(await auth(provider, { serverUrl, resourceMetadataUrl: new URL(metadataUrl) }), 'REDIRECT');
assert(authorization); assert.equal(authorization.origin, new URL(issuer).origin);
assert.equal(authorization.searchParams.get('resource'), serverUrl.href); assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
assert(verifier);
assert.equal((await fetch(serverUrl, { method: 'POST', headers: { authorization: 'Bearer invalid' } })).status, 401);
console.info('Real MCP challenge → SDK protected-resource/OIDC discovery → S256 authorization URL passed. No login, registration, token exchange or authenticated tools were performed.');
