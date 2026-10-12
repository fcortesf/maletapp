# Maletapp web

English React/Vite SPA based on the v3 travel notebook concept. Trips and packing
lists use the real gateway, Keycloak PKCE, shared domain categories/lifecycle and
same-user MCP live updates. Prototype folders are preserved.

## Local setup

Use Node 24 (baseline 24.14.0). Start the stack from `../gateway/`:

```sh
docker compose --profile mcp up -d --build
```

From `../mcp/`, check delegated client setup with `npm run setup:keycloak -- --check`.
For a new local stack use its documented `--apply` workflow, preserving Keycloak's
volume and existing users. Do not recreate/import the realm to update an existing
volume. From `web/`:

```sh
npm ci
npm run setup:keycloak -- --apply
npm run dev
```

Open http://localhost:5173. The additive web setup keeps the existing public
client, exact callback http://localhost:5173/callback and API audience; it sets
exact logout http://localhost:5173/signed-out and English login locale. The SPA
requests English and disables login iframes so normal redirects work without
third-party cookies. Access and refresh tokens are memory-only.

`.env.example` contains public VITE_GATEWAY_BASE_URL (default /web),
VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM and VITE_KEYCLOAK_CLIENT_ID. Vite proxies /web
to localhost:5000; split origins require an absolute gateway URL ending /web and
an exact WEB_ALLOWED_ORIGINS entry. Public build config never contains credentials.

## Verification

```sh
npm run check:contracts
npm run check
npm test
npm run build
npm run setup:e2e
npm run e2e
npm run e2e:static
```

Types regenerate using `npm run generate:types` from separate source YAMLs.
Browser acceptance serves the built static output, so development hot reload cannot reset recovery timers. The real-stack tests log in two isolated fixture users and call MCP using its
existing authorization-code/token-exchange flow. Fixture passwords are random
and saved privately to ignored `.local/e2e-users.json`; fixture cleanup is scoped
to these accounts. Browser acceptance needs the stack running with MCP configured.

If Chromium's host libraries are unavailable, use the matching official browser
container (Linux host networking, loopback endpoint), from web/:

```sh
docker run --rm --network host --mount type=bind,source="$PWD",target=/work --workdir /work mcr.microsoft.com/playwright:v1.63.0-noble npx playwright run-server --port 9222 --host 127.0.0.1
```

Then set PLAYWRIGHT_WS_ENDPOINT=ws://127.0.0.1:9222/ for tests, or put that public
endpoint in ignored `.local/browser-endpoint`. Tests keep traces off so credentials
are not written into tracing artifacts. Screenshots contain fixed fixture data.

## Static hosting

`npm run build` emits dist/. A future static host must serve index.html for /,
/trips, /trips/:tripId, /callback and /signed-out while serving assets normally.
`npm run e2e:static` verifies a local static fallback/proxy server on the exact
callback origin. `npm run preview` is a local validation aid. No actual hosting
or VPS deployment is included.

The API is single-instance EF InMemory: restarts lose business data. SSE has no
replay; the browser reconciles every 60 visible seconds and on ready/focus/online.
Writes have no automatic retry/offline queue. Unknown outcomes require reading
current state before deliberate resubmission. Observed form conflicts preserve
drafts, but there are no ETags or atomic stale-editor rejection; same-field intent
is last-executed-wins. See [architecture](docs/architecture.md) and
[acceptance evidence](docs/acceptance.md).
