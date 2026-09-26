# Authentication contract and manual setup

The client obtains a Keycloak user access token with audience exactly
`http://localhost:5001/mcp`. MCP verifies RS256, issuer, expiration, issued-at,
subject and Keycloak access-token `typ: Bearer`. It exchanges that token using
its confidential client credentials and a fixed target client. The output must
be a different signed access token for `api://maletapp` with the same subject.
Only that output goes to the gateway. Tokens are neither logged nor stored.

The confidential credential authenticates the exchange request; it is not a
shared user account. The server never requests client-credentials grants,
impersonation, `requested_subject`, extra roles or an alternative identity.
Gateway issuer/audience checks stay unchanged. The domain still authorizes every
trip/item against the user's GUID. Persistent identity mapping remains deferred.
Scopes `openid email profile` are identity scopes, not new domain permissions.

## Keycloak choice

The installed version is **25.0.6**. Its legacy token exchange is a disabled-by-default
preview. For this local PoC, the implemented path uses that feature. A later
migration to a release supporting standard exchange is an alternative, but would
require a separate upgrade and compatibility test. The version remains unchanged. Local feature/client provisioning was subsequently
authorized and applied through the idempotent setup script. [Keycloak 25 exchange guide](https://www.keycloak.org/docs/25.0.6/securing_apps/index.html#_token-exchange).

## Local automation

For the current PoC, `npm run setup:keycloak -- --apply` now provisions these
settings without replacing the existing realm. A second apply was verified to
make zero changes. See [the local setup guide](local-keycloak-setup.md) for plan,
check, credential handling, preservation and recovery. Real-user login and a
successful exchange still require verification. The manual steps below remain
the reference procedure for other environments.

## Manual administrator steps

Use the existing `maletapp` realm and volume. Do not replace the realm import.

1. Enable `token-exchange` in the Keycloak startup feature configuration. The
   documented switch is `--features=token-exchange`. The target-client permission
   UI may also require `admin-fine-grained-authz`; enable only these needed
   features rather than all preview features. Restart **only Keycloak**, keeping
   its data volume. The local script automates this step only for the existing local PoC.
2. Create the confidential requesting client `maletapp-mcp`. Keep user login,
   implicit flow, password grants and service accounts disabled. Copy its secret
   securely to `EXCHANGE_CLIENT_SECRET` in the applicable ignored `.env`.
3. Create target client `maletapp-api`. Its access-token audience mapper must
   include custom audience `api://maletapp`. Keep unnecessary grants disabled.
4. On the target client's permissions, allow `token-exchange` only through a
   client policy selecting `maletapp-mcp`. Do not grant impersonation or broad
   exchange permissions. This follows the versioned guide's internal exchange
   permission procedure. Restrict role scope mappings to actual user permissions.
5. Create public client `maletapp-mcp-cli` with authorization code enabled,
   PKCE **S256 required**, and password/implicit grants and service accounts off.
   Register exactly `http://127.0.0.1:49152/callback` for the included CLI.
   Use exact client-specific callbacks for other MCP clients.
6. On this public client's dedicated scope, add access-token Audience mappers
   for custom audience **`http://localhost:5001/mcp`** and requesting client
   **`maletapp-mcp`**. The URI is MCP's resource identity; the client audience lets
   Keycloak 25 accept an exchange by a client different from the original issuer
   of the token. Do not add these to existing web/mobile clients by default.
7. Keep existing users and their GUID subjects. Do not recreate users or alter
   subjects to make tests pass. Apply the setup, restart only MCP to load its
   secret, then run `npm run login` and the two-user smoke procedure.

Steps 2–7 specify this application's configuration. Confirm exchanged tokens
preserve user roles/identity and audience before calling the live flow verified.
A target scope must not add privileges the user does not hold. Incoming and
exchanged tokens are independently checked by MCP and gateway; domain ownership
is the current application permission boundary.

## Discovery and interoperability

MCP publishes RFC 9728 metadata at
`/.well-known/oauth-protected-resource/mcp` (and its root alias). A 401 challenge
points there with `resource_metadata`. Metadata points to the **real Keycloak
issuer**, not to the gateway origin pretending to be an issuer. The official SDK
successfully discovers Keycloak through its OIDC fallback and constructs S256
requests carrying the exact `resource` URI. This follows the selected
[MCP authorization revision](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

Keycloak 25 resource-indicator handling is not assumed to create the correct
audience dynamically. Dedicated audience mappers pin the intended resource;
authorization requests still send `resource`. Admin claim previews now confirm these audiences and unchanged user subjects;
full real-user login/token issuance remains pending verification. Newer client-ID metadata-document
registration is not advertised by this realm; pre-registration is the tested
SDK discovery path and recommended setup for this PoC.

Keycloak OIDC discovery advertises its direct registration endpoint. MCP clients
following it do **not** automatically use gateway `/oauth/register`. The gateway
registration proxy remains available to clients explicitly configured for it;
its issuer must remain Keycloak. Do not set `authorization_servers` to the gateway
just to select that proxy. Anonymous registration, initial-access-token policies,
client mapper defaults and S256 enforcement still need manual verification.
No registration requests were sent during this task.

The service supports exact-origin CORS/preflight and validates Host/Origin to
resist DNS rebinding. Empty origins means no browser cross-origin access. Also
configure each public client's Keycloak Web Origins and registration-origin
policy where applicable. The gateway's existing OAuth proxy has no cross-origin
CORS implementation; use the direct Keycloak/pre-registered flow for this version.
No broad wildcard policy is installed.

Transport is stateless: no session credentials, resumable events or standalone
SSE stream. Authenticated GET/DELETE `/mcp` returns 405; POST handles protocol
requests. The SDK negotiates supported protocol versions. Identity and gateway
requests have deadlines, forbid following redirects and never retry writes.
