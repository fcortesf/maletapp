import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash, randomBytes } from 'node:crypto';
import { KeycloakAdmin } from './keycloak/admin.ts';
try {
  const env = parseEnv(await readFile(new URL('../../gateway/.env', import.meta.url), 'utf8'));
  const api = await KeycloakAdmin.login('http://localhost:8080', 'maletapp', env.KEYCLOAK_ADMIN ?? 'admin', env.KEYCLOAK_ADMIN_PASSWORD!);
  const issuer = 'http://localhost:8080/realms/maletapp';
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  for (const [clientId, port] of [['maletapp-mcp-cli',49152], ['maletapp-codex',49153]] as const) {
    const url = new URL(`${issuer}/protocol/openid-connect/auth`);
    url.search = new URLSearchParams({client_id:clientId,redirect_uri:`http://127.0.0.1:${port}/callback`,response_type:'code',scope:'openid email profile',state:randomBytes(16).toString('hex'),resource:'http://localhost:5001/mcp',code_challenge:challenge,code_challenge_method:'S256'}).toString();
    const valid = await fetch(url,{redirect:'manual'}); assert.equal(valid.status,200); assert((await valid.text()).includes('kc-form-login'));
    url.searchParams.delete('code_challenge'); url.searchParams.delete('code_challenge_method');
    const noPkce = await fetch(url,{redirect:'manual'}); assert.notEqual(noPkce.status,200); await noPkce.body?.cancel();
    url.searchParams.set('code_challenge',challenge); url.searchParams.set('code_challenge_method','S256'); url.searchParams.set('redirect_uri','http://unregistered.invalid/callback');
    const wrongRedirect = await fetch(url,{redirect:'manual'}); assert.equal(wrongRedirect.status,400); await wrongRedirect.body?.cancel();
    console.log(`${clientId}: exact callback/S256 login form succeeds; missing PKCE and unregistered callback rejected.`);
  }
  const request = async (extra: Record<string, string>) => {
    const r = await fetch(`${issuer}/protocol/openid-connect/token`,{method:'POST',redirect:'error',body:new URLSearchParams({client_id:'maletapp-mcp',client_secret:env.EXCHANGE_CLIENT_SECRET!,...extra})});
    return {status:r.status, body:await r.json()};
  };
  const service = await request({grant_type:'client_credentials'}); assert.equal(service.body.error,'unauthorized_client');
  const exchange = await request({grant_type:'urn:ietf:params:oauth:grant-type:token-exchange',subject_token:'invalid-test-token',subject_token_type:'urn:ietf:params:oauth:token-type:access_token',audience:'maletapp-api'});
  assert(exchange.status>=400); assert.notEqual(exchange.body.error,'unsupported_grant_type');
  console.log('Shared service-account grant disabled; real exchange endpoint handles and rejects invalid subject tokens.');
  const users = await api.request<{ id: string }[]>('GET','/users?first=0&max=1');
  if (users.length) {
    for(const [clientId, expected] of [['maletapp-mcp-cli','http://localhost:5001/mcp'],['maletapp-codex','http://localhost:5001/mcp'],['maletapp-api','api://maletapp']] as const) {
      const c=(await api.request<{ id: string }[]>('GET',`/clients?clientId=${clientId}`))[0]!;
      const example=await api.request<{ sub: string; aud: string | string[] }>('GET',`/clients/${c.id}/evaluate-scopes/generate-example-access-token?userId=${encodeURIComponent(users[0]!.id)}&scope=openid%20email%20profile`);
      assert.equal(example.sub, users[0]!.id); assert([example.aud].flat().includes(expected));
      if (clientId!=='maletapp-api') assert([example.aud].flat().includes('maletapp-mcp'));
    }
    console.log('Admin claim previews preserve an existing user subject and produce all required audiences; these are not issued user tokens.');
  }
  const health = await (await fetch('http://localhost:5001/health')).json(); assert.equal(health.delegationConfigured,true);
  console.log('MCP reports delegation configured. Full real-user login/exchange remains untested.');
} catch { console.error('Live setup verification failed; details suppressed to protect credentials.'); process.exitCode=1; }
