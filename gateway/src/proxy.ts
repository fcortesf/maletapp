import type { Handler } from 'hono'
import type { GatewayEnv } from './auth.ts'

// Confirmed: maletapp/src/Trip.API/Infrastructure/UserContext/UserContextHeaderNames.cs:7
export const USER_HEADER = 'X-Test-User-Id'
const hopHeaders = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade']
export function cleanHeaders(source: Headers): Headers {
  const headers = new Headers(source)
  for (const name of (headers.get('connection') ?? '').split(',')) {
    if (name.trim()) headers.delete(name.trim())
  }
  for (const name of hopHeaders) headers.delete(name)
  return headers
}

export function proxy(domainApiUrl: string, prefix = ''): Handler<GatewayEnv> {
  return async (c) => {
    const incoming = new URL(c.req.url)
    const target = new URL(domainApiUrl)
    // Assign pathname rather than resolving a client-controlled URL against the origin.
    target.pathname = incoming.pathname.slice(prefix.length) || '/'
    target.search = incoming.search
    const headers = cleanHeaders(c.req.raw.headers)
    for (const name of [...headers.keys()]) {
      if (['host', 'authorization', 'cookie', 'content-length', 'forwarded'].includes(name) ||
          name.startsWith('x-forwarded-') || name.startsWith('x-user') || name.startsWith('x-test-user')) {
        headers.delete(name)
      }
    }
    headers.set(USER_HEADER, c.get('userId'))
    headers.set('accept-encoding', 'identity')
    const init: RequestInit & { duplex: 'half' } = {
      method: c.req.method, headers, redirect: 'manual', duplex: 'half',
      signal: AbortSignal.any([c.req.raw.signal, AbortSignal.timeout(30000)]),
    }
    if (!['GET', 'HEAD'].includes(c.req.method)) init.body = c.req.raw.body
    try {
      const response = await fetch(target, init)
      if (response.status === 401 || response.status === 403) {
        await response.body?.cancel()
        if (response.status === 401) c.header('WWW-Authenticate', 'Bearer')
        return c.json({ error: 'unauthorized' }, response.status)
      }
      const outgoing = cleanHeaders(response.headers)
      // Node fetch decodes compressed upstream responses.
      outgoing.delete('content-encoding')
      outgoing.delete('content-length')
      return new Response(response.body, { status: response.status, headers: outgoing })
    } catch {
      return c.json({ error: 'bad_gateway' }, 502)
    }
  }
}
