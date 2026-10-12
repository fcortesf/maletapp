import { serve } from '@hono/node-server'
import { Subscribers } from './events.ts'
import { createApp } from './app.ts'
import { readConfig } from './config.ts'
const config = readConfig()
const subscribers = new Subscribers()
const app = createApp(config, subscribers)
const server = serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { subscribers.close(); server.close() })
export default app
