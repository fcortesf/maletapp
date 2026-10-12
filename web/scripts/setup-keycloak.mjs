import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { KeycloakAdmin } from '../../mcp/scripts/keycloak/admin.ts'
const apply = process.argv.includes('--apply')
const env = parseEnv(await readFile(new URL('../../gateway/.env', import.meta.url), 'utf8'))
try {
  const api = await KeycloakAdmin.login('http://localhost:8080', 'maletapp', env.KEYCLOAK_ADMIN ?? 'admin', env.KEYCLOAK_ADMIN_PASSWORD)
  const clients = await api.request('GET', '/clients?clientId=maletapp-web')
  if (clients.length !== 1) throw new Error('Expected exactly one existing web client')
  const client = await api.request('GET', '/clients/' + clients[0].id)
  const attributes = { ...client.attributes, 'pkce.code.challenge.method': 'S256', 'post.logout.redirect.uris': 'http://localhost:5173/signed-out' }
  if (client.attributes?.['post.logout.redirect.uris'] !== attributes['post.logout.redirect.uris']) {
    if (apply) await api.request('PUT', '/clients/' + client.id, { ...client, attributes })
    console.info(`${apply ? 'Applied' : 'Planned'} exact web logout redirect; existing client/users preserved.`)
  }
  const realm = await api.request('GET', '/')
  if (realm.defaultLocale !== 'en' || !realm.internationalizationEnabled || !realm.supportedLocales?.includes('en')) {
    if (apply) await api.request('PUT', '/', { internationalizationEnabled: true, supportedLocales: [...new Set([...(realm.supportedLocales ?? []), 'en'])], defaultLocale: 'en' })
    console.info(`${apply ? 'Applied' : 'Planned'} English login locale; realm and existing users preserved.`)
  }
} catch { console.error('Web Keycloak setup failed; credential details suppressed.'); process.exitCode = 1 }
