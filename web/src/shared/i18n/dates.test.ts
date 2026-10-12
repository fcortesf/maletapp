import { it, expect } from 'vitest'
import { formatDate, tripStatus, progress } from './dates'
import type { Item, Trip } from '../api/types'
it('date-only formatting is invariant across western and eastern timezones', () => {
  const original = process.env.TZ
  for (const timezone of ['Pacific/Honolulu', 'Asia/Tokyo', 'Europe/Madrid']) { process.env.TZ = timezone; expect(formatDate('2026-09-28')).toBe('28 Sept 2026') }
  process.env.TZ = original
})
it('status and packing progress are independent of lifecycle and quantity', () => {
  const items = [{ isPacked: true, itemCount: 10 }, { isPacked: false }] as Item[]
  const trip = { id: 'a', destination: 'Test', isFinished: false, startDate: null, endDate: null } as Trip
  expect(progress(items)).toEqual({ packed: 1, total: 2, percent: 50 })
  expect(progress([]).percent).toBe(0)
  expect(tripStatus(trip, items)).toBe('preparing')
  expect(tripStatus({ ...trip, endDate: '2020-01-01' }, items)).toBe('past')
  expect(tripStatus({ ...trip, isFinished: true, endDate: '2020-01-01' }, items)).toBe('finished')
})
