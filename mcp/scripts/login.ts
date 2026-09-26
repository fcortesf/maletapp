import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError, type OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
const endpoint = new URL(process.env.MCP_RESOURCE_URL ?? 'http://localhost:5001/mcp');
const issuer = process.env.KEYCLOAK_AUTHORITY ?? 'http://localhost:8080/realms/maletapp';
const redirectUrl = 'http://127.0.0.1:49152/callback';
const state = randomBytes(32).toString('hex');
let tokens: OAuthTokens | undefined, verifier = '';
let resolveCode: (value: string) => void;
const code = new Promise<string>(resolve => { resolveCode = resolve; });
const callback = createServer((req, res) => {
  const url = new URL(req.url ?? '/', redirectUrl);
  const received = Buffer.from(url.searchParams.get('state') ?? '');
  const expectedState = Buffer.from(state);
  if (url.pathname !== '/callback' || req.method !== 'GET' || received.length !== expectedState.length || !timingSafeEqual(received, expectedState) ||
    (url.searchParams.has('iss') && url.searchParams.get('iss') !== issuer) || !url.searchParams.get('code')) {
    res.writeHead(400); res.end('Invalid authorization response.'); return;
  }
  res.setHeader('Cache-Control', 'no-store'); res.end('Authorization received. Return to the terminal.');
  resolveCode(url.searchParams.get('code')!);
});
const provider: OAuthClientProvider = {
  redirectUrl, clientMetadata: { redirect_uris: [redirectUrl], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: 'openid email profile', client_name: 'Maletapp MCP CLI' },
  state: () => state,
  clientInformation: () => ({ client_id: process.env.MCP_LOGIN_CLIENT_ID ?? 'maletapp-mcp-cli' }),
  tokens: () => tokens, saveTokens: value => { tokens = value; },
  saveCodeVerifier: value => { verifier = value; }, codeVerifier: () => verifier,
  redirectToAuthorization: url => {
    if (url.origin !== new URL(issuer).origin || url.searchParams.get('code_challenge_method') !== 'S256') throw new Error('Unexpected authorization endpoint or PKCE method');
    console.info(`Open this authorization URL in your browser:\n${url.href}`);
  },
};
await new Promise<void>((resolve, reject) => { callback.once('error', reject); callback.listen(49152, '127.0.0.1', resolve); });
let client = new Client({ name: 'maletapp-login', version: '1' });
let transport = new StreamableHTTPClientTransport(endpoint, { authProvider: provider });
const timer = setTimeout(() => { console.error('Authorization timed out.'); callback.close(); process.exitCode = 1; resolveCode(''); }, 300000);
try {
  try { await client.connect(transport); }
  catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    const authorizationCode = await code;
    if (!authorizationCode) throw new Error('Authorization timed out');
    await transport.finishAuth(authorizationCode);
    await client.close();
    client = new Client({ name: 'maletapp-login', version: '1' });
    transport = new StreamableHTTPClientTransport(endpoint, { authProvider: provider });
    await client.connect(transport);
  }
  console.info('Connected using SDK OAuth discovery and PKCE. Tokens remain in memory.');
  console.info('Tools:', (await client.listTools()).tools.map(t => t.name).join(', '));
  console.info('Prompts:', (await client.listPrompts()).prompts.map(p => p.name).join(', '));
  const result = await client.callTool({ name: 'list_trips', arguments: {} });
  console.info(result.isError ? `Delegation/read failed: ${JSON.stringify(result.structuredContent)}` : 'Authenticated trip read succeeded.');
  if (result.isError) process.exitCode = 1;
} catch { console.error('OAuth connection failed. Check manual Keycloak setup, issuer, resource audience and callback registration.'); process.exitCode = 1; }
finally { clearTimeout(timer); callback.closeAllConnections(); callback.close(); await client.close(); }
