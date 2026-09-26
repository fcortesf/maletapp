# Discovery and decisions — 2026-09-07

Read workspace context, gateway sources/tests/ADR and actual domain endpoints, handlers, entities and persistence before implementation. No existing MCP implementation found. Gateway files remain untracked; no commits. Domain AGENTS applies to the narrowly required deletion extension; its referenced git-workflow skill is unavailable, and no Git publication is requested or needed.

Actual runtime: Keycloak 25.0.6, gateway 5000, issuer http://localhost:8080/realms/maletapp, API audience api://maletapp. All three containers running; domain memory persistence means restarting it destroys current trips. Do not restart the existing domain to load the new endpoint. Validate changes in an isolated test deployment instead.

Use official TypeScript SDK v1, stateless Streamable HTTP at http://localhost:5001/mcp, targeting MCP 2025-11-25. Per-request server/transport and delegation avoid cross-user session state. Protected resource is the exact URL, including /mcp. Validate signed, expiring RS256 user access tokens for that resource. Never forward the input bearer to gateway. Authenticate a confidential MCP client solely for RFC 8693 subject-token exchange, then verify the output signature, issuer, gateway audience and unchanged subject before use. No client_credentials grant, requested_subject, identity headers or identity mapping.

Keycloak 25 legacy exchange is preview and disabled in current command. Implement this compatible PoC path, document manual enablement and target-client permissions; do not change running Keycloak. Upgrade to supported standard exchange is an alternative requiring a separate version/migration decision. Fixed audience mappers are needed because Keycloak 25 resource-indicator behavior cannot be assumed. DCR and full interactive authorization remain manual gates.

Missing operation: DELETE /items/{itemId}. Minimal domain extension was explained to the user before modification: ownership-checked application handler, removal from baggage aggregate, existing repository UpdateAsync persistence, endpoint/contract and tests. No new dependencies or domain identity changes. isPacked toggles packing. Nullable notes and itemCount carry item comments and positive quantities; the old counter action has been retired.

Gateway /mcp remains a documented legacy HTTP prefix for backward compatibility; it is NOT the protocol endpoint. MCP calls raw gateway routes, not this prefix. New service joins only Compose edge network, never private domain network.

Sources: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization ; https://modelcontextprotocol.io/specification/2025-11-25/basic/transports ; https://ts.sdk.modelcontextprotocol.io/server ; https://www.keycloak.org/docs/25.0.6/securing_apps/index.html#_token-exchange

Verification: 9 MCP tests pass with RUN_DOMAIN_STACK=1; this includes actual
sibling gateway + fresh .NET domain and fixture token exchange, full item cycle
and two-user denial. Domain 96 tests and format pass; existing NU1903 warnings
remain. Gateway 22 tests/build/check pass. New MCP Docker container started alone;
existing services retain uptime. Real SDK → MCP → Keycloak discovery and S256
resource URL construction verified, without login or registration. Manual
exchange configuration and real-user OAuth remain pending. See docs/verification.md.

README follow-up: added explicit product goal/decision summary and a Codex CLI
OAuth example (public maletapp-codex client, fixed callback 127.0.0.1:49153,
resource audience, login/list commands and agent requests). Verified official
OpenAI docs and codex-cli 0.153.4 help/config parsing. No user Codex configuration
or Keycloak settings changed; interactive login remains unverified.


## Authorized local automation — 2026-09-07

The user explicitly requested the idempotent script and local execution. This
supersedes the earlier manual-only restriction for the local PoC; the manual guide
remains the reference for other environments. Added setup:keycloak (plan/apply/check)
and verify:keycloak. Targets existing localhost maletapp realm, Keycloak 25.0.x,
fixed sibling Compose project. No realm import, user mutations, identity migration,
secret rotation, commits or domain restart.

First apply enabled token-exchange/admin-fine-grained-authz (Keycloak recreation
with existing volume), created marked maletapp-mcp/maletapp-api/maletapp-mcp-cli/
maletapp-codex clients, audience mappers and only the MCP→API exchange policy.
Secret synchronized privately to MCP/gateway .env (0600), MCP recreated to load it.
Second apply and --check show zero changes; MCP and gateway/domain containers,
user IDs and unrelated clients preserved. Default/admin password grant is used
only by the local administrative script, never as user identity in MCP.

14 MCP/provisioning/isolated-stack tests pass; gateway 22 tests/build/check pass.
Typecheck/build pass. Actual Keycloak verifies callbacks/S256, rejects missing
PKCE/wrong callbacks/service-account grant/invalid exchange subject. Admin claim
previews show required audiences and unchanged existing subject. MCP health now
reports delegation configured. Real-user browser login and successful user-token
exchange remain pending; no end-user credentials were obtained. See
../docs/local-keycloak-setup.md and ../docs/verification.md for reproducible checks.
