import type { Session } from '../auth/session'
export class ApiError extends Error {
  constructor(readonly code: 'validation' | 'auth' | 'forbidden' | 'missing' | 'conflict' | 'busy' | 'unknown' | 'network' | 'offline', readonly status = 0, readonly retryAfter = 0) { super(code) }
}
export class ReadLimiter {
  private active = 0
  private queue: (() => void)[] = []
  async run<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) throw signal.reason
    await new Promise<void>((resolve, reject) => {
      const start = () => { signal.removeEventListener('abort', abort); this.active++; resolve() }
      const abort = () => { this.queue = this.queue.filter(entry => entry !== start); reject(signal.reason) }
      if (this.active < 4) start()
      else { this.queue.push(start); signal.addEventListener('abort', abort, { once: true }) }
    })
    try { signal.throwIfAborted(); return await work() }
    finally { this.active--; this.queue.shift()?.() }
  }
}
export const gatewayBase = (import.meta.env.VITE_GATEWAY_BASE_URL ?? '/web').replace(/\/$/, '')
export class Transport {
  private readonly limiter = new ReadLimiter()
  constructor(private readonly session: Session) {}
  async request<T>(path: string, method = 'GET', body?: unknown, querySignal?: AbortSignal): Promise<T> {
    const generation = this.session.generation
    const sessionSignal = this.session.signal
    const signal = AbortSignal.any([sessionSignal, ...(querySignal ? [querySignal] : []), AbortSignal.timeout(15_000)])
    const work = async (): Promise<T> => {
      if (method !== 'GET' && !navigator.onLine) throw new ApiError('offline')
      const send = async (force = false) => {
        const token = await this.session.token(force)
        if (generation !== this.session.generation) throw new DOMException('Session changed', 'AbortError')
        return fetch(gatewayBase + path, { method, credentials: 'omit', signal, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
      }
      try {
        let response = await send()
        if (response.status === 401 && method === 'GET') { await response.body?.cancel(); response = await send(true) }
        if (generation !== this.session.generation || signal.aborted) throw new DOMException('Session changed', 'AbortError')
        if (!response.ok) {
          await response.body?.cancel()
          const codes: Record<number, ApiError['code']> = { 400: 'validation', 401: 'auth', 403: 'forbidden', 404: 'missing', 409: 'conflict', 429: 'busy' }
          if (response.status === 401) this.session.clear()
          const retry = response.headers.get('Retry-After')
          const retryAfter = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now())) : 0
          throw new ApiError(codes[response.status] ?? (method === 'GET' ? 'network' : 'unknown'), response.status, retryAfter)
        }
        const result = response.status === 204 ? undefined : await response.json()
        if (generation !== this.session.generation || sessionSignal.aborted) throw new DOMException('Session changed', 'AbortError')
        return result as T
      } catch (error) {
        if (error instanceof ApiError || sessionSignal.aborted || querySignal?.aborted) throw error
        if (!this.session.scope) throw new ApiError('auth')
        throw new ApiError(method === 'GET' ? 'network' : 'unknown')
      }
    }
    return method === 'GET' ? this.limiter.run(work, signal) : work()
  }
}
