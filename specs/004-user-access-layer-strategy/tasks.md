# Tasks: User Access Layer Strategy

**Input**: Design documents from `/specs/004-user-access-layer-strategy/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit and integration tests are required when implementation changes affect current-user seams or HTTP access behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each architectural increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the documentation artifacts and implementation placeholders needed for the access-layer strategy

- [ ] T001 Create supporting design artifacts for this feature in `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/research.md`, `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/data-model.md`, and `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/quickstart.md`
- [ ] T002 [P] Create a contracts placeholder for adapter-boundary decisions in `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/contracts/access-boundaries.md`
- [ ] T003 [P] Review and update the repository overview to reflect the private-by-default core API direction in `/home/sicor/local-repos/maletapp/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Harden the current-user seam and make the trust model explicit before any user-story work proceeds

**⚠️ CRITICAL**: No user story work should begin until this phase is complete

- [ ] T004 Document the production versus development trust model for current-user resolution in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/UserContext/HttpUserContextAccessor.cs`, `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/UserContext/UserContextHeaderNames.cs`, and `/home/sicor/local-repos/maletapp/src/Trip.API/appsettings.Development.json`
- [ ] T005 [P] Review and refine the internal current-user abstraction boundary in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Abstractions/IUserContextAccessor.cs`
- [ ] T006 [P] Add or update unit-test coverage for current-user seam behavior in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/`
- [ ] T007 [P] Add or update integration-test coverage for unauthorized access and development-only identity injection in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Infrastructure/TripApiFactory.cs` and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/`
- [ ] T008 Clarify API-host registration and trust-boundary comments for user-context services in `/home/sicor/local-repos/maletapp/src/Trip.API/Program.cs`

**Checkpoint**: Foundation ready - the current-user seam and trust assumptions are explicit and testable

---

## Phase 3: User Story 1 - Reuse core business capabilities across consumers (Priority: P1) 🎯 MVP

**Goal**: Keep the trip and item business capabilities reusable across future frontend, MCP, and LLM adapters without duplicating ownership rules

**Independent Test**: Verify that current application handlers remain reusable without depending on raw HTTP auth details and that the architecture documents define stable adapter entry points

### Tests for User Story 1

- [ ] T009 [P] [US1] Add or update application-level tests that prove ownership behavior remains independent from HTTP-specific auth handling in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/` and `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/`
- [ ] T010 [P] [US1] Add or update integration coverage that verifies business behavior still flows through the current-user abstraction rather than direct request parsing in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/` and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/`

### Implementation for User Story 1

- [ ] T011 [P] [US1] Document the reusable-core and thin-adapter pattern in `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/research.md` and `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/contracts/access-boundaries.md`
- [ ] T012 [P] [US1] Review existing handler seams and note any HTTP-specific assumptions that must stay outside the reusable business path in `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/` and `/home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/`
- [ ] T013 [US1] Update repository guidance and manual verification steps for treating the current API as a private-by-default core adapter in `/home/sicor/local-repos/maletapp/README.md` and `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/quickstart.md`

**Checkpoint**: The reusable-core direction is documented and existing business handlers are verified to remain adapter-friendly

---

## Phase 4: User Story 2 - Keep authentication concerns outside the business core when possible (Priority: P1)

**Goal**: Preserve the current edge-auth model so auth-provider and transport concerns do not leak into domain or application logic

**Independent Test**: Verify that the application layer still consumes only the current-user abstraction and that HTTP auth extraction remains isolated to infrastructure and API boundaries

### Tests for User Story 2

- [ ] T014 [P] [US2] Add or update tests that fail if application handlers begin to depend on HTTP-specific identity details in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/`
- [ ] T015 [P] [US2] Add or update integration tests covering missing current-user context and trusted user resolution through the HTTP adapter in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/` and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/`

### Implementation for User Story 2

- [ ] T016 [P] [US2] Refine `HttpUserContextAccessor` so development-only header behavior is clearly separated from validated production identity paths in `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/UserContext/HttpUserContextAccessor.cs`
- [ ] T017 [P] [US2] Add succinct comments or notes where needed to keep production auth concerns out of the core registration path in `/home/sicor/local-repos/maletapp/src/Trip.API/Program.cs`
- [ ] T018 [US2] Document the edge-auth and identity-translation rules for future frontend, MCP, and LLM adapters in `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/data-model.md` and `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/contracts/access-boundaries.md`

**Checkpoint**: Authentication concerns remain isolated to trusted adapters and infrastructure seams

---

## Phase 5: User Story 3 - Define explicit trust and authorization boundaries (Priority: P2)

**Goal**: Make the public/private boundary, identity-validation boundary, identity-translation boundary, and authorization boundary explicit and enforceable

**Independent Test**: Verify that the documentation, API examples, and current-user resolution behavior all align on the same trust model and do not imply a public caller-controlled identity header

### Tests for User Story 3

- [ ] T019 [P] [US3] Add or update integration coverage that distinguishes unauthorized requests from authorized-but-forbidden ownership failures in `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/` and `/home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/`
- [ ] T020 [P] [US3] Add or update any supporting unit-test fixtures required for trust-boundary scenarios in `/home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Testing/TripFixtures.cs`

### Implementation for User Story 3

- [ ] T021 [P] [US3] Update manual HTTP examples to distinguish development-only identity injection from the target production trust model in `/home/sicor/local-repos/maletapp/src/Trip.API/Trip.API.http`
- [ ] T022 [P] [US3] Document the recommended public/private, identity-validation, identity-translation, and authorization boundaries in `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/quickstart.md` and `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/contracts/access-boundaries.md`
- [ ] T023 [US3] Update the repository overview and feature documentation to state when a BFF, gateway, MCP adapter, or LLM tool layer should be introduced instead of expanding the core API contract in `/home/sicor/local-repos/maletapp/README.md` and `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/research.md`

**Checkpoint**: The trust model is explicit in docs, examples, and tests

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup for the access-layer strategy

- [ ] T024 [P] Review the current Trips and Items endpoint docs and names for consistency with the private-core recommendation in `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Trips/` and `/home/sicor/local-repos/maletapp/src/Trip.API/Api/Items/`
- [ ] T025 [P] Ensure the feature artifacts are internally consistent across `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/spec.md`, `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/plan.md`, `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/research.md`, `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/data-model.md`, `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/quickstart.md`, and `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/contracts/access-boundaries.md`
- [ ] T026 Run the full verification flow with `dotnet build --no-incremental`, `dotnet test --no-build`, and `dotnet format --verify-no-changes`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion; is the MVP
- **User Story 2 (Phase 4)**: Depends on Foundational completion and benefits from the seam documentation created for US1
- **User Story 3 (Phase 5)**: Depends on Foundational completion and benefits from the auth-boundary clarification completed in US2
- **Polish (Phase 6)**: Depends on all implemented user stories

### User Story Dependencies

- **US1**: No dependency on other user stories
- **US2**: No strict dependency on US1, but its documentation and test guidance benefit from the reusable-core decisions made there
- **US3**: No strict dependency on US1 or US2, but the trust-boundary documentation is clearer after auth-seam work is complete

### Within Each User Story

- Tests should be updated before or alongside the corresponding seam changes
- Documentation of boundaries before optional adapter expansion
- Infrastructure seam changes before README and manual-example finalization
- Final verification after all boundary and documentation changes are aligned

### Parallel Opportunities

- T001, T002, and T003 can run in parallel
- T005, T006, and T007 can run in parallel after T004 starts
- For US1, T009, T010, T011, and T012 can run in parallel before T013
- For US2, T014, T015, T016, and T017 can run in parallel before T018
- For US3, T019, T020, T021, and T022 can run in parallel before T023
- T024 and T025 can run in parallel before T026

---

## Parallel Example: User Story 1

```bash
Task: "Add or update application-level tests in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Trips/ and /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/Items/"
Task: "Add or update integration coverage in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/ and /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/"
Task: "Document the reusable-core and thin-adapter pattern in /home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/research.md and /home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/contracts/access-boundaries.md"
Task: "Review existing handler seams in /home/sicor/local-repos/maletapp/src/Trip.API/Application/Trips/ and /home/sicor/local-repos/maletapp/src/Trip.API/Application/Items/"
```

## Parallel Example: User Story 2

```bash
Task: "Add or update tests that fail if application handlers depend on HTTP-specific identity details in /home/sicor/local-repos/maletapp/tests/Trip.API.UnitTests/Application/"
Task: "Add or update integration tests for missing current-user context in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/ and /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/"
Task: "Refine HttpUserContextAccessor in /home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/UserContext/HttpUserContextAccessor.cs"
Task: "Add notes to the registration path in /home/sicor/local-repos/maletapp/src/Trip.API/Program.cs"
```

## Parallel Example: User Story 3

```bash
Task: "Add or update integration coverage for unauthorized versus forbidden outcomes in /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Trips/ and /home/sicor/local-repos/maletapp/tests/Trip.API.IntegrationTests/Items/"
Task: "Update manual HTTP examples in /home/sicor/local-repos/maletapp/src/Trip.API/Trip.API.http"
Task: "Document the recommended trust boundaries in /home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/quickstart.md and /home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/contracts/access-boundaries.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Verify the reusable-core direction and current-user seam independently
5. Commit the completed task work before moving to later stories

### Incremental Delivery

1. Complete Setup and Foundational work once
2. Deliver US1 as the MVP documentation and seam-hardening increment
3. Deliver US2 to lock auth concerns at the edges
4. Deliver US3 to make trust boundaries explicit in docs, examples, and tests
5. Finish with cross-cutting verification and cleanup

### Parallel Team Strategy

1. One engineer can prepare the feature docs while another tightens current-user seam tests during Phase 2
2. After Phase 2, one engineer can drive reusable-core documentation while another validates auth-boundary tests
3. The README, quickstart, and contract-boundary documents can be finalized after the seam and trust-model changes settle

---

## Notes

- Every task follows the required checklist format with an ID, optional parallel marker, required story label for story work, and exact file paths
- Tests are included because the current-user seam and HTTP access behavior are executable architectural boundaries, not documentation-only opinions
- US1 is the suggested MVP scope
- Adapter runtime projects such as a BFF, gateway, MCP server, or function-calling host are intentionally not mandatory in this task list; they should be added as separate feature work when a concrete consumer exists
