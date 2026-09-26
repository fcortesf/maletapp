import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { createApp } from '../src/app.ts'
import type { Config } from '../src/config.ts'

const servers: Server[] = []
let config: Config
let oidcReady = true
let domainReady = true
let issuerOverride: string | undefined
let domainHeaders: Record<string, unknown>
let domainCalls = 0
let oidcCalls = 0
async function listen(server: Server) {
  servers.push(server)
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const address = server.address()
  assert(address && typeof address !== 'string')
  return `http://127.0.0.1:${address.port}`
}
before(async () => {
  const authority = await listen(createServer((_req, res) => {
    oidcCalls++
    res.writeHead(oidcReady ? 200 : 503, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ issuer: issuerOverride ?? config.authority, jwks_uri: `${config.authority}/keys`,
      authorization_endpoint: `${config.authority}/custom/login`, token_endpoint: `${config.authority}/custom/token` }))
  }))
  const domainApiUrl = await listen(createServer((req, res) => {
    domainCalls++
    domainHeaders = req.headers
    assert.equal(req.url, '/swagger/v1/swagger.json')
    res.writeHead(domainReady ? 200 : 503, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ openapi: '3.0.1', info: { title: 'Trip.API', version: 'v1' },
      servers: [{ url: 'http://domain-api:5110' }], security: [],
      paths: { '/trips': { servers: [{ url: 'http://domain-api:5110' }],
        get: { operationId: 'GetTrips', security: [], servers: [{ url: 'http://domain-api:5110' }], responses: { 200: { description: 'OK' } } },
        post: { operationId: 'CreateTrip', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTripRequest' } } } }, responses: { 201: { description: 'Created' } } } } },
      components: { schemas: { CreateTripRequest: { type: 'object', properties: { destination: { type: 'string' } } } },
        securitySchemes: { testHeader: { type: 'apiKey', name: 'X-Test-User-Id', in: 'header' } } },
    }))
  }))
  config = { authority, domainApiUrl, audience: 'api://maletapp', development: true, port: 5000 }
})
after(async () => { await Promise.all(servers.map(server => new Promise<void>(resolve => server.close(() => resolve())))) })

const publicPaths = ['/docs', '/docs/', '/docs/init.js', '/docs/swagger-ui.css', '/docs/swagger-ui-bundle.js',
  '/docs/oauth2-redirect.html', '/docs/oauth2-redirect.js', '/docs/openapi.json']
test('only exact documentation GETs are public; APIs and unrelated assets require JWT', async () => {
  const app = createApp(config)
  for (const path of publicPaths) {
    const response = await app.request(path)
    assert.equal(response.status, path === '/docs/' ? 302 : 200, path)
    if (path !== '/docs/') assert.equal(response.headers.get('cache-control'), 'no-store')
    await response.body?.cancel()
  }
  const previous = domainCalls
  for (const path of ['/trips', '/web/trips', '/mobile/trips', '/mcp/trips', '/items/123',
    '/docs/trips', '/docs/openapi.json/extra', '/docs/package.json', '/docs/swagger-ui-bundle.js.map', '/swagger/v1/swagger.json']) {
    for (const headers of [{}, { authorization: 'Bearer invalid' }]) {
      const res = await app.request(path, { headers })
      assert.equal(res.status, 401, path)
      assert.deepEqual(await res.json(), { error: 'unauthorized' })
    }
  }
  for (const path of publicPaths) {
    assert.equal((await app.request(path, { method: 'POST' })).status, 401)
  }
  assert.equal(domainCalls, previous)
})
test('production documentation is unavailable without contacting dependencies', async () => {
  const app = createApp({ ...config, development: false, authority: 'https://issuer.example/realm' })
  const beforeCalls = [domainCalls, oidcCalls]
  for (const path of [...publicPaths, '/docs/unknown', '/swagger', '/swagger/v1/swagger.json', '/web/swagger/index.html', '/mobile/swagger/v1/swagger.json', '/mcp/swagger/oauth2-redirect.html']) {
    for (const headers of [{}, { authorization: 'Bearer anything' }]) {
      assert.equal((await app.request(path, { headers })).status, 404, path)
    }
  }
  const res = await app.request('/trips')
  assert.equal(res.status, 401)
  assert.deepEqual(await res.json(), { error: 'unauthorized' })
  assert.deepEqual([domainCalls, oidcCalls], beforeCalls)
})
test('generated schema retains contracts, forces gateway targets and OAuth on every operation', async () => {
  const response = await createApp(config).request('/docs/openapi.json', {
    headers: { authorization: 'Bearer do-not-forward', cookie: 'secret=do-not-forward', 'X-Test-User-Id': 'spoof' },
  })
  const doc = await response.json()
  assert.equal(response.status, 200)
  assert.deepEqual(doc.servers, [{ url: '/', description: 'This gateway' }])
  assert.deepEqual(doc.paths['/trips'].servers, doc.servers)
  for (const method of ['get', 'post']) {
    assert.deepEqual(doc.paths['/trips'][method].servers, doc.servers)
    assert.deepEqual(doc.paths['/trips'][method].security, [{ keycloak: ['openid', 'profile', 'email'] }])
    assert.equal(new URL('/trips', new URL(doc.servers[0].url, 'http://localhost:5000/docs')).href, 'http://localhost:5000/trips')
  }
  assert.equal(doc.paths['/trips'].post.operationId, 'CreateTrip')
  assert.equal(doc.components.schemas.CreateTripRequest.properties.destination.type, 'string')
  assert.deepEqual(doc.components.securitySchemes, { keycloak: { type: 'oauth2', flows: { authorizationCode: {
    authorizationUrl: `${config.authority}/custom/login`, tokenUrl: `${config.authority}/custom/token`,
    scopes: { openid: 'Sign in', profile: 'Profile', email: 'Email' },
  } } } })
  assert.equal(JSON.stringify(doc).includes('domain-api'), false)
  for (const header of ['authorization', 'cookie', 'x-test-user-id']) assert.equal(domainHeaders[header], undefined)
})
test('OIDC and domain startup failures recover in the same app instance', async () => {
  const app = createApp(config)
  try {
    oidcReady = false
    let response = await app.request('/docs/openapi.json')
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('retry-after'), '3')
    assert.deepEqual(await response.json(), { error: 'docs_not_ready', dependency: 'oidc' })
    oidcReady = true
    issuerOverride = 'http://wrong-issuer'
    assert.equal((await app.request('/docs/openapi.json')).status, 503)
    issuerOverride = undefined
    domainReady = false
    response = await app.request('/docs/openapi.json')
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'docs_not_ready', dependency: 'domain_openapi' })
    domainReady = true
    assert.equal((await app.request('/docs/openapi.json')).status, 200)
  } finally { oidcReady = true; domainReady = true; issuerOverride = undefined }
})
test('UI config uses PKCE, exact same-origin callback, memory-only auth and readiness retry', async () => {
  const app = createApp(config)
  const script = await (await app.request('/docs/init.js')).text()
  let uiConfig: any
  let oauth: any
  let retried = false
  const context = {
    window: { location: { origin: 'http://localhost:5000' } },
    document: { getElementById: () => ({ textContent: '' }) },
    fetch: async () => ({ ok: true, json: async () => ({ paths: {} }) }),
    SwaggerUIBundle: Object.assign((value: any) => { uiConfig = value; return { initOAuth: (value: any) => { oauth = value } } }, { presets: { apis: {} } }),
    setTimeout: (_callback: unknown, milliseconds: number) => { assert.equal(milliseconds, 3000); retried = true },
  }
  await runInNewContext(script, context)
  assert.equal(uiConfig.oauth2RedirectUrl, 'http://localhost:5000/docs/oauth2-redirect.html')
  assert.equal(uiConfig.persistAuthorization, false)
  assert.equal(uiConfig.queryConfigEnabled, false)
  assert.equal(uiConfig.validatorUrl, null)
  assert.equal(oauth.clientId, 'maletapp-swagger')
  assert.equal(oauth.usePkceWithAuthorizationCodeGrant, true)
  assert.equal(oauth.useBasicAuthenticationWithAccessCodeGrant, false)
  assert.equal(oauth.clientSecret, undefined)
  context.fetch = async () => { throw new Error('unavailable') }
  await runInNewContext(script, context)
  assert.equal(retried, true)
  const callback = await (await app.request('/docs/oauth2-redirect.html')).text()
  assert.match(callback, /src="oauth2-redirect.js"/)
  const callbackScript = await (await app.request('/docs/oauth2-redirect.js')).text()
  assert.match(callbackScript, /swaggerUIRedirectOauth2/)
})
test('realm config has a dedicated public client with exact callback, S256 and API audience', async () => {
  const realm = JSON.parse(await readFile(new URL('../keycloak/maletapp-realm.json', import.meta.url), 'utf8'))
  const client = realm.clients.find((client: any) => client.clientId === 'maletapp-swagger')
  assert.equal(client.publicClient, true)
  assert.equal(client.standardFlowEnabled, true)
  assert.equal(client.implicitFlowEnabled, false)
  assert.equal(client.directAccessGrantsEnabled, false)
  assert.equal(client.serviceAccountsEnabled, false)
  assert.equal(client.secret, undefined)
  assert.deepEqual(client.redirectUris, ['http://localhost:5000/docs/oauth2-redirect.html'])
  assert.deepEqual(client.webOrigins, ['http://localhost:5000'])
  assert.equal(client.attributes['pkce.code.challenge.method'], 'S256')
  assert.equal(client.protocolMappers[0].config['included.custom.audience'], 'api://maletapp')
  assert.equal(client.protocolMappers[0].config['access.token.claim'], 'true')
  assert.equal(client.protocolMappers[0].config['id.token.claim'], 'false')
})
