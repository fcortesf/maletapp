# Browser live updates

GET /web/events is gateway-owned, exact and Bearer-authenticated. Validated GUID
subjects are canonical lowercase; query/header identities cannot select a user.
The stream is independent of the 30-second domain proxy timeout. It sends:

```text
event: ready
data: {"version":1,"expiresAt":"2026-09-28T10:05:00.000Z"}

event: trips.changed
data: {"version":1,"tripId":"<uuid>"}

event: items.changed
data: {"version":1,"itemId":"<uuid>"}

```

IDs are optional hints; no user text, replay, event IDs or durable delivery.
Register before ready. Browser must reconcile on ready/reconnect/focus/online and
every 60 visible seconds; unsupported frames must fall back to reconciliation.

| Normalized request | Confirmed status | Frame |
| --- | --- | --- |
| POST /trips | 201 | trips.changed |
| DELETE /trips/:tripId | 204 | trips.changed + tripId |
| POST /trips/:tripId/finish or /reopen | 200 | trips.changed + tripId |
| POST /trips/:tripId/items | 201 | items.changed + tripId |
| PATCH /items/:itemId | 200 | items.changed + itemId |
| DELETE /items/:itemId | 204 | items.changed + itemId |

The shared hook covers raw/web/mobile/mcp aliases without buffering responses or
looking up an item's trip. Reads, redirects, failed or unexpected statuses emit
nothing. Delivery never waits in the REST success path. ItemId-only changes need
broad item-query invalidation in the browser.

Cache-Control: no-store, no-transform and X-Accel-Buffering: no disable caching
and buffering. Heartbeats are comments every 15 seconds. Streams close at token
expiry or five minutes; renew and replace 15 seconds before expiry. A subscriber
has 32 queued frames, a five-second write deadline, and ten streams per user;
the process permits 1,000. Capacity gives 429 / Retry-After: 30. Abort, expiry,
write failure, slow client and shutdown clear registrations/queues/timers.
No immediate JWT revocation or multi-instance delivery guarantee is claimed.

WEB_ALLOWED_ORIGINS contains exact comma-separated origins, defaulting locally
to http://localhost:5173. /web/* preflight runs before JWT, permits GET/POST/PATCH/
DELETE/OPTIONS with Authorization/Content-Type/Accept, exposes Retry-After and
WWW-Authenticate, varies by Origin and allows no credentials. Actual requests
still authenticate. Vite can proxy /web to localhost:5000. No cookie sessions.
Future ingress must disable buffering/caching and allow idle timeouts above 45
seconds. Deploying ingress, brokers, replay and multiple instances is excluded.
