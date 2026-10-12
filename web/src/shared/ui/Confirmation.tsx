import { useTranslation } from 'react-i18next'
import { Button, Modal, footerClass } from './primitives'
import { ErrorMessage, useOnline } from './state'
export function Confirmation({ title, description, close, confirm, pending, error }: { title: string; description: string; close: () => void; confirm: () => void; pending: boolean; error?: unknown }) {
  const { t } = useTranslation(), online = useOnline()
  return <Modal open onOpenChange={open => { if (!open && !pending) close() }} title={title} description={description}>{!!error && <ErrorMessage error={error}/>}<div className={footerClass}><Button onClick={close}>{t('cancel')}</Button><Button tone="danger" disabled={pending || !online} onClick={confirm}>{t('delete')}</Button></div></Modal>
}
