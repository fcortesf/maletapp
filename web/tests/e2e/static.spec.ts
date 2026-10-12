import { test, expect } from '@playwright/test'
import { login, mcp, call } from './helpers'
test('built static deep links and callback authenticate with gateway-only business traffic and memory-only tokens', async ({ page, context }) => {
  const requests: string[] = []
  page.on('request', request => { if (/\/(web|items|trips)\//.test(new URL(request.url()).pathname)) requests.push(request.url()) })
  await login(page)
  const client = await mcp(context)
  try {
    const trip = await call(client, 'create_trip', { destination: 'Static deep link' })
    await page.goto('/trips/' + trip.id)
    await expect(page.getByRole('heading', { name: 'Static deep link', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Static deep link', exact: true })).toBeVisible()
    await page.goto('/callback')
    await expect(page).toHaveURL(/\/trips$/)
    expect(requests.every(url => new URL(url).origin === 'http://localhost:5173')).toBe(true)
    const stored = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, url: location.href }))
    expect(JSON.stringify(stored)).not.toMatch(/access_token|refresh_token|eyJ/)
    await page.goto('/signed-out')
    await expect(page.getByRole('heading', { name: 'You are signed out' })).toBeVisible()
  } finally { await client.close() }
})
