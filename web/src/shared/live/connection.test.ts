import { it, expect, vi } from 'vitest'
import { connectLive } from './connection'
import { Session } from '../auth/session'
const session = () => new Session({ token: 'memory', tokenParsed: { sub: 'a', iss: 'issuer' }, async updateToken() { return true }, clearToken() {}, async logout() {} }, false)
it('ready reconciles, malformed versions degrade without reconnecting and cleanup stops timers', async () => {
  vi.useFakeTimers()
  const receive = vi.fn(), status = vi.fn()
  const fetch = vi.fn(async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('event: ready\ndata: {"version":1,"expiresAt":"2099-01-01T00:00:00Z"}\n\nevent: items.changed\ndata: {"version":2}\n\n')) } })))
  vi.stubGlobal('fetch', fetch)
  const stop = connectLive(session(), receive, status)
  for (let i = 0; i < 12; i++) await Promise.resolve()
  expect(receive).toHaveBeenCalledTimes(2); expect(status).toHaveBeenCalledWith('degraded')
  stop(); await vi.advanceTimersByTimeAsync(100_000)
  expect(fetch).toHaveBeenCalledOnce()
  vi.unstubAllGlobals(); vi.useRealTimers()
})
it('honors capacity Retry-After and never reconnects after logout cleanup', async () => {
  vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429, headers: { 'Retry-After': '30' } })))
  const auth = session(), stop = connectLive(auth, vi.fn(), vi.fn())
  for (let i = 0; i < 12; i++) await Promise.resolve()
  await vi.advanceTimersByTimeAsync(29_000); expect(fetch).toHaveBeenCalledOnce()
  stop(); auth.clear(); await vi.advanceTimersByTimeAsync(100_000); expect(fetch).toHaveBeenCalledOnce()
  vi.unstubAllGlobals(); vi.useRealTimers()
})
it('expiry replaces a stream, byte watchdog reconnects and each old stream closes first', async () => {
  vi.useFakeTimers()
  let active = 0, maximum = 0, calls = 0
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    calls++; active++; maximum = Math.max(maximum, active)
    let ended = false
    const end = () => { if (!ended) { ended = true; active-- } }
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`event: ready\ndata: ${JSON.stringify({ version: 1, expiresAt: new Date(Date.now() + (calls === 1 ? 45_000 : 300_000)).toISOString() })}\n\n`))
        init.signal!.addEventListener('abort', () => { end(); controller.error(new DOMException('Aborted', 'AbortError')) }, { once: true })
      }, cancel: end
    }))
  }))
  const stop = connectLive(session(), vi.fn(), vi.fn())
  for (let i = 0; i < 12; i++) await Promise.resolve()
  await vi.advanceTimersByTimeAsync(30_001)
  expect(calls).toBe(2); expect(maximum).toBe(1)
  await vi.advanceTimersByTimeAsync(47_000)
  expect(calls).toBeGreaterThan(2); expect(maximum).toBe(1)
  stop(); await vi.advanceTimersByTimeAsync(100_000); expect(active).toBe(0)
  vi.unstubAllGlobals(); vi.useRealTimers()
})
