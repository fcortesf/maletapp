import { readFile, mkdir, rmdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { KeycloakAdmin, SetupError, type JsonObject } from './keycloak/admin.ts';
import { desiredClients, localSettings, preflight, reconcile, type Client } from './keycloak/reconcile.ts';
import { compose, saveEnvironment, updateEnvironment } from './keycloak/local.ts';
    const gatewayDirectory = fileURLToPath(new URL('../../gateway/', import.meta.url));
const gatewayEnvFile = `${gatewayDirectory}.env`;
const localEnvFile = fileURLToPath(new URL('../.env', import.meta.url));
const localDirectory = fileURLToPath(new URL('../.local/', import.meta.url));
const lock = `${localDirectory}keycloak-setup.lock`;
const flags = process.argv.slice(2);
if (flags.includes('--help')) {
  console.info('npm run setup:keycloak [-- --apply | --check]\nDefault: read-only plan. --apply reconciles local Keycloak 25, saves secrets privately and starts/recreates only Keycloak/MCP if needed. --check exits 1 on drift. Uses gateway/.env administrator credentials.');
} else {
  let locked = false;
  try {
    if (flags.some(f => !['--apply', '--check'].includes(f)) || flags.length > 1) throw new SetupError('Use no flag, --apply or --check; see --help.');
    const apply = flags.includes('--apply');
    await mkdir(localDirectory, { recursive: true, mode: 0o700 });
    try { await mkdir(lock, { mode: 0o700 }); locked = true; }
    catch { throw new SetupError('Another setup may be running. If a previous run crashed, remove .local/keycloak-setup.lock only after checking no setup process is active.'); }
    const text = await readFile(gatewayEnvFile, 'utf8');
    const env = parseEnv(text);
    if (!env.KEYCLOAK_ADMIN_PASSWORD) throw new SetupError('Set KEYCLOAK_ADMIN_PASSWORD in the existing gateway .env.');
    const expectedIssuer = 'http://localhost:8080/realms/maletapp';
    if (env.KEYCLOAK_AUTHORITY && env.KEYCLOAK_AUTHORITY !== expectedIssuer) throw new SetupError('This script targets only the existing local maletapp realm; use manual setup for other issuers.');
    if (env.KEYCLOAK_AUDIENCE && env.KEYCLOAK_AUDIENCE !== localSettings.apiAudience) throw new SetupError('Gateway audience differs from this local setup; use manual configuration.');
    // Pin Compose's managed env to the file; ambient shell overrides must not silently select another stack.
    const composeEnv: NodeJS.ProcessEnv = { ...process.env, ...env };
    delete composeEnv.COMPOSE_FILE; delete composeEnv.COMPOSE_PROJECT_NAME; delete composeEnv.COMPOSE_PROFILES; delete composeEnv.COMPOSE_ENV_FILES;
    const runCompose = (args: string[], capture = false) => compose(gatewayDirectory, ['--project-name', 'maletapp-gateway', '--file', 'docker-compose.yml', '--env-file', '.env', ...args], composeEnv, capture);
    const login = () => KeycloakAdmin.login('http://localhost:8080', 'maletapp', env.KEYCLOAK_ADMIN ?? 'admin', env.KEYCLOAK_ADMIN_PASSWORD!);
    let api = await login();
    interface ServerInfo { systemInfo: { version: string }; profileInfo: { disabledFeatures: string[] } }
    let info = await api.request<ServerInfo>('GET', '/serverinfo');
    if (!info.systemInfo.version.startsWith('25.0.')) throw new SetupError('This bootstrap supports Keycloak 25.0.x only. Review the manual exchange configuration for other versions.');
    await preflight(api);
    const managedNames = new Set(desiredClients().map(c => c.clientId));
    async function preservedState() {
      const users: JsonObject[] = [];
      for (let first = 0; ; first += 100) {
        const page = await api.request<JsonObject[]>('GET', `/users?first=${first}&max=100`); users.push(...page);
        if (page.length < 100) break;
      }
      const clients = await api.request<Client[]>('GET', '/clients');
      const unrelated = clients.filter(c => !managedNames.has(c.clientId) && c.clientId !== 'realm-management').sort((a, b) => a.clientId.localeCompare(b.clientId));
      const userIds = users.map(u => String(u.id)).sort();
      return createHash('sha256').update(JSON.stringify({ userIds, clients: unrelated })).digest('hex');
    }
    const preserved = await preservedState();
    const untouched = await runCompose(['ps', '-q', 'domain-api', 'gateway'], true);
    if (untouched.split('\n').filter(Boolean).length !== 2 || !(await runCompose(['ps', '-q', 'keycloak'], true))) {
      throw new SetupError('Expected the Maletapp Compose stack with domain, gateway and Keycloak running. Start it from gateway/ before provisioning.');
    }
    const features = new Set((env.KEYCLOAK_FEATURES ?? '').split(',').filter(Boolean));
    features.add('token-exchange'); features.add('admin-fine-grained-authz');
    const featureEnv = { KEYCLOAK_FEATURES: [...features].sort().join(',') };
    const featureDrift = updateEnvironment(text, featureEnv) !== text;
    const disabled = info.profileInfo.disabledFeatures;
    const needsFeatures = disabled.includes('TOKEN_EXCHANGE') || disabled.includes('ADMIN_FINE_GRAINED_AUTHZ');
    let changes = 0;
    if (featureDrift || needsFeatures) {
      console.info(`${apply ? 'Apply' : 'Plan'}: persist token-exchange/admin-fine-grained-authz and reconcile only Keycloak, preserving its volume.`);
      changes++;
      if (apply) {
        await saveEnvironment(gatewayEnvFile, featureEnv); Object.assign(composeEnv, featureEnv);
        await runCompose(['up', '-d', '--no-deps', 'keycloak']);
        let ready = false;
        for (let n = 0; n < 60; n++) {
          try {
            api = await login(); info = await api.request<ServerInfo>('GET', '/serverinfo');
            if (!info.profileInfo.disabledFeatures.includes('TOKEN_EXCHANGE') && !info.profileInfo.disabledFeatures.includes('ADMIN_FINE_GRAINED_AUTHZ')) { ready = true; break; }
          } catch {}
          if (n % 15 === 0) console.info('Waiting for Keycloak readiness...');
          await new Promise(r => setTimeout(r, 1000));
        }
        if (!ready) throw new SetupError('Keycloak is not ready with the required features. Existing data was not reset.');
      }
    }
    // Before features exist, avoid requesting unavailable permission APIs during a plan.
    if (!apply && needsFeatures) {
      const existing = await preflight(api);
      for (const client of desiredClients()) console.info(`Plan: ${existing.has(client.clientId) ? 'reconcile' : 'create'} ${client.clientId}`);
      console.info('Plan: reconcile the restricted exchange permission, save the existing client secret to both ignored .env files, then reconcile only MCP.');
    } else {
      const result = await reconcile(api, apply, console.info);
      changes += result.changed;
      if (result.secret) {
        const settings = { EXCHANGE_CLIENT_ID: 'maletapp-mcp', EXCHANGE_AUDIENCE: 'maletapp-api', EXCHANGE_CLIENT_SECRET: result.secret };
        const currentGateway = await readFile(gatewayEnvFile, 'utf8');
        const currentLocal = await readFile(localEnvFile, 'utf8').catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return ''; throw error; });
        // Seed host defaults on first creation only, retaining existing host settings.
        const localValues = { ...(!currentLocal ? parseEnv(await readFile(new URL('../.env.example', import.meta.url), 'utf8')) : {}), ...settings };
        const fileDrift = updateEnvironment(currentGateway, settings) !== currentGateway || updateEnvironment(currentLocal, localValues) !== currentLocal;
        if (fileDrift) { changes++; console.info(`${apply ? 'Apply' : 'Plan'}: synchronize secret/configuration into private gateway and MCP .env files (values hidden).`); }
        if (apply) {
          await saveEnvironment(gatewayEnvFile, settings); await saveEnvironment(localEnvFile, localValues);
          Object.assign(composeEnv, settings, featureEnv);
          const previousMcp = await runCompose(['ps', '-q', 'mcp'], true);
          // Compose recreates only if its configuration changed; repeat apply does not force restarts.
          await runCompose(['--profile', 'mcp', 'up', '-d', '--no-deps', 'mcp']);
          const currentMcp = await runCompose(['ps', '-q', 'mcp'], true);
          console.info(previousMcp === currentMcp ? 'MCP container preserved.' : 'MCP container started/recreated with delegated authentication configured.');
        }
      }
    }
    if (preserved !== await preservedState()) throw new SetupError('Preservation check failed: user IDs or unrelated clients changed. Investigate before continuing.');
    if (untouched !== await runCompose(['ps', '-q', 'domain-api', 'gateway'], true)) throw new SetupError('Gateway/domain container preservation check failed.');
    console.info('User IDs, unrelated clients and gateway/domain containers preserved.');
    console.info(`${apply ? 'Applied' : 'Planned'} ${changes} change group(s). Secrets were not printed or rotated.`);
    if (flags.includes('--check') && changes) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof SetupError ? error.message : 'Local Keycloak setup failed; technical details suppressed to protect credentials. Check file permissions and service availability.');
    process.exitCode = 1;
  } finally { if (locked) await rmdir(lock); }
}
