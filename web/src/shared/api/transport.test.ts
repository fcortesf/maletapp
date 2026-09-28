import { it, expect, vi } from 'vitest'
import { Transport, ReadLimiter, ApiError } from './transport'
import { Session } from '../auth/session'
const session = () => new Session({ token: 'only-memory', tokenParsed: { sub: 'a', iss: 'issuer' }, updateToken: async () => true, clearToken() {}, async logout() {} }, false)
it('bounds concurrent reads to four and removes canceled queued work', async () => {
  const limiter = new ReadLimiter(), abort = new AbortController(), releases: (() => void)[] = []
  let active = 0, maximum = 0, executed = 0
  const work = () => limiter.run(async () => { executed++; maximum = Math.max(maximum, ++active); await new Promise<void>(resolve => releases.push(resolve)); active-- }, abort.signal)
  const pending = Array.from({ length: 8 }, work)
  await Promise.resolve(); await Promise.resolve()
  expect(executed).toBe(4)
  const canceled = new AbortController()
  const never = limiter.run(async () => { throw new Error('Should never execute') }, canceled.signal)
  canceled.abort(); await expect(never).rejects.toBeDefined()
  for (let i = 0; i < 8; i++) { releases.shift()?.(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }
  await Promise.all(pending); expect(maximum).toBe(4)
})
it('never retries uncertain writes and carries no cookie credentials', async () => {
  const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => { throw new TypeError('Disconnected') }); vi.stubGlobal('fetch', fetch)
  const transport = new Transport(session())
  await expect(transport.request('/trips', 'POST', { destination: 'Test' })).rejects.toEqual(new ApiError('unknown'))
  expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0]?.[1]).toMatchObject({ credentials: 'omit' })
  vi.unstubAllGlobals()
})
it('late authenticated reads cannot return data after logout', async () => {
  let release!: (response: Response) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { release = resolve })))
  const auth = session(), transport = new Transport(auth)
  const pending = transport.request('/trips')
  for (let i = 0; i < 8; i++) await Promise.resolve()
  auth.clear(); release(new Response('[]'))
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  vi.unstubAllGlobals()
})
