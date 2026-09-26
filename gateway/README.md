# Maletapp gateway

Hono + TypeScript on Node.js 24. Validates access tokens with `verifyWithJwks` from `hono/jwt`, discovers the provider's JWKS, and forwards the authenticated GUID `sub` in **X-Test-User-Id**. See [the confirmed source](../api/src/Trip.API/Infrastructure/UserContext/UserContextHeaderNames.cs) and the [domain API](../api/README.md).

See the [architecture overview](docs/architecture.md) for the request flow, trust boundaries, BFF structure, and planned changes.

## Run the stack

Install Docker with Compose, and keep the repositories side by side:

```text
maletapp/
  api/
  gateway/
  mcp/
```

1. No hosts-file changes are needed. The browser uses `http://localhost:8080` for Keycloak and `http://localhost:5000` for the gateway. Compose routes server-side identity requests through Docker DNS.
2. Copy `.env.example` to `.env` and replace the admin password placeholder with your own local password. Do not commit `.env`.
3. Run:

```sh
docker compose up --build
```

Gateway: `http://localhost:5000`. Keycloak: `http://localhost:8080`. Domain HTTP port **5110** is on a dedicated internal network shared only with the gateway; it has no host port. Its Dockerfile lives here and builds the API source from the monorepo.

Keycloak imports the `maletapp` realm with the existing `maletapp-web` client and the dedicated `maletapp-swagger` client on first boot. Both use public authorization-code clients with S256 PKCE and the `api://maletapp` access-token audience. No users or secrets ship in the realm JSON. If the realm already exists, add the Swagger client using the settings below before authorizing.

Compose enables `ASPNETCORE_ENVIRONMENT=Development` on the private domain container so the gateway can fetch its generated `/swagger/v1/swagger.json`. `NODE_ENV=development` enables the gateway-owned UI at **http://localhost:5000/docs**. The domain remains accessible only on the internal network.

Readiness checks:

```sh
curl --fail http://localhost:8080/realms/maletapp/.well-known/openid-configuration
curl --fail http://localhost:5000/docs/openapi.json
curl -i http://localhost:5000/trips
```

The last request must return `401 {"error":"unauthorized"}`. Compose `depends_on` controls startup order, not readiness. `/docs` loads even while services are starting and retries loading the schema every three seconds. `/docs/openapi.json` returns `503 {"error":"docs_not_ready","dependency":"oidc"}` or `"domain_openapi"` until ready; failed discovery and schema requests recover without a gateway restart. API upstream connection failures return structured 502 and can be retried once the domain is ready.

Keycloak data persists in a named volume. Domain data is in memory and disappears on restart. `docker compose down` preserves the Keycloak volume.

## Sign in and test entirely in the browser

1. Open **http://localhost:8080/admin/** and sign in with the admin credentials from `.env`. Select the **maletapp** realm (not `master`).
2. Go to **Users → Add user**, set a username, and fill any required profile fields (email, first and last name). Leave the user enabled and create it. Under **Credentials → Set password**, enter a local password, turn **Temporary** off, and save. A local user needs no Google/GitHub setup. The admin account in `master` is separate from this API user.
3. Open **http://localhost:5000/docs**. When the operations appear, click **Authorize**. Keep client ID `maletapp-swagger`, leave any client secret field empty, and use scopes `openid profile email`. Click **Authorize** in the dialog and allow the login popup if the browser blocks it.
4. Sign in with the local `maletapp` user. Keycloak redirects the popup to `http://localhost:5000/docs/oauth2-redirect.html`; Swagger completes the code exchange with its PKCE verifier and closes the popup. Close the authorization dialog once it shows **Authorized**.
5. Expand **POST /trips**, click **Try it out**, replace the request body with the following, and click **Execute**:

```json
{"destination":"Madrid","startDate":"2026-10-01","endDate":"2026-10-05"}
```

6. Expect **201** and a trip ID. Expand **GET /trips**, click **Try it out → Execute**, and confirm Madrid appears. The request URL must start with `http://localhost:5000/`; Swagger adds `Authorization: Bearer <access token>` automatically. Use the returned trip/item IDs to exercise the other generated operations.

Tokens stay in Swagger's page memory; authorization persistence is disabled. Reload to clear them, or use Swagger's **Logout**. The Keycloak SSO session may still be active; sign out of Keycloak or use a private browser session to switch users. When an access token expires, authorize again. Swagger is a development client, not a gateway cookie session implementation.

## Exact Swagger Keycloak client settings

The checked-in [realm configuration](keycloak/maletapp-realm.json) supplies these settings on a fresh volume:

| Setting | Value |
|---|---|
| Realm / protocol | `maletapp` / OpenID Connect |
| Client ID | `maletapp-swagger` |
| Client authentication | Off (public client; no secret) |
| Standard flow | On (authorization code) |
| Implicit flow / Direct access grants / Service accounts | Off |
| Valid redirect URIs | `http://localhost:5000/docs/oauth2-redirect.html` only |
| Web origins | `http://localhost:5000` only |
| Advanced → Proof Key for Code Exchange Code Challenge Method | `S256` |
| Requested scopes | `openid profile email` |
| Audience mapper type / name | Audience / `maletapp-api-audience` |
| Included Custom Audience | `api://maletapp` |
| Add to access token / Add to ID token | On / Off |

Do not add wildcard callbacks or origins. No password grants, implicit flow, or client secrets are needed. The original `maletapp-web` client remains available at its separate `http://localhost:5173/callback` URI for a future frontend.

### Existing Keycloak volume: add the client without losing users

**Startup realm import skips an existing realm**, so rebuilding or restarting the stack will not add this client to an existing `maletapp` realm. Keep the existing volume and users. See [Keycloak's import behavior](https://www.keycloak.org/server/importExport).

In the admin console, select **maletapp → Clients → Create client**, choose OpenID Connect, and create `maletapp-swagger`. Apply the client settings in the table, save, then set the PKCE method under **Advanced**. Under **Client scopes → maletapp-swagger-dedicated → Mappers**, choose **Configure a new mapper → Audience**, set the table's mapper fields, and save. Leave **Included Client Audience** empty; use **Included Custom Audience**. If the client already exists, edit it in place. Ensure `profile` and `email` are assigned client scopes (normally assigned by default). These steps change only this client, not existing users or the `maletapp-web` client. Client and mapper concepts are described in the [Keycloak administration guide](https://www.keycloak.org/docs/latest/server_admin/index.html).

## Documentation and authentication boundary

In development, only `/docs`, `/docs/`, `/docs/init.js`, `/docs/swagger-ui.css`, `/docs/swagger-ui-bundle.js`, `/docs/openapi.json`, `/docs/oauth2-redirect.html` and `/docs/oauth2-redirect.js` are available without Bearer authentication for GET/HEAD. Unknown documentation paths and API routes still pass through JWT validation. Assets come from pinned `swagger-ui-dist` in the gateway image; no CDN or external schema validator is used.

The schema is fetched from the domain on demand, preserving generated routes and request/response schemas. The gateway replaces root, path and operation servers with `/` and applies OAuth security to each operation. Authorization and token URLs come from validated OIDC discovery; they are not hardcoded in the UI. Swagger uses [authorization-code PKCE](https://swagger.io/docs/open-source-tools/swagger-ui/usage/oauth2/) with [authorization persistence disabled](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/).

Outside `NODE_ENV=development`, `/docs` and its descendants return 404 regardless of authentication. Raw and BFF `/swagger` paths also return 404 so an upstream development UI cannot leak through a production gateway. Run the domain in Production for production deployments; the included Compose stack explicitly enables development.

`/web/*`, `/mobile/*`, and `/mcp/*` strip the client prefix before proxying; raw domain routes work too. All API groups require Bearer. `src/bff/web.ts` remains the future HttpOnly session hook. For a separate local frontend, use its development server's same-origin proxy to port 5000; API cross-origin CORS is not enabled. For terminal calls, use an access token acquired by your PKCE client:

```sh
curl -i http://localhost:5000/trips -H "Authorization: Bearer $ACCESS_TOKEN"
curl -i http://localhost:5000/mobile/trips -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Issuer mismatch or login opens an unreachable host | Use `KEYCLOAK_AUTHORITY=http://localhost:8080/realms/maletapp` and Keycloak `KC_HOSTNAME=http://localhost:8080`. Compose supplies `KEYCLOAK_INTERNAL_ORIGIN=http://keycloak:8080` for server-side discovery/JWKS. Leave this override unset for a host-run gateway. Discovery issuer and token `iss` must match the public authority exactly. Reauthorize after changing the issuer; old tokens are invalid. If an existing realm has a custom Frontend URL, clear or update it to localhost in Realm settings. |
| `invalid_redirect_uri`, client not found, or popup fails to return | Open the UI at `http://localhost:5000/docs`, not `127.0.0.1:5000`. Verify the exact callback and client ID above in the `maletapp` realm. Existing volumes need the manual client update. Allow popups and keep the original docs tab open. |
| Token exchange CORS error or `invalid_client` | Set Web origins to exactly `http://localhost:5000`; client authentication must be off and the secret field empty. Standard flow must be on, PKCE method S256. |
| Authorized UI but API returns 401 | Check access-token `aud` includes `api://maletapp`, the audience mapper applies to access tokens, issuer matches, and token is unexpired. Obtain a new token after mapper changes. Use the access token, not ID token. Do not paste tokens into online decoders. |
| API returns 403 | A validated subject must be a GUID under the unchanged identity contract. A normal local Keycloak user satisfies it; external non-GUID subjects do not. Identity mapping remains unimplemented. |
| `/docs/openapi.json` returns 503 | Inspect its `dependency` field. For `oidc`, check discovery, issuer and service logs; for `domain_openapi`, confirm the domain is running with `ASPNETCORE_ENVIRONMENT=Development` and reachable from the gateway. Run `docker compose logs keycloak domain-api gateway`. The page retries automatically, or reload it after correcting configuration. |
| API returns 502 | The domain may still be starting or unavailable. Inspect domain logs and retry. The gateway does not need restarting for dependency readiness. |
| `/docs` returns 404 | Verify gateway `NODE_ENV=development`; documentation is intentionally disabled in every other environment. |


## Social providers after first boot

1. Open the Keycloak admin console, sign in with the local admin credentials, and select `maletapp`.
2. Open **Identity providers**, add **Google** or **GitHub**, and copy the displayed redirect URI.
3. For Google, create an OAuth client in Google Cloud, configure its consent screen/test users, and register the copied URI as an authorized redirect URI. For GitHub, create an OAuth App in developer settings and set its authorization callback URL to that URI.
4. Enter the provider client ID and secret only in Keycloak's provider settings, enable the provider, and save. Do not put credentials in the realm JSON or repository.
5. Start the client's PKCE login again, select the provider, and complete the first-login account linking flow. Keycloak issues its own token with the local user's GUID subject.

If a provider rejects the lab's `http://keycloak` callback, use a provider-accepted HTTPS hostname/tunnel, configure Keycloak's `KC_HOSTNAME` and the gateway's `KEYCLOAK_AUTHORITY` to that same public issuer, ensure it resolves from both client and gateway, and register the newly displayed callback. Do not mix localhost and container issuer URLs. See [Keycloak identity brokering](https://www.keycloak.org/docs/latest/server_admin/index.html#_identity_broker).

## Auth0 and production

Provider discovery is portable: create an Auth0 API with identifier `api://maletapp` and RS256 tokens, configure the clients in Auth0, then configure the gateway's public provider setting:

```dotenv
KEYCLOAK_AUTHORITY=https://YOUR_TENANT.auth0.com/
```

Keep the trailing slash when it is part of the issuer. The gateway discovers `jwks_uri`; no Keycloak-specific path is hardcoded. When changing provider, unset `KEYCLOAK_INTERNAL_ORIGIN` (set it to an empty value in `.env` for Compose) unless you deliberately configure a matching private origin. Keep `KEYCLOAK_AUDIENCE=api://maletapp` by using that same Auth0 API identifier. See [Auth0 JWKS discovery](https://auth0.com/docs/secure/tokens/json-web-tokens/locate-json-web-key-sets).

**An end-to-end authority-only Auth0 migration is blocked by the existing domain identity contract.** The .NET accessor parses a GUID, so typical Auth0 subjects such as `google-oauth2|1183` receive structured 403 before reaching the API. The header is described as development/test-only in domain source.

**Agreed direction (not implemented):** keep Maletapp's internal GUID user IDs and add persistent identity mapping from validated `(issuer, subject)` to an internal user ID. This preserves domain ownership independently of the authentication provider. Create mappings atomically on first authenticated access; linking a new provider to an existing account requires explicit verification, never an email-only match. Renaming the test header to an explicit trusted gateway header is a separate follow-up. Changing the authority alone does not migrate existing accounts. See [ADR 0001: Map external identities to internal user IDs](docs/decisions/0001-external-identity-mapping.md) for rationale and implementation boundaries.

The included Compose file is a local PoC (Keycloak `start-dev`, HTTP, local realm SSL disabled). For a production deployment set `NODE_ENV=production`, use HTTPS issuer/JWKS endpoints and external TLS ingress, and retain the private domain network. The gateway permits HTTP identity endpoints only when `NODE_ENV=development`. These deployment changes are separate from the provider selection.

## Develop and verify

```sh
npm ci
npm run build
npm test
cp .env.example .env
# Edit .env for your local URLs.
npm run dev
```

The example `.env` sets `PORT=5000` so host development uses the same Swagger callback as Compose (which continues to use container port 3000). For a gateway running on the host, run the domain separately using `dotnet run --project ../api/src/Trip.API --launch-profile http` (port 5110), and start Keycloak with `docker compose up keycloak`. Host development bypasses the Compose network isolation and is for local testing only. `npm start` serves compiled code and expects environment variables from the launcher; `npm run dev` loads `.env`.

Tests generate temporary RSA keys and exercise real loopback OIDC/JWKS and upstream HTTP servers. They verify invalid tokens never reach upstream, identity replacement, adapter routing, methods/bodies/query strings, upstream errors and fail-closed outages. Build/typecheck and all 18 tests passed in the implementation environment, including documentation access, production denial, OAuth configuration, gateway targets, and startup recovery. UI initialization is tested in a JavaScript VM; Compose/image builds and live discovery/OpenAPI checks now pass; browser tools are unavailable, so the real Keycloak login → callback → authenticated browser API flow remains unverified.

Discovery metadata is cached until process restart; JWKS is fetched on every authenticated request, allowing key rotation without restarts at the cost of IdP latency/availability. Identity fetches time out after 5 seconds and proxy fetches after 30 seconds. Invalid authentication and domain 401/403 responses use `{ "error": "unauthorized" }`; upstream connection failures use 502 `{ "error": "bad_gateway" }`. Redirects are returned without following them. Credentials, cookies, forwarded headers and spoofed user headers are removed before proxying. Email forwarding is omitted because the domain defines no email header contract.

Hono's supported JWKS API is documented in [JWK authentication](https://hono.dev/docs/middleware/builtin/jwk). The task's `jwt({ secret: { jwks: ... } })` example is not a supported configuration in the pinned Hono version.

## Local Docker verification (2026-09-07)

`docker compose up --build -d` now builds and starts all three services successfully. The gateway-owned `docker/domain-api.Dockerfile.dockerignore` excludes host `bin`/`obj` artifacts so they cannot overwrite container NuGet restore metadata. Runtime checks confirmed `/docs` and `/docs/openapi.json` return 200 with the actual domain routes and discovered Keycloak endpoints; `/trips` without a token returns structured 401. The domain port remains unpublished. Real browser login/callback/API execution remains unverified because browser tools are unavailable.

No Windows or WSL hosts-file entry is needed with the localhost configuration. The local admin password is stored only in ignored `.env`.

## Public issuer and private identity requests

`KEYCLOAK_AUTHORITY=http://localhost:8080/realms/maletapp` is the public issuer used for exact JWT validation and browser OAuth endpoints. Compose sets `KEYCLOAK_INTERNAL_ORIGIN=http://keycloak:8080` solely for server-side discovery and JWKS HTTP requests. The gateway preserves endpoint paths and only substitutes the origin; when an internal override is configured, discovered JWKS must use the public issuer's origin. OAuth URLs returned to Swagger remain unchanged from discovery. Keycloak advertises its fixed public hostname with dynamic backchannel URLs disabled.

`KEYCLOAK_INTERNAL_ORIGIN` is optional, must be an origin without a path/credentials/query/fragment, and requires HTTPS outside development. Omit it for host execution or providers reached directly. Compose uses a default only when the variable is unset, so an explicitly empty value disables the override.

For an existing stack, update the old authority in `.env` to `http://localhost:8080/realms/maletapp`, then run `docker compose up --build -d`. This retains the Keycloak volume, users, clients and passwords. Swagger's callback and web origin remain unchanged. Reload Swagger and authorize again because previously issued tokens have the old issuer.

Live verification after the localhost migration: internal discovery and JWKS returned 200 with the exact public issuer; Swagger and callback assets returned 200 on host port 5000; a real authorization-code/S256 request reached Keycloak's login form with localhost form URLs. Missing and invalid API tokens returned structured 401. The interactive username/password → callback → authenticated API flow has not been exercised with a browser.

## Separate MCP service

The protocol endpoint is **http://localhost:5001/mcp**, implemented in the
[MCP component](../mcp/README.md). Port 5000 `/mcp/*` remains a
legacy HTTP prefix adapter for compatibility; it does not speak MCP. `/web` and
`/mobile` retain their behavior. The MCP service calls raw gateway API paths with
an exchanged user token for `api://maletapp`; it never forwards MCP tokens.

The optional `mcp` Compose profile joins only `edge`. Start existing services first,
then `docker compose --profile mcp up --build -d --no-deps mcp`. This does not restart
the in-memory domain or Keycloak. Set EXCHANGE_CLIENT_SECRET in the ignored gateway
.env after manual Keycloak configuration described in the MCP README. Do not run
`down -v` or recreate the existing domain to load item deletion while user data
needs preserving. Loading that domain extension needs a separately scheduled restart.

The local MCP setup is now automated: from the `mcp/` directory,
run `npm run setup:keycloak` to review, then `npm run setup:keycloak -- --apply`.
It reads administrator credentials from this gateway's ignored .env, persists
KEYCLOAK_FEATURES (mapped to KC_FEATURES), provisions only marked clients and
restricted token-exchange policy, and synchronizes the existing MCP secret.
Only Keycloak/MCP may be recreated; domain/gateway remain running. Repeat runs
are idempotent. See [setup details](../mcp/docs/local-keycloak-setup.md);
manual configuration remains documented for other environments.
