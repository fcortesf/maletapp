import Keycloak from 'keycloak-js'
export interface Adapter {
  token?: string
  tokenParsed?: { sub?: string; iss?: string; exp?: number }
  updateToken(minValidity: number): Promise<boolean>
  clearToken(): void
  logout(options: { redirectUri: string }): Promise<void>
}
export function safeReturnPath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /[\r\n]/.test(path)) return '/trips'
  try {
    const url = new URL(path, 'https://app.invalid')
    if (url.origin !== 'https://app.invalid' || !/^\/trips(?:\/[^/]+)?$/.test(url.pathname)) return '/trips'
    return url.pathname + url.search + url.hash
  } catch { return '/trips' }
}
export class Session {
  private readonly adapter: Adapter
  private renewal?: Promise<boolean>
  private listeners = new Set<() => void>()
  private controller = new AbortController()
  private channel?: BroadcastChannel
  generation = 0
  scope = ''
  constructor(adapter: Adapter, crossTab = true) {
    this.adapter = adapter
    this.scope = this.identity()
    if (crossTab && typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('maletapp.logout')
      this.channel.onmessage = event => { if (event.data === 'logout') this.clear() }
    }
  }
  get signal() { return this.controller.signal }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  snapshot = () => `${this.generation}:${this.scope}`
  private identity() { const p = this.adapter.tokenParsed; return p?.iss && p.sub ? `${p.iss}|${p.sub.toLowerCase()}` : '' }
  clear(clearCredentials = true) {
    this.controller.abort()
    this.controller = new AbortController()
    this.generation++
    this.scope = ''
    if (clearCredentials) this.adapter.clearToken()
    for (const listener of this.listeners) listener()
  }
  async token(force = false): Promise<string> {
    const generation = this.generation
    if (!this.renewal) {
      this.renewal = this.adapter.updateToken(force ? -1 : 30)
      this.renewal.finally(() => { this.renewal = undefined }).catch(() => {})
    }
    try { await this.renewal } catch { this.clear(); throw new Error('session_expired') }
    if (generation !== this.generation) throw new DOMException('Session changed', 'AbortError')
    const nextScope = this.identity()
    if (nextScope !== this.scope) {
      this.controller.abort(); this.controller = new AbortController(); this.generation++
      this.scope = nextScope
      for (const listener of this.listeners) listener()
    }
    if (!this.adapter.token || !this.scope) throw new Error('session_expired')
    return this.adapter.token
  }
  async logout() {
    this.channel?.postMessage('logout')
    this.clear(false)
    await this.adapter.logout({ redirectUri: `${location.origin}/signed-out` })
  }
  dispose() { this.clear(); this.channel?.close() }
}
export async function initializeSession(): Promise<Session | undefined> {
  if (location.pathname === '/signed-out') return undefined
  const keycloak = new Keycloak({ url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080', realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'maletapp', clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'maletapp-web' })
  if (location.pathname !== '/callback') sessionStorage.setItem('maletapp.return', safeReturnPath(location.pathname + location.search + location.hash))
  await keycloak.init({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false, locale: 'en', redirectUri: `${location.origin}/callback` })
  if (location.pathname === '/callback') {
    const path = safeReturnPath(sessionStorage.getItem('maletapp.return') ?? '/trips')
    sessionStorage.removeItem('maletapp.return')
    history.replaceState(null, '', path)
  }
  return new Session(keycloak)
}
