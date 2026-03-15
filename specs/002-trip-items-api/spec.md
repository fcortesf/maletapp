# Feature Specification: Trip Item Access

**Feature Branch**: `002-trip-items-api`  
**Created**: 2026-03-15  
**Status**: Draft  
**Input**: User description: "Using the OpenAPI specification already present in the project (spec/item.yml), implement the Items feature for the travel API. Focus exclusively on the following endpoints: - GET /trips/{tripId}/items — List all items belonging to a specific trip - POST /trips/{tripId}/items — Create a new item under a trip (assigned internally to a default baggage) - GET /items/{itemId} — Retrieve a single item by its ID - PATCH /items/{itemId} — Rename or update an item by its ID Before performing any operation, verify that the trip associated with the item belongs to the authenticated user. If the trip does not belong to the current user, return 403 Forbidden. This check must be applied to all four endpoints. Same when you are going to retrieve or patch a single ITEM, check if this items is associated with the user. - Follow the request/response schemas defined in the OpenAPI spec (NewItem, Item, and related components) - All IDs are UUIDs - POST /trips/{tripId}/items must assign the created item to the"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View items for my trip (Priority: P1)

As a traveler, I want to see all items already assigned to one of my trips so I can review what I plan to carry.

**Why this priority**: Listing trip items is the fastest way for a user to inspect packing progress and confirm the trip context before making changes.

**Independent Test**: Can be fully tested by requesting the items for a trip owned by the current user and confirming the response contains only items linked to that trip.

**Acceptance Scenarios**:

1. **Given** an authenticated user who owns a trip with multiple items, **When** the user requests that trip's items, **Then** the system returns all items associated with that trip.
2. **Given** an authenticated user who owns a trip with no items, **When** the user requests that trip's items, **Then** the system returns an empty list.
3. **Given** an authenticated user, **When** the user requests items for a trip owned by another user, **Then** the system denies access.

---

### User Story 2 - Add an item to my trip (Priority: P2)

As a traveler, I want to add a new item directly to one of my trips so I can build my packing list without choosing a baggage manually.

**Why this priority**: Creating items turns a trip into an actionable packing list and depends on a valid trip context already existing.

**Independent Test**: Can be fully tested by creating an item under a trip owned by the current user and confirming the saved item is linked to that trip and assigned to the trip's default baggage.

**Acceptance Scenarios**:

1. **Given** an authenticated user who owns a trip, **When** the user submits a valid new item for that trip, **Then** the system creates the item, associates it with the trip, and assigns it to that trip's default baggage.
2. **Given** an authenticated user, **When** the user submits a new item for a trip owned by another user, **Then** the system denies access and does not create the item.
3. **Given** an authenticated user who owns a trip, **When** the user submits an item without the required item name, **Then** the system rejects the request and explains the validation failure.

---

### User Story 3 - View or update a specific item I own (Priority: P3)

As a traveler, I want to retrieve one item or change its details so I can confirm or correct my packing list one item at a time.

**Why this priority**: Single-item lookup and editing are useful follow-up actions once items exist, but they are less foundational than listing and creating trip items.

**Independent Test**: Can be fully tested by retrieving and updating an existing item owned by the current user and confirming the returned item reflects the expected values while ownership checks remain enforced.

**Acceptance Scenarios**:

1. **Given** an authenticated user and an existing item associated with one of that user's trips, **When** the user requests that item by identifier, **Then** the system returns the item details.
2. **Given** an authenticated user and an existing item associated with one of that user's trips, **When** the user submits a valid partial update for that item, **Then** the system saves the new values and returns the updated item.
3. **Given** an authenticated user, **When** the user requests or updates an item associated with another user's trip, **Then** the system denies access.
4. **Given** an authenticated user, **When** the user requests or updates an item that does not exist, **Then** the system reports that the item was not found.

### Edge Cases

- A user supplies an identifier that is not a valid UUID for a trip or item request.
- A trip exists but has no default baggage available when the user attempts to add an item directly to the trip.
- A user submits a partial update that changes none of the item fields.
- A user submits a partial update with an empty item name.
- The system cannot determine the current authenticated user for the request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow the current authenticated user to retrieve all items associated with a specific trip owned by that user.
- **FR-002**: The system MUST return only items associated with the requested trip when listing a trip's items.
- **FR-003**: The system MUST return an empty list when the current user requests a trip they own that has no items.
- **FR-004**: The system MUST allow the current authenticated user to create a new item under a trip owned by that user using the item creation fields defined for this feature.
- **FR-005**: The system MUST assign each newly created item a UUID.
- **FR-006**: The system MUST associate each newly created item with the requested trip and with that trip's default baggage.
- **FR-007**: The system MUST allow the current authenticated user to retrieve a single item by UUID when that item is associated with a trip owned by that user.
- **FR-008**: The system MUST allow the current authenticated user to partially update a single item by UUID when that item is associated with a trip owned by that user.
- **FR-009**: The system MUST limit item updates in this feature to the fields defined as updateable by the item contract for partial updates.
- **FR-010**: The system MUST apply an ownership check before completing any of the four supported item operations and MUST deny access when the related trip is not owned by the current authenticated user.
- **FR-011**: The system MUST return a forbidden outcome for list, create, retrieve, and update requests when the related trip belongs to a different user.
- **FR-012**: The system MUST report when the requested trip or item does not exist.
- **FR-013**: The system MUST reject item creation or update requests that do not satisfy the required item data rules, including a missing required item name on creation.
- **FR-014**: The system MUST preserve the item data defined for this feature: item identifier, trip identifier, baggage identifier, item name, check count, and optional default item reference.
- **FR-015**: The system MUST reject requests that do not have a determinable current authenticated user.
- **FR-016**: All trip identifiers, item identifiers, baggage identifiers, and default item references used by this feature MUST be UUID values.

### Key Entities *(include if feature involves data)*

- **Item**: A packing-list entry owned indirectly through a trip, identified uniquely, linked to one trip and one baggage, with a name, a check count, and an optional reference to a predefined item.
- **Trip**: A travel plan owned by one user that groups items and supplies the default baggage used when an item is created directly under the trip.
- **Current User Context**: The request-scoped authenticated identity used to determine trip ownership and whether item access is allowed.

### Assumptions

- The feature scope is limited to listing trip items, creating an item directly under a trip, retrieving one item, and partially updating one item.
- A valid authenticated user identity is expected to be available for each authorized request, but the authentication mechanism itself is outside this feature's scope.
- Each trip has exactly one default baggage available for direct item creation; if that baggage cannot be resolved, item creation fails clearly rather than assigning the item elsewhere.
- Item updates in this phase are limited to fields explicitly allowed by the existing item contract for partial updates.
- No item deletion, item check action, baggage-specific item creation, item sharing, or cross-user collaboration behavior is included in this phase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation testing, 100% of item list requests for a user's own trip return only items associated with that selected trip.
- **SC-002**: A user can add a new item to one of their trips in a single submission without having to choose a baggage manually.
- **SC-003**: In validation testing, 100% of successful single-item retrievals and updates return the correct item and preserve its trip association.
- **SC-004**: In validation testing, 100% of requests involving another user's trip or item are denied with a forbidden outcome.
- **SC-005**: In validation testing, 100% of requests with missing data, invalid UUIDs, unresolved ownership, or missing records return a clear failure outcome instead of an ambiguous success response.
