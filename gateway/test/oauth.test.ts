import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type IncomingHttpHeaders } from 'node:http'
import { gzipSync } from 'node:zlib'
import { createApp } from '../src/app.ts'
import { readConfig } from '../src/config.ts'

const config = () => readConfig({ NODE_ENV: 'production',
  KEYCLOAK_AUTHORITY: 'https://identity.example/realms/maletapp/',
  KEYCLOAK_AUDIENCE: 'api://maletapp', DOMAIN_API_URL: 'http://127.0.0.1:1' })

test('public OAuth metadata uses configured issuer and gateway registration URL in all environments', async () => {
  for (const development of [false, true]) {
    const app = createApp({ ...config(), development })
    const res = await app.request('https://gateway.example/.well-known/oauth-authorization-server', {
      headers: { authorization: 'Bearer invalid', 'x-forwarded-host': 'untrusted.example' },
    })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), {
      issuer: config().authority,
      authorization_endpoint: 'https://identity.example/realms/maletapp/protocol/openid-connect/auth',
      token_endpoint: 'https://identity.example/realms/maletapp/protocol/openid-connect/token',
      registration_endpoint: 'https://gateway.example/oauth/register',
      scopes_supported: ['openid', 'email', 'profile'], response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'],
    })
  }
})

test('only exact OAuth handlers bypass JWT; BFF routes and lookalikes remain protected', async () => {
  const app = createApp(config())
  for (const path of ['/oauth/register', '/oauth/register/child', '/oauth/register-evil',
    '/.well-known/oauth-authorization-server/child', '/.well-known/oauth-authorization-server-evil',
    '/mobile/trips', '/web/trips', '/mcp/trips', '/trips']) {
    assert.equal((await app.request(path)).status, 401, path)
  }
  assert.equal((await app.request('/.well-known/oauth-authorization-server', { method: 'POST' })).status, 401)
})

test('registration preserves payload and Keycloak success/errors through the private origin', async () => {
  const requests: { path?: string; body: Buffer; headers: IncomingHttpHeaders }[] = []
  let status = 201
  const responseBody = '{ "client_id": "mcp-test", "extra": true }\n'
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk)
    requests.push({ path: req.url, body: Buffer.concat(chunks), headers: req.headers })
    const body = gzipSync(status === 201 ? responseBody : '{"error":"registration_denied"}')
    res.writeHead(status, { 'content-type': 'application/json', 'content-encoding': 'gzip',
      'content-length': body.length, 'x-keycloak': 'preserved', location: 'https://identity.example/next' })
    res.end(body)
  })
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  try {
    const address = server.address()
    assert(address && typeof address !== 'string')
    const internal = `http://127.0.0.1:${address.port}`
    for (const internalOverride of [true, false]) {
      const app = createApp({ ...config(), development: true,
        authority: internalOverride ? config().authority : `${internal}/realms/maletapp/`,
        internalIdentityOrigin: internalOverride ? internal : undefined })
      for (const code of [201, 400, 401, 403, 302, 500]) {
        status = code
        const body = ' { "client_name": "MCP café", "redirect_uris": ["http://localhost:1234/callback"] }\n'
        const res = await app.request('/oauth/register', { method: 'POST', body,
          headers: { 'content-type': 'application/json', ...(code === 201 ? {} : { authorization: 'Bearer test-initial-access-token' }),
            cookie: 'session=private', 'x-test-user-id': 'spoof', connection: 'x-remove', 'x-remove': 'bad' } })
        assert.equal(res.status, code)
        assert.equal(await res.text(), code === 201 ? responseBody : '{"error":"registration_denied"}')
        assert.equal(res.headers.get('x-keycloak'), 'preserved')
        assert.equal(res.headers.get('location'), 'https://identity.example/next')
        assert.equal(res.headers.get('content-encoding'), null)
        assert.equal(res.headers.get('content-length'), null)
        const request = requests.at(-1)!
        assert.equal(request.path, '/realms/maletapp/clients-registrations/openid-connect')
        assert.deepEqual(request.body, Buffer.from(body))
        assert.equal(request.headers.authorization, code === 201 ? undefined : 'Bearer test-initial-access-token')
        for (const name of ['cookie', 'x-test-user-id', 'x-remove']) assert.equal(request.headers[name], undefined)
      }
    }
    assert.equal(requests.length, 12)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('registration network failure returns 502 without requiring JWT', async () => {
  const app = createApp({ ...config(), development: true, internalIdentityOrigin: 'http://127.0.0.1:1' })
  const res = await app.request('/oauth/register', { method: 'POST', body: '{}' })
  assert.equal(res.status, 502)
  assert.deepEqual(await res.json(), { error: 'bad_gateway' })
})
