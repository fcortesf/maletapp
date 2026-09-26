import { Hono } from 'hono'
import { documentation } from './docs.ts'
import { oidcDiscovery } from './oidc.ts'
import { oauth } from './oauth.ts'
import { authentication, type GatewayEnv } from './auth.ts'
import type { Config } from './config.ts'
import { proxy } from './proxy.ts'
import { webSession } from './bff/web.ts'

export function createApp(config: Config) {
  const app = new Hono<GatewayEnv>()
  const discover = oidcDiscovery(config)
  documentation(app, config, discover)
  oauth(app, config)
  app.use('/web/*', webSession)
  app.use('*', authentication(config, discover))
  for (const client of ['web', 'mobile', 'mcp']) {
    const adapter = new Hono<GatewayEnv>()
    adapter.all('*', proxy(config.domainApiUrl, `/${client}`))
    app.route(`/${client}`, adapter)
  }
  app.all('*', proxy(config.domainApiUrl))
  app.onError(() => new Response(JSON.stringify({ error: 'internal_server_error' }), {
    status: 500, headers: { 'content-type': 'application/json' },
  }))
  return app
}
