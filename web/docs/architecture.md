# Web architecture

## Boundaries and composition

App initializes one Keycloak 25 adapter before React/router, then builds a scoped
query runtime. Pages compose feature components and shared presentation primitives.
CSS Modules use extracted v3 tokens/system serif and sans typography. Local SVG
icons and deterministic trip-ID landscape variants are decorative generic art;
they make no destination claims. Prototype code/storage is never imported.

The supported business surface is trip create/list/read/delete/finish/reopen and
item create/list/read/patch/delete through gateway /web only. Baggage contract
routes are unimplemented. Generated separate trip/item TypeScript schemas retain
required fields and optional PATCH presence; drift is checked against API YAML.

## Auth and transport

Public maletapp-web uses authorization code/S256, login-required, English locale,
exact callback and checkLoginIframe false. Normal redirects work when third-party
cookies are blocked. Only validated app return paths enter sessionStorage and
are consumed once; callback parameters are cleaned. /signed-out is public.
Access/refresh tokens remain in adapter memory. No cache or draft persistence.

A shared renewal promise calls updateToken(30) before REST/stream; GET 401 can
force one coordinated renewal/retry. Writes never replay. A scope is issuer plus
canonical subject, never a token. Logout/user switch aborts protected work, closes
SSE, clears query caches and remounts forms using an auth generation. All async
responses check their generation before returning data. Cross-tab logout sends
only the string logout through BroadcastChannel, with no credentials. Local
cache/drafts clear before Keycloak logout; remote revocation detection is bounded
by renewal/401, not immediate server token revocation.

All fetches omit credentials. Abortable queued GETs share a four-read limiter.
Reads retry at most twice for transient errors and honor Retry-After. Domain
problems and gateway error JSON normalize to translated codes without displaying
arbitrary server text. Validation/access/missing/conflict/busy are distinct;
network/5xx write outcomes are uncertain and trigger reads before explicit retry.
No automatic write retries, optimistic domain writes or offline queue exist.

## Remote state and live recovery

Keys are [scope,trips], [scope,trip,id], [scope,items,tripId], [scope,item,id]. Cards
share item-list queries with detail. Counter loading, unknown/error and zero are
distinct. One fetch SSE connection per tab carries Authorization. Framing handles
chunk boundaries, CRLF and comments. Known malformed/unsupported frames degrade
to periodic reads without a reconnect hot loop; unknown names are ignored.

Every ready reconciles active queries, closing the initial read/subscription gap.
Frames batch with 250 ms debounce and a one-second maximum. Inactive queries become
stale; changes during an in-flight read produce a trailing refresh. ItemId-only
notifications broadly invalidate item queries. Local mutations apply confirmed
snapshots to lists/details and share coalesced invalidation with SSE.

A 45-second byte watchdog detects silent streams. Advertised expiry replaces the
stream 15 seconds early, closing the old one before renewal/open. Jittered backoff
is capped at 30 seconds and honors capacity Retry-After. Offline pauses reconnect
and disables writes. Focus/online/visibility return and periodic visible-tab checks
reconcile within 60 seconds (scheduled at 55 seconds to reserve browser and
batching time) even if the stream looks healthy. Suspended tabs have no background
browser-timer deadline. Connections, timers and queue subscriptions are cleaned
on generation changes/unmount/logout.

## Product semantics and forms

Category codes match the domain and labels/suggestions come from English i18n
common/trips/packing/auth namespaces, with en-GB Intl and English fallback. User
text is preserved. Dates stay YYYY-MM-DD; explicit UTC travel-date formatting
avoids timezone day shifts, while today/status uses the user's local calendar and
recomputes at midnight/focus. Row-based progress ignores quantity: empty is zero.
Finished takes precedence, followed by past/preparing/upcoming; lifecycle never
follows dates or packing automatically. Finished trips remain editable.

Forms capture an initial snapshot and local draft separately from query data.
PATCH contains only dirty fields; blank dirty notes/count clear with null, while
omission preserves. Background data does not overwrite drafts. Observed changes
to dirty fields offer reload or deliberate save, without claiming atomic version
checks. External item/parent deletion disables save and preserves a copyable draft
and stable focus/navigation. Radix dialogs/menus supply keyboard/Escape/focus
behavior; return focus has a stable target when a row disappears. All controls,
feedback and errors are translated; motion respects reduced-motion preference.

One global API operation gate serializes complete operations. Disjoint changes
accumulate; same-field stale intent is last-executed-wins. Delete-first returns
404 to queued work, update-first then delete leaves absence. The gate is neither
durable rollback nor optimistic concurrency. InMemory and one API/gateway process
remain deliberate PoC limitations; durable storage, brokers, multiple replicas,
VPS/static-host deployment and complete Spanish translation are excluded.
