import type { Item, Category, PatchItem } from '../../shared/api/types'
export type Draft = { name: string; notes: string; itemCount: string; category: Category }
export const draftOf = (item?: Item): Draft => ({ name: item?.name ?? '', notes: item?.notes ?? '', itemCount: item?.itemCount?.toString() ?? '', category: item?.category ?? 'other' })
export function dirtyPayload(initial: Draft, draft: Draft): PatchItem {
  const body: PatchItem = {}
  if (initial.name !== draft.name) body.name = draft.name.trim()
  if (initial.notes !== draft.notes) body.notes = draft.notes === '' ? null : draft.notes
  if (initial.itemCount !== draft.itemCount) body.itemCount = draft.itemCount === '' ? null : Number(draft.itemCount)
  if (initial.category !== draft.category) body.category = draft.category
  return body
}
export function observedConflict(initial: Draft, draft: Draft, current: Draft): boolean {
  return (Object.keys(initial) as (keyof Draft)[]).some(key => draft[key] !== initial[key] && current[key] !== initial[key])
}
