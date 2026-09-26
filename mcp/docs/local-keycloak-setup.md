# Idempotent local Keycloak setup

The user authorized automatic setup for the local PoC on 2026-09-07. The
[manual procedure](authentication.md#manual-administrator-steps) remains available
for other environments. This script supports **Keycloak 25.0.x**, the existing
`maletapp` realm at `http://localhost:8080`, and the `gateway/` component
Compose project. It does not import, replace or reset a realm.

## Run

From `mcp/`, with dependencies installed and the existing gateway/domain/
Keycloak stack running:

```bash
npm ci
npm run setup:keycloak             # Read deployment state and display a plan
npm run setup:keycloak -- --apply  # Apply and verify preservation
npm run setup:keycloak -- --check  # Exit 0 if settings match; 1 on drift/error
npm run verify:keycloak           # Live callbacks, PKCE, audiences and auth checks
```

The command resolves paths relative to its script, so it uses the gateway
`.env` regardless of shell working directory. It reads `KEYCLOAK_ADMIN` (default
`admin`) and `KEYCLOAK_ADMIN_PASSWORD` from that existing file. No password or token
is accepted in command arguments or printed. The administrator uses the built-in
`admin-cli` token endpoint solely for setup. This is separate from application
clients, which have password grants and service accounts disabled.

## Managed resources

| Client | Purpose | Callback |
|---|---|---|
| `maletapp-mcp` | Confidential client authenticating user-token exchange | None |
| `maletapp-api` | Target client; access-token audience `api://maletapp` | None |
| `maletapp-mcp-cli` | Public SDK CLI, authorization code and required S256 | `http://127.0.0.1:49152/callback` |
| `maletapp-codex` | Public Codex client, authorization code and required S256 | `http://127.0.0.1:49153/callback` |

Only `maletapp-codex` receives the optional `offline_access` client scope,
which allows Codex's OAuth refresh requests to include that scope. Rerunning
`npm run setup:keycloak -- --apply` updates existing managed clients; manual
configuration is unnecessary. Run `--check` afterwards to verify no drift remains.
After upgrading an existing login, run `codex mcp logout maletapp` followed by
`codex mcp login maletapp --scopes openid,email,profile,offline_access` from the
Codex project directory and complete the browser login.

The two public clients receive access-token audiences `http://localhost:5001/mcp`
and `maletapp-mcp`. The script manages only their dedicated audience mappers and
settings; no default realm scope or unrelated client is reconfigured. All four
clients disable implicit/password/service-account grants and unrestricted role
scope. The target's token-exchange permission is attached only to a positive
client policy selecting `maletapp-mcp`; no impersonation permission is granted.

The Admin REST API is used for client lookup/creation/update, mappers and
client-management permissions. [Keycloak 25 API reference](https://www.keycloak.org/docs-api/25.0.6/rest-api/index.html).
The legacy exchange feature/target permission model follows the
[versioned exchange guide](https://www.keycloak.org/docs/25.0.6/securing_apps/index.html#_token-exchange).

## Idempotence and preservation

- Names are looked up before creation. Newly created clients carry
  `maletapp-mcp.setup=v1`. An existing unmarked client with a requested name causes
  an error; the script never silently adopts or replaces it.
- Managed fields are compared before PUT; mapper/policy names and IDs are reused.
  Unrelated attributes are retained. A conflicting unmanaged exchange policy or
  another policy on the target permission causes an error for manual review.
- The MCP secret is retrieved with GET and reused. The secret-generation/rotation
  endpoint is never called. Files are written atomically with mode `0600`; unchanged
  files retain their modification times. `.env` and temporary variants are ignored
  by Git. Duplicate managed environment assignments and symlink destinations fail.
- The gateway `.env` gains `KEYCLOAK_FEATURES` containing `token-exchange` and
  `admin-fine-grained-authz`, preserving any already-listed features. Compose maps
  this to `KC_FEATURES`. Only Keycloak is reconciled with `up -d --no-deps` if
  feature configuration is missing. Its existing named data volume is reused.
- The existing secret, `EXCHANGE_CLIENT_ID` and `EXCHANGE_AUDIENCE` are synchronized
  to both gateway and MCP `.env`. The MCP `.env` is seeded from `.env.example` only
  when absent/empty. Neither file's other existing settings are overwritten.
- Only MCP is then reconciled by Compose to load its secret. No forced rebuild or
  restart occurs on subsequent matching runs. Gateway and domain are never restarted.
- User IDs, unrelated client representations and gateway/domain container IDs are
  compared before/after. No user write endpoint is called. Realm-management's
  intended new target permission is excluded from the unrelated-client comparison.

Setup is not a multi-request transaction. If a request fails after Keycloak has
persisted it, rerun the command: existing marked resources are recognized. Writes
have no automatic retries. Do not delete clients to recover; that changes IDs and
secrets. A local `.local/keycloak-setup.lock` directory prevents concurrent runs.
If execution is interrupted, check that no setup process is active before removing
that stale lock directory. Administrator tokens and raw API errors are not logged.

`--check` verifies desired configuration and the private environment files; it
is not proof of a successful end-user login or live token exchange. Default plan
and check make no persistent Keycloak configuration changes; authentication and
the local transient lock are still needed to inspect protected administration APIs.

## What was verified locally

The first apply created four clients, audience mappers and the restricted
exchange permission, enabled the two required features and configured MCP.
The second apply reported **zero changes** and retained the MCP container;
client IDs and the secret remained unchanged. Gateway/domain containers and
users were preserved across both runs.

`npm run verify:keycloak` checks real Keycloak login forms for both public
clients, rejection of missing PKCE and unregistered callbacks, disabled
client-credentials grants, rejection of an invalid exchange subject token, and
MCP `delegationConfigured: true`. If a user already exists, read-only Admin API
claim previews check subject/audiences without issuing an end-user token.

A complete successful user login → token exchange → MCP tool call still requires
signing in as a real user. After setup use `npm run login`, or the
[Codex configuration](../README.md#connect-codex-cli). This script does not alter
your Codex configuration, register anonymous dynamic clients or create test users.
The running domain still predates item deletion; loading it remains separate
because restarting that in-memory service would discard its trips.
