## ADDED Requirements

### Requirement: Explicit finish state in the trip contract
Every Trip response SHALL contain read-only boolean `isFinished`, initially false.
An owner SHALL finish using POST /trips/{tripId}/finish (`finishTrip`) and reopen
using POST /trips/{tripId}/reopen (`reopenTrip`), both bodyless and returning 200
with the resulting Trip. Repetition SHALL succeed without toggling.

#### Scenario: Create, finish and reopen
- **WHEN** an owner creates a trip, finishes it, then reopens it
- **THEN** the respective response values are false, true and false
- **THEN** list and get responses reflect each completed operation

#### Scenario: Repeated intent
- **WHEN** finish is called twice or reopen is called twice
- **THEN** both calls return 200 and the requested final state remains stable

### Requirement: Lifecycle is independent of dates and packing
Finishing SHALL be allowed for empty or partially packed trips regardless of
dates. Dates and progress MUST NOT automatically set isFinished. Finish/reopen
SHALL preserve all items and dates; finished trips SHALL remain editable/deletable.

#### Scenario: Finish an incomplete future trip
- **WHEN** an owner finishes a future trip with unpacked items
- **THEN** isFinished becomes true and dates/items/packed flags remain unchanged
- **THEN** the owner can still add, edit, pack or delete an item

#### Scenario: Complete packing and past dates
- **WHEN** all items are packed or the trip end date passes
- **THEN** isFinished remains unchanged

#### Scenario: Reopen a past trip
- **WHEN** a finished trip whose end date is past is reopened
- **THEN** isFinished is false and the UI displays Past without resetting packing

### Requirement: Lifecycle respects ownership and missing resources
The API SHALL return 401 without identity, 403 for a foreign trip and 404 for
a missing or deleted trip. Lifecycle operations MUST NOT recreate resources.

#### Scenario: Unauthorized lifecycle change
- **WHEN** a caller with no identity or a different owner invokes finish/reopen
- **THEN** the API returns respectively 401 or 403 and the trip is unchanged

#### Scenario: Deleted trip
- **WHEN** a lifecycle operation executes after deletion of the trip
- **THEN** it returns 404 and the trip remains absent

### Requirement: Browser and MCP share lifecycle intent
MCP SHALL expose finish_trip and reopen_trip with required tripId and idempotent
annotations, using existing delegated identity. The browser SHALL expose both
actions contextually and derive date/status labels independently of persisted state.

#### Scenario: Agent finishes a browser trip
- **WHEN** an authorized same-user MCP finish_trip call succeeds
- **THEN** a browser refetch displays Finished and offers Reopen
- **THEN** MCP get_trip and list_trips expose isFinished true

#### Scenario: Progress is based on rows
- **WHEN** a trip contains two items, one packed with quantity ten and one unpacked
- **THEN** the browser displays 50 percent progress regardless of lifecycle state
