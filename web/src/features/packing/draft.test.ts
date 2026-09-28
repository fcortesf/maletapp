import { it, expect } from 'vitest'
import { draftOf, dirtyPayload, observedConflict } from './draft'
import type { Item } from '../../shared/api/types'
it('sends only dirty fields, explicitly clears nullable fields and preserves packing/category', () => {
  const initial = draftOf({ name: 'Phone', notes: 'Keep', itemCount: 2, category: 'electronics', isPacked: false } as Item)
  expect(dirtyPayload(initial, { ...initial, notes: '' })).toEqual({ notes: null })
  expect(dirtyPayload(initial, { ...initial, itemCount: '' })).toEqual({ itemCount: null })
  expect(dirtyPayload(initial, initial)).toEqual({})
  expect(dirtyPayload(initial, { ...initial, category: 'other' })).toEqual({ category: 'other' })
})
it('detects only observed changes to dirty fields and preserves the draft', () => {
  const initial = draftOf({ name: 'Phone', notes: 'Keep', category: 'electronics' } as Item), draft = { ...initial, notes: 'My draft' }
  expect(observedConflict(initial, draft, { ...initial, category: 'health' })).toBe(false)
  expect(observedConflict(initial, draft, { ...initial, notes: 'Agent edit' })).toBe(true)
  expect(draft.notes).toBe('My draft')
})
