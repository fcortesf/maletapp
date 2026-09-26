export interface Config {
  authority: string
  internalIdentityOrigin?: string
  audience: string
  domainApiUrl: string
  development: boolean
  port: number
}

export function httpUrl(value: string, allowHttp: boolean): URL {
  const url = new URL(value)
  if ((url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) ||
      url.username || url.password || url.search || url.hash) {
    throw new Error('Expected an HTTPS URL (HTTP is allowed only for development identity endpoints)')
  }
  return url
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const required = (name: string) => {
    const value = env[name]?.trim()
    if (!value) throw new Error(`Missing ${name}`)
    return value
  }
  const development = env.NODE_ENV === 'development'
  const authority = required('KEYCLOAK_AUTHORITY')
  httpUrl(authority, development)
  const internalValue = env.KEYCLOAK_INTERNAL_ORIGIN?.trim()
  const internal = internalValue ? httpUrl(internalValue, development) : undefined
  if (internal && internal.pathname !== '/') throw new Error('KEYCLOAK_INTERNAL_ORIGIN must be an origin without a path')
  const domain = httpUrl(required('DOMAIN_API_URL'), true)
  if (domain.pathname !== '/') throw new Error('DOMAIN_API_URL must be an origin without a path')
  const port = Number(env.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  return { authority, internalIdentityOrigin: internal?.origin, audience: required('KEYCLOAK_AUDIENCE'), domainApiUrl: domain.origin, development, port }
}
