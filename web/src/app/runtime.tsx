import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '../shared/auth/session'
import { Transport } from '../shared/api/transport'
import { createQueryClient } from '../shared/api/queries'
import { useTranslation } from 'react-i18next'
import { Reconciler, type Change } from '../shared/live/reconcile'
import { connectLive, type LiveStatus } from '../shared/live/connection'
const Context = createContext<{ session: Session; transport: Transport; scope: string; live: LiveStatus; invalidate: (change: Change) => void; notify: (key: string) => void } | undefined>(undefined)
export function Runtime({ session, children }: { session: Session; children: ReactNode }) {
  const snapshot = useSyncExternalStore(session.subscribe, session.snapshot)
  const client = useMemo(createQueryClient, [snapshot])
  const transport = useMemo(() => new Transport(session), [session, snapshot])
  const [live, setLive] = useState<LiveStatus>('connecting')
  const scope = session.scope
  const reconciler = useMemo(() => new Reconciler(client, scope), [client, scope])
  const [message, notify] = useState('')
  const { t } = useTranslation()
  useEffect(() => {
    const stopSession = session.subscribe(() => { void client.cancelQueries(); client.clear() })
    if (!scope) return () => { stopSession(); client.clear() }
    const stop = connectLive(session, change => change ? reconciler.change(change) : reconciler.all(), setLive)
    const reconcile = () => { if (document.visibilityState !== 'hidden') reconciler.all() }
    window.addEventListener('focus', reconcile); window.addEventListener('online', reconcile)
    document.addEventListener('visibilitychange', reconcile)
    // Reserve time for browser scheduling and the shared debounce within the
    // sixty-second recovery bound, rather than starting work at its deadline.
    const timer = setInterval(reconcile, 55_000)
    return () => { stop(); stopSession(); reconciler.dispose(); clearInterval(timer); window.removeEventListener('focus', reconcile); window.removeEventListener('online', reconcile); document.removeEventListener('visibilitychange', reconcile); void client.cancelQueries(); client.clear() }
  }, [client, scope, session, reconciler])
  useEffect(() => { if (!message) return; const timer = setTimeout(() => notify(''), 5000); return () => clearTimeout(timer) }, [message])
  return <QueryClientProvider client={client}><Context.Provider value={{ session, transport, scope, live, invalidate: change => reconciler.change(change), notify }}><div key={snapshot}>{children}{message && <p role="status" style={{ position: 'fixed', bottom: 16, left: 16, background: 'var(--color-success-soft)', padding: '1rem', borderRadius: 14 }}>{t(message)}</p>}</div></Context.Provider></QueryClientProvider>
}
export function useRuntime() { const context = useContext(Context); if (!context) throw new Error('Missing runtime'); return context }
