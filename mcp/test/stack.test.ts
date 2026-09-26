import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { generateKeyPair, exportJWK, SignJWT, jwtVerify } from 'jose';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { connect, exercise } from '../scripts/smoke.ts';
// Explicit opt-in: real gateway + fresh .NET process, fixture issuer only.
test('isolated real gateway/domain lifecycle and two-user authorization (fixture issuer)', { skip: process.env.RUN_DOMAIN_STACK !== '1', timeout: 30000 }, async () => {
  const servers: Server[] = [];
  async function listen(s: Server) {
    servers.push(s); await new Promise<void>((resolve, reject) => { s.once('error', reject); s.listen(0, '127.0.0.1', resolve); });
    const a = s.address(); assert(a && typeof a !== 'string'); return `http://127.0.0.1:${a.port}`;
  }
  const reservation = createServer(); const domainUrl = await listen(reservation);
  await new Promise<void>(r => reservation.close(() => r()));
  const domain = spawn('dotnet', ['../api/src/Trip.API/bin/Debug/net10.0/Trip.API.dll', '--urls', domainUrl], {
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', Logging__LogLevel__Default: 'Error' }, stdio: 'ignore',
  });
  const pair = await generateKeyPair('RS256'); const jwk = { ...await exportJWK(pair.publicKey), alg: 'RS256', kid: 'stack' };
  let issuer: string, endpoint: string;
  const sign = (sub: string, aud: string) => new SignJWT({ typ: 'Bearer' }).setProtectedHeader({ alg: 'RS256', kid: 'stack' }).setSubject(sub).setIssuer(issuer).setAudience(aud).setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
  let owner: Awaited<ReturnType<typeof connect>> | undefined, other: typeof owner;
  try {
    let ready = false;
    for (let n = 0; n < 100; n++) {
      try { const r = await fetch(`${domainUrl}/swagger/v1/swagger.json`); if (r.ok) { const schema = await r.json(); assert(schema.paths['/items/{itemId}'].delete); assert(!schema.paths['/items/{itemId}/check-item']); assert(schema.components.schemas.CreateItemInTripRequest.properties.itemCount); ready = true; break; } } catch {}
      if (domain.exitCode !== null) throw new Error('Isolated domain failed to start');
      await new Promise(r => setTimeout(r, 100));
    }
    assert(ready, 'Build domain before running stack test');
    issuer = await listen(createServer(async (req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.url === '/.well-known/openid-configuration') { res.end(JSON.stringify({ issuer, jwks_uri: `${issuer}/keys`, token_endpoint: `${issuer}/token` })); return; }
      if (req.url === '/keys') { res.end(JSON.stringify({ keys: [jwk] })); return; }
      const chunks = []; for await (const c of req) chunks.push(c);
      const form = new URLSearchParams(Buffer.concat(chunks).toString());
      assert.equal(form.get('client_secret'), 'stack-fixture-secret');
      assert.equal(form.get('audience'), 'maletapp-api');
      const { payload } = await jwtVerify(form.get('subject_token')!, pair.publicKey, { issuer, audience: endpoint });
      res.end(JSON.stringify({ token_type: 'Bearer', access_token: await sign(payload.sub!, 'api://maletapp') }));
    }));
    const { createApp: gatewayApp } = await import(new URL('../../gateway/src/app.ts', import.meta.url).href);
    const { getRequestListener } = await import(new URL('../../gateway/node_modules/@hono/node-server/dist/index.mjs', import.meta.url).href);
    const gateway = await listen(createServer(getRequestListener(gatewayApp({ authority: issuer, audience: 'api://maletapp', domainApiUrl: domainUrl, development: true, port: 3000 }).fetch)));
    const mcp = createServer(); endpoint = `${await listen(mcp)}/mcp`;
    mcp.on('request', createApp(readConfig({ NODE_ENV: 'development', MCP_RESOURCE_URL: endpoint, KEYCLOAK_AUTHORITY: issuer, GATEWAY_URL: gateway, EXCHANGE_CLIENT_SECRET: 'stack-fixture-secret' })));
    owner = await connect(await sign('11111111-1111-4111-8111-111111111111', endpoint), endpoint);
    other = await connect(await sign('22222222-2222-4222-8222-222222222222', endpoint), endpoint);
    await exercise(owner, other);
  } finally {
    await owner?.close(); await other?.close();
    await Promise.all(servers.map(s => new Promise<void>(r => { s.closeAllConnections(); s.close(() => r()); })));
    if (domain.exitCode === null) { const exited = once(domain, 'exit'); domain.kill('SIGTERM'); await exited; }
  }
});
