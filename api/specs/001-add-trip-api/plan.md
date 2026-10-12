# Implementation Plan: Trip API Bootstrap

**Branch**: `001-add-trip-api` | **Date**: 2026-03-14 | **Spec**: [spec.md](/home/sicor/local-repos/maletapp/api/specs/001-add-trip-api/spec.md)
**Input**: Feature specification from `/specs/001-add-trip-api/spec.md`

## Summary

Implement the first Trips API slice for creating trips, listing the current user's trips, and retrieving a trip by identifier. The implementation will use Minimal API endpoints over a repository-based application structure, Entity Framework with an in-memory database provider for this phase, a current-user accessor abstraction for ownership, explicit `CancellationToken` propagation across endpoints, handlers, and repositories, structured logging for trip operations and failures, and both unit and integration tests.

## Technical Context

**Language/Version**: C# with .NET 10 (`net10.0`)  
**Primary Dependencies**: ASP.NET Core Minimal API, Entity Framework Core, EF Core InMemory provider, OpenAPI/Swagger tooling  
**Storage**: Entity Framework in-memory database for the current phase  
**Testing**: .NET test runner with unit tests for domain/application behavior and integration tests for HTTP endpoints and persistence wiring  
**Target Platform**: Linux-hosted ASP.NET Core web service  
**Project Type**: Web service  
**Performance Goals**: Support local development and automated test execution for the trip bootstrap flows with no perceptible latency in manual verification  
**Constraints**: Preserve trip/item domain separation, use repository abstractions, rely on current-user accessor instead of implementing authentication flow, propagate `CancellationToken` from Minimal API endpoints through handlers and repositories, use structured logging instead of console output, and keep warnings at zero  
**Scale/Scope**: Initial MVP for one sub-API with 3 trip endpoints, one aggregate root, and isolated ownership rules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `Contract-First Delivery`: Pass. The plan is derived from [spec.md](/home/sicor/local-repos/maletapp/api/specs/001-add-trip-api/spec.md) and remains aligned with [trip.yml](/home/sicor/local-repos/maletapp/api/spec/trip.yml).
- `Domain Separation`: Pass. This phase touches only Trips and does not introduce item-domain dependencies.
- `Repository and Persistence Discipline`: Pass. The design uses repository abstractions with Entity Framework and an in-memory provider.
- `Testable by Default`: Pass. The plan includes both unit and integration test suites.
- `Operational Consistency`: Pass. The design uses Minimal API behavior, explicit `CancellationToken` propagation, structured logging, current-user access checks, and problem-details-oriented failures.

Post-design re-check: Pass. The generated research, data model, contracts, and quickstart artifacts do not introduce constitutional violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-add-trip-api/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
└── Trip.API/
    ├── Domain/
    │   ├── Entities/
    │   └── Value-objects/
    ├── Application/
    │   ├── Abstractions/
    │   ├── Dtos/
    │   └── Trips/
    ├── Infrastructure/
    │   ├── Persistence/
    │   ├── Repositories/
    │   └── UserContext/
    └── Api/
        └── Trips/

tests/
├── Trip.API.UnitTests/
└── Trip.API.IntegrationTests/
```

**Structure Decision**: Keep a single deployable API project and add internal application and infrastructure folders inside `src/Trip.API` to avoid unnecessary project sprawl at this stage. Add separate unit and integration test projects under `tests/` so domain/application behavior and API wiring can evolve independently.

## Complexity Tracking

No constitutional violations or justified exceptions are required for this plan.

## Web PoC contract extension (Trips 0.0.2)

Every Trip response includes read-only isFinished, initially false. Bodyless
POST /trips/{tripId}/finish (finishTrip) and /reopen (reopenTrip) return 200 Trip,
including repeated intent. Both allow empty/incomplete trips independent of dates,
preserve items/dates and retain edit/delete support. No identity returns 401,
foreign ownership 403, missing trip 404. NewTrip cannot set lifecycle state.

## Complete-operation serialization and constitution check

Every trip/item read and write acquires the same singleton application operation
gate before repository access, including ownership and item-to-trip resolution,
through SaveChanges and DTO snapshot; response transport remains outside.
If deletion executes first, queued item/lifecycle work returns typed 404 and
cannot resurrect data. If update executes first, update and deletion succeed
and final reads return 404. Disjoint changes accumulate; same-field changes
are last-executed-wins, with no stale-editor/version/409 or durable rollback
guarantee. Cancellation and exceptions release only successfully acquired leases.
Cross-endpoint deterministic integration coverage lives in
`tests/Trip.API.IntegrationTests/Concurrency/`, using barriers/hooks instead of sleeps;
default baggage uniqueness is observed through item baggageIds.
Constitution 1.1.0: compliant, contract-first; containment-only coupling, repository
and gate abstractions, EF persistence, typed errors and cancellation. No new
production dependency or exception is required.

Required fields are declared on typed NewTrip/Trip object schemas so TypeScript
generation retains required destination/id/isFinished through allOf composition.
