import type { MiddlewareHandler } from 'hono'
import type { GatewayEnv } from '../auth.ts'

// Future hook: resolve an HttpOnly session to server-held credentials here.
// Cookie sessions require CSRF protection before enabling mutating requests.
// Today the common authentication layer still requires a Bearer token.
export const webSession: MiddlewareHandler<GatewayEnv> = async (_c, next) => { await next() }
