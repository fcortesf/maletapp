# Implementation Plan: Delete Trip

**Branch**: `005-delete-trip` | **Date**: 2026-03-16 | **Spec**: [spec.md](/home/sicor/local-repos/maletapp/specs/005-delete-trip/spec.md)
**Input**: Feature specification from `/specs/005-delete-trip/spec.md`

## Summary

Implement trip deletion so the current user can remove one owned trip through the existing Trips contract and have all trip-contained baggages and items removed with it. The implementation will add the `deleteTrip` Minimal API slice, enforce current-user ownership before deletion, extend the repository boundary for aggregate removal, and add unit plus integration coverage for successful deletion and unauthorized, forbidden, and missing-trip failures.

## Technical Context

**Language/Version**: C# with .NET 10 (`net10.0`)  
**Primary Dependencies**: ASP.NET Core Minimal API, Entity Framework Core, EF Core InMemory provider, OpenAPI/Swagger tooling  
**Storage**: Entity Framework in-memory database for the current phase, persisting trips with owned baggages and items  
**Testing**: .NET test runner with unit tests for application behavior plus integration tests for HTTP endpoint behavior, ownership rules, and persistence effects; baggage removal is verified indirectly through aggregate deletion because no baggage API contract exists  
**Target Platform**: Linux-hosted ASP.NET Core web service  
**Project Type**: Web service  
**Performance Goals**: Support local development and automated verification of trip deletion with immediate removal from subsequent trip and item retrieval flows  
**Constraints**: Preserve the existing `spec/trip.yml` contract outcomes, keep repository abstractions between application and persistence, propagate `CancellationToken` from endpoint to handler and repository, use typed exceptions and structured logging, keep public endpoint handler names equal to OpenAPI `operationId` values, remove only the targeted trip aggregate, and keep warnings at zero  
**Scale/Scope**: 1 new trip endpoint (`DELETE /trips/{tripId}`), 1 trip deletion handler flow, repository and persistence support for aggregate removal, and matching unit plus integration coverage for success and failure paths

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `Contract-First Delivery`: Pass. The plan is derived from [spec.md](/home/sicor/local-repos/maletapp/specs/005-delete-trip/spec.md) and stays aligned with the existing delete-trip contract already present in [trip.yml](/home/sicor/local-repos/maletapp/spec/trip.yml).
- `Domain Separation`: Pass. The feature stays within the Trips API surface and only removes baggages and items as contained trip-owned data already allowed by the constitution's ownership boundary.
- `Repository and Persistence Discipline`: Pass. The implementation will extend the existing repository abstraction for trip deletion and will not bypass persistence from endpoint or handler code.
- `Testable by Default`: Pass. The plan includes application-level unit tests and HTTP-level integration tests for successful deletion plus unauthorized, forbidden, and missing-trip outcomes.
- `Operational Consistency`: Pass. The design keeps Minimal API handlers, explicit cancellation propagation, structured problem details through typed failures, and zero-warning verification gates.

Post-design re-check: Pass. The research, data model, contract summary, and quickstart keep the feature inside the existing trip contract, preserve the aggregate ownership boundary for cascading trip data removal, maintain repository discipline, and require both unit and integration coverage.

## Project Structure

### Documentation (this feature)

```text
specs/005-delete-trip/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── trips.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
└── Trip.API/
    ├── Domain/
    │   ├── Entities/
    │   └── ValueObjects/
    ├── Application/
    │   ├── Abstractions/
    │   ├── Dtos/
    │   ├── Exceptions/
    │   ├── Items/
    │   └── Trips/
    ├── Infrastructure/
    │   ├── Persistence/
    │   │   └── Configurations/
    │   ├── Repositories/
    │   └── UserContext/
    └── Api/
        ├── ErrorHandling/
        ├── Items/
        └── Trips/

tests/
├── Trip.API.UnitTests/
│   └── Application/
└── Trip.API.IntegrationTests/
    ├── Infrastructure/
    └── Trips/
```

**Structure Decision**: Keep the single deployable API project under `src/Trip.API` and add the delete-trip behavior inside the existing `Application/Trips`, `Api/Trips`, repository, and persistence layers. Keep primary delete-route integration coverage in `tests/Trip.API.IntegrationTests/Trips`, extend `tests/Trip.API.IntegrationTests/Items` for cross-endpoint validation that deleted trip items are no longer retrievable, treat baggage removal as an aggregate-deletion persistence concern verified indirectly because no baggage API surface exists, and keep application-level unit coverage in `tests/Trip.API.UnitTests/Application` for ownership and missing-trip decision logic.

## Complexity Tracking

No constitutional violations or justified exceptions are required for this plan.
