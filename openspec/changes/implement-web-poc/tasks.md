## 1. Contract-first domain definition

- [x] 1.1 Extend `api/spec/item.yml` to 0.0.3 with required response category, optional create/patch enum, defaults and null/invalid-value errors; update `api/specs/002-trip-items-api/spec.md` and `plan.md` in the same session, including existing notes/quantity/deletion behavior.
- [x] 1.2 Extend `api/spec/trip.yml` to 0.0.2 with required read-only isFinished and bodyless finishTrip/reopenTrip routes, success/ownership/not-found responses and idempotence; update `api/specs/001-add-trip-api/spec.md` and `plan.md` in the same session.
- [x] 1.3 Document operation serialization and both deletion race orders in the related API plans and `api/specs/005-delete-trip/{spec,plan}.md`; record constitution compliance and cross-endpoint `tests/Trip.API.IntegrationTests/Concurrency/` coverage.
- [x] 1.4 Verify source OpenAPI schemas resolve (including Trips bearerAuth definition), endpoint operation names and request/response presence rules; document baggage routes as unimplemented and exclude them from this client's supported surface.

## 2. Domain operation isolation

- [x] 2.1 Add application operation-gate abstraction with a singleton infrastructure SemaphoreSlim implementation; cover cancellable acquisition, safe finally release and DI lifetime without production package additions.
- [x] 2.2 Apply one complete-operation gate scope to every existing trip/item read/write handler, from first lookup through ownership, SaveChanges and DTO snapshot; keep response transport outside and avoid nested acquisition.
- [x] 2.3 Validate complete patch input before tracked persistence mutation and use typed missing-resource errors for supported deletion/update races, preserving existing 401/403/404 semantics.
- [x] 2.4 Add deterministic concurrency integration tests for simultaneous additions/default-baggage uniqueness, disjoint item patches, sibling edit/delete, both trip-deletion race orders and read isolation; use barriers/test hooks instead of timing sleeps.
- [x] 2.5 Add cancellation and exception-release tests for queued/acquired gates, plus controlled same-field last-executed-wins tests; document that the gate provides no stale-editor or durable rollback guarantee.

## 3. Domain categories and lifecycle

- [x] 3.1 Implement category value validation/defaults in item domain, DTO/request/response mapping and EF data model/rehydration; preserve category through aggregate rewrites and PATCH omission semantics.
- [x] 3.2 Add category unit/integration tests covering all response shapes, absent/null/invalid/numeric/case values, category-only edits, preservation of existing fields and foreign/missing resources.
- [x] 3.3 Implement isFinished in trip domain/model/DTOs and finish/reopen handlers/endpoints with exact operationId names, operation-gate coverage and response snapshots.
- [x] 3.4 Add lifecycle unit/integration tests for repeated intent, empty/incomplete/past/future trips, editable finished trips, preserved items/dates, authorization and concurrent lifecycle/item/deletion operations.
- [x] 3.5 Run from `api/`: `dotnet build --no-incremental`, `dotnet test --no-build`, `dotnet format --verify-no-changes`; fix failures and new warnings before integrating clients.

## 4. MCP shared product behavior

- [x] 4.1 Extend add_item/edit_item category schemas, category-only nonempty validation and read descriptions; add finish_trip/reopen_trip with delegated identity, bodyless routes and explicit idempotent annotations for POST commands.
- [x] 4.2 Update tool instructions for lifecycle independence, user-authorized intent, preservation of unrelated fields and uncertain-write handling; retain explicit set_item_packed behavior and the existing prompt.
- [x] 4.3 Test tool schemas, omission/defaults, response values, lifecycle routes/annotations, delegation and gateway failures; run `npm run typecheck`, `npm test`, `npm run build` in `mcp/`.

## 5. Gateway stream and origins

- [x] 5.1 Add exact-origin WEB_ALLOWED_ORIGINS configuration/examples/local Compose wiring and `/web/*` CORS/preflight before auth; test allowed/disallowed origins, headers and actual-request authentication.
- [x] 5.2 Extend validated auth context with expiry and canonical GUID identity; register exact GET /web/events before aliases using an independent streaming lifetime and cache/buffering headers.
- [x] 5.3 Implement user-scoped subscriber registry, ready/version/expiresAt framing, 15-second heartbeats, five-minute/token-expiry closure, 32-frame/5-second slow-client bounds, stream caps/429 and complete abort/timer cleanup.
- [x] 5.4 Add shared proxy success notification classification for the exact status/method/path table across raw/web/mobile/mcp aliases; avoid response-body buffering, extra item-trip lookup and delivery coupling to REST success.
- [x] 5.5 Test alias parity, same-user multi-tab delivery, other-user/spoofed/case-varied identity, no events on failures/reads/redirects, expiry and all cleanup/capacity bounds using upstream/JWKS fixtures and injected clocks.
- [x] 5.6 Run `npm run check`, `npm test`, `npm run build` in `gateway/`; retain existing identity stripping, upstream timeout and docs/auth regressions.

## 6. Web foundation and early vertical slice

- [x] 6.1 Create isolated web package/lockfile with the exact design pins and Node 24 baseline, Vite/React Router library mode, strict TypeScript and scripts for dev/build/check/test/e2e/type generation; preserve all prototype directories.
- [x] 6.2 Generate separate trip/item TypeScript types from source YAML, provide typed HTTP aliases and a generation-drift check; verify dependency installation and peer compatibility without legacy-peer-deps overrides.
- [x] 6.3 Establish app/shared/features/pages structure, v3 tokens/global styles/CSS Modules, local SVG art/icons and English i18n namespaces with en-GB Intl helpers and date-only timezone tests.
- [x] 6.4 Add public web env example/Vite gateway proxy and Keycloak adapter initialization before routing, PKCE/login-required/English locale, safe return path, exact callback and public signed-out route; coordinate existing-volume client/logout/locale settings without replacing the realm.
- [x] 6.5 Implement coordinated token renewal, authenticated transport, scoped query client, four-read limiter, auth-generation guards and logout/user-switch cleanup including credential-free cross-tab logout.
- [x] 6.6 Build a minimal real login → trip read → authenticated SSE → same-user MCP trip-create slice against local Compose; verify Keycloak 25 adapter compatibility, token expiry/renewal and blocked-third-party-cookie login before full screen work.

## 7. Recovery and mutation behavior

- [x] 7.1 Implement fetch SSE framing across chunk boundaries/CRLF/comments with Authorization, ready/version handling, 45-second watchdog and one connection per tab; close old connections before renewal/logout replacements.
- [x] 7.2 Implement bounded jittered reconnect, Retry-After/offline handling and initial-ready/reconnect/focus/online/60-second visible-tab reconciliation; show translated degraded/disconnected states.
- [x] 7.3 Implement resource-aware invalidation with broad fallback for itemId-only events, 250 ms debounce/one-second maximum wait, inactive-cache staleness and one trailing refresh for changes during in-flight reads.
- [x] 7.4 Implement local successful mutation updates/invalidation, duplicate-submit prevention, dirty-field PATCH and no automatic write retries/offline queue; normalize problem-details and gateway errors with unknown-outcome recovery.
- [x] 7.5 Add component/service tests for stream parsing/expiry/retry cleanup, bounded GET/burst scheduling, auth-switch late responses, lost events, mutation uncertainty and null-versus-omitted payloads.

## 8. V3 product screens and interaction

- [x] 8.1 Compose Button/Input/Badge/Icon/FormField primitives and styled Radix dialogs/menus with focus, Escape and reduced-motion behavior; keep service/query logic outside presentation primitives.
- [x] 8.2 Build trips route/grid/cards, create sheet, date/status labels and shared item-query counters with independent loading/unknown/error/empty states and four-read bounds.
- [x] 8.3 Build detail/progress and flat/grouped packing list with collapsible categories, add/edit forms, translated suggestion chips, nullable notes/quantity and explicit packed actions.
- [x] 8.4 Add trip/item delete confirmations, finish/reopen menus and account/logout; preserve lifecycle/date/progress semantics and show useful mutation feedback.
- [x] 8.5 Preserve local form drafts through background refetches, show observed dirty-field conflicts with reload/deliberate-save choices, and handle external item/trip deletion with disabled save, copyable draft and stable focus/navigation.
- [x] 8.6 Verify all UI/aria/error/toast copy is translated, user text is preserved, grouping/category labels agree with contracts, and no mock business data or prototype storage is used.

## 9. Integrated acceptance and visual verification

- [x] 9.1 Add real-stack `web/tests/e2e/` fixtures using two Keycloak users and authenticated MCP protocol calls through existing token exchange; cover browser CRUD/packing/category/lifecycle and same-user live updates without reload.
- [x] 9.2 Verify another user's data/events never appear, two tabs stay synchronized, logout clears both tabs and switching users during delayed requests cannot leak stale data.
- [x] 9.3 Verify initial-subscription races, notification loss on a healthy stream, gateway restart, network interruption, token renewal/expiry and background/focus recovery; assert healthy visible updates within three seconds and reconciliation within 60 seconds plus read time.
- [x] 9.4 Exercise burst MCP writes with open dirty forms, same/disjoint-field concurrent edits, resource deletion and unknown create outcomes; assert bounded refetches, preserved drafts and the documented serial results.
- [x] 9.5 Capture fixed-data screenshots at 320/390/768/1440 widths and review against v3; run axe checks and keyboard/focus/zoom/reflow/reduced-motion checks, including dialog validation and externally removed resources.
- [x] 9.6 Test built static output with direct trip/callback navigation and auth redirects; verify browser business URLs target only gateway and no access/refresh tokens appear in storage, URLs or logs.
- [x] 9.7 Run final changed-component checks: API build/test/format, gateway check/test/build, MCP typecheck/test/build, web contract-drift/check/test/build/e2e. Record actual commands/results and any remaining limitations; do not mark tasks complete from planning alone.

## 10. Component documentation and handoff

- [x] 10.1 Add `web/AGENTS.md`, `web/README.md`, `web/docs/architecture.md` covering scripts, public config, atomic structure, auth, i18n, dates, drafts, serial-write limitations and static fallback.
- [x] 10.2 Update `gateway/docs/architecture.md` and add `gateway/docs/web-realtime.md` with SSE frames/status table, auth expiry, origins, bounds, local settings and future ingress requirements; remove misleading cookie-session implications.
- [x] 10.3 Update MCP overview/auth/verification docs with tool category/lifecycle semantics, same-user integration and write uncertainty; update API docs/specs/plans to actual supported behavior and concurrency guarantees.
- [x] 10.4 Record acceptance evidence and change discovery status only to match actual completion; retain durable storage/VPS/multi-instance exclusions and leave archive as a separate workflow after implementation review.

Acceptance evidence: [web/docs/acceptance.md](../../../web/docs/acceptance.md).
All 51 tasks are implemented and verified; archive remains a separate workflow.
