## ADDED Requirements

### Requirement: Item exposes packed state
The system SHALL expose an `isPacked` boolean field in every API response that uses the `Item` representation.

#### Scenario: Item response includes packed state
- **WHEN** an item is returned by an Items API operation
- **THEN** the response includes `isPacked` with the item's current packed state

### Requirement: New items start unpacked
The system SHALL create every new item with `isPacked` set to `false`.

#### Scenario: Create item starts unpacked
- **WHEN** the current user creates an item in an owned trip
- **THEN** the created item has `isPacked = false`

### Requirement: Owner can update packed state
The system SHALL allow the current user to set `isPacked` to `true` or `false` for an item whose trip is owned by that user.

#### Scenario: Mark item as packed
- **WHEN** the owning user updates an unpacked item's `isPacked` value to `true`
- **THEN** the system returns `200 OK` with the updated item
- **THEN** the updated item has `isPacked = true`

#### Scenario: Mark item as unpacked
- **WHEN** the owning user updates a packed item's `isPacked` value to `false`
- **THEN** the system returns `200 OK` with the updated item
- **THEN** the updated item has `isPacked = false`

### Requirement: Packed state update enforces item ownership
The system MUST prevent a user from updating `isPacked` for an item whose trip belongs to another user.

#### Scenario: Reject packed state update for another user's item
- **WHEN** a user updates `isPacked` for an item owned by another user
- **THEN** the system returns `403 Forbidden`
- **THEN** the item packed state remains unchanged

### Requirement: Packed state update handles missing items
The system MUST return not found when a packed state update targets an item that does not exist.

#### Scenario: Missing item update returns not found
- **WHEN** the current user updates `isPacked` for an item id that does not exist
- **THEN** the system returns `404 Not Found`
