import { createApp } from './app.ts';
import { readConfig } from './config.ts';
const config = readConfig();
const server = createApp(config).listen(config.port, config.host, () => {
  console.info(`Maletapp MCP listening on ${config.resource}; delegation ${config.exchangeClientSecret ? 'configured' : 'requires manual setup'}`);
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());
