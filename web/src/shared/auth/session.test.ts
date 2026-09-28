import { describe, it, expect, vi } from 'vitest'
import { Session, safeReturnPath } from './session'
function fixture() {
  return { token: 'in-memory', tokenParsed: { sub: 'ABC', iss: 'issuer', exp: 999999 }, updateToken: vi.fn(async () => true), clearToken: vi.fn(), logout: vi.fn(async () => {}) }
}
describe('session', () => {
  it('accepts only app return paths', () => {
    expect(safeReturnPath('/trips/abc?view=grouped')).toBe('/trips/abc?view=grouped')
    for (const path of ['https://evil', '//evil', '/callback', '/signed-out', '/\\evil', '/trips/../callback']) expect(safeReturnPath(path)).toBe('/trips')
  })
  it('coordinates renewals and canonical scopes', async () => {
    const adapter = fixture(), session = new Session(adapter, false)
    await Promise.all([session.token(), session.token(), session.token()])
    expect(adapter.updateToken).toHaveBeenCalledTimes(1)
    expect(session.scope).toBe('issuer|abc')
  })
  it('aborts and signals caches before exposing a changed user', async () => {
    const adapter = fixture(), session = new Session(adapter, false), old = session.signal
    const listener = vi.fn(); session.subscribe(listener)
    adapter.tokenParsed.sub = 'DEF'
    await session.token()
    expect(old.aborted).toBe(true); expect(session.generation).toBe(1)
    expect(session.scope).toBe('issuer|def'); expect(listener).toHaveBeenCalledOnce()
  })
  it('rejects late renewal after logout and broadcasts no credentials', async () => {
    const adapter = fixture()
    let release!: () => void
    adapter.updateToken = vi.fn(() => new Promise(resolve => { release = () => resolve(true) }))
    const session = new Session(adapter, false)
    const token = session.token()
    session.clear(); release()
    await expect(token).rejects.toMatchObject({ name: 'AbortError' })
    expect(session.scope).toBe('')
  })
})
