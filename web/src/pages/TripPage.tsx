import { useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useTrip, useItems, useWrite } from '../features/trips/queries'
import { ItemEditor } from '../features/packing/ItemEditor'
import { ItemRow } from '../features/packing/ItemRow'
import { categories, type Trip, type Item, type Category } from '../shared/api/types'
import { Button, Badge, Icon, Menu, MenuItem } from '../shared/ui/primitives'
import { Confirmation } from '../shared/ui/Confirmation'
import { ErrorMessage, useOnline, useToday } from '../shared/ui/state'
import { ApiError } from '../shared/api/transport'
import { progress, tripStatus, formatDate } from '../shared/i18n/dates'
import styles from './pages.module.css'
export function TripPage() {
  const { tripId = '' } = useParams(), { t } = useTranslation(), navigate = useNavigate(), online = useOnline(), today = useToday()
  const trip = useTrip(tripId), items = useItems(tripId), [grouped, setGrouped] = useState(true), [confirm, setConfirm] = useState(false)
  const [editor, setEditor] = useState<{ item?: Item; suggestion?: { name: string; category: Category } } | null>(null)
  const add = useRef<HTMLButtonElement>(null)
  const remove = useWrite<void>(`/trips/${tripId}`, 'DELETE', tripId, () => navigate('/trips'))
  const lifecycle = useWrite<Trip>(`/trips/${tripId}/${trip.data?.isFinished ? 'reopen' : 'finish'}`, 'POST', tripId)
  const missing = (trip.error instanceof ApiError && trip.error.code === 'missing') || (items.error instanceof ApiError && items.error.code === 'missing')
  const counts = items.data ? progress(items.data) : undefined
  const closeEditor = () => { setEditor(null); if (missing) navigate('/trips'); else setTimeout(() => add.current?.focus(), 0) }
  return <main><Link to="/trips"><Icon name="arrow"/>{t('back')}</Link>
    {trip.isPending ? <p role="status">{t('loading')}</p> : missing || !trip.data ? <ErrorMessage error={trip.error ?? items.error} retry={missing ? undefined : () => { void trip.refetch() }}/>: <>
      <div className={styles.heading}><div><Badge>{t(`trips:${tripStatus(trip.data, items.data, today)}`)}</Badge><h1>{trip.data.destination}</h1><p>{trip.data.startDate ? formatDate(trip.data.startDate) : t('trips:undated')}{trip.data.endDate && ` – ${formatDate(trip.data.endDate)}`}</p></div><Menu label={t('actions')}><MenuItem disabled={lifecycle.isPending || !online} onSelect={() => lifecycle.mutate(undefined)}>{t(trip.data.isFinished ? 'trips:reopen' : 'trips:finish')}</MenuItem><MenuItem onSelect={() => setConfirm(true)}>{t('delete')}</MenuItem></Menu></div>
      {lifecycle.isError && <ErrorMessage error={lifecycle.error}/>}
      <div className={styles.detail}><aside className={styles.progress}><Icon name="bag"/><h2>{t('packing:title')}</h2>{items.isPending ? <p>{t('loading')}</p> : items.isError ? <><p>{t('unavailable')}</p><Button onClick={() => { void items.refetch() }}>{t('retry')}</Button></> : counts && <><progress max="100" value={counts.percent} aria-label={t('packing:progress', counts)}/><p>{t('packing:progress', counts)}</p></>}</aside><section aria-label={t('packing:title')}>
        <div className={styles.toolbar}><Button ref={add} tone="primary" onClick={() => setEditor({})}><Icon name="plus"/>{t('packing:add')}</Button><Button onClick={() => setGrouped(!grouped)}>{t(grouped ? 'packing:flat' : 'packing:grouped')}</Button></div>
        {items.data?.length === 0 && <div className={styles.empty}><h2>{t('packing:empty')}</h2><p>{t('packing:emptyBody')}</p></div>}
        {items.data && (grouped ? categories.map(category => { const group = items.data.filter(item => item.category === category); return group.length ? <details key={category} open className={styles.category}><summary>{t(`packing:${category}`)} · {t('count', { count: group.length })}</summary>{group.map(item => <ItemRow key={item.id} tripId={tripId} item={item} edit={() => setEditor({ item })}/>)}</details> : null }) : <div className={styles.category}>{items.data.map(item => <ItemRow key={item.id} tripId={tripId} item={item} edit={() => setEditor({ item })}/>)}</div>)}
        <h3>{t('packing:suggestions')}</h3><div className={styles.suggestions}>{([['suggestionPassport', 'documents'], ['suggestionSocks', 'clothing'], ['suggestionCharger', 'electronics']] as const).map(([key, category]) => <Button key={key} onClick={() => setEditor({ suggestion: { name: t(`packing:${key}`), category } })}>{t(`packing:${key}`)}</Button>)}</div>
      </section></div></>}
    {confirm && <Confirmation title={t('trips:deleteTitle')} description={t('trips:deleteBody')} close={() => setConfirm(false)} confirm={() => remove.mutate(undefined)} pending={remove.isPending} error={remove.error}/>}
    {editor && <ItemEditor returnFocusRef={add} tripId={tripId} item={editor.item} suggestion={editor.suggestion} missing={missing || (!!editor.item && !!items.data && !items.isError && !items.data.some(item => item.id === editor.item!.id))} close={closeEditor}/>}
  </main>
}
