import { httpUrl, type Config } from './config.ts'

export interface DiscoveryDocument {
  issuer: string
  jwks_uri: string
  authorization_endpoint?: unknown
  token_endpoint?: unknown
}

// Only server-side identity traffic uses the configured private origin.
// Issuer validation and browser OAuth endpoints always retain the public URLs.
export function identityFetchUrl(value: string, config: Config): string {
  const url = httpUrl(value, config.development)
  if (!config.internalIdentityOrigin) return url.href
  if (url.origin !== new URL(config.authority).origin) {
    throw new Error('Internal identity routing requires an issuer-origin endpoint')
  }
  const internal = httpUrl(config.internalIdentityOrigin, config.development)
  if (internal.pathname !== '/') throw new Error('Internal identity origin must not contain a path')
  internal.pathname = url.pathname
  return internal.href
}

export function oidcDiscovery(config: Config) {
  let discovery: Promise<DiscoveryDocument> | undefined
  return () => discovery ??= (async () => {
    const response = await fetch(identityFetchUrl(`${config.authority.replace(/\/$/, '')}/.well-known/openid-configuration`, config), {
      redirect: 'error', signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error('OIDC discovery failed')
    const document = await response.json() as DiscoveryDocument
    if (document.issuer !== config.authority || typeof document.jwks_uri !== 'string') {
      throw new Error('Invalid discovery metadata')
    }
    return { ...document, jwks_uri: identityFetchUrl(document.jwks_uri, config) }
  })().catch((error: unknown) => { discovery = undefined; throw error })
}
