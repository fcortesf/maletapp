import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, jwtVerify } from 'jose';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { Identity, identityUrl } from '../src/auth.ts';
import { Gateway } from '../src/gateway.ts';
const servers: Server[] = [];
const clients: Client[] = [];
const pair = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(pair.publicKey), kid: 'test', alg: 'RS256' };
const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';
let issuer: string, endpoint: string, gateway: string;
let exchangeMode = 'ok', gatewayMode = 'ok', gatewayCalls = 0, exchangeCalls = 0;
let lastRequest: { path?: string; method?: string; body: unknown; headers: Record<string, unknown>; subject?: string };
let config: ReturnType<typeof readConfig>;
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const a = server.address(); assert(a && typeof a !== 'string'); return `http://127.0.0.1:${a.port}`;
}
async function token(sub = userA, claims: Record<string, unknown> = {}, audience = endpoint) {
  return new SignJWT({ typ: 'Bearer', ...claims }).setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setSubject(sub).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
}
async function customToken(claims: Record<string, unknown>) {
  return new SignJWT({ sub: userA, iss: issuer, aud: endpoint, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+300, typ: 'Bearer', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(pair.privateKey);
}
async function client(sub = userA) {
  const c = new Client({ name: 'maletapp-test', version: '1' }); clients.push(c);
  await c.connect(new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers: { authorization: `Bearer ${await token(sub)}` } } }));
  return c;
}
before(async () => {
  issuer = await listen(createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/.well-known/openid-configuration') { res.end(JSON.stringify({ issuer, jwks_uri: `${issuer}/keys`, token_endpoint: `${issuer}/token` })); return; }
    if (req.url === '/keys') { res.end(JSON.stringify({ keys: [jwk] })); return; }
    exchangeCalls++;
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const form = new URLSearchParams(Buffer.concat(chunks).toString());
    assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:token-exchange');
    assert.equal(form.get('client_id'), 'maletapp-mcp'); assert.equal(form.get('client_secret'), 'test-only-secret');
    assert.equal(form.get('audience'), 'maletapp-api'); assert.equal(form.has('requested_subject'), false);
    const incoming = form.get('subject_token')!;
    const { payload } = await jwtVerify(incoming, pair.publicKey, { audience: endpoint, issuer });
    if (exchangeMode === 'deny') { res.writeHead(403); res.end('{"error":"secret should never leak"}'); return; }
    let accessToken = exchangeMode === 'passthrough' ? incoming : await token(exchangeMode === 'subject' ? userB : payload.sub,
      {}, exchangeMode === 'audience' ? endpoint : 'api://maletapp');
    if (exchangeMode === 'expired') accessToken = await customToken({ aud: 'api://maletapp', exp: 1 });
    if (exchangeMode === 'id-token') accessToken = await customToken({ aud: 'api://maletapp', typ: 'ID' });
    if (exchangeMode === 'signature') accessToken = accessToken.slice(0, -10) + 'xxxxxxxxxx';
    res.end(JSON.stringify({ access_token: accessToken, token_type: 'Bearer' }));
  }));
  gateway = await listen(createServer(async (req, res) => {
    gatewayCalls++;
    const { payload } = await jwtVerify(req.headers.authorization!.slice(7), pair.publicKey, { audience: 'api://maletapp', issuer });
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString();
    lastRequest = { path: req.url, method: req.method, body: text ? JSON.parse(text) : null, headers: req.headers, subject: payload.sub };
    res.setHeader('content-type', 'application/json');
    if (gatewayMode === 'delay') { setTimeout(() => res.end('{}'), 200); return; }
    if (gatewayMode !== 'ok') { res.writeHead(Number(gatewayMode)); res.end('{"detail":"private internal error"}'); return; }
    if (req.method === 'DELETE') { res.writeHead(204); res.end(); return; }
    res.end(JSON.stringify(lastRequest.body ?? { subject: payload.sub }));
  }));
  // Reserve the port before deriving the canonical resource URL.
  const server = createServer(); const origin = await listen(server); endpoint = `${origin}/mcp`;
  config = readConfig({ NODE_ENV: 'development', MCP_RESOURCE_URL: endpoint, KEYCLOAK_AUTHORITY: issuer, GATEWAY_URL: gateway,
    EXCHANGE_CLIENT_SECRET: 'test-only-secret', ALLOWED_ORIGINS: 'http://allowed.example' });
  server.on('request', createApp(config));
});
after(async () => {
  await Promise.all(clients.map(c => c.close()));
  await Promise.all(servers.map(s => new Promise<void>(r => { s.closeAllConnections(); s.close(() => r()); })));
});
test('resource discovery, challenges, host and explicit browser origin protection', async () => {
  const response = await fetch(endpoint); assert.equal(response.status, 401);
  assert.match(response.headers.get('www-authenticate')!, /resource_metadata=".*oauth-protected-resource\/mcp"/);
  const metadata = await (await fetch(new URL('/.well-known/oauth-protected-resource/mcp', endpoint))).json();
  assert.equal(metadata.resource, endpoint); assert.deepEqual(metadata.authorization_servers, [issuer]);
  assert.equal((await fetch(endpoint, { headers: { origin: 'http://evil.example' } })).status, 403);
  const badHost = await new Promise<number | undefined>((resolve, reject) => {
    const req = httpRequest(endpoint, { headers: { host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(badHost, 403);
  const preflight = await fetch(endpoint, { method: 'OPTIONS', headers: { origin: 'http://allowed.example' } });
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://allowed.example');
});
test('missing, expired, wrong audience, wrong issuer, ID tokens and tampering rejected before exchange', async () => {
  const before = exchangeCalls;
  for (const value of ['broken', await customToken({ exp: 1 }), await customToken({ exp: undefined }), await customToken({ aud: 'api://maletapp' }),
    await customToken({ iss: 'wrong' }), await customToken({ typ: 'ID' }), await customToken({ nbf: 9999999999 }), (await token()).slice(0, -10) + 'xxxxxxxxxx']) {
    assert.equal((await fetch(endpoint, { method: 'POST', headers: { authorization: `Bearer ${value}` } })).status, 401);
  }
  assert.equal(exchangeCalls, before);
});
test('SDK initialization, tools and prompt discovery, strict schemas and useful guidance', async () => {
  const c = await client(); assert.match(c.getInstructions()!, /Recommendations alone do not authorize writes/);
  const tools = (await c.listTools()).tools; assert.equal(tools.length, 9);
  assert(!tools.some(t => t.name === 'check_item'));
  assert.match(c.getInstructions()!, /notes/); assert.match(c.getInstructions()!, /itemCount/);
  for (const t of tools) assert.equal(t.inputSchema.additionalProperties, false);
  assert.equal((await c.listPrompts()).prompts[0]?.name, 'preparar_equipaje');
  const prompt = await c.getPrompt({ name: 'preparar_equipaje', arguments: { tripId: userA } });
  assert.match(JSON.stringify(prompt), /get_trip/); assert.match(JSON.stringify(prompt), /no autoriza guardarlos/);
  const before = gatewayCalls;
  for (const args of [{ user_id: userB }, { tripId: '../escape' }]) {
    assert.equal((await c.callTool({ name: 'get_trip', arguments: args })).isError, true);
  }
  assert.equal((await c.callTool({ name: 'edit_item', arguments: { itemId: userA } })).isError, true);
  assert.equal((await c.callTool({ name: 'create_trip', arguments: { destination: 'Test', startDate: '2026-02-30' } })).isError, true);
  for (const itemCount of [0, -1, 1.5, 2147483648, '2', true]) {
    assert.equal((await c.callTool({ name: 'add_item', arguments: { tripId: userA, name: 'Socks', itemCount } })).isError, true);
    assert.equal((await c.callTool({ name: 'edit_item', arguments: { itemId: userA, itemCount } })).isError, true);
  }
  assert.equal((await c.callTool({ name: 'add_item', arguments: { tripId: userA, name: 'Socks', notes: 42 } })).isError, true);
  assert.equal((await c.callTool({ name: 'edit_item', arguments: { itemId: userA, checkCount: 1 } })).isError, true);
  assert.equal((await c.callTool({ name: 'check_item', arguments: { itemId: userA } })).isError, true);
  assert.equal(gatewayCalls, before);
});
test('tools adapt exact HTTP contracts and delegate separately for concurrent users', async () => {
  const c = await client();
  const cases: [string, Record<string, unknown>, string, string, unknown][] = [
    ['list_trips', {}, 'GET', '/trips', null], ['create_trip', { destination: 'Madrid', startDate: null }, 'POST', '/trips', { destination: 'Madrid', startDate: null }],
    ['get_trip', { tripId: userA }, 'GET', `/trips/${userA}`, null], ['list_items', { tripId: userA }, 'GET', `/trips/${userA}/items`, null],
    ['add_item', { tripId: userA, name: 'Passport' }, 'POST', `/trips/${userA}/items`, { name: 'Passport' }],
    ['add_item', { tripId: userA, name: 'Socks', notes: 'Bring spares', itemCount: 3 }, 'POST', `/trips/${userA}/items`, { name: 'Socks', notes: 'Bring spares', itemCount: 3 }],
    ['add_item', { tripId: userA, name: 'Socks', notes: null, itemCount: null }, 'POST', `/trips/${userA}/items`, { name: 'Socks', notes: null, itemCount: null }],
    ['edit_item', { itemId: userA, notes: null, itemCount: null }, 'PATCH', `/items/${userA}`, { notes: null, itemCount: null }],
    ['edit_item', { itemId: userA, notes: '', itemCount: 2147483647 }, 'PATCH', `/items/${userA}`, { notes: '', itemCount: 2147483647 }],
    ['get_item', { itemId: userA }, 'GET', `/items/${userA}`, null],
    ['edit_item', { itemId: userA, defaultItemId: null }, 'PATCH', `/items/${userA}`, { defaultItemId: null }],
    ['set_item_packed', { itemId: userA, isPacked: true }, 'PATCH', `/items/${userA}`, { isPacked: true }],
    ['set_item_packed', { itemId: userA, isPacked: false }, 'PATCH', `/items/${userA}`, { isPacked: false }],
    ['delete_item', { itemId: userA }, 'DELETE', `/items/${userA}`, null],
  ];
  for (const [name, args, method, path, body] of cases) {
    const result = await c.callTool({ name, arguments: args }); assert.notEqual(result.isError, true);
    assert.equal(lastRequest.path, path); assert.equal(lastRequest.method, method); assert.deepEqual(lastRequest.body, body);
    assert.equal(lastRequest.subject, userA); assert.equal(lastRequest.headers['x-test-user-id'], undefined);
  }
  const other = await client(userB);
  const results = await Promise.all([c, other].map(c => c.callTool({ name: 'list_trips', arguments: {} })));
  assert.deepEqual(results.map(r => (r.structuredContent as { result: { subject: string } }).result.subject), [userA, userB]);
});
test('exchange failure, changed subject/audience and passthrough never reach gateway', async () => {
  const c = await client(); const before = gatewayCalls;
  try {
    for (const mode of ['deny', 'subject', 'audience', 'passthrough', 'expired', 'id-token', 'signature']) {
      exchangeMode = mode;
      const result = await c.callTool({ name: 'list_trips', arguments: {} });
      assert.equal(result.isError, true); assert.equal((result.structuredContent as Record<string, unknown> | undefined)?.error, 'delegation_failed');
      assert(!JSON.stringify(result).includes('test-only-secret'));
    }
  } finally { exchangeMode = 'ok'; }
  assert.equal(gatewayCalls, before);
});
test('domain errors remain meaningful, sanitized and writes never retry', async () => {
  const c = await client();
  try {
    for (const status of [400, 401, 403, 404, 409, 500]) {
      gatewayMode = String(status); const before = gatewayCalls;
      const result = await c.callTool({ name: 'add_item', arguments: { tripId: userA, name: 'Test' } });
      assert.equal(result.isError, true); assert.equal((result.structuredContent as Record<string, unknown> | undefined)?.status, status); assert.equal(gatewayCalls, before+1);
      assert(!JSON.stringify(result).includes('private internal error'));
    }
  } finally { gatewayMode = 'ok'; }
});
test('missing exchange configuration fails closed; timeout warns about uncertain writes', async () => {
  const credential = await new Identity(config).authenticate(await token());
  const unconfigured = new Identity({ ...config, exchangeClientSecret: undefined });
  await assert.rejects(unconfigured.delegate(credential), /administrator/);
  const short = { ...config, timeoutMs: 50 };
  gatewayMode = 'delay'; const before = gatewayCalls;
  try { await assert.rejects(new Gateway(short, new Identity(config), credential).request('POST', '/trips', { destination: 'Test' }), /outcome is unknown/); }
  finally { gatewayMode = 'ok'; }
  assert.equal(gatewayCalls, before+1);
});

test('configuration enforces distinct audiences, exact issuer and trusted private identity routing', () => {
  const env = { NODE_ENV: 'development', MCP_RESOURCE_URL: endpoint, KEYCLOAK_AUTHORITY: issuer };
  assert.equal(readConfig(env).issuer, issuer);
  assert.throws(() => readConfig({ ...env, GATEWAY_AUDIENCE: endpoint }));
  assert.throws(() => readConfig({ ...env, NODE_ENV: 'production' }));
  for (const value of ['http://user:secret@private', 'http://private/path', 'http://private?x=1', 'http://private#fragment']) {
    assert.throws(() => readConfig({ ...env, KEYCLOAK_INTERNAL_ORIGIN: value }));
  }
  const privateConfig = readConfig({ ...env, KEYCLOAK_INTERNAL_ORIGIN: 'http://private:8080' });
  assert.equal(identityUrl(`${issuer}/keys`, privateConfig).href, 'http://private:8080/keys');
  assert.equal(privateConfig.issuer, issuer);
  assert.throws(() => identityUrl('http://untrusted.example/keys', privateConfig));
  assert.throws(() => readConfig({ ...env, PORT: '0' }));
  assert.throws(() => readConfig({ ...env, HTTP_TIMEOUT_MS: 'NaN' }));
});
