# Live deployment verification — 2026-09-09

The local domain was rebuilt from main `5207afb` and the complete Compose stack
was started with its existing Keycloak volume. The MCP image already contained
the notes/quantity changes and its deployed tools were verified over HTTP.

- Gateway `/docs/openapi.json` returns notes/itemCount in create, patch and item
  response schemas, includes DELETE /items/{itemId}, and omits check-item.
- MCP health reports delegation configured; live discovery advertises nine tools,
  nullable notes/itemCount in add_item/edit_item, and guidance for consuming agents.
- The existing user's OAuth refresh succeeded and refreshed credentials were saved
  privately without printing tokens.
- Real Keycloak → MCP → gateway → domain operations passed: create a temporary trip
  and item, retrieve/list, edit notes/quantity, preserve them when packing, clear
  them with null, and delete the item. The temporary trip was then deleted through
  the gateway; no verification data was retained.
- Keycloak's existing container and volume were preserved. The in-memory domain
  started fresh. Two-user live verification was not repeated; prior isolated
  two-user coverage remains documented below.

The following sections describe earlier verification and historical pending gates;
this live deployment supersedes the earlier undeployed/single-user-login status.

# Verification — 2026-09-07

## Notes and quantity revision — verified 2026-09-07

- Domain branch `feat/item-notes-and-count` starts from main `ab1b2f4`.
- `dotnet build --no-incremental`, `dotnet test --no-build` (44 unit + 51 integration),
  and `dotnet format --verify-no-changes` pass. The existing NU1903 dependency warning remains.
- MCP `npm run check`, `npm run build`, and `RUN_DOMAIN_STACK=1 npm test` pass (15 tests).
- Nine tools are advertised. Creation/editing forward nullable notes and positive int32
  itemCount; missing fields remain omitted and explicit nulls are preserved.
- Isolated MCP → real gateway → fresh real domain verifies creation, read-back,
  pack/unpack preservation, clearing/editing notes and quantity, deletion and two-user
  ownership. A fixture issuer supplies tokens; this does not verify live Keycloak login.
- API integration tests cover wrong JSON types, invalid quantities, unchanged state after
  rejected writes, independent PATCH fields, nullable defaults, and generated Swagger.
- No existing containers were rebuilt or restarted. Upgrade domain and MCP together.

## Original implementation verification (historical)

- `npm run typecheck` (source, scripts and tests), `npm run build`; official SDK 1.30.0, Node 24.14.0.
- `RUN_DOMAIN_STACK=1 npm test`: 14 tests passed. The default `npm test` runs 13 and
  explicitly skips the opt-in full-stack integration test.
- SDK initialize, instructions, tools/list, tools/call, prompts/list, prompts/get;
  all ten tools use actual route/method/body contracts. Unknown arguments, bad
  IDs, invalid calendar dates and empty patches rejected before gateway calls.
- Signed RSA identity fixtures: missing/expired/wrong-audience/wrong-issuer,
  tampered and ID tokens rejected. Delegation rejection, audience/subject changes
  and passthrough fail closed. Concurrent users remain separate. Gateway errors
  retain status, sanitize internals, and write errors/timeouts do not retry.
- Isolated **real gateway code + real .NET domain process**, with a fixture issuer
  and exchange endpoint: trip create/list/detail; item add/list/get/edit,
  pack/unpack, increment checkCount, delete; two users denied cross-owner trip
  reads, item reads and all item mutations. Fresh process/test data discarded
  after the test. This is not real Keycloak authentication.
- Domain `dotnet build --no-incremental`, `dotnet test --no-build`: 49 unit and
  47 integration tests passed. `dotnet format --verify-no-changes` passed.
  Existing NU1903 warnings for transitive Microsoft.OpenApi 2.4.1 remain; no new
  dependency was introduced. This warning was already recorded in workspace
  context before this task.
- Gateway `npm test`, `npm run check`, `npm run build`: all 22 tests passed,
  including web/mobile identity enforcement. Only Compose and documentation
  changed in gateway, not its routing or authentication sources.
- Built and started `maletapp-gateway-mcp-1` using
  `docker compose --profile mcp up --build -d --no-deps mcp`.
  Live `/health` now succeeds with `delegationConfigured: true` after authorized local provisioning.
  Protected-resource metadata and missing/invalid-token 401 challenges verified.
- `node scripts/discovery.ts` against **real running MCP + Keycloak 25.0.6**:
  SDK resource/OIDC discovery succeeds, issuer stays localhost:8080, generated
  authorization request uses S256 and resource http://localhost:5001/mcp.
  This stops before browser login and makes no realm changes.
- Existing domain and gateway container IDs/uptime preserved; domain has no
  published host port. Keycloak was recreated once to enable the exchange features
  and MCP once to load its secret. Keycloak's named data volume was reused.
- Authorized `npm run setup:keycloak -- --apply` created four dedicated clients,
  configured audience mappers and a restricted exchange policy, and saved the
  existing client secret to ignored `.env` files with mode 0600. The second apply
  reported zero changes and preserved MCP. `--check` also reports zero drift.
- `npm run verify:keycloak` against real Keycloak: both public clients accept
  their exact callbacks with S256; missing PKCE and unregistered callbacks are
  rejected. The confidential MCP client's service-account grant is disabled and
  invalid exchange subject tokens are rejected by the enabled exchange endpoint.
  Read-only Admin API claim previews preserve an existing user's subject and
  produce required audiences; these previews are not signed, issued user tokens.
- Provisioning tests cover no-write plans, zero-write repeat application, secret/ID
  preservation, recovery after interrupted creation, unmanaged-name conflicts,
  restricted policy attachment and private/idempotent environment-file updates.

## Pending manual gates

- Complete real-user PKCE login, exchange and tools with two existing users.
  No real Keycloak user tokens were available or issued during this task.
- Verify DCR/initial-access-token policy and any chosen web client's CORS settings.
- Load the new domain deletion endpoint only at an explicitly scheduled time:
  replacing the currently running in-memory domain would erase existing trips.
  No such restart was performed. Until loaded, live `delete_item` will receive a
  gateway/domain operation error; it has no simulated-success fallback.

Authenticated CRUD on the existing live realm is therefore **not yet verified**.
The smoke and login scripts make those remaining steps repeatable without
printing tokens or touching pre-existing trips/items.
