import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useTrips, useItems } from '../features/trips/queries'
import { CreateTrip } from '../features/trips/CreateTrip'
import type { Trip } from '../shared/api/types'
import { Button, Badge, Icon } from '../shared/ui/primitives'
import { Landscape } from '../shared/ui/Landscape'
import { ErrorMessage, useToday } from '../shared/ui/state'
import { formatDate, progress, tripStatus } from '../shared/i18n/dates'
import styles from './pages.module.css'
export function TripCard({ trip, today }: { trip: Trip; today: string }) {
  const { t } = useTranslation(), items = useItems(trip.id), counts = items.data ? progress(items.data) : undefined
  return <article className={styles.card}><Link to={`/trips/${trip.id}`}><Landscape seed={trip.id}/><div className={styles.cardBody}><Badge>{t(`trips:${tripStatus(trip, items.data, today)}`)}</Badge><h2>{trip.destination}</h2><p>{trip.startDate ? formatDate(trip.startDate) : t('trips:undated')}{trip.endDate && ` – ${formatDate(trip.endDate)}`}</p></div></Link><div className={styles.cardBody}>
    {items.isPending ? <p>{t('loading')}</p> : items.isError ? <><p>{t('unavailable')}</p><Button onClick={() => { void items.refetch() }}>{t('retry')}</Button></> : counts && <><progress max="100" value={counts.percent} aria-label={t('packing:progress', counts)}/><p>{t('packing:progress', counts)}</p></>}
  </div></article>
}
export function TripsPage() {
  const { t } = useTranslation(), trips = useTrips(), today = useToday(), [create, setCreate] = useState(false)
  return <main><div className={styles.heading}><div><h1>{t('trips:title')}</h1><p>{t('trips:subtitle')}</p></div><Button tone="primary" onClick={() => setCreate(true)}><Icon name="plus"/>{t('trips:create')}</Button></div>
    {trips.isPending ? <p role="status">{t('loading')}</p> : trips.data ? trips.data.length ? <div className={styles.grid}>{trips.data.map(trip => <TripCard key={trip.id} trip={trip} today={today}/>)}</div> : <div className={styles.empty}><h2>{t('trips:empty')}</h2><p>{t('trips:emptyBody')}</p></div> : <ErrorMessage error={trips.error} retry={() => { void trips.refetch() }}/>} {trips.data && trips.isError && <ErrorMessage error={trips.error} retry={() => { void trips.refetch() }}/>} {create && <CreateTrip open close={() => setCreate(false)}/>}</main>
}
