# Implementation Plan: Item Check Counter

**Branch**: `003-item-check-counter` | **Date**: 2026-03-16 | **Spec**: [spec.md](/home/sicor/local-repos/maletapp/specs/003-item-check-counter/spec.md)
**Input**: Feature specification from `/specs/003-item-check-counter/spec.md`

## Summary

Implement the item packing-check workflow so an owned item can be marked as packed repeatedly through the existing item contract. The implementation will add the `checkItem` API slice to the current Minimal API service, increment the item's cumulative `checkCount` without changing other item fields, preserve trip-based ownership checks through the current-user accessor and repository boundary, and add unit plus integration coverage for successful and failing check flows as well as check count visibility in existing item retrieval endpoints.

## Technical Context

**Language/Version**: C# with .NET 10 (`net10.0`)  
**Primary Dependencies**: ASP.NET Core Minimal API, Entity Framework Core, EF Core InMemory provider, OpenAPI/Swagger tooling  
**Storage**: Entity Framework in-memory database for the current phase, persisting trips with owned baggages and items including `checkCount`  
**Testing**: .NET test runner with unit tests for domain and application behavior plus integration tests for HTTP endpoint behavior, ownership rules, and persistence wiring  
**Target Platform**: Linux-hosted ASP.NET Core web service  
**Project Type**: Web service  
**Performance Goals**: Support local development and automated verification of item check flows with immediate visible count updates in item retrieval responses  
**Constraints**: Preserve Items/Trips contract separation, keep repository abstractions between application and persistence, propagate `CancellationToken` from endpoint to handler and repository, use typed exceptions and structured logging, keep public endpoint handler names equal to OpenAPI `operationId` values, preserve existing item fields during check actions, and keep warnings at zero  
**Scale/Scope**: 1 new item endpoint (`POST /items/{itemId}/check-item`), updates to existing item retrieval outputs to keep `checkCount` visible, 1 owned item aggregate behavior change, and matching unit plus integration test coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `Contract-First Delivery`: Pass. The plan is derived from [spec.md](/home/sicor/local-repos/maletapp/specs/003-item-check-counter/spec.md) and aligns with the existing `checkItem` contract already defined in [item.yml](/home/sicor/local-repos/maletapp/spec/item.yml).
- `Domain Separation`: Pass. The feature stays inside the Items contract surface while continuing to use trip ownership as the allowed containment boundary defined by the constitution.
- `Repository and Persistence Discipline`: Pass. The implementation will extend the existing repository-based item access path and will not allow endpoint or handler code to bypass persistence abstractions.
- `Testable by Default`: Pass. The plan includes unit tests for check-count domain and application rules plus integration tests for the `checkItem` endpoint and related retrieval behavior.
- `Operational Consistency`: Pass. The design keeps Minimal API handlers, explicit cancellation propagation, structured problem details through typed failures, and zero-warning verification gates.

Post-design re-check: Pass. The research, data model, contract summary, and quickstart keep the feature within the existing item contract, trip-ownership boundary, repository discipline, and dual-layer test expectations.

## Project Structure

### Documentation (this feature)

```text
specs/003-item-check-counter/
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

**Structure Decision**: Keep the single deployable API project under `src/Trip.API` and add the check-item behavior inside the existing `Domain`, `Application/Items`, `Api/Items`, and persistence layers. Keep unit and integration coverage in the existing split test projects under `tests/` so domain increment rules, ownership behavior, and HTTP contract conformance remain independently testable.

## Complexity Tracking

No constitutional violations or justified exceptions are required for this plan.
