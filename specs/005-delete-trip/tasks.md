# Tasks: Delete Trip

**Input**: Design documents from `/specs/005-delete-trip/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit and integration tests are required for this feature by the constitution and quickstart.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the solution for the delete-trip workflow

- [X] T001 Create the delete-trip application, API, and test scaffold files in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/DeleteTrip/DeleteTripCommand.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/DeleteTrip/DeleteTripResult.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/DeleteTrip/DeleteTripHandler.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/DeleteTripEndpoint.cs`, `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/DeleteTripHandlerTests.cs`, and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/DeleteTripEndpointTests.cs`
- [X] T002 [P] Extend shared trip test fixtures for delete-trip scenarios in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Testing/TripFixtures.cs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Extend the repository abstraction for trip deletion in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Abstractions/ITripRepository.cs`
- [X] T004 [P] Add delete-trip endpoint naming and route wiring hooks in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/TripEndpointNames.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/TripEndpointRouteBuilderExtensions.cs`
- [X] T005 [P] Add delete-trip logging and handler registration in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/TripLogMessages.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Program.cs`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Remove an obsolete trip (Priority: P1) 🎯 MVP

**Goal**: Let the current user delete one owned trip and stop retrieving it afterward

**Independent Test**: Create an owned trip, delete it through `DELETE /trips/{tripId}`, verify the response is `204 No Content`, then request the same trip and verify `404 Not Found`

### Tests for User Story 1

- [X] T006 [P] [US1] Add owned-trip delete handler tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/DeleteTripHandlerTests.cs`
- [X] T007 [P] [US1] Add owned-trip delete endpoint integration tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/DeleteTripEndpointTests.cs`

### Implementation for User Story 1

- [X] T008 [P] [US1] Implement delete-trip command and result models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/DeleteTrip/DeleteTripCommand.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/DeleteTrip/DeleteTripResult.cs`
- [X] T009 [US1] Implement delete-trip application logic for owned trips in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/DeleteTrip/DeleteTripHandler.cs`
- [X] T010 [US1] Implement the `deleteTrip` endpoint with exact OpenAPI naming and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/DeleteTripEndpoint.cs`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Remove the trip contents together (Priority: P2)

**Goal**: Remove all baggages and items contained in a deleted trip without affecting other trips

**Independent Test**: Create one owned trip with items and another owned trip with different items, delete the first trip, and verify the deleted trip's items are no longer accessible while the second trip and its items remain available

### Tests for User Story 2

- [X] T011 [P] [US2] Add cascade-delete integration tests for trip-contained items and indirect baggage cleanup verification through aggregate deletion in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/DeleteTripEndpointTests.cs`, `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/GetItemEndpointTests.cs`, and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/ListItemsByTripEndpointTests.cs`
- [X] T012 [P] [US2] Extend trip fixture coverage for trips with nested baggage and item data in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Testing/TripFixtures.cs` and `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/DeleteTripHandlerTests.cs`

### Implementation for User Story 2

- [X] T013 [US2] Implement repository aggregate deletion that removes nested baggages and items while preserving other trips in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Repositories/TripRepository.cs`

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - Prevent unauthorized or invalid deletion (Priority: P3)

**Goal**: Return the correct unauthorized, forbidden, and not-found outcomes without deleting any trip data incorrectly

**Independent Test**: Attempt to delete a trip without a current user, a missing trip, and a trip owned by another user, then verify the correct failure status is returned and no other trip data changes

### Tests for User Story 3

- [X] T014 [P] [US3] Add missing-trip and foreign-trip handler tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/DeleteTripHandlerTests.cs`
- [X] T015 [P] [US3] Add unauthorized, forbidden, and missing-trip endpoint tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/DeleteTripEndpointTests.cs`

### Implementation for User Story 3

- [X] T016 [US3] Finalize delete-trip ownership enforcement and failure handling in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/DeleteTrip/DeleteTripHandler.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/DeleteTripEndpoint.cs`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cross-story cleanup and verification

- [X] T017 [P] Update manual HTTP examples for trip deletion in `/home/sicor/local-repos/maletapp/src/Trip.API/Trip.API.http`
- [X] T018 Run the full verification flow documented in `/home/sicor/local-repos/maletapp/specs/005-delete-trip/quickstart.md` with `dotnet build --no-incremental`, `dotnet test --no-build`, and `dotnet format --verify-no-changes`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion; is the MVP
- **User Story 2 (Phase 4)**: Depends on User Story 1 because cascade cleanup builds on the core delete-trip flow
- **User Story 3 (Phase 5)**: Depends on User Story 1 because failure handling is exercised through the same delete-trip handler and endpoint
- **Polish (Phase 6)**: Depends on all implemented user stories

### User Story Dependencies

- **US1**: No dependency on other user stories
- **US2**: Depends on US1
- **US3**: Depends on US1

### Within Each User Story

- Tests must be written before the corresponding implementation tasks
- Command and result models before handler logic
- Handler logic before endpoint completion
- Story verification after endpoint and repository updates are complete

### Parallel Opportunities

- T002 can run in parallel with T001 after the feature scaffolding starts
- T004 and T005 can run in parallel after T003
- In US1, T006, T007, and T008 can run in parallel before T009 and T010
- In US2, T011 and T012 can run in parallel before T013
- In US3, T014 and T015 can run in parallel before T016
- T017 can run in parallel with late-stage verification prep before T018

---

## Parallel Example: User Story 1

```bash
Task: "Add owned-trip delete handler tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/DeleteTripHandlerTests.cs"
Task: "Add owned-trip delete endpoint integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/DeleteTripEndpointTests.cs"
Task: "Implement delete-trip command and result models in /home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/DeleteTrip/DeleteTripCommand.cs and /home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/DeleteTrip/DeleteTripResult.cs"
```

## Parallel Example: User Story 2

```bash
Task: "Add cascade-delete integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/DeleteTripEndpointTests.cs, /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/GetItemEndpointTests.cs, and /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/ListItemsByTripEndpointTests.cs"
Task: "Extend trip fixture coverage in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Testing/TripFixtures.cs and /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/DeleteTripHandlerTests.cs"
```

## Parallel Example: User Story 3

```bash
Task: "Add missing-trip and foreign-trip handler tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/DeleteTripHandlerTests.cs"
Task: "Add unauthorized, forbidden, and missing-trip endpoint tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/DeleteTripEndpointTests.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate delete-trip behavior independently
5. Commit the completed task work before moving to the next story

### Incremental Delivery

1. Complete Setup and Foundational work once
2. Deliver US1 as the MVP
3. Deliver US2 to add cascade cleanup guarantees for trip-contained baggages and items
4. Deliver US3 to lock down unauthorized, forbidden, and missing-trip behavior
5. Finish with cross-cutting verification and manual examples

### Parallel Team Strategy

1. One engineer can prepare trip endpoint naming and route wiring while another registers logging and handler setup during Phase 2
2. After Phase 2, one engineer can implement US1 while another prepares US2 cascade tests
3. Once US1 lands, US2 and US3 can proceed in parallel if the team avoids overlapping edits to the same files

---

## Notes

- Every task follows the required checklist format with an ID, optional parallel marker, required story label for story work, and exact file paths
- Tests are intentionally included because the constitution and quickstart require automated validation
- US1 is the suggested MVP scope
- Commit after each completed task or tight logical batch per repository guidance
