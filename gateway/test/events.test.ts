import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import { generateKeyPairSync } from 'node:crypto'
import { sign } from 'hono/jwt'
import { createApp } from '../src/app.ts'
import { readConfig } from '../src/config.ts'
import { classifyChange, Subscribers, type Clock } from '../src/events.ts'
const user = 'abcdefab-1234-4234-8234-abcdefabcdef'
const other = '12345678-1234-4234-8234-123456789012'
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 })
const privateKey = { ...pair.privateKey.export({ format: 'jwk' }), alg: 'RS256', kid: 'events' }
const publicKey = { ...pair.publicKey.export({ format: 'jwk' }), alg: 'RS256', kid: 'events' }
const servers: Server[] = []
let issuer: string, domain: string
let calls = 0, responseStatus = 201
async function listen(server: Server) {
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const a = server.address(); assert(a && typeof a !== 'string'); return `http://127.0.0.1:${a.port}`
}
before(async () => {
  issuer = await listen(createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(req.url === '/keys' ? { keys: [publicKey] } : { issuer, jwks_uri: issuer + '/keys' }))
  }))
  domain = await listen(createServer((req, res) => { calls++; req.resume(); res.writeHead(responseStatus); res.end(responseStatus === 204 ? undefined : '{}') }))
})
after(async () => { await Promise.all(servers.map(s => new Promise<void>(resolve => { s.closeAllConnections(); s.close(() => resolve()) }))) })
const config = () => readConfig({ NODE_ENV: 'development', KEYCLOAK_AUTHORITY: issuer, KEYCLOAK_AUDIENCE: 'api://maletapp', DOMAIN_API_URL: domain, WEB_ALLOWED_ORIGINS: 'http://localhost:5173' })
const auth = async (sub = user) => ({ authorization: `Bearer ${await sign({ sub, iss: issuer, aud: 'api://maletapp', exp: Math.floor(Date.now() / 1000) + 300 }, privateKey, 'RS256')}` })

class FakeClock implements Clock {
  time = Date.now()
  next = 0
  timers = new Map<number, { at: number; run: () => void }>()
  now = () => this.time
  set = (run: () => void, ms: number) => { const id = ++this.next; this.timers.set(id, { at: this.time + ms, run }); return id as unknown as ReturnType<typeof setTimeout> }
  clear = (id: ReturnType<typeof setTimeout>) => { this.timers.delete(id as unknown as number) }
  advance(ms: number) {
    const end = this.time + ms
    for (;;) {
      const next = [...this.timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
      if (!next) break
      this.time = next[1].at; this.timers.delete(next[0]); next[1].run()
    }
    this.time = end
  }
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve() }

test('exact status/method/path classification excludes reads, failures, redirects and unsupported paths', () => {
  const cases: [string, string, number, string][] = [ ['POST', '/trips', 201, 'trips.changed'], ['DELETE', `/trips/${user}`, 204, 'trips.changed'],
    ['POST', `/trips/${user}/finish`, 200, 'trips.changed'], ['POST', `/trips/${user}/reopen`, 200, 'trips.changed'],
    ['POST', `/trips/${user}/items`, 201, 'items.changed'], ['PATCH', `/items/${user}`, 200, 'items.changed'], ['DELETE', `/items/${user}`, 204, 'items.changed'] ]
  for (const [method, path, status, event] of cases) {
    assert.equal(classifyChange(method, path, status)?.event, event)
    for (const failure of [202, 302, 400, 401, 403, 404, 500]) assert.equal(classifyChange(method, path, failure), undefined)
    assert.equal(classifyChange('GET', path, status), undefined)
  }
  assert.equal(classifyChange('POST', `/trips/${user}/finish/`, 200), undefined)
  assert.equal(classifyChange('PATCH', '/items/not-a-guid', 200), undefined)
})

test('bounded queues, slow writes, heartbeat, token expiry, five-minute lifetime and shutdown clean every timer', async () => {
  const clock = new FakeClock(), registry = new Subscribers(clock)
  const frames: string[] = []
  const active = registry.reserve(user, clock.now() + 600_000)!
  active.attach(async frame => { frames.push(frame) }, () => {})
  await flush()
  assert.match(frames[0], /event: ready/)
  clock.advance(15_000); await flush()
  assert.equal(frames[1], ': heartbeat\n\n')
  clock.advance(285_000); await active.closed
  assert.equal(registry.size, 0); assert.equal(clock.timers.size, 0)
  const expired = registry.reserve(user, clock.now() + 1000)!
  clock.advance(1000); await expired.closed
  expired.enqueue('too late'); assert.equal(registry.size, 0)
  const slow = registry.reserve(user, clock.now() + 30_000)!
  slow.attach(() => new Promise(() => {}), () => {})
  clock.advance(5000); await slow.closed
  assert.equal(registry.size, 0); assert.equal(clock.timers.size, 0)
  const full = registry.reserve(user, clock.now() + 30_000)!
  for (let i = 0; i < 32; i++) full.enqueue('pending')
  await full.closed; assert.equal(registry.size, 0)
  registry.reserve(user, clock.now() + 30_000)!
  registry.close(); assert.equal(registry.size, 0); assert.equal(clock.timers.size, 0)
})

test('per-user and process stream caps have no leaked reservations', () => {
  const clock = new FakeClock(), registry = new Subscribers(clock)
  for (let i = 0; i < 10; i++) assert(registry.reserve(user, clock.now() + 30_000))
  assert.equal(registry.reserve(user.toUpperCase(), clock.now() + 30_000), undefined)
  for (let i = 0; i < 990; i++) assert(registry.reserve(String(i), clock.now() + 30_000))
  assert.equal(registry.size, 1000)
  assert.equal(registry.reserve(other, clock.now() + 30_000), undefined)
  registry.close(); assert.equal(registry.size, 0); assert.equal(clock.timers.size, 0)
})

test('CORS preflight precedes auth while actual requests and stream retain authentication', async () => {
  const app = createApp(config())
  const before = calls
  const preflight = await app.request('/web/trips', { method: 'OPTIONS', headers: { origin: 'http://localhost:5173', 'access-control-request-headers': 'Authorization,Content-Type' } })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  assert.match(preflight.headers.get('access-control-allow-headers')!, /Authorization/)
  assert.equal(preflight.headers.get('access-control-allow-credentials'), null)
  assert.match(preflight.headers.get('vary')!, /Origin/)
  const denied = await app.request('/web/trips', { method: 'OPTIONS', headers: { origin: 'http://localhost:5173.evil' } })
  assert.equal(denied.headers.get('access-control-allow-origin'), null)
  for (const path of ['/web/trips', '/web/events']) {
    const actual = await app.request(path, { headers: { origin: 'http://localhost:5173' } })
    assert.equal(actual.status, 401)
    assert.equal(actual.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    assert.match(actual.headers.get('access-control-expose-headers')!, /Retry-After/)
  }
  assert.equal(calls, before)
  for (const value of ['*', 'http://localhost:5173/path', 'http://localhost:5173/']) assert.throws(() => readConfig({ NODE_ENV: 'development', KEYCLOAK_AUTHORITY: issuer, KEYCLOAK_AUDIENCE: 'api://maletapp', DOMAIN_API_URL: domain, WEB_ALLOWED_ORIGINS: value }))
})

test('aliases publish to canonical same-user tabs, spoofing cannot alter scope and cancellation cleans streams', async () => {
  const clock = new FakeClock(), registry = new Subscribers(clock), app = createApp(config(), registry)
  const frames: string[][] = [[], [], []]
  for (const [index, id] of [user, user.toUpperCase(), other].entries()) registry.reserve(id, clock.now() + 30_000)!.attach(async frame => { frames[index].push(frame) }, () => {})
  await flush()
  for (const prefix of ['', '/web', '/mobile', '/mcp']) {
    responseStatus = 201
    const response = await app.request(prefix + '/trips', { method: 'POST', headers: { ...await auth(user.toUpperCase()), 'x-test-user-id': other }, body: '{}' })
    assert.equal(response.status, 201)
    await response.body?.cancel(); await flush()
  }
  assert.equal(frames[0].length, 5); assert.equal(frames[1].length, 5); assert.equal(frames[2].length, 1)
  for (const status of [202, 302, 400, 401, 403, 404, 500]) {
    responseStatus = status
    const response = await app.request('/mcp/trips', { method: 'POST', headers: await auth(), body: '{}' })
    await response.body?.cancel()
  }
  await flush(); assert.equal(frames[0].length, 5)
  const abort = new AbortController()
  const stream = await app.request('/web/events?userId=' + other, { headers: { ...await auth(), 'x-test-user-id': other }, signal: abort.signal })
  assert.equal(stream.status, 200)
  assert.equal(stream.headers.get('content-type'), 'text/event-stream')
  assert.equal(stream.headers.get('cache-control'), 'no-store, no-transform')
  assert.equal(stream.headers.get('x-accel-buffering'), 'no')
  const reader = stream.body!.getReader()
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: ready/)
  registry.publish(user, { event: 'items.changed', itemId: user })
  assert.match(new TextDecoder().decode((await reader.read()).value), /items.changed/)
  abort.abort(); await reader.cancel(); await flush()
  assert.equal(registry.size, 3)
  registry.close(); assert.equal(registry.size, 0)
})
