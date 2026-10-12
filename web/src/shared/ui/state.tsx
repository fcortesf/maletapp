import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/transport'
import { Button } from './primitives'
import { useSyncExternalStore, useEffect, useState } from 'react'
import { localDay } from '../i18n/dates'
export function ErrorMessage({ error, retry }: { error: unknown; retry?: () => void }) { const { t } = useTranslation(); return <div role="alert"><p>{t(error instanceof ApiError ? error.code : 'network')}</p>{retry && <Button onClick={retry}>{t('retry')}</Button>}</div> }
export function useOnline() { return useSyncExternalStore(listener => { window.addEventListener('online', listener); window.addEventListener('offline', listener); return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener) } }, () => navigator.onLine) }
export function useToday() {
  const [day, setDay] = useState(localDay)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => { setDay(localDay()); clearTimeout(timer); const now = new Date(); const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); timer = setTimeout(refresh, tomorrow.getTime() - now.getTime() + 20) }
    refresh(); window.addEventListener('focus', refresh)
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh) }
  }, [])
  return day
}
