# Tasks: Trip API Bootstrap

**Input**: Design documents from `/specs/001-add-trip-api/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit and integration tests are required for this feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the project and test scaffolding required by the plan

- [ ] T001 Add Entity Framework and testing package references in `/home/sicor/local-repos/maletapp/src/Trip.API/Trip.API.csproj`
- [ ] T002 [P] Create the unit test project definition in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Trip.API.UnitTests.csproj`
- [ ] T003 [P] Create the integration test project definition in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trip.API.IntegrationTests.csproj`
- [ ] T004 Add the API and test projects to `/home/sicor/local-repos/maletapp/Maletapp.sln`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create repository and current-user abstraction interfaces in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Abstractions/ITripRepository.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Abstractions/IUserContextAccessor.cs`
- [ ] T006 [P] Create shared trip DTOs in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Dtos/TripDto.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Dtos/NewTripDto.cs`
- [ ] T007 [P] Create typed application exceptions in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Exceptions/NotFoundException.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Exceptions/ForbiddenException.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Exceptions/UnauthorizedException.cs`, and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Exceptions/ValidationException.cs`
- [ ] T008 Align the trip domain entity rules in `/home/sicor/local-repos/maletapp/src/Trip.API/Domain/Entities/Trip.cs`
- [ ] T009 [P] Create Entity Framework persistence primitives in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Persistence/TripDbContext.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Persistence/Configurations/TripConfiguration.cs`
- [ ] T010 [P] Create the Entity Framework trip repository in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/Repositories/TripRepository.cs`
- [ ] T011 [P] Create the request user-context implementation in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/UserContext/HttpUserContextAccessor.cs`
- [ ] T012 Replace the starter bootstrap with service registration, problem details, and trip endpoint wiring in `/home/sicor/local-repos/maletapp/src/Trip.API/Program.cs`
- [ ] T013 [P] Add OpenAPI endpoint naming constants or verification notes for `createTrip`, `getTrips`, and `getTripById` in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/`
- [ ] T014 [P] Add explicit `CancellationToken` support to repository interfaces, application handlers, and endpoint signatures in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Abstractions/ITripRepository.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/`, and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/`
- [ ] T015 [P] Add structured logging dependencies and shared logging patterns for trip operations in `/home/sicor/local-repos/maletapp/src/Trip.API/Program.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/`
- [ ] T016 [P] Add integration test infrastructure helpers in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Infrastructure/TripApiFactory.cs` and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Infrastructure/TestUserContextHeaderNames.cs`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create a trip (Priority: P1) 🎯 MVP

**Goal**: Allow the current user to create a trip with destination and optional dates

**Independent Test**: Submit a create-trip request and verify the response contains a new identifier, the saved fields, and the trip belongs to the current user; verify invalid input and missing-user failures

### Tests for User Story 1

- [ ] T017 [P] [US1] Add trip domain validation unit tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/TripTests.cs`
- [ ] T018 [P] [US1] Add create-trip application unit tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/CreateTripHandlerTests.cs`
- [ ] T019 [P] [US1] Add create-trip integration tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/CreateTripEndpointTests.cs`

### Implementation for User Story 1

- [ ] T020 [P] [US1] Create the create-trip request and response models in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/CreateTripRequest.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/TripResponse.cs`
- [ ] T021 [P] [US1] Create create-trip application models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/CreateTrip/CreateTripCommand.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/CreateTrip/CreateTripResult.cs`
- [ ] T022 [US1] Implement create-trip application logic with `CancellationToken` support and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/CreateTrip/CreateTripHandler.cs`
- [ ] T023 [US1] Implement the `createTrip` endpoint with the exact OpenAPI `operationId` name, `CancellationToken` parameter, and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/CreateTripEndpoint.cs`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - View my trip list (Priority: P2)

**Goal**: Return only the current user's trips, including the empty-list case

**Independent Test**: Seed trips for multiple users and verify the trip list returns only the current user's trips, or an empty list when none exist

### Tests for User Story 2

- [ ] T024 [P] [US2] Add list-trips application unit tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/GetTripsHandlerTests.cs`
- [ ] T025 [P] [US2] Add list-trips integration tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/GetTripsEndpointTests.cs`

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create list-trips application models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTrips/GetTripsQuery.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTrips/GetTripsResult.cs`
- [ ] T027 [US2] Implement list-trips application logic with `CancellationToken` support and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTrips/GetTripsHandler.cs`
- [ ] T028 [US2] Implement the `getTrips` endpoint with the exact OpenAPI `operationId` name, `CancellationToken` parameter, and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/GetTripsEndpoint.cs`

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - View a trip detail (Priority: P3)

**Goal**: Return a single owned trip and enforce not-found and forbidden access outcomes

**Independent Test**: Request one owned trip by identifier and verify the detail response, then verify missing-trip, foreign-trip, invalid-id, and missing-user failures

### Tests for User Story 3

- [ ] T029 [P] [US3] Add get-trip-detail application unit tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/GetTripByIdHandlerTests.cs`
- [ ] T030 [P] [US3] Add get-trip-detail integration tests in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/GetTripByIdEndpointTests.cs`

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create get-trip-detail application models in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTripById/GetTripByIdQuery.cs` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTripById/GetTripByIdResult.cs`
- [ ] T032 [US3] Implement get-trip-detail application logic with `CancellationToken` support and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTripById/GetTripByIdHandler.cs`
- [ ] T033 [US3] Implement the `getTripById` endpoint with the exact OpenAPI `operationId` name, `CancellationToken` parameter, and structured logging in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/GetTripByIdEndpoint.cs`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cross-story cleanup and verification

- [ ] T034 [P] Add unit test shared fixtures in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Testing/TripFixtures.cs`
- [ ] T035 Update API example configuration for current-user testing in `/home/sicor/local-repos/maletapp/src/Trip.API/appsettings.Development.json`
- [ ] T036 Run the full verification flow from `/home/sicor/local-repos/maletapp/specs/001-add-trip-api/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion; is the MVP
- **User Story 2 (Phase 4)**: Depends on Foundational completion and can reuse the trip DTOs and repository from earlier phases
- **User Story 3 (Phase 5)**: Depends on Foundational completion and can reuse the trip DTOs and repository from earlier phases
- **Polish (Phase 6)**: Depends on all implemented user stories

### User Story Dependencies

- **US1**: No dependency on other user stories
- **US2**: No strict dependency on US1 for architecture, but practical verification benefits from at least one created trip
- **US3**: No strict dependency on US2, but practical verification benefits from at least one created trip

### Within Each User Story

- Tests must be written before the corresponding implementation tasks
- API request/response models before handlers when they share files
- Application handlers before endpoints
- Endpoint wiring must be complete before story verification

### Parallel Opportunities

- T002 and T003 can run in parallel after T001
- T006, T007, T009, T010, T011, T013, T014, T015, and T016 can run in parallel after T005 and T008 where applicable
- For US1, T017, T018, T019, T020, and T021 can run in parallel before T022 and T023
- For US2, T024, T025, and T026 can run in parallel before T027 and T028
- For US3, T029, T030, and T031 can run in parallel before T032 and T033
- T034 can run in parallel with other polish tasks

---

## Parallel Example: User Story 1

```bash
Task: "Add trip domain validation unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Domain/TripTests.cs"
Task: "Add create-trip application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/CreateTripHandlerTests.cs"
Task: "Add create-trip integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/CreateTripEndpointTests.cs"
Task: "Create the create-trip request and response models in /home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/CreateTripRequest.cs and /home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/TripResponse.cs"
Task: "Create create-trip application models in /home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/CreateTrip/CreateTripCommand.cs and /home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/CreateTrip/CreateTripResult.cs"
```

## Parallel Example: User Story 2

```bash
Task: "Add list-trips application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/GetTripsHandlerTests.cs"
Task: "Add list-trips integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/GetTripsEndpointTests.cs"
Task: "Create list-trips application models in /home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTrips/GetTripsQuery.cs and /home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTrips/GetTripsResult.cs"
```

## Parallel Example: User Story 3

```bash
Task: "Add get-trip-detail application unit tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/GetTripByIdHandlerTests.cs"
Task: "Add get-trip-detail integration tests in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/GetTripByIdEndpointTests.cs"
Task: "Create get-trip-detail application models in /home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTripById/GetTripByIdQuery.cs and /home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/GetTripById/GetTripByIdResult.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate create-trip behavior independently
5. Commit and push the completed task work

### Incremental Delivery

1. Complete Setup and Foundational work once
2. Deliver US1 as the MVP
3. Deliver US2 as the next independently testable increment
4. Deliver US3 as the final functional increment
5. Finish with cross-cutting verification and cleanup

### Parallel Team Strategy

1. One engineer handles test-project and solution setup while another prepares foundational abstractions
2. After Phase 2, one engineer can handle US1 while others prepare US2 and US3 tests and query models
3. Complete each story, verify it independently, then merge in priority order

---

## Notes

- Every task follows the required checklist format with an ID, optional parallel marker, required story label for story work, and exact file paths
- Tests are intentionally included because the user requested unit and integration coverage
- US1 is the suggested MVP scope
- Commit after each completed task or tight logical batch, then push after each completed `speckit.tasks` task per repository guidance
