import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import '../shared/i18n'
import './styles.css'
import { initializeSession } from '../shared/auth/session'
import { Runtime, useRuntime } from './runtime'
import { TripsPage } from '../pages/TripsPage'
import { TripPage } from '../pages/TripPage'
import { Menu, MenuItem } from '../shared/ui/primitives'
function Site() {
  const { session, scope, live } = useRuntime(), { t } = useTranslation()
  if (!scope) return <SignedOut/>
  return <><header><Link to="/trips"><strong>{t('brand')}</strong></Link><Menu label={t('auth:account')}><MenuItem onSelect={() => { void session.logout() }}>{t('auth:logout')}</MenuItem></Menu></header><div style={{ maxWidth: 1160, margin: 'auto', padding: '0 1.25rem' }}><p role="status">{t(live)}</p></div><Routes><Route path="/trips" element={<TripsPage/>}/><Route path="/trips/:tripId" element={<TripPage/>}/><Route path="*" element={<Navigate to="/trips" replace/>}/></Routes></>
}
function SignedOut() { const { t } = useTranslation('auth'); return <main><h1>{t('signedOut')}</h1><a href="/trips">{t('login')}</a></main> }
const session = await initializeSession().catch(() => undefined)
const root = createRoot(document.getElementById('root')!)
root.render(session ? <Runtime session={session}><BrowserRouter><Site/></BrowserRouter></Runtime> : <SignedOut/> )
