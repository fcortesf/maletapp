import { useTranslation } from 'react-i18next'
export function Landscape({ seed }: { seed: string }) {
  const { t } = useTranslation('trips')
  const variant = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3
  return <svg viewBox="0 0 360 160" role="img" aria-label={t('art')} width="100%" style={{ display: 'block', background: 'var(--color-illustration-sky)' }}>
    <circle cx={variant === 1 ? 90 : 270} cy="45" r="23" fill="var(--color-illustration-light)"/>
    {variant === 0 ? <><path d="M0 160 100 45 175 120 245 62 360 160" fill="var(--color-illustration-mid)"/><path d="m50 160 120-85 110 85" fill="var(--color-illustration-dark)"/><path d="m88 59 12-14 14 18-12-4-5 4" fill="var(--color-illustration-light)"/></> : variant === 1 ? <><path d="M0 100q90-15 180 0t180 0v60H0" fill="var(--color-illustration-mid)"/><path d="M0 125q90-15 180 0t180 0v35H0" fill="var(--color-illustration-dark)"/><path d="m230 100-40-8 40-40z" fill="var(--color-surface)"/></> : <><path d="M0 160V110h60V65h50v95h35V90h65v70h35V45h45v115h70" fill="var(--color-illustration-mid)"/><path d="M65 160v-70h30v70M150 160v-50h45v50M250 160V75h30v85" fill="var(--color-illustration-clay)"/></>}
  </svg>
}
