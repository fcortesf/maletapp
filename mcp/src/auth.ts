import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Config } from './config.ts';
import { ServiceError } from './errors.ts';
export interface Credential { token: string; claims: JWTPayload & { sub: string } }
export function identityUrl(value: string, config: Config): URL {
  const u = new URL(value);
  if (u.origin !== new URL(config.issuer).origin || u.username || u.password || u.search || u.hash) throw new Error('Untrusted identity endpoint');
  if (config.internalIdentityOrigin) {
    const internal = new URL(config.internalIdentityOrigin);
    u.protocol = internal.protocol; u.host = internal.host;
  }
  return u;
}
export class Identity {
  private metadata?: Promise<{ jwks_uri: string; token_endpoint: string }>;
  private keys?: ReturnType<typeof createRemoteJWKSet>;
  private readonly config: Config;
  constructor(config: Config) { this.config = config; }
  private discover() {
    return this.metadata ??= (async () => {
      const response = await fetch(identityUrl(`${this.config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`, this.config),
        { redirect: 'error', signal: AbortSignal.timeout(this.config.timeoutMs) });
      if (!response.ok) throw new Error('Discovery unavailable');
      const doc = await response.json();
      if (doc.issuer !== this.config.issuer || typeof doc.jwks_uri !== 'string' || typeof doc.token_endpoint !== 'string') throw new Error('Invalid metadata');
      identityUrl(doc.token_endpoint, this.config); identityUrl(doc.jwks_uri, this.config);
      return doc as { jwks_uri: string; token_endpoint: string };
    })().catch((error: unknown) => { this.metadata = undefined; throw error; });
  }
  private async verify(token: string, audience: string): Promise<Credential> {
    const doc = await this.discover();
    this.keys ??= createRemoteJWKSet(identityUrl(doc.jwks_uri, this.config), { timeoutDuration: this.config.timeoutMs });
    const { payload } = await jwtVerify(token, this.keys, {
      issuer: this.config.issuer, audience, algorithms: ['RS256'], requiredClaims: ['exp', 'sub', 'iat'],
    });
    if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.iat !== 'number' || payload.iat > Date.now() / 1000 || payload.typ !== 'Bearer') throw new Error('Invalid access token claims');
    return { token, claims: payload as Credential['claims'] };
  }
  async authenticate(token: string) { return this.verify(token, this.config.resource); }
  async delegate(credential: Credential, signal?: AbortSignal): Promise<string> {
    const config = this.config;
    if (!config.exchangeClientSecret) throw new ServiceError('delegation_not_configured', 'An administrator must configure the MCP token-exchange client.', 503);
    try {
      const doc = await this.discover();
      const response = await fetch(identityUrl(doc.token_endpoint, config), {
        method: 'POST', redirect: 'error', signal: AbortSignal.any([AbortSignal.timeout(config.timeoutMs), ...(signal ? [signal] : [])]),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          client_id: config.exchangeClientId, client_secret: config.exchangeClientSecret,
          subject_token: credential.token, subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
          requested_token_type: 'urn:ietf:params:oauth:token-type:access_token', audience: config.exchangeAudience }),
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error('Exchange rejected'); }
      const result = await response.json();
      if (typeof result.access_token !== 'string' || result.token_type?.toLowerCase() !== 'bearer' || result.access_token === credential.token) throw new Error('Invalid exchange result');
      const delegated = await this.verify(result.access_token, config.gatewayAudience);
      if (delegated.claims.sub !== credential.claims.sub) throw new Error('Exchange changed subject');
      return delegated.token;
    } catch {
      throw new ServiceError('delegation_failed', 'User token exchange failed. Check Keycloak exchange permissions, audiences and client configuration. No gateway operation was sent.', 502);
    }
  }
}
