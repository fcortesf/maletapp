import type { Config } from './config.ts';
import type { Credential, Identity } from './auth.ts';
import { ServiceError } from './errors.ts';
export class Gateway {
  private readonly config: Config;
  private readonly identity: Identity;
  private readonly credential: Credential;
  constructor(config: Config, identity: Identity, credential: Credential) { this.config = config; this.identity = identity; this.credential = credential; }
  async request(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
    const token = await this.identity.delegate(this.credential, signal);
    const target = new URL(this.config.gateway); target.pathname = path;
    try {
      const response = await fetch(target, {
        method, redirect: 'error', signal: AbortSignal.any([AbortSignal.timeout(this.config.timeoutMs), ...(signal ? [signal] : [])]),
        headers: { authorization: `Bearer ${token}`, accept: 'application/json', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        const messages: Record<number, string> = { 400: 'The domain rejected these values.', 401: 'The gateway rejected the delegated credentials.',
          403: 'You do not have permission to access this trip or item.', 404: 'The trip, item or API operation was not found.', 409: 'The operation conflicts with the current resource state.' };
        throw new ServiceError('gateway_error', messages[response.status] ?? 'The gateway could not complete the operation.', response.status);
      }
      return response.status === 204 ? { deleted: true } : await response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError('gateway_unavailable', `The gateway request failed or timed out.${method === 'GET' ? '' : ' The write outcome is unknown; read the current state before retrying.'}`);
    }
  }
}
