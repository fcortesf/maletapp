import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { readConfig } from './config.ts'
const config = readConfig()
const app = createApp(config)
const server = serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close())
export default app
