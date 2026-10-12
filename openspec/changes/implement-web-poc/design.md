## Context

Planning date: 2026-09-28. Status: proposed implementation, no application changes.
The [discovery](../../../docs/discovery/web-poc.md) supplies the approved product
direction. This design resolves its pending decisions; it is not a description
of behavior already deployed.

The gateway validates GUID subjects and proxies raw, `/web`, `/mobile` and `/mcp`
paths. MCP uses raw paths. The API uses EF Core InMemory and reconstructs an
entire trip's contained baggage/items on updates. Endpoint registration confirms
trip CRUD except update, and item list/create/read/patch/delete. The baggage
routes present in `api/spec/item.yml` are not registered and are not web features.
The only existing OpenSpec catalog is under `api/`; this root change coordinates
services without moving that catalog or changing its packed-state requirements.

## Goals / Non-Goals

**Goals:** deliver the v3 journeys through the real gateway, shared categories and
trip lifecycle, safe operation serialization, authenticated best-effort updates,
English UI with i18n foundations, and verifiable browser/agent interoperability.

**Non-Goals:** those in discovery, including durable storage, actual deployment,
multiple API/gateway instances, offline writes, replay/outbox, cookie sessions,
identity mapping, shared trips and a Spanish translation. No trip destination/date
editor, baggage management, search service or backend suggestions API is added.

## Decisions

### 1. Contract ownership and domain extensions

Implementation starts with `api/spec/item.yml` and `api/spec/trip.yml`, updating
related `api/specs/002-trip-items-api/{spec,plan}.md` and
`api/specs/001-add-trip-api/{spec,plan}.md` in the same session. Add the deletion
race guarantees to `api/specs/005-delete-trip/{spec,plan}.md`. Root capability
specs coordinate the change; these YAML files remain the wire-contract authority.
Use additive versions Items `0.0.3` and Trips `0.0.2` for these additions.

**Categories:** `category` is a non-null string enum on every Item response,
required in the response schema, optional on NewItem and PatchItem:

| Wire code | English label | v3 category |
| --- | --- | --- |
| `documents` | Documents | documentacion |
| `clothing` | Clothing | ropa |
| `toiletries` | Toiletries | higiene |
| `electronics` | Electronics | electronica |
| `health` | Health | salud |
| `accessories` | Accessories | accesorios |
| `other` | Other | otros |

Creation omission defaults to `other`. PATCH omission preserves the value;
explicit `other` resets it. Null, empty, numeric, unknown and differently cased
values return 400 problem details, with no partial mutation. Rehydration/default
models use `other` for legacy objects lacking the field. Store a typed domain
value and map explicit lowercase codes at the boundary; reject numeric enum
deserialization. Categories are fixed for this PoC, not user-managed entities.
Labels belong to translation resources, never to the stored value. This avoids
free-text grouping drift and does not couple Items to a new sub-API.

Preserve existing notes/quantity semantics: missing PATCH fields are unchanged;
`notes: null` and `itemCount: null` clear; count is a positive int32, never an
implied one. UI blank optional inputs explicitly clear on edit only when dirty.
Retain `defaultItemId` behavior and new items' `isPacked: false`. Suggestions
create ordinary items with name/category and no invented `defaultItemId`.

**Trip lifecycle:** add required read-only response boolean `isFinished`, default
false; NewTrip cannot set it. Use explicit desired-state commands:

| Operation | Request | Success | Errors |
| --- | --- | --- | --- |
| `finishTrip` | `POST /trips/{tripId}/finish`, no body | 200 Trip with `isFinished: true` | 401 / 403 / 404 / 500 |
| `reopenTrip` | `POST /trips/{tripId}/reopen`, no body | 200 Trip with `isFinished: false` | 401 / 403 / 404 / 500 |

Both operations are idempotent: repeating the same intent returns 200 unchanged.
They preserve dates, item contents, categories and packed state. An empty or
partially packed trip can finish; packing 100% or passing the end date never
finishes it automatically. Finished trips remain editable and deletable, matching
the prototype. There is no `finishedAt` or inferred lifecycle transition. Explicit
commands expose intent to MCP without introducing a general trip PATCH surface.

UI status precedence follows v3: finished first; then past if end date is before
the user's local calendar day; then preparing if start is today/past and end is
absent/today/future; undated trips are preparing if any item is packed, otherwise
upcoming; all other cases upcoming. A reopened past trip displays Past. Progress
is packed item rows / all item rows, independent of quantity; zero items means 0%
and an empty-list label. Date changes at local midnight/focus recompute UI status.

### 2. Serialize complete domain operations for this PoC

Use a single process-wide asynchronous `SemaphoreSlim(1, 1)` behind an application
abstraction, `IDomainOperationGate`, implemented/registered as a singleton in
infrastructure. Acquire it once in every trip/item application handler, before
the first repository read, and release in `finally` after SaveChanges and DTO
snapshot creation. Cover reads as well as writes so no request observes a
partially rewritten aggregate. Pass cancellation to `WaitAsync` and repository
calls; release only after successful acquisition. No nested acquisition.

Coverage is explicit: create/list/get/delete trip; finish/reopen trip;
create/list/get/patch/delete item. Ownership checks, item-to-trip resolution,
default-baggage creation, all read/modify/write work and cascade deletion happen
inside that same critical section. All callers, including direct private API
tests and MCP, pass through these handlers. Request parsing and response/network
streaming remain outside. Do not hold the gate during gateway or SSE work.

This deliberately serializes all users for the small dataset. A global gate avoids
the item-ID-to-trip-ID lookup/deletion race and lock-map cleanup complexity of
per-trip locks. A lock only inside `UpdateAsync`, per-request semaphore, frontend
queue or gateway mutex cannot protect the stale snapshot loaded by a handler.
Optimistic ETags would provide stale-editor conflict detection but add client
preconditions and compatibility changes across all writes; defer that broader
contract until needed. No new production .NET dependency or constitution change
is necessary: containment remains the only Items/Trips coupling.

Guaranteed outcome is a serial order of completed operations, not request-arrival
order. Concurrent item additions both survive, disjoint PATCH fields accumulate,
and lifecycle/packing changes preserve each other. If two writes explicitly set
the same field, the last operation to execute wins. There is no revision check or
409 for an editor's stale intent. State this limitation in web/MCP docs. Frontend
PATCH sends only dirty fields; explicit packed values are never toggle commands.

If deletion executes first, a queued item/lifecycle operation re-reads and returns
404; it cannot recreate the trip/item. If an update executes first and deletion
second, both succeed and the resource is ultimately absent. Keep foreign-owner
403 semantics. Validate all requested fields before changing tracked persistence;
map expected missing-resource failures to typed exceptions/problem details.
No transaction, crash-atomicity or rollback guarantee is claimed for EF InMemory;
failed/unknown writes trigger reads, never blind retries.

### 3. Browser dependencies and build boundary

Create a separate `web/package.json` and lockfile, leaving prototype packages
intact. Node `24.14.0` is the selected planning baseline (already available locally);
use the Node 24 line, and exact package pins without caret/tilde:

| Role | Package pins |
| --- | --- |
| Rendering | `react@19.3.0`, `react-dom@19.3.0` |
| Routing/state | `react-router@8.4.0`, `@tanstack/react-query@5.104.0` |
| Auth | `keycloak-js@25.0.6` |
| Translation | `i18next@26.4.2`, `react-i18next@17.0.15` |
| Headless controls | `@radix-ui/react-dialog@1.1.23`, `@radix-ui/react-dropdown-menu@2.1.24` |
| Build | `vite@8.3.1`, `@vitejs/plugin-react@6.1.1`, `typescript@5.9.3` |
| Contract generation | `openapi-typescript@7.13.0` |
| Types | `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `@types/node@24.13.3` |
| Unit/component tests | `vitest@5.0.2`, `jsdom@26.1.0`, `@testing-library/react@16.3.3`, `@testing-library/dom@10.4.2`, `@testing-library/user-event@14.6.7` |
| Browser/accessibility tests | `@playwright/test@1.63.0`, `@axe-core/playwright@4.13.0` |

Registry versions, Node engines and peer ranges were inspected during planning.
TypeScript 5.9.3 satisfies openapi-typescript's `^5.x` peer; do not copy the other
components' TypeScript 7 pin into web. jsdom 26.1.0 supports current Node 24.14,
whereas current jsdom 30 requires a newer Node patch. Keycloak adapter 25.0.6
matches the deployed server's 25 line; do not upgrade the server as part of this
work. Optional React compiler/Babel peers and canvas are not enabled. Peer-range
compatibility is established; installation/build and real Keycloak behavior are
implementation gates, not claimed as tested here. Lock transitive dependencies
with npm during implementation and use `npm ci` thereafter.

Use React Router's client library mode, no framework server/SSR. Generate separate
`shared/api/generated/{trip,item}.ts` files from the two source YAML files, expose
aliases through a small API module, and check generation drift. Resolve generator
schema errors in source contracts with related spec updates, including the Trips
contract's currently referenced but undefined `bearerAuth` security scheme.
Do not assume the generator creates working endpoints for baggage routes.

Follow the discovery `app/shared/features/pages` layout. CSS Modules consume
extracted v3 CSS variables; reuse its system serif/sans typography and local SVG
illustrations/icons. Radix supplies dialog/menu focus and keyboard behavior;
style through the existing visual language. Use native select/checkbox controls
where appropriate. Presentation primitives receive props/actions; query, auth
and transport logic stay in feature/shared services. Avoid a separate UI package.

### 4. Authentication, origins and HTTP

Initialize one Keycloak adapter before the router (including under React strict
mode). Use public `maletapp-web`, authorization code, explicit `pkceMethod: S256`,
`login-required`, and `checkLoginIframe: false`; rely on normal redirects, not
third-party-cookie-dependent silent checks. Request login locale `en`. Tokens
remain adapter memory only, with no token/cached-data persistence. Temporary
adapter PKCE/state/nonce storage is allowed; it is not token persistence.

Routes: `/` redirects to `/trips`, `/trips`, `/trips/:tripId`, `/callback`, and a
public signed-out `/signed-out` page. Preserve only a validated same-origin app
return path in sessionStorage across login; reject schemes, `//` and callback
loops. Consume it once and clean the authorization callback URL. Add exact local
post-logout redirect `/signed-out`; existing callback remains
`http://localhost:5173/callback`. A reload re-establishes auth using the Keycloak
session; this does not require storing tokens. The adapter guidance explicitly
requires initialization before routing and recommends memory-only tokens.
[Keycloak adapter documentation](https://www.keycloak.org/securing-apps/javascript-adapter).

Serialize renewal through one shared promise using `updateToken(30)` before REST
and stream creation. All business fetches use `credentials: omit`. Local logout
first aborts requests, closes SSE, clears the
query cache and form state, and broadcasts a credential-free logout message to
other tabs, then invokes Keycloak logout. On subject/issuer change perform the
same cleanup before showing the new user's view. Async callbacks carry an auth
generation and cannot repopulate a newer session's cache. Remote Keycloak logout
is detected on renewal/401; immediate server-side token revocation is not claimed.

Use relative `/web` through a Vite development proxy to `http://localhost:5000`.
Public configuration: `VITE_GATEWAY_BASE_URL` (default `/web`, absolute gateway
URL ending `/web` for split origins), `VITE_KEYCLOAK_URL`,
`VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`. Keep public examples in
`web/.env.example`. Configure explicit `WEB_ALLOWED_ORIGINS` in gateway examples
and local Compose, default local origin `http://localhost:5173`; no wildcard or
suffix matching. CORS middleware precedes auth for `/web/*` OPTIONS: allow
GET/POST/PATCH/DELETE/OPTIONS, Authorization/Content-Type/Accept; expose
Retry-After/WWW-Authenticate, add Vary: Origin and no credentials. Disallowed
origins receive no allow-origin header; unauthenticated preflight never proxies.
Actual requests, including the SSE GET, still require JWT validation. Existing
raw/mobile/MCP authentication and identity-header stripping stay intact.

Generate static `web/dist`, document host fallback to index.html for app routes
and callback, and verify direct deep links on a local static test server. Vite
preview is only a local validation aid, not a production hosting choice.
[Vite guide](https://vite.dev/guide/).

### 5. Gateway SSE contract v1

Register exact `GET /web/events` after authentication and before proxy routes.
It belongs to the gateway; no `/events`, `/mcp/events` or domain endpoint is added.
Extend validated auth context with token expiry and use canonical lowercase GUID
identity for both publishing/subscribing. Never accept user scope from query,
body or identity headers, and never put Bearer tokens in URLs.

Response: `text/event-stream`, `Cache-Control: no-store, no-transform`,
`X-Accel-Buffering: no`. Use Hono streaming cancellation/write facilities with
an independent lifecycle, not the domain proxy's 30-second AbortSignal.
[Hono streaming documentation](https://hono.dev/docs/helpers/streaming).

Register the subscription before sending this initial frame:

```text
event: ready
data: {"version":1,"expiresAt":"2026-09-28T10:05:00.000Z"}

event: trips.changed
data: {"version":1,"tripId":"<uuid>"}

event: items.changed
data: {"version":1,"tripId":"<uuid>"}

event: items.changed
data: {"version":1,"itemId":"<uuid>"}

```

Payload IDs are optional narrowing hints. They contain no names, notes, full
resources or user identifiers. No `id` field, Last-Event-ID replay, persisted
offset or business-event meaning. Unknown event names are ignored; an unsupported
version or malformed known event moves the client to reconciliation mode and
surfaces a translated update-connection error without a reconnect hot loop.
v1 supports additive optional fields; a breaking version needs coordinated
client support. `ready` is emitted only after authorization and registration.

Emit after a domain response confirms the exact success status below, using a
shared post-proxy hook that normalizes the supported prefix once:

| Normalized method/path | Confirmed status | Notification |
| --- | --- | --- |
| POST `/trips` | 201 | `trips.changed`, no ID required |
| DELETE `/trips/:tripId` | 204 | `trips.changed` with tripId; invalidate its detail/items too |
| POST `/trips/:tripId/finish` or `/reopen` | 200 | `trips.changed` with tripId |
| POST `/trips/:tripId/items` | 201 | `items.changed` with tripId |
| PATCH `/items/:itemId` | 200 | `items.changed` with itemId |
| DELETE `/items/:itemId` | 204 | `items.changed` with itemId |

The table applies identically to raw, web, mobile and mcp aliases. Do not parse
or buffer response bodies just for enrichment. An itemId without tripId broadly
invalidates that user's item-list queries/card counters; no extra ownership
lookup. No event for reads, redirects, unexpected 202, validation/auth failures
or failed upstream fetches. A repeated successful finish can emit a harmless
duplicate. Notification failure never changes a committed HTTP response.

Each tab has one fetch-based stream with Authorization and `credentials: omit`.
Server closes at `min(validated token exp, connected time + 5 minutes)`; send no
event at/after that boundary, including queued events. Client renews auth and
replaces the stream 15 seconds before advertised expiry, closing the old one
before opening another. If too little lifetime remains, refresh before opening.
No stream lives indefinitely on its initial token. Invalid auth at connect is
401/403 with ordinary gateway JSON, not a 200 SSE error frame.

Heartbeat comment every 15 seconds; browser aborts/reconnects after 45 seconds
without received bytes. Bound each subscriber to 32 queued frames, each write
to 5 seconds, 10 streams per user and 1,000 per process. Disconnect a slow
subscriber without blocking publisher/other tabs. Capacity rejection returns
429 and Retry-After: 30. Cleanup registration, queued frames, timers and abort
handlers on disconnect, expiry, cancellation, send failure and shutdown. Test
these bounds with injected clocks; do not await one slow subscriber in the
REST success path. Future ingress needs buffering disabled, caching disabled
and idle timeout greater than 45 seconds; actual ingress deployment is excluded.

### 6. Query recovery, drafts and errors

Use authenticated query keys scoped by issuer plus canonical subject:
`[scope, 'trips']`, `[scope, 'trip', tripId]`, `[scope, 'items', tripId]`,
`[scope, 'item', itemId]`. Do not include access tokens. Cards consume the same
item-list queries as the detail page. Limit all browser business GETs to four
in flight with abortable queued requests; this also bounds card-counter fanout.
Incomplete/failed counter queries display unknown/retry state, never invented 0%.

`trips.changed` invalidates the list and indicated trip/detail/items (all current
trip/detail/item queries if no ID). `items.changed` invalidates identified trip
items or all user's item queries, and derived progress. Inactive queries become
stale for their next mount; active queries refetch. Coalesce notifications with
250 ms debounce and 1 second maximum wait. While a refresh is in flight, retain
a dirty flag and perform one trailing refresh so writes arriving during reads
are not lost; no unbounded queues of identical invalidations. Query invalidation
marks cached data stale and refetches active queries.
[TanStack Query invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation).

On every `ready`, refetch all active user queries even on the first connection;
this closes the initial-read/subscription gap. Reconnect with randomized backoff
1/2/4/8/16/30 seconds capped at 30, resetting after ready; honor Retry-After and
pause when offline. Refetch on focus/online and every 60 seconds while visible,
whether SSE appears healthy or disconnected. Background tabs reconcile on return;
there is no browser-timer delivery deadline while suspended. Disable writes while
known offline and preserve drafts; there is no offline mutation queue.

Successful local mutations update/invalidate affected queries immediately and
deduplicate with SSE refreshes. Use no optimistic domain mutation initially;
disable duplicate submit/row actions until settled. A create response supplies
the new ID for navigation. Writes have automatic retries disabled. Idempotence
does not prove whether a timed-out request committed, especially a create.

Forms retain a local initial snapshot and dirty-field state independently of
query data. Background updates can refresh non-dirty display data but must not
overwrite draft values or steal focus. If a refreshed dirty field differs from
the initial snapshot, show a translated changed-elsewhere notice with reload
or deliberate save choices. This is a usability check, not atomic optimistic
concurrency: an unseen concurrent same-field write still follows serial last
writer semantics. If item/trip disappears, disable save, retain draft for copying,
show a removed message and offer navigation; never silently recreate it.

Normalize domain RFC 9457 problems and gateway `{error}` responses into UI error
codes; do not display arbitrary server text as translated UI. Handle:

| Result | Browser behavior |
| --- | --- |
| 400 | Inline translated validation; preserve draft and focus first invalid field |
| 401 / failed renewal | Cancel protected work, clear session cache, offer login; GET can retry once after successful coordinated renewal, writes never replay automatically |
| 403 | Access-denied state, no retry loop; distinguish from removed resource |
| 404 | Missing/deleted state, evict stale resource, preserve an open draft |
| 409 if received | Conflict notice and explicit review/refetch; no current operation invents a revision conflict |
| 429 | Respect Retry-After for reads/stream, keep cached state |
| Network / 5xx | Read error with bounded retry (max two); retain last data with stale notice. For writes show outcome-unknown when commitment is uncertain, refetch before a user decides to resubmit |

After an uncertain create, show refreshed list for review; a matching name is
not proof of identity and must not drive automatic deduplication or retry.

### 7. MCP, journeys, i18n and accessibility

Extend `add_item`/`edit_item` strict schemas with the exact category enum and
ensure category-only edits count as nonempty. Existing reads return category and
isFinished; `set_item_packed` remains explicit. Add `finish_trip` and `reopen_trip`
with required tripId, no toggle, idempotent annotations despite POST, and ordinary
user delegation. Update descriptions/instructions: dates/progress do not authorize
finishing; act only within user intent, preserve unrelated fields, and never
blindly retry uncertain writes. Trip deletion already works through web/API; do
not add an unrelated MCP tool solely for parity. Keep the existing Spanish MCP
prompt; English-first applies to the new browser and Keycloak login experience.

Implement v3 trip grid/cards, create-trip sheet, detail/progress, flat/grouped
packing lists and collapsible categories, item add/edit, suggestion chips,
explicit packing checkbox, trip/item delete confirmations, finish/reopen menus,
notifications and account/logout. No prototype data/localStorage migration. Local
decorative SVG variant derives deterministically from trip ID, with translated
generic captions; it does not assert destination facts. Keep dev-only prototype
state toggles/design-system gallery outside product navigation.

English resources use `common`, `trips`, `packing`, `auth`; initial language `en`,
formatting locale `en-GB`, fallback `en`. Structure allows later `es-ES` without
shipping translations/picker now. Extract validation, aria labels, categories,
errors, suggestions, toasts and disconnected states. Never translate user text.
Keep date-only API strings as YYYY-MM-DD; use parsed year/month/day and explicit
UTC date formatting for travel dates, separate from local-calendar today logic,
so western/eastern timezone tests cannot shift the displayed date. Use Intl for
dates/numbers and i18next plural rules instead of sentence concatenation.

Preserve desktop grid/mobile sheet behavior, v3 tokens and local art. Verify
320/390/768/1440 CSS-pixel viewports, zoom/reflow, reduced motion, readable
contrast, visible focus, labeled controls, Escape/menu keys, focus trapping and
return, and live announcements without announcing every background event. Keep
loading, empty, retry/error and disconnected states distinct; retain usable cached
content during stream loss. If a control's resource disappears, move focus to a
stable message/navigation target, without discarding the draft.

### 8. Verification and documentation ownership

API unit tests cover category/lifecycle rules, defaulting and field presence;
integration tests cover status/schema/ownership/persistence and deterministic
concurrency. Add cross-endpoint suites at
`api/tests/Trip.API.IntegrationTests/Concurrency/`, using barriers/test hooks
around repository access rather than sleeps. Verify only one handler enters the
critical region, both commit orders of races, and cancellation/exception release.
Verify default baggage uniqueness indirectly through item baggageIds and, where
needed, test-only persistence inspection; no baggage endpoint is implied.

Gateway `test/` suites use local upstream/JWKS fixtures and fake timers for SSE
auth, expiry, aliases, failure/no-event, identity spoofing, case-normalized scope,
slow-client/capacity cleanup, heartbeat and disconnect. MCP `test/` covers strict
schema/defaults, lifecycle routes/annotations and delegation/error semantics.
Web `src/**/*.test.ts(x)` covers drafts, null/omission, dates, auth races and query
scheduling with mocked boundaries; `web/tests/e2e/` covers the real local Compose
stack plus SPA. Browser tests log in via Keycloak and use authenticated MCP
protocol calls with the same user's delegated identity; an LLM or manual agent
is not required for a deterministic end-to-end assertion.

End-to-end cases include another user's stream/cache isolation, two tabs,
MCP-created trips/items and packed/category changes without reload, finish/reopen,
external deletion with dirty form, burst writes, initial-subscription race,
gateway restart, dropped notifications on a healthy stream, token renewal/expiry,
logout/user switch during requests, and blocked third-party cookies. Target
healthy visible-tab changes within 3 seconds in local tests; lost events reconcile
within 60 seconds plus request time. Visual fixtures use fixed dates/data and
reviewable screenshots for the four viewports; compare composition to v3 with
English copy rather than asserting identical Spanish pixels.

Implementation documentation: `web/AGENTS.md`, `web/README.md`,
`web/docs/architecture.md`; `gateway/docs/architecture.md` and new
`gateway/docs/web-realtime.md`; `mcp/README.md`, `mcp/docs/authentication.md` and
`mcp/docs/verification.md`; API contracts, related specs/plans and API README.
Update discovery status only when implementation status actually changes. Record
local setup and existing-volume Keycloak callback/logout/locale updates; realm
import alone does not update an existing persistent realm. Never commit secrets.

Constitution check: contract-first tasks precede runtime code; Items/Trips retain
containment boundaries; application uses repository/gate abstractions and EF;
unit/integration tests, cancellation, typed errors and standard quality gates are
required. No constitution exception and no new production .NET package is planned.

## Risks / Trade-offs

- Global serialization reduces throughput across users → acceptable for this PoC;
  document one API instance and replace with transactional/versioned persistence
  before scaling. Same-field stale intent remains last-writer-wins, explicitly.
- Best-effort notifications can be lost around commits/restarts → initial-ready,
  reconnect, focus/network and 60-second reconciliation recover authoritative data.
- Expiry bounds do not implement immediate JWT revocation → local logout closes
  tabs immediately; server authorization is bounded by token lifetime/5 minutes.
- Multiple item-list fetches scale with trips → shared cache, four-read limit,
  unknown counter state; summaries are a later measured optimization.
- InMemory restart loses domain data and does not supply durable transactions →
  local PoC only; browser handles disappeared resources; VPS requires persistence.
- Package peer compatibility is not runtime proof → lock/install/build and the
  early real Keycloak/stream slice must pass before full screen composition.

## Migration Plan

No runtime migration is executed by this proposal. Implement domain contracts,
gate and extensions first, then MCP, gateway and browser in dependency order.
Use a small login/read/SSE/MCP vertical slice before composing all screens. Local
API restarts lose preexisting data as before; there is no durable data backfill.
Apply additive Keycloak web-client settings using the documented setup workflow,
preserving its volume and existing users. Keep current prototype folders intact.

Rollback is reverting the application change and rebuilding local services; an
API restart cannot restore in-memory records. Keep additive client settings
compatible with the previous stack. Production rollout/rollback is not included.

## Open Questions

No product or contract decision remains blocking this proposal. Runtime package
and auth compatibility, visual fidelity and latency targets are implementation
verification gates with concrete tasks below, not unresolved design choices.
Future host/domain and durable database choices remain outside this change.

## Dependency evidence

Exact package availability and peer/engine metadata were read from the publisher
registry on the planning date, not installed: [npm registry](https://registry.npmjs.org/),
[React Router 8.4.0](https://registry.npmjs.org/react-router/8.4.0),
[Vite 8.3.1](https://registry.npmjs.org/vite/8.3.1),
[plugin-react 6.1.1](https://registry.npmjs.org/@vitejs%2fplugin-react/6.1.1),
[openapi-typescript 7.13.0](https://registry.npmjs.org/openapi-typescript/7.13.0),
[TypeScript 5.9.3](https://registry.npmjs.org/typescript/5.9.3),
[jsdom 26.1.0](https://registry.npmjs.org/jsdom/26.1.0),
[Keycloak adapter 25.0.6](https://registry.npmjs.org/keycloak-js/25.0.6).
