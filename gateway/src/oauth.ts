import type { Hono } from 'hono'
import type { GatewayEnv } from './auth.ts'
import type { Config } from './config.ts'
import { identityFetchUrl } from './oidc.ts'
import { cleanHeaders } from './proxy.ts'

// Install exact public handlers before authentication, as with documentation.
export function oauth(app: Hono<GatewayEnv>, config: Config) {
  const authority = config.authority.replace(/\/$/, '')
  app.get('/.well-known/oauth-authorization-server', (c) => c.json({
    issuer: config.authority,
    authorization_endpoint: `${authority}/protocol/openid-connect/auth`,
    token_endpoint: `${authority}/protocol/openid-connect/token`,
    registration_endpoint: new URL('/oauth/register', c.req.url).href,
    scopes_supported: ['openid', 'email', 'profile'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  }))

  app.post('/oauth/register', async (c) => {
    const headers = cleanHeaders(c.req.raw.headers)
    for (const name of [...headers.keys()]) {
      if (['host', 'cookie', 'content-length', 'forwarded'].includes(name) ||
          name.startsWith('x-forwarded-') || name.startsWith('x-user') || name.startsWith('x-test-user')) {
        headers.delete(name)
      }
    }
    // Preserve Authorization: Keycloak can require an initial access token.
    headers.set('accept-encoding', 'identity')
    try {
      // A replayable raw body avoids Node fetch turning upstream 401s into network errors.
      const init: RequestInit = {
        method: 'POST', headers, body: await c.req.arrayBuffer(), redirect: 'manual',
        signal: AbortSignal.any([c.req.raw.signal, AbortSignal.timeout(30000)]),
      }
      const response = await fetch(identityFetchUrl(`${authority}/clients-registrations/openid-connect`, config), init)
      const outgoing = cleanHeaders(response.headers)
      // Node fetch decodes compressed responses; preserve the actual payload.
      outgoing.delete('content-encoding')
      outgoing.delete('content-length')
      return new Response(response.body, { status: response.status, headers: outgoing })
    } catch {
      return c.json({ error: 'bad_gateway' }, 502)
    }
  })
}
