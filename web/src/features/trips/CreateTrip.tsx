import { useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button, Modal, Input, FormField, formClass, footerClass } from '../../shared/ui/primitives'
import { ErrorMessage, useOnline } from '../../shared/ui/state'
import { useWrite } from './queries'
import type { Trip, NewTrip } from '../../shared/api/types'
export function CreateTrip({ open, close }: { open: boolean; close: () => void }) {
  const { t } = useTranslation(), navigate = useNavigate(), online = useOnline()
  const [destination, setDestination] = useState(''), [startDate, setStartDate] = useState(''), [endDate, setEndDate] = useState(''), [invalid, setInvalid] = useState<'destination' | 'endDate' | null>(null)
  const input = useRef<HTMLInputElement>(null), endInput = useRef<HTMLInputElement>(null)
  const create = useWrite<Trip>('/trips', 'POST', undefined, trip => { close(); navigate(`/trips/${trip.id}`) })
  return <Modal open={open} onOpenChange={value => { if (!value && !create.isPending) close() }} title={t('trips:create')} description={t('trips:subtitle')}><form noValidate className={formClass} onSubmit={event => {
    event.preventDefault(); if (create.isPending) return
    if (!destination.trim()) { setInvalid('destination'); input.current?.focus(); return }
    if (startDate && endDate && startDate > endDate) { setInvalid('endDate'); endInput.current?.focus(); return }
    setInvalid(null); const body: NewTrip = { destination: destination.trim(), startDate: startDate || null, endDate: endDate || null }; create.mutate(body)
  }}><FormField id="destination" label={t('trips:destination')} error={invalid === 'destination' ? t('validation') : undefined}><Input id="destination" ref={input} aria-invalid={invalid === 'destination'} aria-describedby={invalid === 'destination' ? 'destination-error' : undefined} value={destination} onChange={e => setDestination(e.target.value)} autoComplete="off"/></FormField>
    <FormField id="startDate" label={t('trips:startDate')}><Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}/></FormField>
    <FormField id="endDate" label={t('trips:endDate')} error={invalid === 'endDate' ? t('validation') : undefined}><Input ref={endInput} aria-invalid={invalid === 'endDate'} aria-describedby={invalid === 'endDate' ? 'endDate-error' : undefined} id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)}/></FormField>
    {create.isError && <ErrorMessage error={create.error}/>}{!online && <p role="status">{t('offline')}</p>}<div className={footerClass}><Button type="button" onClick={close}>{t('cancel')}</Button><Button tone="primary" disabled={create.isPending || !online}>{t('trips:create')}</Button></div></form></Modal>
}
