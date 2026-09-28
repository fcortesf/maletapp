## ADDED Requirements

### Requirement: Authenticated user-scoped stream
The gateway SHALL own GET /web/events, registered before its domain proxy, with
Bearer authentication and canonical validated GUID scope. User-supplied IDs MUST
NOT control subscriptions. Each tab SHALL use one authenticated fetch stream;
the domain SHALL have no client-subscription responsibility.

#### Scenario: Same user in two tabs
- **WHEN** two tabs authenticate as the same user and subscribe
- **THEN** both receive that user's invalidations through separate streams

#### Scenario: Isolation and spoofing
- **WHEN** another user subscribes with a forged user query/header, or a valid GUID differs only in casing
- **THEN** scope is derived only from the validated canonical GUID
- **THEN** unrelated users receive no resource IDs or notifications

#### Scenario: Invalid authentication
- **WHEN** a stream request has absent/expired/wrong-audience credentials or an invalid subject
- **THEN** normal gateway 401/403 handling runs and no subscription is registered

### Requirement: Versioned best-effort invalidation protocol
After registration the gateway SHALL send ready with version 1 and expiresAt.
It SHALL send trips.changed/items.changed with version 1 and optional tripId/itemId
hints, no personal contents or user ID. There SHALL be no durable replay/event IDs.

#### Scenario: Initial subscription closes the read gap
- **WHEN** a write occurs between the initial page read and stream registration
- **THEN** ready causes a fresh read that recovers the write without requiring replay

#### Scenario: Unsupported frame
- **WHEN** a known event has an unsupported version or malformed payload
- **THEN** the browser reports degraded updates and relies on reconciliation without a tight reconnect loop

### Requirement: Publish confirmed writes across aliases
The shared proxy path SHALL publish only after the success statuses in design
section 5: trip create 201, delete 204, finish/reopen 200; item create 201, patch
200, delete 204. Raw, web, mobile and mcp aliases SHALL behave identically. It
MUST NOT read response bodies or perform extra lookups solely to enrich events.

#### Scenario: Raw MCP write
- **WHEN** a delegated MCP call creates a trip using raw POST /trips and receives 201
- **THEN** all connected same-user tabs receive trips.changed and refetch

#### Scenario: Item deletion without trip ID
- **WHEN** DELETE /items/:itemId returns 204 through any supported alias
- **THEN** items.changed includes the itemId and the client broadly invalidates its item queries
- **THEN** the gateway makes no additional domain lookup for notification enrichment

#### Scenario: Failed or unrelated request
- **WHEN** a read, rejected write, redirect, unexpected 202 or upstream failure occurs
- **THEN** no success invalidation is published

#### Scenario: Notification delivery fails
- **WHEN** a confirmed write cannot notify a subscriber
- **THEN** the REST success response remains unchanged and reconciliation can recover later

### Requirement: Bounded authorization and streaming resources
The stream SHALL close no later than token expiry or five minutes after connection,
whichever comes first, and SHALL NOT use the ordinary proxy timeout. Heartbeats
SHALL occur every 15 seconds. Queues SHALL hold at most 32 frames, writes time
out after five seconds, and capacity SHALL be ten streams/user and 1000/process.
Capacity rejection SHALL return 429 with Retry-After 30. SSE SHALL disable caching
and buffering and clean up all resources on termination.

#### Scenario: Expiry and renewal
- **WHEN** a stream reaches its token or five-minute boundary
- **THEN** it closes without sending later queued data
- **THEN** the client coordinates renewal and opens a replacement before expiry where possible

#### Scenario: Slow client and cleanup
- **WHEN** a client's queue fills, send blocks, tab closes or request aborts
- **THEN** that subscription, timers and buffers are released without delaying other clients or REST writes

#### Scenario: Stream capacity
- **WHEN** an authenticated subscription would exceed either stream cap
- **THEN** it receives 429 with Retry-After 30 and no leaked registration

### Requirement: Browser recovers and bounds refetch work
The browser SHALL refetch on every ready, focus/network recovery and every 60
seconds while visible. It SHALL reconnect using jittered exponential backoff
capped at 30 seconds, honor Retry-After and stop reconnect attempts while offline.
It SHALL use a 45-second received-byte watchdog, 250 ms invalidation debounce,
one-second maximum batching delay and at most four concurrent business GETs.
Events during in-flight refetch SHALL produce a trailing refresh.

#### Scenario: Restart or healthy-stream notification loss
- **WHEN** the gateway restarts or a notification is lost while the stream appears healthy
- **THEN** reconnection or periodic reconciliation recovers current REST state without manual reload

#### Scenario: Burst continues during reads
- **WHEN** an agent writes rapidly, including during a browser refetch
- **THEN** refresh scheduling is bounded, no event can postpone refresh indefinitely, and the final state is eventually fetched

#### Scenario: Suspended or offline tab
- **WHEN** a tab returns from suspension or the network reconnects
- **THEN** it refetches current data and re-establishes its stream, preserving any draft

### Requirement: Explicit CORS without relaxing authentication
Gateway /web/* CORS SHALL match configured exact origins, handle OPTIONS before
auth, allow the required methods/headers and expose retry/auth headers. Actual
REST/SSE requests SHALL retain JWT authentication with no cookie credentials.

#### Scenario: Allowed-origin preflight
- **WHEN** an allowed origin preflights Authorization and Content-Type
- **THEN** the gateway returns appropriate CORS headers without proxying to the domain
- **THEN** a subsequent unauthenticated actual request still fails authentication

#### Scenario: Unapproved origin
- **WHEN** a request uses an origin outside the configured allowlist
- **THEN** the response grants no allow-origin access
