export class SetupError extends Error {}
export type JsonObject = Record<string, unknown>;
export interface AdminApi {
  request<T>(method: string, path: string, body?: unknown): Promise<T>;
}
export class KeycloakAdmin implements AdminApi {
  private origin: string;
  private realm: string;
  private token: string;
  private constructor(origin: string, realm: string, token: string) {
    this.origin = origin; this.realm = realm; this.token = token;
  }
  static async login(origin: string, realm: string, username: string, password: string) {
    const url = new URL(origin);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new SetupError('This local provisioning script accepts only a loopback Keycloak origin. Use the manual guide for other environments.');
    }
    try {
      const response = await fetch(`${url.origin}/realms/master/protocol/openid-connect/token`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username, password }),
      });
      if (!response.ok) { await response.body?.cancel(); throw new SetupError(`Administrator login failed (HTTP ${response.status}).`); }
      const data = await response.json() as { access_token?: unknown };
      if (typeof data.access_token !== 'string') throw new SetupError('Administrator login returned no token.');
      return new KeycloakAdmin(url.origin, realm, data.access_token);
    } catch (error) {
      if (error instanceof SetupError) throw error;
      throw new SetupError('Could not reach Keycloak for administrator login.');
    }
  }
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new SetupError('Invalid admin path.');
    const base = path === '/serverinfo' ? `${this.origin}/admin` : `${this.origin}/admin/realms/${encodeURIComponent(this.realm)}`;
    try {
      const response = await fetch(`${base}${path}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { authorization: `Bearer ${this.token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new SetupError(`Keycloak ${method} ${path.split('?')[0]} failed (HTTP ${response.status}). No automatic retry; rerun to reconcile state.`);
      }
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    } catch (error) {
      if (error instanceof SetupError) throw error;
      throw new SetupError(`Keycloak ${method} ${path.split('?')[0]} failed or timed out. No automatic retry; rerun to reconcile state.`);
    }
  }
}
