## ADDED Requirements

### Requirement: Independent static SPA using the approved visual concept
The web component SHALL be a React/TypeScript/Vite SPA with the agreed atomic
composition, client routing, CSS Modules, v3 tokens/system typography/local SVGs,
and preserved prototype directories. It SHALL build independently to static files
and serve direct trip and callback routes through documented host fallback.

#### Scenario: Deep link and callback
- **WHEN** a browser opens /trips/:tripId or /callback directly on the static test host
- **THEN** the SPA loads, completes required authentication and resolves the route

#### Scenario: Responsive v3 journeys
- **WHEN** trips and packing screens are viewed at 320, 390, 768 and 1440 CSS pixels
- **THEN** they retain the v3 composition, art, readable English text and usable controls without horizontal page overflow

### Requirement: Existing Keycloak login with memory-only tokens
The client SHALL initialize Keycloak before routing, use public maletapp-web,
authorization code/S256 PKCE, English login and normal redirects without requiring
silent third-party-cookie checks. Access/refresh tokens MUST remain in memory.
Business traffic SHALL use the gateway /web prefix, never domain or MCP directly.

#### Scenario: Login and renewal
- **WHEN** a signed-out user opens a protected trip route and completes login
- **THEN** the exact callback completes and the validated same-origin return route opens
- **THEN** REST and fetch SSE use Bearer tokens renewed through a shared renewal promise

#### Scenario: Third-party cookies blocked
- **WHEN** the browser blocks third-party cookies
- **THEN** normal redirect login/callback still works without a required silent iframe

#### Scenario: Logout or user switch during requests
- **WHEN** logout or a subject/issuer change happens with REST/SSE work in flight
- **THEN** requests/stream are aborted, user cache and drafts clear, and late responses cannot repopulate state
- **THEN** local logout signals other tabs without sharing tokens and reaches the public signed-out page

### Requirement: Complete trip and packing journeys
The SPA SHALL support trip list/read/create/delete, finish/reopen, item
list/create/read/edit/delete, explicit packing, nullable notes/quantity, category
grouping and local suggestions. It SHALL include loading, empty, error/retry and
disconnected states, with destructive confirmations and contextual notifications.

#### Scenario: Create and prepare a trip
- **WHEN** a user creates a trip, adds an item, edits its optional fields and marks it packed
- **THEN** each confirmed result comes from the gateway and appears in trip/detail queries
- **THEN** MCP reads the same values and no prototype local-storage record is used

#### Scenario: Trip deletion
- **WHEN** a user confirms deletion of an owned trip
- **THEN** the SPA returns to the trip list and evicts its cached detail/items after success

#### Scenario: Partial card counter failure
- **WHEN** one card's item-list read fails while other trips load
- **THEN** that card shows unavailable progress with retry instead of falsely showing zero
- **THEN** no more than four business reads are in flight

### Requirement: Preserve drafts across external changes
Form state SHALL be independent of remote query state and SHALL submit only dirty
fields. Updates MUST NOT overwrite drafts or steal focus. Observed changes to
dirty fields SHALL show reload/deliberate-save choices, while documenting that
there is no atomic stale-write detection. External deletion SHALL disable saving
and preserve draft contents for copying without automatic recreation.

#### Scenario: Agent changes another field
- **WHEN** MCP changes packed state while the user edits notes
- **THEN** refresh shows the packed state without replacing the notes draft
- **THEN** saving notes sends no stale packed value

#### Scenario: Agent changes the edited field
- **WHEN** a refetch observes changed notes while notes are dirty in the form
- **THEN** a translated notice allows reload or deliberate save and retains typed text

#### Scenario: Resource removed externally
- **WHEN** a form's item or parent trip is deleted externally
- **THEN** saving is disabled, the removal is explained and the draft can be copied before navigation

### Requirement: Explicit mutation error and retry semantics
Writes SHALL have no automatic retries or offline queue. The UI SHALL distinguish
validation, authorization, missing resources, conflicts and uncertain outcomes,
preserve drafts on recoverable failure and refetch after uncertain writes before
offering deliberate resubmission. Read retries SHALL be bounded to two, with one
coordinated authentication retry when applicable.

#### Scenario: Unknown create outcome
- **WHEN** trip or item creation times out after it may have committed
- **THEN** the browser reports uncertainty and refreshes the list without repeating POST
- **THEN** identical names are not treated as proof that retry is safe

#### Scenario: Validation and forbidden response
- **WHEN** an edit returns 400 or 403
- **THEN** the UI respectively shows translated field validation or access denial without a retry loop

### Requirement: Internationalization and date-only values
The client SHALL use English resources/fallback, en-GB formatting and namespaces
common/trips/packing/auth, ready for future es-ES. All UI/accessibility/error copy
SHALL be extracted; user-authored text SHALL be preserved. Travel dates SHALL
remain date-only strings with no timezone-induced day shifts.

#### Scenario: Different browser timezones
- **WHEN** the same travel date is viewed in western and eastern timezones
- **THEN** its displayed calendar date is identical while today-based status uses the local day

#### Scenario: Labels and plurals
- **WHEN** the UI shows categories, suggestions, validation or counts
- **THEN** it uses translated keys and plural rules while leaving names/notes/destinations unchanged

### Requirement: Accessible interaction and resilient rendering
Dialogs/menus SHALL provide keyboard operation, focus trapping/return and Escape
behavior. Controls SHALL have labels, visible focus and readable contrast; motion
SHALL respect reduced-motion preferences. Async refresh SHALL retain usable cached
content and announce meaningful state changes without an event-by-event flood.

#### Scenario: Keyboard create/edit/delete
- **WHEN** a user completes core journeys using the keyboard
- **THEN** fields, menus and dialogs are reachable, validation is associated with controls and focus returns to a stable target

#### Scenario: Disconnected with an open form
- **WHEN** the stream disconnects or the network goes offline
- **THEN** a translated status is visible, cached content/draft remain, known-offline writes are disabled and recovery does not erase the form
