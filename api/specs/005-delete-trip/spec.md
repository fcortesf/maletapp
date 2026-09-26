# Feature Specification: Delete Trip

**Feature Branch**: `005-delete-trip`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "As a user i want to delete an old trip with all the items. Follow spec/trip.yml contract."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove an obsolete trip (Priority: P1)

As a traveler managing past trips, I want to delete an old trip so it no longer appears in my trip list and I can keep only relevant trips.

**Why this priority**: This is the core user outcome and directly matches the requested feature.

**Independent Test**: Can be fully tested by deleting one existing owned trip and confirming the deletion succeeds with no response body and the trip can no longer be retrieved.

**Acceptance Scenarios**:

1. **Given** a traveler owns an existing trip, **When** the traveler deletes that trip, **Then** the system removes the trip and responds with a successful no-content outcome.
2. **Given** a traveler has deleted an owned trip, **When** the traveler requests that same trip again, **Then** the system returns a not found outcome.

---

### User Story 2 - Remove the trip contents together (Priority: P2)

As a traveler deleting an old trip, I want all baggages and items stored under that trip removed at the same time so no orphaned packing data remains behind.

**Why this priority**: The request explicitly requires deleting the trip with all of its items, and removing contained trip data preserves a clean account history.

**Independent Test**: Can be tested by deleting a trip that contains baggages and items and confirming none of that trip's previously associated contents remain accessible afterward.

**Acceptance Scenarios**:

1. **Given** a trip contains baggages and items, **When** the traveler deletes the trip, **Then** the system removes the trip and all data contained within that trip as one outcome.
2. **Given** a trip with items has been deleted, **When** the traveler later views remaining trips and their contents, **Then** only data belonging to non-deleted trips is still available.

---

### User Story 3 - Prevent unauthorized or invalid deletion (Priority: P3)

As a traveler, I want trip deletion to fail clearly when the trip does not belong to me or no longer exists so my data stays protected and the result is unambiguous.

**Why this priority**: Clear failure handling is required by the trip contract and protects trip ownership boundaries.

**Independent Test**: Can be tested by attempting to delete a missing trip and a trip owned by a different user and confirming the correct failure outcomes are returned without changing any trip data.

**Acceptance Scenarios**:

1. **Given** a traveler requests deletion for a trip that does not exist, **When** the delete action is submitted, **Then** the system returns a not found outcome and leaves all existing trips unchanged.
2. **Given** a traveler requests deletion for a trip owned by another user, **When** the delete action is submitted, **Then** the system returns a forbidden outcome and leaves the other user's trip and items unchanged.

### Edge Cases

- Deleting a trip that has no baggages or items must still succeed and remove the trip itself.
- Repeating a delete request for a trip that was already deleted must return a not found outcome.
- Deleting one trip must not remove or alter items that belong to any other trip.
- A user who is not authenticated must not be allowed to delete a trip.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an authenticated user to delete a trip by its unique trip identifier.
- **FR-002**: The system MUST delete only trips owned by the current user.
- **FR-003**: When an owned trip is deleted, the system MUST remove the trip and all baggages and items contained within that trip as part of the same user action.
- **FR-004**: The system MUST return a successful no-content outcome when an owned trip is deleted.
- **FR-005**: The system MUST return a not found outcome when the requested trip does not exist.
- **FR-006**: The system MUST return a forbidden outcome when the requested trip exists but is owned by a different user.
- **FR-007**: The system MUST return an unauthorized outcome when the requester is not authenticated.
- **FR-008**: After a successful deletion, the deleted trip MUST no longer be retrievable by its identifier.
- **FR-009**: After a successful deletion, items and baggages that were contained only within the deleted trip MUST no longer be accessible through trip-related retrieval flows.
- **FR-010**: Deleting one trip MUST NOT change any trip, baggage, or item that belongs to a different trip.

### Key Entities *(include if feature involves data)*

- **Trip**: A traveler-owned itinerary record identified by a trip ID and containing trip details such as destination and dates.
- **Baggage**: A packing container that belongs to exactly one trip and groups items under that trip.
- **Item**: A packing-list entry contained within a trip, optionally grouped under a baggage, that must be removed when its parent trip is deleted.

## Assumptions

- Deleting a trip is a permanent removal action for the trip and its contained packing data.
- A trip's baggages and items are fully owned by that trip and are not shared across trips.
- Successful deletion does not require a separate confirmation step within this feature scope.
- Failure responses follow the outcomes already defined in `spec/trip.yml`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful trip deletion requests remove the selected trip from subsequent trip retrieval results.
- **SC-002**: 100% of successful trip deletion requests also remove the deleted trip's baggages and items from subsequent retrieval attempts.
- **SC-003**: In acceptance testing, 100% of delete requests against missing trips return the defined not found outcome, and 100% of delete requests against foreign trips return the defined forbidden outcome.
- **SC-004**: In acceptance testing, users can complete deletion of an owned obsolete trip in a single request with no follow-up cleanup required.
