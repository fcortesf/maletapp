import { it, expect, vi } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { Reconciler } from './reconcile'
it('coalesces bursts, keeps inactive queries stale and isolates other scopes', async () => {
  vi.useFakeTimers()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['user', 'items', 'trip'], [])
  client.setQueryData(['other', 'items', 'trip'], [])
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const reconciler = new Reconciler(client, 'user')
  for (let i = 0; i < 100; i++) { reconciler.change({ event: 'items.changed', itemId: 'item' }); await vi.advanceTimersByTimeAsync(5) }
  await vi.advanceTimersByTimeAsync(1000)
  expect(invalidate).toHaveBeenCalledTimes(1)
  expect(client.getQueryState(['user', 'items', 'trip'])?.isInvalidated).toBe(true)
  expect(client.getQueryState(['other', 'items', 'trip'])?.isInvalidated).toBe(false)
  reconciler.dispose(); client.clear(); vi.useRealTimers()
})
it('refreshes once more when a change arrives during an existing GET', async () => {
  vi.useFakeTimers()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let release!: (value: number) => void
  let reads = 0
  const observer = new QueryObserver(client, { queryKey: ['user', 'items', 'trip'], queryFn: async () => { reads++; return reads === 1 ? new Promise<number>(resolve => { release = resolve }) : 2 } })
  const unsubscribe = observer.subscribe(() => {})
  const reconciler = new Reconciler(client, 'user')
  reconciler.change({ event: 'items.changed', tripId: 'trip' })
  await vi.advanceTimersByTimeAsync(250)
  release(1); for (let i = 0; i < 10; i++) await Promise.resolve()
  expect(reads).toBe(2)
  expect(client.getQueryData(['user', 'items', 'trip'])).toBe(2)
  reconciler.dispose(); unsubscribe(); client.clear(); vi.useRealTimers()
})
