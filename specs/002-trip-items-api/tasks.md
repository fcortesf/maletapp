# Tasks: Trip Item Access

**Input**: Design documents from `/specs/002-trip-items-api/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit and integration tests are required for this feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare solution and test scaffolding for the item feature

- [ ] T001 Add any required item-feature package or project reference updates in `/home/sicor/local-repos/maletapp/src/Trip.API/Trip.API.csproj`, `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Trip.API.UnitTests.csproj`, and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trip.API.IntegrationTests.csproj`
- [ ] T002 [P] Create item test folders and placeholder coverage files in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/`, `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs`, and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/`
- [ ] T003 [P] Create item application and API folders in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/` and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/`
- [ ] T004 Confirm the new item files are included in `/home/sicor/local-repos/maletapp/Maletapp.sln` where needed for build and test discovery

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Extend repository abstractions for trip item list, create, item lookup, and item update flows in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Abstractions/ITripRepository.cs`
- [ ] T006 [P] Create shared item DTOs for contract-aligned read and write models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Dtos/ItemDto.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Dtos/NewItemDto.cs`, and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Dtos/PatchItemDto.cs`
- [ ] T007 [P] Align the item and baggage domain behaviors for rename, default baggage assignment, and UUID-backed references in `/home/sicor/local-repos/maletapp/src/Trip.API/Domain/Entities/Item.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Domain/Entities/Baggage.cs`, and `/home/sicor/local-repos/maletapp/src/Trip.API/Domain/Entities/Trip.cs`
- [ ] T008 [P] Expand EF Core persistence models and configuration to store trips with nested baggages and items in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Persistence/TripDbContext.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Persistence/TripDataModel.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Persistence/BaggageDataModel.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Persistence/ItemDataModel.cs`, and `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Persistence/Configurations/TripConfiguration.cs`
- [ ] T009 [P] Implement repository mapping and persistence support for nested baggages and items in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Repositories/TripRepository.cs`
- [ ] T010 [P] Create shared item endpoint naming and logging helpers in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ItemEndpointNames.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ItemLogMessages.cs`, and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ItemEndpointRouteBuilderExtensions.cs`
- [ ] T011 [P] Register item handlers and endpoint wiring in `/home/sicor/local-repos/maletapp/src/Trip.API/Program.cs`
- [ ] T012 [P] Extend integration test infrastructure for owned-trip and foreign-trip item scenarios in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Infrastructure/TripApiFactory.cs` and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Infrastructure/TestUserContextHeaderNames.cs`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View items for my trip (Priority: P1) 🎯 MVP

**Goal**: Return all items for one owned trip and deny access to foreign trips

**Independent Test**: Seed multiple trips and items for different users, request `GET /trips/{tripId}/items`, and verify the response contains only the selected owned trip's items, returns an empty list for an owned empty trip, returns `404 Not Found` for a missing trip, and returns forbidden for a foreign trip

### Tests for User Story 1

- [ ] T013 [P] [US1] Add item domain and aggregate tests for trip-scoped item listing behavior in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs` and `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Testing/TripFixtures.cs`
- [ ] T014 [P] [US1] Add list-items application unit tests covering owned-trip, foreign-trip, and missing-trip outcomes in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/ListItemsByTripHandlerTests.cs`
- [ ] T015 [P] [US1] Add list-items integration tests covering owned-trip, empty-trip, missing-trip, and foreign-trip outcomes in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/ListItemsByTripEndpointTests.cs`

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create list-items query and result models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/ListItemsByTrip/ListItemsByTripQuery.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/ListItemsByTrip/ListItemsByTripResult.cs`
- [ ] T017 [P] [US1] Create list-items response mapping models in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ItemResponse.cs`
- [ ] T018 [US1] Implement list-items application logic with ownership enforcement and missing-trip `404 Not Found` handling in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/ListItemsByTrip/ListItemsByTripHandler.cs`
- [ ] T019 [US1] Implement the `listItemsByTrip` endpoint with exact OpenAPI naming, structured logging, and missing-trip failure mapping in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ListItemsByTripEndpoint.cs`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Add an item to my trip (Priority: P2)

**Goal**: Create a new item directly under an owned trip and assign it to the trip's default baggage

**Independent Test**: Submit `POST /trips/{tripId}/items` for an owned trip and verify the created item has a new UUID, the correct trip id, a resolved default baggage id, and that missing-trip, forbidden, or validation failures are returned for invalid scenarios

### Tests for User Story 2

- [ ] T020 [P] [US2] Add default-baggage item creation domain tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs`
- [ ] T021 [P] [US2] Add create-item application unit tests covering owned-trip, missing-trip, and foreign-trip outcomes in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/CreateItemInTripHandlerTests.cs`
- [ ] T022 [P] [US2] Add create-item integration tests covering success, missing-trip, foreign-trip, and bad-request outcomes in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/CreateItemInTripEndpointTests.cs`

### Implementation for User Story 2

- [ ] T023 [P] [US2] Create create-item command and result models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CreateItemInTrip/CreateItemInTripCommand.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CreateItemInTrip/CreateItemInTripResult.cs`
- [ ] T024 [P] [US2] Create create-item request models in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/CreateItemInTripRequest.cs`
- [ ] T025 [US2] Implement create-item application logic with ownership checks, default baggage assignment, and missing-trip `404 Not Found` handling in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CreateItemInTrip/CreateItemInTripHandler.cs`
- [ ] T026 [US2] Implement the `createItemInTrip` endpoint with exact OpenAPI naming, validation handling, structured logging, and missing-trip failure mapping in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/CreateItemInTripEndpoint.cs`

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - View or update a specific item I own (Priority: P3)

**Goal**: Retrieve a single owned item and partially update its allowed fields while preserving trip ownership rules

**Independent Test**: Request `GET /items/{itemId}` and `PATCH /items/{itemId}` for an owned item, verify the correct item is returned and updated, and verify not-found, forbidden, invalid-body, and missing-user failures

### Tests for User Story 3

- [ ] T027 [P] [US3] Add single-item retrieval and patch domain tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs`
- [ ] T028 [P] [US3] Add get-item application unit tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/GetItemHandlerTests.cs`
- [ ] T029 [P] [US3] Add patch-item application unit tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/PatchItemHandlerTests.cs`
- [ ] T030 [P] [US3] Add get-item and patch-item integration tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/GetItemEndpointTests.cs` and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/PatchItemEndpointTests.cs`

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create get-item query and result models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/GetItem/GetItemQuery.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/GetItem/GetItemResult.cs`
- [ ] T032 [P] [US3] Create patch-item command and result models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/PatchItem/PatchItemCommand.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/PatchItem/PatchItemResult.cs`
- [ ] T033 [P] [US3] Create patch-item request models in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/PatchItemRequest.cs`
- [ ] T034 [US3] Implement get-item application logic with ownership enforcement in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/GetItem/GetItemHandler.cs`
- [ ] T035 [US3] Implement patch-item application logic for allowed item fields in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/PatchItem/PatchItemHandler.cs`
- [ ] T036 [US3] Implement the `getItem` endpoint with exact OpenAPI naming and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/GetItemEndpoint.cs`
- [ ] T037 [US3] Implement the `patchItem` endpoint with exact OpenAPI naming, validation handling, and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/PatchItemEndpoint.cs`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cross-story cleanup and verification

- [ ] T038 [P] Update Swagger and HTTP examples for the item endpoints in `/home/sicor/local-repos/maletapp/src/Trip.API/Program.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Trip.API.http`
- [ ] T039 [P] Add any missing shared test helpers for item scenarios in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Testing/TripFixtures.cs` and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Infrastructure/TripApiFactory.cs`
- [ ] T040 Run the full verification flow from `/home/sicor/local-repos/maletapp/specs/002-trip-items-api/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion; is the MVP
- **User Story 2 (Phase 4)**: Depends on Foundational completion and practically benefits from US1 list coverage for seeded trip/item data
- **User Story 3 (Phase 5)**: Depends on Foundational completion and reuses shared item DTOs, repository support, and endpoint routing from earlier phases
- **Polish (Phase 6)**: Depends on all implemented user stories

### User Story Dependencies

- **US1**: No dependency on other user stories
- **US2**: No strict dependency on US1, but verification benefits from the same seeded item and trip infrastructure
- **US3**: No strict dependency on US1 or US2, but verification benefits from an existing persisted item

### Within Each User Story

- Tests must be written before the corresponding implementation tasks
- Query and command models before handlers
- Handlers before endpoints
- Story verification after endpoint completion

### Parallel Opportunities

- T002 and T003 can run in parallel after T001
- T006, T007, T008, T009, T010, T011, and T012 can run in parallel after T005 where dependencies allow
- For US1, T013, T014, T015, T016, and T017 can run in parallel before T018 and T019
- For US2, T020, T021, T022, T023, and T024 can run in parallel before T025 and T026
- For US3, T027, T028, T029, T030, T031, T032, and T033 can run in parallel before T034, T035, T036, and T037
- T038 and T039 can run in parallel before T040

---

## Parallel Example: User Story 1

```bash
Task: "Add item domain and aggregate tests for trip-scoped item listing in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs and /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Testing/TripFixtures.cs"
Task: "Add list-items application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/ListItemsByTripHandlerTests.cs"
Task: "Add list-items integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/ListItemsByTripEndpointTests.cs"
Task: "Create list-items query and result models in /home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/ListItemsByTrip/ListItemsByTripQuery.cs and /home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/ListItemsByTrip/ListItemsByTripResult.cs"
Task: "Create list-items response mapping models in /home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/ItemResponse.cs"
```

## Parallel Example: User Story 2

```bash
Task: "Add default-baggage item creation domain tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/ItemTests.cs"
Task: "Add create-item application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/CreateItemInTripHandlerTests.cs"
Task: "Add create-item integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/CreateItemInTripEndpointTests.cs"
Task: "Create create-item command and result models in /home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CreateItemInTrip/CreateItemInTripCommand.cs and /home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/CreateItemInTrip/CreateItemInTripResult.cs"
Task: "Create create-item request models in /home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/CreateItemInTripRequest.cs"
```

## Parallel Example: User Story 3

```bash
Task: "Add get-item application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/GetItemHandlerTests.cs"
Task: "Add patch-item application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/PatchItemHandlerTests.cs"
Task: "Add get-item and patch-item integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/GetItemEndpointTests.cs and /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/PatchItemEndpointTests.cs"
Task: "Create get-item query and result models in /home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/GetItem/GetItemQuery.cs and /home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/GetItem/GetItemResult.cs"
Task: "Create patch-item command and result models in /home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/PatchItem/PatchItemCommand.cs and /home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/PatchItem/PatchItemResult.cs"
Task: "Create patch-item request models in /home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/PatchItemRequest.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate trip item listing behavior independently
5. Commit the completed task work before moving to the next story

### Incremental Delivery

1. Complete Setup and Foundational work once
2. Deliver US1 as the MVP
3. Deliver US2 as the next independently testable increment
4. Deliver US3 as the final functional increment
5. Finish with cross-cutting verification and cleanup

### Parallel Team Strategy

1. One engineer can expand persistence and repository support while another prepares item DTOs and endpoint scaffolding during Phase 2
2. After Phase 2, one engineer can implement US1 while another prepares US2 tests and a third prepares US3 request and query models
3. Complete each story, verify it independently, then merge in priority order

---

## Notes

- Every task follows the required checklist format with an ID, optional parallel marker, required story label for story work, and exact file paths
- Tests are intentionally included because the feature specification and constitution require automated validation
- US1 is the suggested MVP scope
- Commit after each completed `speckit.tasks` task or tight logical batch per repository guidance
