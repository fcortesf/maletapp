import { useState, useRef, useEffect, type RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useRuntime } from '../../app/runtime'
import { categories, type Item, type NewItem, type Category } from '../../shared/api/types'
import { ApiError } from '../../shared/api/transport'
import { Button, Input, Modal, FormField, formClass, footerClass } from '../../shared/ui/primitives'
import { ErrorMessage, useOnline } from '../../shared/ui/state'
import { useWrite } from '../trips/queries'
import { draftOf, dirtyPayload, observedConflict, type Draft } from './draft'
export function ItemEditor({ tripId, item, missing, close, suggestion, returnFocusRef }: { tripId: string; item?: Item; missing: boolean; close: () => void; suggestion?: { name: string; category: Category }; returnFocusRef?: RefObject<HTMLElement | null> }) {
  const { t } = useTranslation(), { scope, transport } = useRuntime(), online = useOnline()
  const [initial, setInitial] = useState<Draft>(() => suggestion ? { ...draftOf(), ...suggestion } : draftOf(item))
  const [draft, setDraft] = useState(initial), [invalid, setInvalid] = useState<'name' | 'itemCount' | null>(null), [copied, setCopied] = useState(false)
  const input = useRef<HTMLInputElement>(null), countInput = useRef<HTMLInputElement>(null), removedMessage = useRef<HTMLParagraphElement>(null)
  const current = useQuery({ queryKey: [scope, 'item', item?.id], enabled: !!item && !missing, initialData: item, initialDataUpdatedAt: 0, queryFn: ({ signal }) => transport.request<Item>(`/items/${item!.id}`, 'GET', undefined, signal) })
  const removed = missing || (current.error instanceof ApiError && current.error.code === 'missing')
  const remote = draftOf(current.data)
  const conflict = !!item && observedConflict(initial, draft, remote)
  const write = useWrite<Item>(item ? `/items/${item.id}` : `/trips/${tripId}/items`, item ? 'PATCH' : 'POST', tripId, close)
  useEffect(() => { if (removed) removedMessage.current?.focus() }, [removed])
  const change = (key: keyof Draft, value: string) => setDraft(previous => ({ ...previous, [key]: value }))
  return <Modal open returnFocusRef={returnFocusRef} onOpenChange={open => { if (!open && !write.isPending) close() }} title={t(item ? 'packing:edit' : 'packing:add')} description={t('packing:title')}>
    {removed && <p ref={removedMessage} tabIndex={-1} role="alert">{t('removed')}</p>}
    {conflict && !removed && <div role="status"><p>{t('changed')}</p><Button onClick={() => { setInitial(remote); setDraft(remote) }}>{t('reload')}</Button></div>}
    <form noValidate className={formClass} onSubmit={event => {
      event.preventDefault(); if (removed || write.isPending || !online) return
      const quantity = draft.itemCount === '' ? null : Number(draft.itemCount)
      if (!draft.name.trim()) { setInvalid('name'); input.current?.focus(); return }
      if (quantity !== null && (!Number.isInteger(quantity) || quantity <= 0 || quantity > 2147483647)) { setInvalid('itemCount'); countInput.current?.focus(); return }
      setInvalid(null)
      if (item) write.mutate(dirtyPayload(initial, draft))
      else { const body: NewItem = { name: draft.name.trim(), category: draft.category, notes: draft.notes || null, itemCount: quantity }; write.mutate(body) }
    }}>
      <FormField id="item-name" label={t('packing:name')} error={invalid === 'name' ? t('validation') : undefined}><Input ref={input} id="item-name" value={draft.name} onChange={e => change('name', e.target.value)} aria-invalid={invalid === 'name'} aria-describedby={invalid === 'name' ? 'item-name-error' : undefined}/></FormField>
      <FormField id="item-category" label={t('packing:category')}><select id="item-category" value={draft.category} onChange={e => change('category', e.target.value)}>{categories.map(category => <option key={category} value={category}>{t(`packing:${category}`)}</option>)}</select></FormField>
      <FormField id="item-notes" label={t('packing:notes')}><textarea id="item-notes" value={draft.notes} onChange={e => change('notes', e.target.value)}/></FormField>
      <FormField id="item-count" label={t('packing:itemCount')} error={invalid === 'itemCount' ? t('validation') : undefined}><Input ref={countInput} aria-invalid={invalid === 'itemCount'} aria-describedby={invalid === 'itemCount' ? 'item-count-error' : undefined} id="item-count" type="number" min="1" max="2147483647" step="1" value={draft.itemCount} onChange={e => change('itemCount', e.target.value)}/></FormField>
      {write.isError && <ErrorMessage error={write.error}/>}{!online && <p role="status">{t('offline')}</p>}
      <div className={footerClass}>{removed && <Button type="button" onClick={() => { void navigator.clipboard.writeText(JSON.stringify(draft, null, 2)).then(() => setCopied(true)) }}>{t('copy')}</Button>}<Button type="button" onClick={close}>{t('cancel')}</Button><Button tone="primary" disabled={removed || write.isPending || !online}>{t(conflict ? 'deliberate' : 'save')}</Button></div>{copied && <p role="status">{t('copied')}</p>}
    </form></Modal>
}
