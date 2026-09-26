import { verifyWithJwks } from 'hono/jwt'
import type { MiddlewareHandler } from 'hono'
import type { Config } from './config.ts'
import { oidcDiscovery } from './oidc.ts'

export type GatewayEnv = { Variables: { userId: string } }
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function authentication(config: Config, discover = oidcDiscovery(config)): MiddlewareHandler<GatewayEnv> {

  return async (c, next) => {
    const token = /^Bearer ([^\s,]+)$/i.exec(c.req.header('authorization') ?? '')?.[1]
    if (!token) {
      c.header('WWW-Authenticate', 'Bearer')
      return c.json({ error: 'unauthorized' }, 401)
    }
    let subject: string
    try {
      const payload = await verifyWithJwks(token, {
        jwks_uri: (await discover()).jwks_uri, allowedAlgorithms: ['RS256'],
        verification: { iss: config.authority, aud: config.audience },
      }, { redirect: 'error', signal: AbortSignal.timeout(5000) })
      if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) ||
          typeof payload.sub !== 'string' || !payload.sub) throw new Error('Missing claims')
      subject = payload.sub
    } catch {
      c.header('WWW-Authenticate', 'Bearer')
      return c.json({ error: 'unauthorized' }, 401)
    }
    // The unchanged .NET accessor accepts GUIDs only.
    if (!guid.test(subject)) return c.json({ error: 'unauthorized' }, 403)
    c.set('userId', subject)
    await next()
  }
}
