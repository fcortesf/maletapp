import type { MiddlewareHandler } from 'hono'
import type { GatewayEnv } from '../auth.ts'

export function webCors(origins: readonly string[]): MiddlewareHandler<GatewayEnv> {
  return async (c, next) => {
    c.header('Vary', 'Origin', { append: true })
    const origin = c.req.header('Origin')
    if (origin && origins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Access-Control-Expose-Headers', 'Retry-After, WWW-Authenticate')
      if (c.req.method === 'OPTIONS') {
        c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept')
      }
    }
    if (c.req.method === 'OPTIONS') return c.body(null, 204)
    await next()
  }
}
