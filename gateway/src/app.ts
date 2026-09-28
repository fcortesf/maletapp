import { Hono } from 'hono'
import { documentation } from './docs.ts'
import { oidcDiscovery } from './oidc.ts'
import { oauth } from './oauth.ts'
import { authentication, type GatewayEnv } from './auth.ts'
import type { Config } from './config.ts'
import { proxy } from './proxy.ts'
import { events, Subscribers } from './events.ts'
import { webCors } from './bff/web.ts'

export function createApp(config: Config, subscribers = new Subscribers()) {
  const app = new Hono<GatewayEnv>()
  const discover = oidcDiscovery(config)
  documentation(app, config, discover)
  oauth(app, config)
  app.use('/web/*', webCors(config.webAllowedOrigins ?? []))
  app.use('*', authentication(config, discover))
  app.get('/web/events', events(subscribers))
  for (const client of ['web', 'mobile', 'mcp']) {
    const adapter = new Hono<GatewayEnv>()
    adapter.all('*', proxy(config.domainApiUrl, `/${client}`, subscribers))
    app.route(`/${client}`, adapter)
  }
  app.all('*', proxy(config.domainApiUrl, '', subscribers))
  app.onError(() => new Response(JSON.stringify({ error: 'internal_server_error' }), {
    status: 500, headers: { 'content-type': 'application/json' },
  }))
  return app
}
