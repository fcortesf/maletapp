import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Hono } from 'hono'
import { events, Subscribers } from '../src/events.ts'
import type { GatewayEnv } from '../src/auth.ts'

test('authenticated stream capacity returns 429 and Retry-After without allocating', async () => {
  const subscribers = new Subscribers()
  const app = new Hono<GatewayEnv>()
  app.use('*', async (c, next) => { c.set('userId', 'user'); c.set('tokenExpiresAt', Date.now() + 10000); await next() })
  app.get('/web/events', events(subscribers))
  try {
    for (let i = 0; i < 10; i++) subscribers.reserve('user', Date.now() + 10000)
    const response = await app.request('/web/events')
    assert.equal(response.status, 429)
    assert.equal(response.headers.get('retry-after'), '30')
    assert.equal(subscribers.size, 10)
  } finally { subscribers.close() }
})

test('failed subscriber delivery cleans up without rejecting a publisher', async () => {
  const subscribers = new Subscribers()
  const subscription = subscribers.reserve('user', Date.now() + 10000)!
  subscription.attach(async () => { throw new Error('fixture failure') }, () => {})
  subscribers.publish('user', { event: 'trips.changed' })
  await subscription.closed
  assert.equal(subscribers.size, 0)
})
