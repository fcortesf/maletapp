import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import type { Hono } from 'hono'
import type { GatewayEnv } from './auth.ts'
import { httpUrl, type Config } from './config.ts'
import { oidcDiscovery } from './oidc.ts'

const require = createRequire(import.meta.url)
const assets = {
  'swagger-ui.css': 'text/css',
  'swagger-ui-bundle.js': 'text/javascript',
  'oauth2-redirect.html': 'text/html',
  'oauth2-redirect.js': 'text/javascript',
} as const
const operations = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']
const security = [{ keycloak: ['openid', 'profile', 'email'] }]
const servers = [{ url: '/', description: 'This gateway' }]
type ObjectValue = Record<string, any>

// Keep the generated domain contracts; replace only gateway transport/auth metadata.
export function gatewayOpenApi(document: ObjectValue, authorizationUrl: string, tokenUrl: string) {
  if (typeof document.openapi !== 'string' || !document.openapi.startsWith('3.') ||
      !document.paths || typeof document.paths !== 'object') throw new Error('Expected OpenAPI 3')
  document.servers = servers
  document.security = security
  document.components = { ...document.components, securitySchemes: {
    keycloak: { type: 'oauth2', flows: { authorizationCode: {
      authorizationUrl, tokenUrl,
      scopes: { openid: 'Sign in', profile: 'Profile', email: 'Email' },
    } } },
  } }
  for (const [path, item] of Object.entries(document.paths) as [string, ObjectValue][]) {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path')
    item.servers = servers
    for (const method of operations) {
      if (item[method]) {
        item[method].servers = servers
        item[method].security = security
      }
    }
  }
  return document
}

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Maletapp API</title>
<link rel="stylesheet" href="/docs/swagger-ui.css"></head>
<body><p id="readiness" role="status">Loading API documentation…</p><div id="swagger-ui"></div>
<script src="/docs/swagger-ui-bundle.js"></script><script src="/docs/init.js"></script></body></html>`

const initializer = `async function start() {
  const status = document.getElementById('readiness');
  try {
    const response = await fetch('/docs/openapi.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Keycloak or domain Swagger is not ready (HTTP ' + response.status + ').');
    const spec = await response.json();
    window.ui = SwaggerUIBundle({
      spec, dom_id: '#swagger-ui', validatorUrl: null, queryConfigEnabled: false,
      persistAuthorization: false,
      oauth2RedirectUrl: window.location.origin + '/docs/oauth2-redirect.html',
      presets: [SwaggerUIBundle.presets.apis]
    });
    window.ui.initOAuth({
      clientId: 'maletapp-swagger', scopes: 'openid profile email',
      usePkceWithAuthorizationCodeGrant: true,
      useBasicAuthenticationWithAccessCodeGrant: false
    });
    status.textContent = 'Authorize with a local maletapp user, then use Try it out. Tokens stay in memory; reload to clear them.';
  } catch (error) {
    status.textContent = error.message + ' Retrying in 3 seconds. Check gateway /docs/openapi.json and service logs for readiness errors.';
    setTimeout(start, 3000);
  }
}
start();`

export function documentation(app: Hono<GatewayEnv>, config: Config, discover = oidcDiscovery(config)) {
  if (!config.development) {
    app.all('/docs', c => c.notFound())
    app.all('/docs/*', c => c.notFound())
    // Do not expose the upstream development UI through raw or BFF proxy paths.
    for (const prefix of ['', '/web', '/mobile', '/mcp']) {
      app.all(`${prefix}/swagger`, c => c.notFound())
      app.all(`${prefix}/swagger/*`, c => c.notFound())
    }
    return
  }
  // Exact GET routes precede authentication. No static directory or general proxy bypass.
  app.get('/docs', c => { c.header('Cache-Control', 'no-store'); return c.html(html) })
  app.get('/docs/', c => c.redirect('/docs'))
  app.get('/docs/init.js', c => c.body(initializer, 200, {
    'Content-Type': 'text/javascript', 'Cache-Control': 'no-store',
  }))
  for (const [file, contentType] of Object.entries(assets)) {
    app.get(`/docs/${file}`, async c => c.body(
      await readFile(require.resolve(`swagger-ui-dist/${file}`), 'utf8'),
      200, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    ))
  }
  app.get('/docs/openapi.json', async c => {
    c.header('Cache-Control', 'no-store')
    let dependency = 'oidc'
    try {
      const metadata = await discover()
      if (typeof metadata.authorization_endpoint !== 'string' || typeof metadata.token_endpoint !== 'string') {
        throw new Error('OAuth endpoints missing')
      }
      const authorizationUrl = httpUrl(metadata.authorization_endpoint, config.development).href
      const tokenUrl = httpUrl(metadata.token_endpoint, config.development).href
      dependency = 'domain_openapi'
      const response = await fetch(new URL('/swagger/v1/swagger.json', config.domainApiUrl), {
        redirect: 'error', signal: AbortSignal.timeout(5000), headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Domain Swagger unavailable')
      return c.json(gatewayOpenApi(await response.json(), authorizationUrl, tokenUrl))
    } catch {
      c.header('Retry-After', '3')
      return c.json({ error: 'docs_not_ready', dependency }, 503)
    }
  })
}
