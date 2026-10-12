import type { Session } from '../auth/session'
import { gatewayBase } from '../api/transport'
import { SseParser } from './parser'
import type { Change } from './reconcile'
export type LiveStatus = 'connecting' | 'connected' | 'disconnected' | 'degraded'
export function connectLive(session: Session, receive: (change?: Change) => void, status: (status: LiveStatus) => void) {
  const lifetime = new AbortController()
  const generation = session.generation
  const signal = AbortSignal.any([lifetime.signal, session.signal])
  let connection: AbortController | undefined
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let stopDelay: (() => void) | undefined
  let attempts = 0
  let halted = false
  let authRetries = 0
  const delay = (ms: number) => new Promise<void>(resolve => {
    stopDelay = resolve
    reconnectTimer = setTimeout(resolve, ms)
  })
  const valid = () => !signal.aborted && session.generation === generation
  const run = async () => {
    while (valid() && !halted) {
      if (!navigator.onLine) { status('disconnected'); await delay(1000); continue }
      let nextDelay = Math.min(30_000, Math.min(1000 * 2 ** attempts++, 30_000) * (0.75 + Math.random() * 0.5))
      let watchdog: ReturnType<typeof setTimeout> | undefined
      let renewal: ReturnType<typeof setTimeout> | undefined
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
      let renewNow = false
      connection = new AbortController()
      try {
        status('connecting')
        const token = await session.token()
        if (!valid()) break
        const response = await fetch(gatewayBase + '/events', { credentials: 'omit', headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal: AbortSignal.any([signal, connection.signal]) })
        if (!response.ok) {
          await response.body?.cancel()
          if (response.status === 401) {
            if (authRetries++ > 0) { session.clear(); break }
            await session.token(true); nextDelay = 0
          }
          if (response.status === 403) { session.clear(); break }
          if (response.status === 429) {
            const retry = response.headers.get('Retry-After') ?? '30'
            nextDelay = /^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now())
          }
          throw new Error('Disconnected')
        }
        const parser = new SseParser(frame => {
          if (!['ready', 'trips.changed', 'items.changed'].includes(frame.event)) return
          try {
            const data = JSON.parse(frame.data)
            const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (data.version !== 1 || (data.tripId !== undefined && !guid.test(data.tripId)) || (data.itemId !== undefined && !guid.test(data.itemId))) throw new Error('Malformed')
            if (frame.event === 'ready') {
              const expiry = Date.parse(data.expiresAt)
              if (typeof data.expiresAt !== 'string' || !Number.isFinite(expiry) || expiry <= Date.now()) throw new Error('Malformed')
              attempts = 0; authRetries = 0; status('connected'); receive()
              clearTimeout(renewal)
              renewal = setTimeout(() => { renewNow = true; connection?.abort() }, Math.max(0, expiry - Date.now() - 15_000))
            } else receive({ event: frame.event as Change['event'], tripId: data.tripId, itemId: data.itemId })
          } catch { halted = true; status('degraded'); receive(); connection?.abort() }
        })
        reader = response.body!.getReader()
        const decoder = new TextDecoder()
        const heartbeat = () => { clearTimeout(watchdog); watchdog = setTimeout(() => connection?.abort(), 45_000) }
        heartbeat()
        while (valid()) {
          const { done, value } = await reader.read()
          if (done) break
          heartbeat(); parser.push(decoder.decode(value, { stream: true }))
        }
      } catch { if (valid() && !halted) status('disconnected') }
      finally { clearTimeout(watchdog); clearTimeout(renewal); connection.abort(); await reader?.cancel().catch(() => {}) }
      if (!valid() || halted) break
      if (renewNow) { await session.token().catch(() => {}); nextDelay = 0 }
      if (!valid()) break
      await delay(nextDelay)
    }
  }
  void run()
  const online = () => { clearTimeout(reconnectTimer); stopDelay?.() }
  const offline = () => { connection?.abort(); status('disconnected') }
  window.addEventListener('offline', offline)
  window.addEventListener('online', online)
  const stop = () => { lifetime.abort(); connection?.abort(); clearTimeout(reconnectTimer); stopDelay?.(); window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  signal.addEventListener('abort', stop, { once: true })
  return () => { signal.removeEventListener('abort', stop); stop() }
}
