import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { randomBytes } from 'node:crypto'
import { KeycloakAdmin } from '../../mcp/scripts/keycloak/admin.ts'
const path = new URL('../.local/e2e-users.json', import.meta.url)
try {
  const env = parseEnv(await readFile(new URL('../../gateway/.env', import.meta.url), 'utf8'))
  const api = await KeycloakAdmin.login('http://localhost:8080', 'maletapp', env.KEYCLOAK_ADMIN ?? 'admin', env.KEYCLOAK_ADMIN_PASSWORD)
  const users = await readFile(path, 'utf8').then(JSON.parse).catch(() => [])
  for (const suffix of ['a', 'b']) {
    const username = `maletapp-web-e2e-${suffix}`
    const matches = await api.request('GET', '/users?exact=true&username=' + username)
    let fixture = users.find(user => user.username === username)
    if (matches.length) {
      const managed = await api.request('GET', '/users/' + matches[0].id)
      if (managed.attributes?.['maletapp-web.fixture']?.[0] !== 'v1' || !fixture) throw new Error('Unmanaged fixture name or missing private credentials')
    } else {
      fixture = { username, password: randomBytes(24).toString('base64url') }
      await api.request('POST', '/users', { username, enabled: true, email: username + '@example.invalid', emailVerified: true, firstName: 'Web', lastName: 'Fixture', attributes: { 'maletapp-web.fixture': ['v1'] }, credentials: [{ type: 'password', value: fixture.password, temporary: false }] })
      users.push(fixture)
    }
  }
  await mkdir(new URL('../.local/', import.meta.url), { recursive: true, mode: 0o700 })
  await writeFile(path, JSON.stringify(users), { mode: 0o600 })
  console.info('Two isolated local browser fixtures ready; credentials remain in ignored .local only.')
} catch { console.error('Fixture provisioning failed; credentials suppressed.'); process.exitCode = 1 }
