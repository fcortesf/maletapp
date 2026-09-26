import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { generateKeyPairSync } from 'node:crypto'
import { sign } from 'hono/jwt'
import { createApp } from '../src/app.ts'
import { readConfig } from '../src/config.ts'
import { oidcDiscovery } from '../src/oidc.ts'

const authority = 'http://public-issuer.invalid:8080/realms/maletapp'

test('private discovery and JWKS preserve public issuer, OAuth URLs and JWT validation', async () => {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const privateKey = { ...pair.privateKey.export({ format: 'jwk' }), alg: 'RS256', kid: 'split' }
  const publicKey = { ...pair.publicKey.export({ format: 'jwk' }), alg: 'RS256', kid: 'split' }
  const requests: string[] = []
  let metadataIssuer = authority
  let jwks = `${authority}/custom-keys`
  let ready = false
  const server = createServer((req, res) => {
    requests.push(req.url!)
    res.setHeader('content-type', 'application/json')
    if (req.url === '/realms/maletapp/.well-known/openid-configuration') {
      if (!ready) { res.writeHead(503); res.end('{}'); return }
      res.end(JSON.stringify({ issuer: metadataIssuer, jwks_uri: jwks,
        authorization_endpoint: `${authority}/custom-auth`, token_endpoint: `${authority}/custom-token` }))
    } else if (req.url === '/realms/maletapp/custom-keys') {
      res.end(JSON.stringify({ keys: [publicKey] }))
    } else if (req.url === '/swagger/v1/swagger.json') {
      res.end(JSON.stringify({ openapi: '3.0.1', info: { title: 'Trips', version: 'v1' }, paths: { '/trips': { get: { responses: {} } } } }))
    } else if (req.url === '/trips') {
      res.end(JSON.stringify({ userId: req.headers['x-test-user-id'] }))
    } else { res.writeHead(404); res.end('{}') }
  })
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  try {
    const address = server.address()
    assert(address && typeof address !== 'string')
    const internal = `http://127.0.0.1:${address.port}`
    const config = readConfig({ NODE_ENV: 'development', KEYCLOAK_AUTHORITY: authority,
      KEYCLOAK_INTERNAL_ORIGIN: internal, KEYCLOAK_AUDIENCE: 'api://maletapp', DOMAIN_API_URL: internal })
    const app = createApp(config)
    assert.equal((await app.request('/docs/openapi.json')).status, 503)
    ready = true
    metadataIssuer = internal + '/realms/maletapp'
    assert.equal((await app.request('/docs/openapi.json')).status, 503)
    metadataIssuer = authority
    jwks = 'http://different-origin.invalid/keys'
    assert.equal((await app.request('/docs/openapi.json')).status, 503)
    jwks = `${authority}/custom-keys`
    const response = await app.request('/docs/openapi.json')
    assert.equal(response.status, 200)
    const doc = await response.json()
    assert.equal(doc.components.securitySchemes.keycloak.flows.authorizationCode.authorizationUrl, `${authority}/custom-auth`)
    assert.equal(doc.components.securitySchemes.keycloak.flows.authorizationCode.tokenUrl, `${authority}/custom-token`)
    assert.equal(JSON.stringify(doc).includes(internal), false)
    const sub = '13a8eece-e92c-40e6-a0ca-56e80ef15d78'
    for (const [iss, aud, expected] of [[authority, 'api://maletapp', 200], [internal + '/realms/maletapp', 'api://maletapp', 401], [authority, 'wrong', 401]] as const) {
      const token = await sign({ sub, iss, aud, exp: Math.floor(Date.now()/1000)+300 }, privateKey, 'RS256')
      const res = await app.request('/trips', { headers: { authorization: `Bearer ${token}` } })
      assert.equal(res.status, expected)
      assert.deepEqual(await res.json(), expected === 200 ? { userId: sub } : { error: 'unauthorized' })
    }
    assert.equal(requests.filter(path => path === '/trips').length, 1)
    assert(requests.includes('/realms/maletapp/custom-keys'))
    assert.equal((await app.request('/trips')).status, 401)
    const discovery = await oidcDiscovery(config)()
    assert.equal(discovery.issuer, authority)
    assert.equal(discovery.jwks_uri, internal + '/realms/maletapp/custom-keys')
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('private identity origin is optional and must satisfy URL and environment restrictions', () => {
  const env = { NODE_ENV: 'production', KEYCLOAK_AUTHORITY: 'https://issuer.example/realm', KEYCLOAK_AUDIENCE: 'api://maletapp', DOMAIN_API_URL: 'http://domain:5110' }
  assert.equal(readConfig(env).internalIdentityOrigin, undefined)
  assert.equal(readConfig({ ...env, KEYCLOAK_INTERNAL_ORIGIN: 'https://private.example' }).internalIdentityOrigin, 'https://private.example')
  for (const value of ['http://private:8080', 'https://private/realm', 'https://user:pass@private', 'https://private?query=x', 'https://private#hash']) {
    assert.throws(() => readConfig({ ...env, KEYCLOAK_INTERNAL_ORIGIN: value }))
  }
})
