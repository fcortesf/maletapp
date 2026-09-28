import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Item } from '../../shared/api/types'
import { Button } from '../../shared/ui/primitives'
import { ErrorMessage, useOnline } from '../../shared/ui/state'
import { Confirmation } from '../../shared/ui/Confirmation'
import { useWrite } from '../trips/queries'
import styles from '../../pages/pages.module.css'
export function ItemRow({ item, tripId, edit }: { item: Item; tripId: string; edit: () => void }) {
  const { t } = useTranslation(), online = useOnline(), [confirm, setConfirm] = useState(false)
  const pack = useWrite<Item>(`/items/${item.id}`, 'PATCH', tripId)
  const remove = useWrite<void>(`/items/${item.id}`, 'DELETE', tripId, () => setConfirm(false))
  return <><div className={styles.row}><input type="checkbox" checked={item.isPacked} disabled={pack.isPending || remove.isPending || !online} aria-label={`${t('packing:packed')}: ${item.name}`} onChange={e => pack.mutate({ isPacked: e.target.checked })}/><div className={styles.rowBody} data-packed={item.isPacked}><button onClick={edit}>{item.name}</button><p>{t(`packing:${item.category}`)}{item.itemCount != null && ` · ${new Intl.NumberFormat('en-GB').format(item.itemCount)}`}</p>{item.notes && <p>{item.notes}</p>}{pack.isError && <ErrorMessage error={pack.error}/>}</div><Button aria-label={`${t('delete')}: ${item.name}`} tone="danger" onClick={() => setConfirm(true)} disabled={remove.isPending}>{t('delete')}</Button></div>{confirm && <Confirmation title={t('packing:deleteTitle')} description={t('packing:deleteBody')} close={() => setConfirm(false)} confirm={() => remove.mutate(undefined)} pending={remove.isPending} error={remove.error}/>}</>
}
