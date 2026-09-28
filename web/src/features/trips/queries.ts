import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRuntime } from '../../app/runtime'
import type { Trip, Item } from '../../shared/api/types'
export function useTrips() { const { scope, transport } = useRuntime(); return useQuery({ queryKey: [scope, 'trips'], enabled: !!scope, queryFn: ({ signal }) => transport.request<Trip[]>('/trips', 'GET', undefined, signal) }) }
export function useTrip(id: string) { const { scope, transport } = useRuntime(); return useQuery({ queryKey: [scope, 'trip', id], enabled: !!scope, queryFn: ({ signal }) => transport.request<Trip>(`/trips/${id}`, 'GET', undefined, signal) }) }
export function useItems(id: string) { const { scope, transport } = useRuntime(); return useQuery({ queryKey: [scope, 'items', id], enabled: !!scope, queryFn: ({ signal }) => transport.request<Item[]>(`/trips/${id}/items`, 'GET', undefined, signal) }) }
export function useWrite<T>(path: string, method: string, tripId?: string, after?: (result: T) => void) {
  const { scope, transport, invalidate, notify } = useRuntime(), client = useQueryClient()
  return useMutation({ mutationFn: (body?: unknown) => transport.request<T>(path, method, body), retry: false,
    onSuccess: async result => {
      const itemOperation = path.startsWith('/items') || path.endsWith('/items')
      const resourceId = path.split('/')[2]
      if (method === 'DELETE') {
        if (itemOperation) {
          client.removeQueries({ queryKey: [scope, 'item', resourceId] })
          client.setQueryData<Item[]>([scope, 'items', tripId], items => items?.filter(item => item.id !== resourceId))
        } else {
          client.removeQueries({ queryKey: [scope, 'trip', tripId] }); client.removeQueries({ queryKey: [scope, 'items', tripId] })
          client.setQueryData<Trip[]>([scope, 'trips'], trips => trips?.filter(trip => trip.id !== tripId))
        }
      } else if (result && typeof result === 'object' && 'id' in result) {
        const resource = result as unknown as Item & Trip
        client.setQueryData([scope, itemOperation ? 'item' : 'trip', resource.id], result)
        const key = itemOperation ? [scope, 'items', tripId] : [scope, 'trips']
        client.setQueryData<(Item | Trip)[]>(key, previous => previous ? previous.some(item => item.id === resource.id) ? previous.map(item => item.id === resource.id ? resource : item) : [...previous, resource] : previous)
      }
      notify(itemOperation ? method === 'DELETE' ? 'packing:deleted' : method === 'POST' ? 'packing:added' : 'packing:updated' : method === 'DELETE' ? 'trips:deleted' : path === '/trips' ? 'trips:created' : 'trips:updated')
      after?.(result)
      await client.invalidateQueries({ queryKey: [scope], refetchType: 'none' })
      invalidate(itemOperation ? { event: 'items.changed', tripId } : { event: 'trips.changed', tripId })
    }, onError: async () => { await client.invalidateQueries({ queryKey: [scope] }, { cancelRefetch: false }) } })
}
