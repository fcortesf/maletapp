## Why

Maletapp has an approved v3 web concept but no working browser client. Implementing
the [approved discovery](../../../docs/discovery/web-poc.md) will let users and
authenticated AI agents manage the same trips and packing lists, with browser
updates and protection against concurrent aggregate writes.

## What Changes

- Build an English React/TypeScript/Vite SPA in `web/`, preserving the prototypes,
  v3 visual language, accessible interactions and future `es-ES` support.
- Use existing Keycloak authorization code/S256 PKCE, in-memory tokens and
  gateway-only business requests; add explicit gateway CORS.
- Add shared item categories and explicit, idempotent trip finish/reopen operations
  to domain contracts, implementation and MCP tools.
- Serialize domain operations across browser and agent callers for the single
  in-memory API instance; define same-field update and deletion race semantics.
- Add user-scoped gateway SSE invalidations for all proxy aliases, plus browser
  reconnection, bounded batching, reconciliation and draft preservation.
- Verify contracts, ownership, concurrency, real browser/MCP integration and v3
  responsive/accessibility behavior; document each affected component.

## Capabilities

### New Capabilities

- `web-client`: authenticated SPA, v3 journeys, internationalization, remote state
  and error/draft handling.
- `item-categories`: stable category codes shared by API, MCP and web.
- `trip-lifecycle`: finish/reopen state independent of dates and packing progress.
- `domain-operation-serialization`: complete operation isolation in the current
  single-instance EF InMemory domain.
- `gateway-live-updates`: authenticated SSE, alias coverage, resource bounds and
  client recovery.

### Modified Capabilities

None in the root OpenSpec catalog, which is new. The existing
`api/openspec/specs/item-packed-state/spec.md` remains authoritative for its
unchanged explicit packed-state behavior; do not move or duplicate it.

## Impact

This root change coordinates `api/`, `gateway/`, `mcp/` and `web/`. Implementation
must update `api/spec/item.yml` and `api/spec/trip.yml` with their related API
specifications in the same session, and the relevant component documentation.
New browser dependencies and exact pins are specified in `design.md`; no new
production .NET dependency is planned. Domain additions preserve existing client
requests. Process-local serialization trades throughput for correctness at PoC scale.

This proposal contains planning artifacts only. It does not change application
code, live OpenAPI contracts, runtime configuration, dependencies or infrastructure.
No database migration, VPS/static-host deployment, broker, multi-replica support,
cookie BFF, identity-mapping migration, offline editing, embedded chat, published
design system or complete Spanish translation is included.
