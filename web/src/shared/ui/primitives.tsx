import { useRef, type ComponentProps, type ReactNode, type RefObject } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { useTranslation } from 'react-i18next'
import styles from './primitives.module.css'
export function Button({ tone, className = '', ...props }: ComponentProps<'button'> & { tone?: 'primary' | 'danger' }) { return <button {...props} className={`${styles.button} ${tone ? styles[tone] : ''} ${className}`}/> }
export function Input(props: ComponentProps<'input'>) { return <input {...props}/> }
export function Badge({ children }: { children: ReactNode }) { return <span className={styles.badge}>{children}</span> }
export function Icon({ name }: { name: 'plus' | 'close' | 'menu' | 'bag' | 'arrow' }) {
  const paths = { plus: 'M12 5v14M5 12h14', close: 'm6 6 12 12M18 6 6 18', menu: 'M4 6h16M4 12h16M4 18h16', bag: 'M5 8h14v12H5zM9 8V5h6v3', arrow: 'm13 5-7 7 7 7M6 12h14' }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={paths[name]}/></svg>
}
export function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) { return <div className={styles.field}><label htmlFor={id}>{label}</label>{children}{error && <span id={`${id}-error`} className={styles.error}>{error}</span>}</div> }
export function Modal({ open, onOpenChange, title, description, children, returnFocusRef }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: ReactNode; returnFocusRef?: RefObject<HTMLElement | null> }) {
  const { t } = useTranslation()
  const returnFocus = useRef(document.activeElement as HTMLElement | null)
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={styles.dialog} onCloseAutoFocus={event => { event.preventDefault(); const target = returnFocusRef?.current?.isConnected ? returnFocusRef.current : returnFocus.current?.isConnected ? returnFocus.current : document.querySelector<HTMLElement>('main button') ?? document.querySelector<HTMLElement>('main a'); target?.focus() }}><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description><Dialog.Close asChild><Button className={styles.close} aria-label={t('close')}><Icon name="close"/></Button></Dialog.Close>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>
}
export function Menu({ label, children }: { label: string; children: ReactNode }) { return <Dropdown.Root><Dropdown.Trigger asChild><Button aria-label={label}><Icon name="menu"/></Button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content className={styles.menu} sideOffset={5}>{children}</Dropdown.Content></Dropdown.Portal></Dropdown.Root> }
export function MenuItem({ children, onSelect, disabled }: { children: ReactNode; onSelect: () => void; disabled?: boolean }) { return <Dropdown.Item className={styles.menuItem} disabled={disabled} onSelect={onSelect}>{children}</Dropdown.Item> }
export const formClass = styles.form
export const footerClass = styles.footer
