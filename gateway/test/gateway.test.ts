import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import { generateKeyPairSync } from 'node:crypto'
import { sign } from 'hono/jwt'
import { createApp } from '../src/app.ts'
import { readConfig } from '../src/config.ts'

const pair = generateKeyPairSync('rsa', { modulusLength: 2048 })
const privateKey = { ...pair.privateKey.export({ format: 'jwk' }), alg: 'RS256', kid: 'test' }
const publicKey = { ...pair.publicKey.export({ format: 'jwk' }), alg: 'RS256', kid: 'test' }
const sub = '13a8eece-e92c-40e6-a0ca-56e80ef15d78'
const servers: Server[] = []
let issuer: string
let domain: string
let calls = 0
let discoveryIssuer: string | undefined
let jwksStatus = 200
let app: ReturnType<typeof createApp>
async function listen(server: Server) {
  servers.push(server)
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const address = server.address()
  assert(address && typeof address !== 'string')
  return `http://127.0.0.1:${address.port}`
}
const config = () => readConfig({ NODE_ENV: 'development', KEYCLOAK_AUTHORITY: issuer,
  KEYCLOAK_AUDIENCE: 'api://maletapp', DOMAIN_API_URL: domain })
const token = (claims: Record<string, unknown> = {}) => sign({ sub, iss: issuer, aud: 'api://maletapp',
  exp: Math.floor(Date.now() / 1000) + 300, ...claims }, privateKey, 'RS256')
const auth = async (claims = {}) => ({ authorization: `Bearer ${await token(claims)}` })
before(async () => {
  issuer = await listen(createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/.well-known/openid-configuration') {
      res.end(JSON.stringify({ issuer: discoveryIssuer ?? issuer, jwks_uri: `${issuer}/keys` }))
    } else { res.statusCode = jwksStatus; res.end(JSON.stringify({ keys: [publicKey] })) }
  }))
  domain = await listen(createServer(async (req, res) => {
    calls++
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (req.url === '/denied') { res.statusCode = 403; res.end('private detail'); return }
    if (req.url === '/redirect') { res.writeHead(302, { location: `${issuer}/leak` }); res.end(); return }
    if (req.url === '/empty') { res.statusCode = 204; res.end(); return }
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('X-Upstream', 'preserved')
    res.end(JSON.stringify({ path: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString() }))
  }))
  app = createApp(config())
})
after(async () => { await Promise.all(servers.map(server => new Promise<void>(resolve => server.close(() => resolve())))) })

test('missing, malformed and cookie-only authentication never reaches domain', async () => {
  const previous = calls
  for (const headers of [{}, { authorization: 'Basic abc' }, { authorization: 'Bearer broken' }, { cookie: 'token=abc' }]) {
    const res = await app.request('/trips', { headers })
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), { error: 'unauthorized' })
  }
  assert.equal(calls, previous)
})
test('rejects expiry, issuer, audience, missing claims and future validity', async () => {
  const previous = calls
  for (const claims of [{ exp: 1 }, { exp: undefined }, { iss: 'wrong' }, { aud: 'wrong' },
    { sub: undefined }, { nbf: 9999999999 }, { iat: 9999999999 }, { exp: '9999999999' }]) {
    assert.equal((await app.request('/trips', { headers: await auth(claims) })).status, 401)
  }
  assert.equal(calls, previous)
})
test('rejects signature tampering, unknown kid and symmetric algorithm', async () => {
  const valid = await token()
  const parts = valid.split('.')
  parts[1] = Buffer.from(JSON.stringify({ sub, iss: issuer, aud: 'api://maletapp', exp: 9999999999 })).toString('base64url')
  const previous = calls
  for (const value of [parts.join('.'), await sign({ sub }, { ...privateKey, kid: 'unknown' }, 'RS256'),
    await sign({ sub }, 'a-test-key', 'HS256')]) {
    assert.equal((await app.request('/trips', { headers: { authorization: `Bearer ${value}` } })).status, 401)
  }
  assert.equal(calls, previous)
})
test('incompatible string subject returns structured 403 without proxy', async () => {
  const previous = calls
  const res = await app.request('/trips', { headers: await auth({ sub: 'google-oauth2|1183' }) })
  assert.equal(res.status, 403)
  assert.deepEqual(await res.json(), { error: 'unauthorized' })
  assert.equal(calls, previous)
})
test('all BFF adapters preserve query/body and replace spoofed identity', async () => {
  for (const prefix of ['', '/web', '/mobile', '/mcp']) {
    const res = await app.request(`${prefix}/trips?q=a%2Fb&q=two`, {
      method: 'POST', body: '{"destination":"Madrid"}',
      headers: { ...await auth({ aud: ['other', 'api://maletapp'] }), 'content-type': 'application/json',
        'X-Test-User-Id': 'spoof', 'x-user-email': 'spoof@example.org', cookie: 'session=secret',
        'x-forwarded-host': 'evil', connection: 'x-remove', 'x-remove': 'bad' },
    })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('x-upstream'), 'preserved')
    const body = await res.json()
    assert.equal(body.path, '/trips?q=a%2Fb&q=two')
    assert.equal(body.method, 'POST')
    assert.equal(body.body, '{"destination":"Madrid"}')
    assert.equal(body.headers['x-test-user-id'], sub)
    for (const name of ['authorization', 'cookie', 'x-user-email', 'x-forwarded-host', 'x-remove']) assert.equal(body.headers[name], undefined)
  }
})
test('preserves methods, empty responses and redirects without following them', async () => {
  for (const method of ['GET', 'PATCH', 'DELETE', 'HEAD']) {
    const res = await app.request('/items/123', { method, headers: await auth() })
    assert.equal(res.status, 200)
    if (method !== 'HEAD') assert.equal((await res.json()).method, method)
  }
  assert.equal((await app.request('/empty', { headers: await auth() })).status, 204)
  const res = await app.request('/redirect', { headers: await auth() })
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('location'), `${issuer}/leak`)
})
test('normalizes domain authorization errors', async () => {
  const res = await app.request('/denied', { headers: await auth() })
  assert.equal(res.status, 403)
  assert.deepEqual(await res.json(), { error: 'unauthorized' })
})
test('discovery errors recover and JWKS outages fail closed', async () => {
  const fresh = createApp(config())
  discoveryIssuer = 'wrong'
  assert.equal((await fresh.request('/trips', { headers: await auth() })).status, 401)
  discoveryIssuer = undefined
  assert.equal((await fresh.request('/trips', { headers: await auth() })).status, 200)
  jwksStatus = 503
  const previous = calls
  assert.equal((await fresh.request('/trips', { headers: await auth() })).status, 401)
  assert.equal(calls, previous)
  jwksStatus = 200
})
test('unavailable domain returns 502', async () => {
  const fresh = createApp({ ...config(), domainApiUrl: 'http://127.0.0.1:1' })
  const res = await fresh.request('/trips', { headers: await auth() })
  assert.equal(res.status, 502)
  assert.deepEqual(await res.json(), { error: 'bad_gateway' })
})
test('production requires HTTPS and configuration fails fast', () => {
  assert.throws(() => readConfig({}))
  assert.throws(() => readConfig({ NODE_ENV: 'production', KEYCLOAK_AUTHORITY: issuer,
    KEYCLOAK_AUDIENCE: 'api://maletapp', DOMAIN_API_URL: domain }))
})
