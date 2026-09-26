import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Config } from './config.ts';
import { Identity } from './auth.ts';
import { Gateway } from './gateway.ts';
import { createMcp } from './mcp.ts';
export function createApp(config: Config) {
  const app = express();
  app.disable('x-powered-by');
  const identity = new Identity(config);
  const metadataUrl = new URL('/.well-known/oauth-protected-resource/mcp', config.resource).href;
  app.use((req, res, next) => {
    if (!config.allowedHosts.includes(req.headers.host ?? '')) { res.status(403).json({ error: 'invalid_host' }); return; }
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) { res.status(403).json({ error: 'origin_not_allowed' }); return; }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin); res.vary('Origin');
      res.setHeader('Access-Control-Expose-Headers', 'WWW-Authenticate, MCP-Protocol-Version');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID');
      res.status(204).end(); return;
    }
    next();
  });
  app.get('/health', (_req, res) => { res.json({ status: 'ok', delegationConfigured: Boolean(config.exchangeClientSecret) }); });
  app.get(['/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-protected-resource'], (_req, res) => {
    res.json({ resource: config.resource, resource_name: 'Maletapp MCP', authorization_servers: [config.issuer], bearer_methods_supported: ['header'], scopes_supported: ['openid', 'email', 'profile'] });
  });
  app.all('/mcp', async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = /^Bearer ([^\s,]+)$/i.exec(req.headers.authorization ?? '')?.[1];
    try {
      if (!token) throw new Error('Missing bearer');
      res.locals.credential = await identity.authenticate(token);
    } catch {
      res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${metadataUrl}"${token ? ', error="invalid_token"' : ''}`);
      res.status(401).json({ error: 'unauthorized' }); return;
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).end(); return; }
    next();
  }, express.json({ limit: '256kb' }), async (req, res) => {
    const server = createMcp(new Gateway(config, identity, res.locals.credential));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
    }
  });
  app.use((_req, res) => { res.status(404).json({ error: 'not_found' }); });
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: 'invalid_request' });
  });
  return app;
}
