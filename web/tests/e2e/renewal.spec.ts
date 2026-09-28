import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { KeycloakAdmin } from '../../../mcp/scripts/keycloak/admin.ts'
import { login } from './helpers'
test('Keycloak 25 renews an expiring token and replaces the authenticated stream', async ({ page }) => {
  test.setTimeout(75_000)
  const env = parseEnv(await readFile(new URL('../../../gateway/.env', import.meta.url), 'utf8'))
  const admin = await KeycloakAdmin.login('http://localhost:8080', 'maletapp', env.KEYCLOAK_ADMIN ?? 'admin', env.KEYCLOAK_ADMIN_PASSWORD!)
  const matches = await admin.request<{ id: string }[]>('GET', '/clients?clientId=maletapp-web')
  const client = await admin.request<Record<string, any>>('GET', '/clients/' + matches[0].id)
  await admin.request('PUT', '/clients/' + matches[0].id, { ...client, attributes: { ...client.attributes, 'access.token.lifespan': '45' } })
  let refreshes = 0, streams = 0
  page.on('request', request => {
    if (request.url().endsWith('/protocol/openid-connect/token') && new URLSearchParams(request.postData() ?? '').get('grant_type') === 'refresh_token') refreshes++
    if (request.url().endsWith('/web/events')) streams++
  })
  try {
    await login(page)
    await expect(page.getByText('Live updates connected', { exact: true })).toContainText('Live updates connected')
    await expect.poll(() => refreshes, { timeout: 50_000 }).toBeGreaterThan(0)
    await expect.poll(() => streams).toBeGreaterThan(1)
    await expect(page.getByText('Live updates connected', { exact: true })).toContainText('Live updates connected')
  } finally { await admin.request('PUT', '/clients/' + matches[0].id, { ...client, attributes: { ...client.attributes, 'access.token.lifespan': client.attributes?.['access.token.lifespan'] ?? '' } }) }
})
