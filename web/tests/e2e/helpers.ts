import { parseEnv } from 'node:util'
import { readConfig } from '../../../mcp/src/config.ts'
import { Identity } from '../../../mcp/src/auth.ts'
import { Gateway } from '../../../mcp/src/gateway.ts'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createHash, randomBytes } from 'node:crypto'
import type { BrowserContext, Page } from '@playwright/test'
import { Client } from '../../../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js'
import { StreamableHTTPClientTransport } from '../../../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js'
const gateways = new WeakMap<Client, Gateway>()
export async function users(): Promise<{ username: string; password: string }[]> { return JSON.parse(await readFile(new URL('../../.local/e2e-users.json', import.meta.url), 'utf8')) }
export async function login(page: Page, index = 0, path = '/trips') {
  const fixture = (await users())[index]
  await page.goto(path)
  await page.locator('#username').fill(fixture.username)
  await page.locator('#password').fill(fixture.password)
  await page.locator('#kc-login').click()
  await page.waitForURL('**' + path)
}
export async function mcp(context: BrowserContext) {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(16).toString('hex')
  const callback = 'http://127.0.0.1:49152/callback'
  const auth = new URL('http://localhost:8080/realms/maletapp/protocol/openid-connect/auth')
  auth.search = new URLSearchParams({ client_id: 'maletapp-mcp-cli', redirect_uri: callback, response_type: 'code', scope: 'openid', code_challenge: challenge, code_challenge_method: 'S256', state }).toString()
  const page = await context.newPage()
  const server = createServer((_req, res) => { res.setHeader('content-type', 'text/html'); res.end('<html><body>Authenticated</body></html>') })
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(49152, '127.0.0.1', resolve) })
  try { await page.goto(auth.href); await page.waitForURL(callback + '**') }
  finally { await new Promise<void>(resolve => server.close(() => resolve())) }
  const url = new URL(page.url())
  if (url.searchParams.get('state') !== state) throw new Error('Invalid OAuth state')
  const code = url.searchParams.get('code')!
  const response = await context.request.post('http://localhost:8080/realms/maletapp/protocol/openid-connect/token', { form: { grant_type: 'authorization_code', client_id: 'maletapp-mcp-cli', redirect_uri: callback, code, code_verifier: verifier } })
  if (!response.ok()) throw new Error('MCP authorization failed')
  const tokens = await response.json()
  await page.close()
  const client = new Client({ name: 'maletapp-web-acceptance', version: '1' })
  await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:5001/mcp'), { requestInit: { headers: { Authorization: `Bearer ${tokens.access_token}` } } }))
  const config = readConfig(parseEnv(await readFile(new URL('../../../mcp/.env', import.meta.url), 'utf8')))
  const identity = new Identity(config)
  gateways.set(client, new Gateway(config, identity, await identity.authenticate(tokens.access_token)))
  return client
}
export async function clearFixtureTrips(client: Client, keepId?: string) {
  const gateway = gateways.get(client)!
  const trips = await call(client, 'list_trips')
  for (const trip of trips) if (trip.id !== keepId) await gateway.request('DELETE', `/trips/${trip.id}`)
}
export async function call(client: Client, name: string, args: Record<string, unknown> = {}): Promise<any> {
  const response = await client.callTool({ name, arguments: args })
  if (response.isError) throw new Error(`MCP ${name} failed`)
  return (response.structuredContent as { result: unknown }).result
}
