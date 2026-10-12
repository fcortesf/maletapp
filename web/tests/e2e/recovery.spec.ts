import { test, expect } from '@playwright/test'
import { createServer, request } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { login, mcp, call, clearFixtureTrips } from './helpers'

test('initial subscription gap is reconciled by ready', async ({ page, context }) => {
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  let first = true
  await page.route('**/web/events', async route => { if (first) { first = false; await held } await route.continue() })
  const initialRead = page.waitForResponse(response => response.url().endsWith('/web/trips') && response.status() === 200)
  await login(page)
  await (await initialRead).finished()
  await expect(page.getByRole('heading', { name: 'Your next chapter' })).toBeVisible()
  const client = await mcp(context)
  try {
    const focusedRead = page.waitForResponse(response => response.url().endsWith('/web/trips') && response.status() === 200)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await (await focusedRead).finished()
    const destination = 'Subscription gap ' + Date.now()
    await call(client, 'create_trip', { destination })
    await expect(page.getByRole('heading', { name: destination, exact: true })).toHaveCount(0)
    release()
    await expect(page.getByRole('heading', { name: destination, exact: true })).toBeVisible({ timeout: 3000 })
  } finally { release(); await client.close() }
})

test('healthy stream notification loss recovers through periodic visible reconciliation', async ({ page, context }) => {
  test.setTimeout(95_000)
  let drop = false, readyFrames = 0
  const upstreams: ReturnType<typeof request>[] = []
  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Accept')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
    const upstream = request('http://localhost:5000/web/events', { headers: { authorization: req.headers.authorization! } }, response => {
      res.writeHead(response.statusCode!, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' })
      let buffer = ''
      response.on('data', chunk => {
        buffer += chunk.toString()
        let end: number
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, end + 2); buffer = buffer.slice(end + 2)
          if (frame.startsWith('event: ready')) readyFrames++
          res.write(drop && /event: (trips|items)\.changed/.test(frame) ? ': suppressed notification\n\n' : frame)
        }
      })
      response.on('end', () => res.end())
    })
    upstream.on('error', () => res.destroy()); upstream.end(); upstreams.push(upstream)
    res.on('close', () => upstream.destroy())
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing fixture listener')
  await page.route('**/web/events', route => route.continue({ url: `http://localhost:${address.port}/events` }))
  await login(page)
  await expect(page.getByText('Live updates connected', { exact: true })).toBeVisible()
  const client = await mcp(context)
  try {
    await clearFixtureTrips(client)
    await expect(page.locator('article')).toHaveCount(0)
    await page.bringToFront()
    expect(await page.evaluate(() => document.visibilityState)).toBe('visible')
    const readyRefresh = page.waitForResponse(response => new URL(response.url()).pathname === '/web/trips' && response.status() === 200)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await (await readyRefresh).finished()
    const initialReadyFrames = readyFrames
    drop = true
    let readStarted = 0, readFinished = 0
    page.on('request', request => { if (!readStarted && request.url().endsWith('/web/trips') && request.method() === 'GET') readStarted = Date.now() })
    page.on('requestfinished', request => { if (request.url().endsWith('/web/trips') && request.method() === 'GET') readFinished = Date.now() })
    const destination = 'Lost notification ' + Date.now(), start = Date.now()
    const appeared = page.evaluate(destination => new Promise<number>(resolve => {
      const observer = new MutationObserver(() => { if ([...document.querySelectorAll('h2')].some(heading => heading.textContent === destination)) { observer.disconnect(); resolve(Date.now()) } })
      observer.observe(document.body, { childList: true, subtree: true })
    }), destination)
    await call(client, 'create_trip', { destination })
    const appearedAt = await appeared
    await expect(page.getByRole('heading', { name: destination, exact: true })).toBeVisible()
    console.info(`Reconciliation render: ${appearedAt - start} ms; first GET: ${readStarted - start} ms; read sequence: ${Math.max(0, readFinished - readStarted)} ms`)
    expect(readStarted - start).toBeLessThan(60_500)
    expect(appearedAt - start).toBeLessThan(60_500 + Math.max(0, readFinished - readStarted) + 500)
    expect(appearedAt - start).toBeGreaterThan(10_000)
    console.info(`Healthy-stream reconciliation: ${appearedAt - start} ms; read: ${Math.max(0, readFinished - readStarted)} ms`)
    expect(readyFrames).toBe(initialReadyFrames)
    await expect(page.getByText('Live updates connected', { exact: true })).toBeVisible()
  } finally { await client.close(); for (const upstream of upstreams) upstream.destroy(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('network interruption, focus recovery and gateway restart preserve authoritative updates', async ({ page, context }) => {
  test.setTimeout(60_000)
  await login(page)
  const client = await mcp(context)
  try {
    await expect(page.getByText('Live updates connected', { exact: true })).toBeVisible()
    await context.setOffline(true)
    const destination = 'Offline recovery ' + Date.now()
    // The protocol client runs in the test process, so browser offline state does not queue writes.
    await call(client, 'create_trip', { destination })
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.getByRole('heading', { name: destination, exact: true })).toBeVisible({ timeout: 8000 })
    const reconnected = page.waitForResponse(response => response.url().endsWith('/web/events') && response.status() === 200, { timeout: 35_000 })
    await promisify(execFile)('docker', ['compose', 'restart', 'gateway'], { cwd: fileURLToPath(new URL('../../../gateway', import.meta.url)) })
    await reconnected
    await expect(page.getByText('Live updates connected', { exact: true })).toBeVisible({ timeout: 35_000 })
    // A restart may invalidate a pooled upstream socket. Establish recovery with
    // an authoritative read before issuing another write; never replay a write.
    await expect.poll(async () => {
      try { await call(client, 'list_trips'); return true } catch { return false }
    }, { timeout: 8000 }).toBe(true)
    const after = 'After restart ' + Date.now()
    await call(client, 'create_trip', { destination: after })
    await expect(page.getByRole('heading', { name: after, exact: true })).toBeVisible({ timeout: 3000 })
  } finally { await context.setOffline(false); await client.close() }
})

test('parent deletion retains a copyable dirty draft and disabled save', async ({ page, context }) => {
  await login(page)
  const client = await mcp(context)
  try {
    const trip = await call(client, 'create_trip', { destination: 'Removed parent ' + Date.now() })
    await call(client, 'add_item', { tripId: trip.id, name: 'Notebook', notes: 'Initial' })
    await page.goto('/trips/' + trip.id)
    await page.getByRole('button', { name: 'Notebook', exact: true }).click()
    await page.getByLabel('Notes', { exact: true }).fill('Preserved draft')
    const tab = await context.newPage(); await tab.goto('/trips/' + trip.id)
    await tab.getByRole('button', { name: 'Actions', exact: true }).click()
    await tab.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await tab.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByText(/Removed elsewhere/)).toBeVisible({ timeout: 3000 })
    await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Preserved draft')
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page).toHaveURL(/\/trips$/)
    await tab.close()
  } finally { await client.close() }
})
