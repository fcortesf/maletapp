# Implementation Plan: Trip Item Access

**Branch**: `002-trip-items-api` | **Date**: 2026-03-15 | **Spec**: [spec.md](/home/sicor/local-repos/maletapp/specs/002-trip-items-api/spec.md)
**Input**: Feature specification from `/specs/002-trip-items-api/spec.md`

## Summary

Implement the Items API slice for listing all items in an owned trip, creating an item directly under an owned trip, retrieving a single owned item, and partially updating a single owned item. The implementation will extend the existing Minimal API and repository-based Trip API structure, preserve trip-based ownership checks through the current-user accessor, align endpoint names with the OpenAPI `operationId` values, persist trip, baggage, and item data through Entity Framework with the in-memory provider, and add both unit and integration coverage for item behaviors and access control.

## Technical Context

**Language/Version**: C# with .NET 10 (`net10.0`)  
**Primary Dependencies**: ASP.NET Core Minimal API, Entity Framework Core, EF Core InMemory provider, OpenAPI/Swagger tooling  
**Storage**: Entity Framework in-memory database for the current phase, expanded to persist trips with related baggages and items  
**Testing**: .NET test runner with unit tests for domain/application behavior and integration tests for HTTP endpoints, ownership rules, and persistence wiring  
**Target Platform**: Linux-hosted ASP.NET Core web service  
**Project Type**: Web service  
**Performance Goals**: Support local development, automated test execution, and manual verification of item list, create, retrieve, and patch flows with no perceptible latency  
**Constraints**: Preserve Items/Trips contract separation, use repository abstractions rather than direct persistence calls, enforce ownership before all supported item operations, propagate `CancellationToken` from endpoints through handlers and repositories, use structured logging and typed exceptions, keep public endpoint handler names equal to the OpenAPI `operationId` values, and keep warnings at zero  
**Scale/Scope**: Initial Items API slice with 4 endpoints, 1 existing trip aggregate extended for baggages/items, request-scoped ownership checks, and no deletion or check-item behavior in this phase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `Contract-First Delivery`: Pass. The plan is derived from [spec.md](/home/sicor/local-repos/maletapp/specs/002-trip-items-api/spec.md) and remains aligned with [item.yml](/home/sicor/local-repos/maletapp/spec/item.yml).
- `Domain Separation`: Pass. The implementation stays within the existing API boundary and does not introduce cross-sub-API behavior beyond trip ownership used to authorize item access.
- `Repository and Persistence Discipline`: Pass. The design extends repository abstractions and Entity Framework persistence rather than using direct endpoint-to-database access.
- `Testable by Default`: Pass. The plan includes unit tests for item domain and application rules plus integration tests for all 4 endpoints and failure paths.
- `Operational Consistency`: Pass. The design keeps Minimal API handlers, explicit `CancellationToken` propagation, structured logging, typed failures, and problem-details-friendly exception handling.

Post-design re-check: Pass. The generated research, data model, contracts, and quickstart artifacts preserve repository boundaries, contract-first behavior, endpoint naming rules, and dual-layer testing expectations.

## Project Structure

### Documentation (this feature)

```text
specs/002-trip-items-api/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── items.md
└── tasks.md
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
│   ├── Application/
│   └── Domain/
└── Trip.API.IntegrationTests/
    ├── Infrastructure/
    └── Items/
```

**Structure Decision**: Keep a single deployable API project and add item-specific application and endpoint folders inside `src/Trip.API`, while extending the existing domain and persistence layers for baggages and items. Keep separate unit and integration test projects under `tests/` so item rules, ownership behavior, and HTTP contract conformance can evolve independently.

## Complexity Tracking

No constitutional violations or justified exceptions are required for this plan.
