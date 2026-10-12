import type { QueryClient, Query } from '@tanstack/react-query'
export type Change = { event: 'trips.changed' | 'items.changed'; tripId?: string; itemId?: string }
export class Reconciler {
  private changes: Change[] = []
  private debounce?: ReturnType<typeof setTimeout>
  private maximum?: ReturnType<typeof setTimeout>
  private running = false
  private disposed = false
  private stopWaiting?: () => void
  constructor(private readonly client: QueryClient, private readonly scope: string) {}
  change(change: Change) {
    if (this.disposed) return
    // A broad hint subsumes narrower work; queue is bounded regardless of burst size.
    if (this.changes.length >= 32) this.changes = [{ event: 'trips.changed' }]
    else this.changes.push(change)
    clearTimeout(this.debounce)
    this.debounce = setTimeout(() => { void this.flush() }, 250)
    this.maximum ??= setTimeout(() => { void this.flush() }, 1000)
  }
  all = () => this.change({ event: 'trips.changed' })
  private async flush() {
    clearTimeout(this.debounce); clearTimeout(this.maximum)
    this.debounce = this.maximum = undefined
    if (this.running || this.disposed || !this.changes.length) return
    const changes = this.changes; this.changes = []; this.running = true
    const predicate = (query: Query) => {
      const [scope, kind, id] = query.queryKey
      if (scope !== this.scope) return false
      return changes.some(c => c.event === 'trips.changed' ? !c.tripId || kind === 'trips' || id === c.tripId : ['items', 'item'].includes(String(kind)) && (!c.tripId || id === c.tripId))
    }
    const wasFetching = this.client.getQueryCache().findAll({ predicate }).some(q => q.state.fetchStatus === 'fetching')
    try {
      await this.client.invalidateQueries({ predicate, refetchType: 'active' }, { cancelRefetch: false })
      // Invalidation during an existing GET must wait for it before the trailing read.
      const fetching = this.client.getQueryCache().findAll({ predicate }).filter(q => q.state.fetchStatus === 'fetching')
      if (fetching.length) await new Promise<void>(resolve => {
        const finish = () => { unsubscribe(); this.stopWaiting = undefined; resolve() }
        const unsubscribe = this.client.getQueryCache().subscribe(() => {
          if (fetching.every(q => q.state.fetchStatus !== 'fetching') || this.disposed) { finish() }
        })
        this.stopWaiting = finish
      })
      if (wasFetching && !this.disposed) await this.client.invalidateQueries({ predicate, refetchType: 'active' }, { cancelRefetch: false })
    } finally {
      this.running = false
      if (this.changes.length && !this.disposed) { this.debounce = setTimeout(() => { void this.flush() }, 250) }
    }
  }
  dispose() { this.disposed = true; this.stopWaiting?.(); clearTimeout(this.debounce); clearTimeout(this.maximum); this.changes = [] }
}
