# Web component guidance

- Node 24; use the exact dependency pins and npm lockfile, without peer overrides.
- Install with `npm ci`; verify `npm run check:contracts`, `npm run check`,
  `npm test`, `npm run build`, `npm run e2e`, `npm run e2e:static`.
- Source contracts remain `../api/spec/{trip,item}.yml`; regenerate using
  `npm run generate:types`. Never edit generated files manually.
- Keep prototypes intact. App composition lives in app/, shared auth/transport/
  i18n/UI in shared/, product behavior in features/, and routes in pages/.
- Presentation primitives receive props/actions and contain no domain queries.
- Extract all UI, aria, validation and notification copy into English namespaces;
  preserve user text. Travel dates are date-only, formatted with UTC Intl en-GB.
- Business requests use only gateway /web. Tokens stay in adapter memory;
  no query/draft/token persistence. Env examples contain public config only.
- Keep drafts independent from query data; write only dirty fields and explicit
  packed intent. Disable automatic write retries and known-offline writes.
- SSE is best effort. Preserve initial-ready/focus/online/60-second reconciliation,
  four-read concurrency, bounded batching and auth-generation cleanup.
- Update README/architecture/acceptance evidence when behavior changes.
- Real browser tests require the local Compose MCP profile and two isolated
  Keycloak fixtures; credentials remain only in ignored .local.
