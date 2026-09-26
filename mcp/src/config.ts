export interface Config {
  port: number; host: string; resource: string; issuer: string; internalIdentityOrigin?: string;
  gateway: string; gatewayAudience: string; exchangeClientId: string; exchangeClientSecret?: string;
  exchangeAudience: string; timeoutMs: number; allowedOrigins: string[]; allowedHosts: string[];
  development: boolean;
}
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const development = env.NODE_ENV === 'development';
  const url = (value: string, internal = false) => {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash ||
      !(u.protocol === 'https:' || ((development || internal) && u.protocol === 'http:'))) throw new Error('Invalid service URL');
    return u;
  };
  const origin = (value: string, internal = false) => {
    const u = url(value, internal);
    if (u.pathname !== '/') throw new Error('Expected origin without path');
    return u.origin;
  };
  const integer = (value: string, max: number) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > max) throw new Error('Invalid numeric configuration');
    return n;
  };
  const resource = url(env.MCP_RESOURCE_URL ?? 'http://localhost:5001/mcp');
  if (resource.pathname !== '/mcp') throw new Error('MCP_RESOURCE_URL must end in /mcp');
  const issuer = env.KEYCLOAK_AUTHORITY ?? 'http://localhost:8080/realms/maletapp';
  url(issuer);
  const gatewayAudience = env.GATEWAY_AUDIENCE ?? 'api://maletapp';
  if (gatewayAudience === resource.href) throw new Error('MCP and gateway audiences must differ');
  return {
    development, port: integer(env.PORT ?? '5001', 65535), host: env.HOST ?? '127.0.0.1',
    resource: resource.href, issuer,
    internalIdentityOrigin: env.KEYCLOAK_INTERNAL_ORIGIN ? origin(env.KEYCLOAK_INTERNAL_ORIGIN) : undefined,
    gateway: origin(env.GATEWAY_URL ?? 'http://localhost:5000', true), gatewayAudience,
    exchangeClientId: env.EXCHANGE_CLIENT_ID ?? 'maletapp-mcp',
    exchangeClientSecret: env.EXCHANGE_CLIENT_SECRET || undefined,
    exchangeAudience: env.EXCHANGE_AUDIENCE ?? 'maletapp-api',
    timeoutMs: integer(env.HTTP_TIMEOUT_MS ?? '10000', 120000),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean).map(v => origin(v.trim())),
    allowedHosts: [...new Set([resource.host, ...(env.ALLOWED_HOSTS ?? '').split(',').map(v => v.trim()).filter(Boolean)])],
  };
}
