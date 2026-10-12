## ADDED Requirements

### Requirement: Serialize whole domain operations in one API instance
All trip/item handlers SHALL share one process-wide asynchronous operation gate.
The gate SHALL cover first repository read, ownership checks, item-to-trip lookup,
mutation, SaveChanges and result snapshot creation. Read handlers SHALL use the
same gate. The guarantee SHALL apply equally to browser, MCP and private API callers.

#### Scenario: Concurrent additions to an empty trip
- **WHEN** two callers create distinct items concurrently under the same empty trip
- **THEN** both successful items remain in subsequent reads and share one default baggage
- **THEN** neither operation persists an aggregate snapshot loaded before the other committed

#### Scenario: Disjoint updates to one item
- **WHEN** concurrent operations set notes and isPacked on the same item
- **THEN** both successful changes survive, together with existing category and quantity

#### Scenario: Lifecycle and item changes
- **WHEN** a lifecycle operation and an item update execute concurrently
- **THEN** final reads include both successful changes with no aggregate replacement loss

#### Scenario: Read during aggregate rewrite
- **WHEN** a read arrives while a handler is rebuilding a trip's contained items
- **THEN** it waits for the operation gate and never observes a partial intermediate collection

### Requirement: Deletion races have serial outcomes
Resource existence and ownership SHALL be checked inside the same gate as writes.
No queued update SHALL resurrect a deleted resource. Expected missing-resource
outcomes SHALL use typed application errors and API 404 responses.

#### Scenario: Delete executes before patch or lifecycle
- **WHEN** trip deletion executes before a queued item create/patch/delete or finish/reopen
- **THEN** the queued operation returns 404 and no contained data reappears

#### Scenario: Patch executes before deletion
- **WHEN** an item patch executes before trip deletion
- **THEN** both can succeed and final trip/item reads return 404

#### Scenario: Item deletion preserves siblings
- **WHEN** one caller deletes an item while another edits a sibling
- **THEN** the deleted item remains absent and the sibling's successful edit survives

### Requirement: Explicit same-field semantics
Concurrent explicit writes to the same field SHALL follow last-executed-operation
wins semantics. The system MUST NOT claim ETag, stale-editor rejection or 409
version conflicts. Clients SHALL send only intended fields and explicit packed
values; they MUST NOT automatically retry uncertain writes.

#### Scenario: Same-field writes
- **WHEN** two operations set the same item's notes to different values
- **THEN** the value from the last serialized operation is returned by later reads
- **THEN** unrelated fields are preserved and no revision conflict is fabricated

#### Scenario: Response lost after commit
- **WHEN** a write times out and its commitment cannot be determined
- **THEN** browser and MCP report uncertainty and read current state before any deliberate retry

### Requirement: Cancellation and failure release the gate
Gate waits and repository operations SHALL receive cancellation. The gate SHALL
be released in finally only after acquisition, including exceptions/cancellation,
and MUST NOT be held for HTTP response streaming or SSE delivery. All requested
fields SHALL be validated before tracked persistence mutation.

#### Scenario: Cancel a queued request
- **WHEN** a request is canceled while waiting for the gate
- **THEN** it does not execute repository work or release another request's gate
- **THEN** subsequent operations remain able to execute

#### Scenario: Handler fails after acquisition
- **WHEN** a handler throws or is canceled after acquiring the gate
- **THEN** later requests can acquire the gate and proceed
- **THEN** no durable rollback guarantee is implied for an uncertain failed save
