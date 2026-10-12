import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { login, mcp, call, clearFixtureTrips } from './helpers'
test('browser CRUD, packing, categories, null clearing, lifecycle and destructive confirmations', async ({ page, context }) => {
  await login(page)
  const client = await mcp(context)
  const destination = 'Browser journey ' + Date.now()
  try {
    await page.getByRole('button', { name: 'New trip', exact: true }).click()
    await page.getByLabel('Destination', { exact: true }).fill(destination)
    await page.getByLabel('Start date').fill('2099-01-02')
    await page.getByLabel('End date').fill('2099-01-06')
    await page.getByRole('dialog').getByRole('button', { name: 'New trip', exact: true }).click()
    await expect(page.getByRole('heading', { name: destination, exact: true })).toBeVisible()
    const tripId = new URL(page.url()).pathname.split('/').pop()!
    await page.getByRole('button', { name: 'Add item', exact: true }).click()
    await page.getByLabel('Item name', { exact: true }).fill('Camera')
    await page.getByLabel('Category', { exact: true }).selectOption('electronics')
    await page.getByLabel('Notes', { exact: true }).fill('Keep dry')
    await page.getByLabel('Quantity', { exact: true }).fill('2')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Packed: Camera' }).click()
    await expect(page.getByRole('checkbox', { name: 'Packed: Camera' })).toBeChecked()
    let items = await call(client, 'list_items', { tripId })
    expect(items[0]).toMatchObject({ name: 'Camera', category: 'electronics', notes: 'Keep dry', itemCount: 2, isPacked: true })
    await page.getByRole('button', { name: 'Camera', exact: true }).click()
    await page.getByLabel('Notes', { exact: true }).fill('')
    await page.getByLabel('Quantity', { exact: true }).fill('')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    items = await call(client, 'list_items', { tripId })
    expect(items[0]).toMatchObject({ notes: null, itemCount: null, isPacked: true })
    await page.getByRole('button', { name: 'Actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Finish trip' }).click()
    await expect(page.getByText('Finished', { exact: true })).toBeVisible()
    expect((await call(client, 'get_trip', { tripId })).isFinished).toBe(true)
    await call(client, 'reopen_trip', { tripId })
    await expect(page.getByText('Upcoming', { exact: true })).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: 'Delete: Camera' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('checkbox', { name: 'Packed: Camera' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page).toHaveURL(/\/trips$/)
    expect((await call(client, 'list_trips')).some((trip: any) => trip.id === tripId)).toBe(false)
  } finally { await client.close() }
})

test('agent bursts preserve drafts, disjoint fields, conflicts and externally deleted resources', async ({ page, context }) => {
  await login(page)
  const client = await mcp(context)
  try {
    const trip = await call(client, 'create_trip', { destination: 'Draft journey ' + Date.now() })
    const item = await call(client, 'add_item', { tripId: trip.id, name: 'Phone', notes: 'Initial', category: 'electronics' })
    await page.goto('/trips/' + trip.id)
    await page.getByRole('button', { name: 'Phone', exact: true }).click()
    await page.getByLabel('Notes', { exact: true }).fill('My unsaved draft')
    await call(client, 'set_item_packed', { itemId: item.id, isPacked: true })
    await expect(page.getByRole('checkbox', { name: 'Packed: Phone', includeHidden: true })).toBeChecked({ timeout: 3000 })
    await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('My unsaved draft')
    await call(client, 'edit_item', { itemId: item.id, notes: 'Agent notes' })
    await expect(page.getByText(/Your edited fields changed elsewhere/)).toBeVisible({ timeout: 3000 })
    await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('My unsaved draft')
    let reads = 0, active = 0, maximum = 0
    page.on('request', request => { if (request.method() === 'GET' && /\/web\/(trips|items)/.test(request.url())) { reads++; maximum = Math.max(maximum, ++active) } })
    const finish = (request: any) => { if (request.method() === 'GET' && /\/web\/(trips|items)/.test(request.url())) active-- }
    page.on('requestfinished', finish); page.on('requestfailed', finish)
    await Promise.all(Array.from({ length: 12 }, (_, index) => call(client, 'add_item', { tripId: trip.id, name: 'Burst ' + index })))
    await expect(page.getByRole('button', { name: 'Burst 11', exact: true, includeHidden: true })).toBeVisible({ timeout: 3000 })
    expect(maximum).toBeLessThanOrEqual(4); expect(reads).toBeLessThanOrEqual(12)
    await page.getByRole('button', { name: 'Save my draft', exact: true }).click()
    expect(await call(client, 'get_item', { itemId: item.id })).toMatchObject({ notes: 'My unsaved draft', isPacked: true })
    await page.getByRole('button', { name: 'Phone', exact: true }).click()
    await page.getByLabel('Notes', { exact: true }).fill('Keep this draft after deletion')
    await call(client, 'delete_item', { itemId: item.id })
    await expect(page.getByText(/Removed elsewhere/)).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
    await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Keep this draft after deletion')
    await expect(page.getByRole('button', { name: 'Copy draft' })).toBeVisible()
    await expect(page.getByRole('dialog').locator('[role=alert]')).toBeFocused()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Add item', exact: true })).toBeFocused()
  } finally { await client.close() }
})

test('unknown create outcome refreshes authoritative state without retrying the POST', async ({ page, context }) => {
  await login(page)
  const client = await mcp(context), destination = 'Uncertain journey ' + Date.now()
  let posts = 0
  await page.route('**/web/trips', async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return }
    posts++
    const response = await route.fetch()
    expect(response.status()).toBe(201)
    await route.fulfill({ status: 502, body: '{"error":"bad_gateway"}', contentType: 'application/json' })
  })
  try {
    await page.getByRole('button', { name: 'New trip', exact: true }).click()
    await page.getByLabel('Destination', { exact: true }).fill(destination)
    await page.getByRole('dialog').getByRole('button', { name: 'New trip', exact: true }).click()
    await expect(page.getByText(/write outcome is unknown/)).toBeVisible()
    expect(posts).toBe(1)
    expect((await call(client, 'list_trips')).filter((trip: any) => trip.destination === destination)).toHaveLength(1)
    await expect(page.getByLabel('Destination', { exact: true })).toHaveValue(destination)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('heading', { name: destination, exact: true })).toBeVisible()
  } finally { await client.close() }
})

test('two tabs synchronize, another user is isolated, and logout clears both tabs', async ({ page, context, browser }) => {
  await login(page)
  const tab = await context.newPage(); await tab.goto('/trips')
  const isolated = await browser.newContext(), other = await isolated.newPage()
  await login(other, 1)
  const client = await mcp(context), otherClient = await mcp(isolated)
  try {
    const destination = 'Private journey ' + Date.now(), trip = await call(client, 'create_trip', { destination })
    await expect(page.getByText(destination, { exact: true })).toBeVisible({ timeout: 3000 })
    await expect(tab.getByText(destination, { exact: true })).toBeVisible({ timeout: 3000 })
    expect((await call(otherClient, 'list_trips')).some((entry: any) => entry.id === trip.id)).toBe(false)
    await expect(other.getByText(destination, { exact: true })).toHaveCount(0)
    let release!: () => void, observed!: () => void
    const delayed = new Promise<void>(resolve => { release = resolve })
    const started = new Promise<void>(resolve => { observed = resolve })
    let hold = true
    await page.route('**/web/trips', async route => {
      if (route.request().method() !== 'GET' || !hold) { await route.continue(); return }
      hold = false; const response = await route.fetch(); observed(); await delayed
      await route.fulfill({ response }).catch(() => {})
    })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await started
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(tab.getByRole('heading', { name: 'You are signed out' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'You are signed out' })).toBeVisible()
    await expect(tab.getByText(destination, { exact: true })).toHaveCount(0)
    await page.getByRole('link', { name: 'Sign in' }).click()
    const fixtures = await import('./helpers').then(module => module.users())
    await page.getByLabel('Username or email').fill(fixtures[1].username)
    await page.getByLabel('Password', { exact: true }).fill(fixtures[1].password)
    await page.locator('#kc-login').click()
    await expect(page).toHaveURL(/\/trips$/)
    release()
    await expect(page.getByText(destination, { exact: true })).toHaveCount(0)
  } finally { await client.close(); await otherClient.close(); await isolated.close() }
})

test('responsive v3 screens, axe, keyboard validation, reduced motion and reflow', async ({ page, context }, testInfo) => {
  await login(page, 1)
  const client = await mcp(context)
  try {
    const existing = (await call(client, 'list_trips')).find((trip: any) => trip.destination === 'Travel notebook visual fixture' && trip.startDate === '2099-06-12' && trip.endDate === '2099-06-18')
    const trip = existing ?? await call(client, 'create_trip', { destination: 'Travel notebook visual fixture', startDate: '2099-06-12', endDate: '2099-06-18' })
    await clearFixtureTrips(client, trip.id)
    for (const item of await call(client, 'list_items', { tripId: trip.id })) await call(client, 'delete_item', { itemId: item.id })
    await call(client, 'add_item', { tripId: trip.id, name: 'Walking shoes', category: 'clothing', notes: 'For a long walk', itemCount: 2 })
    await page.goto('/trips/' + trip.id)
    await expect(page.getByRole('button', { name: 'Walking shoes', exact: true })).toBeVisible()
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`detail-${width}.png`), fullPage: true })
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    }
    await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/trips')
    await expect(page.getByText('0 of 1 packed · 0%', { exact: true })).toBeVisible()
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.screenshot({ path: testInfo.outputPath(`trips-${width}.png`), fullPage: true })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.setViewportSize({ width: 768, height: 900 })
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => { document.documentElement.style.fontSize = '' })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'New trip', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'New trip', exact: true }).click()
    await expect(page.getByLabel('Destination', { exact: true })).toBeFocused()
    await expect(page.getByLabel('Destination', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  } finally { await client.close() }
})
