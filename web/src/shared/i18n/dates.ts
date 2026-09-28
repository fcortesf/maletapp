import type { Trip, Item } from '../api/types'
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))
}
export function localDay(now = new Date()): string { return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }
export function tripStatus(trip: Trip, items: Item[] | undefined, today = localDay()) {
  if (trip.isFinished) return 'finished'
  if (trip.endDate && trip.endDate < today) return 'past'
  if (trip.startDate && trip.startDate <= today) return 'preparing'
  if (!trip.startDate && !trip.endDate && items?.some(i => i.isPacked)) return 'preparing'
  return 'upcoming'
}
export function progress(items: Item[]) { const packed = items.filter(i => i.isPacked).length; return { packed, total: items.length, percent: items.length ? Math.round(packed * 100 / items.length) : 0 } }
