import type { Handler } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { GatewayEnv } from './auth.ts'

export type Change = { event: 'trips.changed' | 'items.changed'; tripId?: string; itemId?: string }
export interface Clock {
  now(): number
  set(callback: () => void, milliseconds: number): ReturnType<typeof setTimeout>
  clear(timer: ReturnType<typeof setTimeout>): void
}
const systemClock: Clock = { now: Date.now, set: (callback, milliseconds) => setTimeout(callback, milliseconds), clear: clearTimeout }
const guid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const trip = new RegExp(`^/trips/(${guid})(?:/(finish|reopen|items))?$`, 'i')
const item = new RegExp(`^/items/(${guid})$`, 'i')
export function classifyChange(method: string, path: string, status: number): Change | undefined {
  if (method === 'POST' && path === '/trips' && status === 201) return { event: 'trips.changed' }
  const t = trip.exec(path)
  if (t && ((method === 'DELETE' && !t[2] && status === 204) ||
    (method === 'POST' && ['finish', 'reopen'].includes(t[2] ?? '') && status === 200))) {
    return { event: 'trips.changed', tripId: t[1].toLowerCase() }
  }
  if (t && method === 'POST' && t[2] === 'items' && status === 201) return { event: 'items.changed', tripId: t[1].toLowerCase() }
  const i = item.exec(path)
  if (i && ((method === 'PATCH' && status === 200) || (method === 'DELETE' && status === 204))) return { event: 'items.changed', itemId: i[1].toLowerCase() }
}

export class Subscribers {
  private readonly users = new Map<string, Set<Subscription>>()
  private count = 0
  private readonly clock: Clock
  constructor(clock: Clock = systemClock) { this.clock = clock }
  get size() { return this.count }
  reserve(userId: string, tokenExpiresAt: number): Subscription | undefined {
    const user = userId.toLowerCase()
    const current = this.users.get(user) ?? new Set<Subscription>()
    if (current.size >= 10 || this.count >= 1000) return undefined
    const subscription = new Subscription(this.clock, Math.min(tokenExpiresAt, this.clock.now() + 300_000), () => {
      if (current.delete(subscription)) this.count--
      if (!current.size) this.users.delete(user)
    })
    current.add(subscription)
    this.users.set(user, current)
    this.count++
    return subscription
  }
  publish(userId: string, change: Change): void {
    const { event, ...hints } = change
    const frame = `event: ${event}\ndata: ${JSON.stringify({ version: 1, ...hints })}\n\n`
    for (const subscription of this.users.get(userId.toLowerCase()) ?? []) subscription.enqueue(frame)
  }
  close(): void {
    for (const subscriptions of this.users.values()) for (const subscription of subscriptions) subscription.close()
  }
}

export class Subscription {
  private readonly queue: string[] = []
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()
  private writer?: (frame: string) => Promise<unknown>
  private abort?: () => void
  private pumping = false
  private ended = false
  private resolveClosed!: () => void
  readonly closed = new Promise<void>(resolve => { this.resolveClosed = resolve })
  private readonly clock: Clock
  readonly expiresAt: number
  private readonly remove: () => void
  constructor(clock: Clock, expiresAt: number, remove: () => void) {
    this.clock = clock
    this.expiresAt = expiresAt
    this.remove = remove
    this.queue.push(`event: ready\ndata: ${JSON.stringify({ version: 1, expiresAt: new Date(expiresAt).toISOString() })}\n\n`)
    this.schedule(() => this.close(), Math.max(0, expiresAt - clock.now()))
    const heartbeat = () => { if (!this.ended) { this.enqueue(': heartbeat\n\n'); this.schedule(heartbeat, 15_000) } }
    this.schedule(heartbeat, 15_000)
  }
  attach(writer: (frame: string) => Promise<unknown>, abort: () => void) {
    this.writer = writer
    this.abort = abort
    if (this.ended) { abort(); return }
    void this.pump()
  }
  enqueue(frame: string): void {
    if (this.ended) return
    if (this.clock.now() >= this.expiresAt || this.queue.length >= 32) { this.close(); return }
    this.queue.push(frame)
    void this.pump()
  }
  close(): void {
    if (this.ended) return
    this.ended = true
    this.queue.length = 0
    for (const timer of this.timers) this.clock.clear(timer)
    this.timers.clear()
    this.remove()
    this.resolveClosed()
    this.abort?.()
  }
  private schedule(callback: () => void, milliseconds: number) {
    const timer = this.clock.set(() => { this.timers.delete(timer); callback() }, milliseconds)
    this.timers.add(timer)
    return timer
  }
  private async pump(): Promise<void> {
    if (this.pumping || !this.writer || this.ended) return
    this.pumping = true
    try {
      while (this.queue.length && !this.ended) {
        if (this.clock.now() >= this.expiresAt) { this.close(); break }
        const frame = this.queue.shift()!
        const timer = this.schedule(() => this.close(), 5_000)
        await Promise.race([this.writer(frame), this.closed])
        this.clock.clear(timer)
        this.timers.delete(timer)
      }
    } catch { this.close() }
    finally { this.pumping = false }
  }
}

export function events(subscribers: Subscribers): Handler<GatewayEnv> {
  return c => {
    const subscription = subscribers.reserve(c.get('userId'), c.get('tokenExpiresAt'))
    if (!subscription) { c.header('Retry-After', '30'); return c.json({ error: 'stream_capacity' }, 429) }
    const signal = c.req.raw.signal
    const abort = () => subscription.close()
    signal.addEventListener('abort', abort, { once: true })
    const response = streamSSE(c, async stream => {
      stream.onAbort(abort)
      subscription.attach(frame => stream.write(frame), () => stream.abort())
      if (signal.aborted) subscription.close()
      try { await subscription.closed }
      finally { signal.removeEventListener('abort', abort); subscription.close() }
    })
    response.headers.set('Cache-Control', 'no-store, no-transform')
    response.headers.set('X-Accel-Buffering', 'no')
    return response
  }
}
