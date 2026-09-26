# Research: Trip API Bootstrap

## Decision 1: Use repository abstractions backed by Entity Framework

- Decision: Introduce repository interfaces for trip persistence and implement them with Entity Framework in infrastructure code.
- Rationale: This satisfies the requested repository pattern, keeps API/application code independent from persistence details, and preserves the option to replace the in-memory store later without reshaping endpoint behavior.
- Alternatives considered: Direct `DbContext` usage from endpoints was rejected because it couples API handlers to storage concerns. A custom in-memory collection repository was rejected because you explicitly requested Entity Framework, and it would not exercise the intended persistence wiring.

## Decision 2: Use EF Core InMemory as the storage provider for the current phase

- Decision: Configure Entity Framework to use the in-memory provider for local execution and automated tests in this feature phase.
- Rationale: It meets the requested short-term storage approach, keeps setup friction low, and supports fast integration tests for the three trip endpoints.
- Alternatives considered: SQLite in-memory was rejected because the requirement is specifically to start with an in-memory database using Entity Framework and not add extra persistence behavior yet. A durable relational database was rejected because it exceeds the current scope.

## Decision 3: Keep authentication out of scope and use a current-user accessor abstraction

- Decision: Model the current user as an accessor abstraction consumed by endpoints and application services, with integration tests supplying deterministic identities.
- Rationale: The spec explicitly says the auth flow is not defined yet, but ownership and filtering behavior still depend on a current user. An accessor abstraction lets the feature proceed without hard-coding an auth mechanism.
- Alternatives considered: Implementing bearer-token authentication was rejected because it would expand scope into undefined security flows. Using a global static test user was rejected because it would hide ownership behavior and make tests less representative.

## Decision 4: Test at two levels

- Decision: Add unit tests for trip creation rules and ownership-oriented application behavior, plus integration tests covering the HTTP contract for create, list, and detail flows.
- Rationale: The constitution requires both unit and integration tests, and the split gives faster feedback for domain rules while still validating endpoint wiring, serialization, problem responses, and persistence behavior.
- Alternatives considered: Integration tests only were rejected because domain validation and repository interactions would be slower to isolate. Unit tests only were rejected because they would not verify the externally visible API behavior.

## Decision 5: Keep the implementation inside the existing API project

- Decision: Implement the application, infrastructure, and endpoint folders inside `src/Trip.API` instead of creating multiple production projects in this phase.
- Rationale: The repository is currently a single API project. Preserving that shape minimizes churn while still allowing clean layering through folders and abstractions.
- Alternatives considered: Splitting into multiple production projects now was rejected because it adds structural overhead before the feature surface justifies it.
