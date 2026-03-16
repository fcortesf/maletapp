# Tasks: Item Check Counter

**Input**: Design documents from `/specs/003-item-check-counter/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit and integration tests are required for this feature by the constitution and quickstart.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the solution for the new item check workflow

- [X] T001 Create the `CheckItem` application folder and scaffold files in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CheckItem/CheckItemCommand.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CheckItem/CheckItemResult.cs`, and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CheckItem/CheckItemHandler.cs`
- [X] T002 [P] Create the endpoint and test scaffold files for item checking in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/CheckItemEndpoint.cs`, `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/CheckItemHandlerTests.cs`, and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/CheckItemEndpointTests.cs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Extend the item repository contract for owned-item check operations in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Abstractions/ITripRepository.cs`
- [X] T004 [P] Add check-item endpoint naming, routing, and logging constants in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ItemEndpointNames.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ItemEndpointRouteBuilderExtensions.cs`, and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ItemLogMessages.cs`
- [X] T005 [P] Register the check-item handler and endpoint wiring in `/home/sicor/local-repos/maletapp/src/Trip.API/Program.cs`
- [X] T006 Implement repository persistence support for loading and saving checked items in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Repositories/TripRepository.cs`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Mark an item as packed (Priority: P1) 🎯 MVP

**Goal**: Let the current user mark one owned item as packed and immediately receive the updated item with `checkCount` increased by 1

**Independent Test**: Check an owned item through `POST /items/{itemId}/check-item` and verify the response returns the same item identity with `checkCount` increased from `0` to `1`

### Tests for User Story 1

- [X] T007 [P] [US1] Add item increment domain tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs`
- [X] T008 [P] [US1] Add check-item application unit tests covering owned-item success and unauthorized access in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/CheckItemHandlerTests.cs`
- [X] T009 [P] [US1] Add check-item integration tests covering successful first-time packing and unauthorized requests in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/CheckItemEndpointTests.cs`

### Implementation for User Story 1

- [X] T010 [US1] Implement increment-only item behavior in `/home/sicor/local-repos/maletapp/src/Trip.API/Domain/Entities/Item.cs`
- [X] T011 [US1] Implement the check-item command and result models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CheckItem/CheckItemCommand.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CheckItem/CheckItemResult.cs`
- [X] T012 [US1] Implement check-item application logic with current-user resolution and ownership enforcement in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CheckItem/CheckItemHandler.cs`
- [X] T013 [US1] Implement the `checkItem` endpoint with exact OpenAPI naming, cancellation propagation, and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/CheckItemEndpoint.cs`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Re-pack for a return trip (Priority: P2)

**Goal**: Allow repeated checks of the same owned item so packing history accumulates across outbound and return packing passes

**Independent Test**: Check the same owned item multiple times and verify `checkCount` increases cumulatively in the check response and in existing item retrieval endpoints

### Tests for User Story 2

- [X] T014 [P] [US2] Add repeated-check domain tests for cumulative packing history in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs`
- [X] T015 [P] [US2] Add repeated-check application unit tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/CheckItemHandlerTests.cs`
- [X] T016 [P] [US2] Add repeated-check and retrieval-visibility integration tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/CheckItemEndpointTests.cs`, `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/GetItemEndpointTests.cs`, and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/ListItemsByTripEndpointTests.cs`

### Implementation for User Story 2

- [X] T017 [US2] Preserve cumulative `checkCount` mapping across persistence reads and writes in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Repositories/TripRepository.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Persistence/ItemDataModel.cs`
- [X] T018 [US2] Ensure item response mapping continues exposing the latest `checkCount` in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ItemResponse.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/GetItem/GetItemHandler.cs`, and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/ListItemsByTrip/ListItemsByTripHandler.cs`

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - Protect item integrity during check actions (Priority: P3)

**Goal**: Ensure check actions change only packing progress and return correct failure outcomes for missing or forbidden items

**Independent Test**: Check a missing or foreign item and verify the correct failure response, then check an owned item and confirm `name`, `tripId`, `baggageId`, and `defaultItemId` remain unchanged while only `checkCount` increments

### Tests for User Story 3

- [X] T019 [P] [US3] Add item integrity domain tests to confirm check actions do not mutate non-counter fields in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs`
- [X] T020 [P] [US3] Add missing-item and foreign-item application unit tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/CheckItemHandlerTests.cs`
- [X] T021 [P] [US3] Add missing-item, forbidden-item, and field-integrity integration tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/CheckItemEndpointTests.cs`

### Implementation for User Story 3

- [X] T022 [US3] Enforce not-found and forbidden check-item outcomes through repository lookup and typed exceptions in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CheckItem/CheckItemHandler.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Repositories/TripRepository.cs`
- [X] T023 [US3] Preserve immutable item fields during check actions in `/home/sicor/local-repos/maletapp/src/Trip.API/Domain/Entities/Item.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/CheckItemEndpoint.cs`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cross-story cleanup and verification

- [X] T024 [P] Update item-check examples and manual verification requests in `/home/sicor/local-repos/maletapp/src/Trip.API/Trip.API.http` and `/home/sicor/local-repos/maletapp/specs/003-item-check-counter/quickstart.md`
- [X] T025 Run the full verification flow documented in `/home/sicor/local-repos/maletapp/specs/003-item-check-counter/quickstart.md` with `dotnet build --no-incremental`, `dotnet test --no-build`, and `dotnet format --verify-no-changes`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion; is the MVP
- **User Story 2 (Phase 4)**: Depends on Foundational completion; reuses the same check-item flow but remains independently testable
- **User Story 3 (Phase 5)**: Depends on Foundational completion; reuses the same check-item flow but remains independently testable
- **Polish (Phase 6)**: Depends on all implemented user stories

### User Story Dependencies

- **US1**: No dependency on other user stories
- **US2**: No strict dependency on other user stories after Foundational completion
- **US3**: No strict dependency on other user stories after Foundational completion

### Within Each User Story

- Tests should be written before the corresponding implementation tasks
- Domain behavior before handler behavior
- Handler behavior before endpoint completion
- Story verification after endpoint and persistence updates are complete

### Parallel Opportunities

- T002 can run in parallel with T001 after the feature scaffolding starts
- T004 and T005 can run in parallel after T003
- In US1, T007, T008, and T009 can run in parallel before T010 through T013
- In US2, T014, T015, and T016 can run in parallel before T017 and T018
- In US3, T019, T020, and T021 can run in parallel before T022 and T023
- T024 can run in parallel with late-stage validation prep before T025

---

## Parallel Example: User Story 1

```bash
Task: "Add item increment domain tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs"
Task: "Add check-item application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/CheckItemHandlerTests.cs"
Task: "Add check-item integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/CheckItemEndpointTests.cs"
```

## Parallel Example: User Story 2

```bash
Task: "Add repeated-check domain tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs"
Task: "Add repeated-check application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/CheckItemHandlerTests.cs"
Task: "Add repeated-check and retrieval-visibility integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/CheckItemEndpointTests.cs, /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/GetItemEndpointTests.cs, and /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/ListItemsByTripEndpointTests.cs"
```

## Parallel Example: User Story 3

```bash
Task: "Add item integrity domain tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs"
Task: "Add missing-item and foreign-item application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/CheckItemHandlerTests.cs"
Task: "Add missing-item, forbidden-item, and field-integrity integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/CheckItemEndpointTests.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the single check flow independently
5. Commit the completed task work before moving to the next story

### Incremental Delivery

1. Complete Setup and Foundational work once
2. Deliver US1 as the MVP
3. Deliver US2 to add repeated packing support and retrieval visibility
4. Deliver US3 to lock down integrity and failure handling
5. Finish with cross-cutting verification and manual examples

### Parallel Team Strategy

1. One engineer can prepare repository contract changes while another wires endpoint constants and registration during Phase 2
2. After Phase 2, one engineer can drive US1 while another prepares US2 retrieval-visibility tests
3. Once US1 lands, US2 and US3 can be completed in parallel if the team avoids overlapping edits to the same files

---

## Notes

- Every task follows the required checklist format with an ID, optional parallel marker, required story label for story work, and exact file paths
- Tests are intentionally included because the feature plan and repository constitution require automated validation
- US1 is the suggested MVP scope
- Commit after each completed task or tight logical batch per repository guidance
