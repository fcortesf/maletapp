import { test, expect } from '@playwright/test'
import { login, mcp, call } from './helpers'
test('real PKCE login, authenticated stream and same-user MCP create without reload', async ({ page, context }) => {
  const browserSession = await context.newCDPSession(page)
  await browserSession.send('Network.enable')
  await browserSession.send('Network.setCookieControls', { enableThirdPartyCookieRestriction: true })
  let stream = false
  const businessUrls: string[] = []
  page.on('response', response => { if (response.url().endsWith('/web/events') && response.status() === 200) stream = true })
  page.on('request', request => { if (/\/web\/(?:trips|items|events)/.test(request.url())) businessUrls.push(request.url()) })
  await login(page)
  await expect(page.getByText('Live updates connected', { exact: true })).toContainText('Live updates connected')
  const client = await mcp(context)
  try {
    const destination = 'Early slice ' + Date.now()
    const start = Date.now()
    await call(client, 'create_trip', { destination })
    await expect(page.getByText(destination, { exact: true })).toBeVisible({ timeout: 3000 })
    expect(Date.now() - start).toBeLessThan(3000)
    expect(stream).toBe(true)
    expect(businessUrls.every(url => url.startsWith('http://localhost:5173/web/'))).toBe(true)
    const storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))
    expect(JSON.stringify(storage)).not.toMatch(/access_token|refresh_token|eyJ/)
  } finally { await client.close() }
})
