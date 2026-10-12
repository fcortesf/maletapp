# Web PoC acceptance — 2026-09-28

OpenSpec change: `implement-web-poc`. Verification uses Node 24.14.0,
Keycloak 25.0.6 and the local Compose MCP profile with its existing realm volume.
The domain, gateway and MCP images were rebuilt from the final sources. Two
isolated fixture users exercise real authorization-code/S256 login, issued user
tokens and the existing MCP token exchange; credentials remain in ignored `.local`.
Existing realm/users were preserved. The domain deliberately remains InMemory.

## Commands and results

| Directory | Commands | Result |
| --- | --- | --- |
| `api/` | `dotnet build --no-incremental`; `dotnet test --no-build`; `dotnet format --verify-no-changes` | Build/format pass; 59 unit + 79 integration tests pass (138). |
| `gateway/` | `npm run check`; `npm test`; `npm run build` | Check/build pass; 29 tests pass. |
| `mcp/` | `npm run typecheck`; `npm test`; `npm run build` | Typecheck/build pass; 14 tests pass, one opt-in fixture-domain test skipped. |
| `web/` | `npm install`; `npm run check:contracts`; `npm run check`; `npm test`; `npm run build` | Exact pins installed without peer overrides; contract drift/check/build pass; 18 tests pass across eight files. |
| `web/` | `npm run e2e` | 11 tests pass (1.9 minutes), including timed recovery and real renewal. |
| `web/` | `npm run e2e:static` | One built-output acceptance test passes (1.5 seconds). |
| `gateway/` | `docker compose --profile mcp up -d --build` | Final images built and services started, preserving Keycloak volume. |

The optional MCP fixture-domain test was not enabled in the final default run.
The real-stack web tests independently verify MCP SDK calls with actual Keycloak
users and exchange, rather than substituting fixture JWTs for that acceptance.
The API still reports the previously present transitive Microsoft.OpenApi 2.4.1
NU1903 advisory; no production .NET dependency or new compiler warning was added.
Docker's npm install-script notice concerns the existing Swagger analytics
package; its script was not enabled. Playwright prints its harmless conflicting
NO_COLOR/FORCE_COLOR environment notice.

## Verified behavior

API concurrency tests hold the operation gate and queue a second operation with
controlled hooks, without timing sleeps. They cover simultaneous additions,
default baggage uniqueness, disjoint/same-field patches, sibling deletion,
read isolation, lifecycle/item races, both parent-deletion orders, cancellation
and release after exceptions. Category validation/defaults and all response
shapes preserve existing notes, quantity and explicit packed state. Lifecycle
commands preserve dates/items and are independent of packing or travel dates.

The real browser journeys cover CRUD, category selection, quantity/notes clearing,
explicit packing, finish/reopen and deletion confirmation. Same-user MCP writes
appear without reload within three seconds; bursts preserve independent drafts
and bounded refetch work. Observed dirty-field conflicts offer reload or deliberate
save. Deleted items/parents preserve copyable drafts, disable save and retain a
stable focus target. A committed create with a simulated 502 response performs
one POST and recovers its authoritative result before deliberate retry.

Two tabs synchronize; another user's records/events remain isolated. Logout
clears both tabs. Switching users while a delayed GET is pending cannot expose
the previous scope. Tokens remain in adapter memory and never enter application
storage, business URLs or tracing artifacts. Chrome's Network.setCookieControls
explicitly blocks third-party cookies for the PKCE slice; iframe checks are off.

Recovery tests exercise the initial read/subscription gap, an otherwise healthy
stream with mutation notifications suppressed, browser offline/online and focus,
actual gateway restart, and real short-lived-token renewal. The notification-loss
fixture preserves ready/heartbeat frames, so periodic reads provide recovery.
The final notification-loss run begins its first read at 59,189 ms and renders
at 59,200 ms (10 ms read sequence), with no extra ready frame or manual reload.
The periodic check starts at 55 seconds to reserve browser scheduling/debounce
within the 60-second bound; suspended hidden tabs have no timer deadline.
The restart test confirms an authoritative MCP read before another write and
never retries writes. The static verification proxy propagates aborted upstream
streams so reconnection is actually exercised. Fake-clock service tests additionally
cover stream expiry, watchdog, Retry-After and complete timer/connection cleanup.

Built-output acceptance exercises direct trip/callback navigation, auth redirects,
gateway-only browser business requests and empty token storage. The independent
static server provides the SPA fallback; development hot reload is excluded from
timed acceptance. Host Chromium libraries were unavailable and install-deps needed
unavailable sudo credentials, so the matching official Playwright 1.63.0 container
served the browser over a private loopback websocket using Linux host networking.
See README for the repeatable setup.

## Visual and accessibility evidence

Fixed fixture: “Travel notebook visual fixture”, 12–18 June 2099, one unpacked
“Walking shoes” item, clothing, quantity two, note “For a long walk”. Its persisted
trip ID chooses stable decorative landscape art; fixture data uses actual APIs.
Screenshots wait for loaded counters and were visually reviewed against
`app-design-concept-v3/maletapp-concepto.html`. The application retains the warm
paper background, green text/landscape, terracotta actions, serif headings,
rounded cards and pill controls. Desktop detail uses the progress/list columns;
mobile stacks them and wraps long names/actions without horizontal overflow.
English text and real domain controls replace prototype-specific copy.

| Width | Trips | Detail |
| --- | --- | --- |
| 320 | [Screenshot](acceptance/screenshots/trips-320.png) | [Screenshot](acceptance/screenshots/detail-320.png) |
| 390 | [Screenshot](acceptance/screenshots/trips-390.png) | [Screenshot](acceptance/screenshots/detail-390.png) |
| 768 | [Screenshot](acceptance/screenshots/trips-768.png) | [Screenshot](acceptance/screenshots/detail-768.png) |
| 1440 | [Screenshot](acceptance/screenshots/trips-1440.png) | [Screenshot](acceptance/screenshots/detail-1440.png) |

Axe reports zero violations at all detail widths and in the validated create
sheet. Tests check 200% text reflow, reduced-motion preference, keyboard Escape,
validation focus/aria-invalid and focus restoration after external removal.
Automated axe does not claim exhaustive assistive-technology certification.

## Limits and handoff

One API/gateway process, EF InMemory and best-effort SSE are intentional PoC
boundaries. Restarts lose domain data; events have no replay. Serial operations
prevent overlapping aggregate rewrites, but do not provide durable rollback,
ETags or atomic stale-editor rejection. Same-field intent is last-executed-wins.
Writes have no automatic retries, optimistic domain state or offline queue.
English is complete; es-ES is a future translation. Durable storage, broker,
multi-instance scaling, VPS/static-host deployment, identity mapping and manual
Codex-client login are outside this acceptance. Archive remains a separate step.
