# Feature Specification: Item Check Counter

**Feature Branch**: `003-item-check-counter`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Users should be able to check the items as saved in the baggage for the trip, like a ToDo Task done. The check is not boolean is a counter because maybe you are going to need to save again the item when you want to come back to origin. review spec/item.yml to follow the api contract."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mark an item as packed (Priority: P1)

As a traveler preparing baggage for a trip, I want to mark an item as packed so I can track what has already been saved into the baggage without removing it from the packing list.

**Why this priority**: This is the core outcome requested by the feature and enables the basic trip-packing workflow.

**Independent Test**: Can be fully tested by checking an existing trip item once and confirming the returned item shows the updated packing progress.

**Acceptance Scenarios**:

1. **Given** an item belongs to a trip baggage and has not yet been checked, **When** the traveler checks the item as packed, **Then** the system increases the item's check count by 1 and returns the updated item details.
2. **Given** an item already has a positive check count, **When** the traveler checks the item again, **Then** the system increases the check count by 1 instead of blocking the action or replacing the existing count.

---

### User Story 2 - Re-pack for a return trip (Priority: P2)

As a traveler preparing to return to the origin, I want to check the same item again on a later packing pass so I can use the same item list for outbound and return packing.

**Why this priority**: The request explicitly states that the checked state must be cumulative because items may need to be packed again for the return trip.

**Independent Test**: Can be tested by checking the same item across multiple packing passes and confirming the total count preserves the full history of packing confirmations.

**Acceptance Scenarios**:

1. **Given** a traveler is reusing an existing trip item list for the return journey, **When** the traveler checks an item that was already packed earlier in the trip, **Then** the system records an additional check rather than resetting or overwriting the earlier count.
2. **Given** a traveler views trip items after multiple checks, **When** the item list is retrieved, **Then** each item displays its current check count so the traveler can see how many times it has been marked as packed.

---

### User Story 3 - Protect item integrity during check actions (Priority: P3)

As a traveler managing a trip list, I want check actions to affect only packing progress so that item identity and trip association remain unchanged.

**Why this priority**: The check action should be safe and narrow in scope, preventing accidental edits to item details while users are updating packing progress.

**Independent Test**: Can be tested by checking an item and verifying only the check count changes while the item name and trip or baggage association remain the same.

**Acceptance Scenarios**:

1. **Given** an existing item with a name and trip association, **When** the traveler performs a check action, **Then** the system preserves the item's name, trip, baggage, and any default item reference while updating only the check count.
2. **Given** a traveler attempts to check an item that does not exist, **When** the action is submitted, **Then** the system rejects the request with a not found outcome and does not alter any other items.

### Edge Cases

- A check action against a non-existent item must fail without creating a new item or changing any other item.
- Repeated checks submitted one after another must accumulate as separate increments.
- Items with a check count of `0` must still appear in item retrieval results as valid unpacked items.
- A check action must not allow the check count to become negative or be replaced with a boolean-style done state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to record a packing check for an existing item associated with a trip.
- **FR-002**: The system MUST represent packing progress as a non-negative count of completed checks for each item, not as a boolean done or not-done value.
- **FR-003**: When a user records a packing check, the system MUST increase the item's check count by exactly 1.
- **FR-004**: The system MUST preserve the item's existing identity, trip association, baggage association, name, and predefined-item reference when a packing check is recorded.
- **FR-005**: The system MUST return the updated item details immediately after a successful packing check, including the new check count.
- **FR-006**: The system MUST expose each item's current check count whenever items are retrieved in trip or single-item views.
- **FR-007**: The system MUST support multiple packing checks for the same item over time so the same item list can be reused for outbound and return packing.
- **FR-008**: The system MUST reject attempts to record a packing check for an item that does not exist.
- **FR-009**: The system MUST ensure a packing check never reduces the recorded check count.

### Key Entities *(include if feature involves data)*

- **Item**: A trip packing-list entry that belongs to a trip and optionally a baggage; key attributes include item identity, display name, trip reference, baggage reference, optional predefined-item reference, and packing check count.
- **Packing Check Count**: The cumulative number of times an item has been marked as packed; it communicates packing progress across one or more packing passes for the same trip.

## Assumptions

- A single check action always represents one completed packing confirmation for one item.
- Users can infer whether an item is currently unpacked by a check count of `0`.
- The same item list is intentionally reused across the full trip lifecycle, including return packing.
- Concurrent duplicate submissions are out of scope for this feature phase; users are assumed to submit check actions sequentially.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful check actions increase the selected item's displayed check count by exactly 1.
- **SC-002**: 100% of item detail views and item list views show the current check count for each returned item.
- **SC-003**: In end-to-end acceptance testing, users can complete an outbound packing pass and a return packing pass with the same item list without losing prior packing history.
