# Maletapp Constitution

## Core Principles

### I. Contract-First Delivery
All externally visible behavior for Items and Trips starts from the domain contract files in `spec/item.yml` and `spec/trip.yml` and their corresponding feature specifications and plans. Implementation must match the contract, and contract changes must be documented in the related specification work in the same session.

### II. Domain Separation
Items and Trips are separate sub-APIs. Cross-domain dependencies, shared persistence models, or endpoint behavior that couples the domains are not allowed unless this constitution is amended first.

### III. Repository and Persistence Discipline
Application code must depend on repository abstractions rather than direct persistence calls. Persistence implementations must use Entity Framework, with an in-memory provider acceptable for the current stage until a persistent store is intentionally introduced. Domain behavior remains isolated from infrastructure concerns.

### IV. Testable by Default
Every feature must include automated unit tests for domain and application rules and integration tests for API behavior, contract conformance, and persistence wiring. New work is not complete unless both test layers cover the primary flow and relevant failure paths.

### V. Operational Consistency
Minimal API endpoints must propagate cancellation, return structured problem details for failures, and avoid leaking unhandled exceptions. Build, test, and formatting checks are required quality gates, and new warnings are treated as failures.

## Delivery Constraints

- Use C# on .NET 10 with nullable reference types enabled.
- Public endpoint names must match the relevant OpenAPI `operationId` values exactly.
- Use typed domain exceptions and structured logging; do not use `Console.WriteLine`.
- Do not introduce production dependencies in project files without explicit user approval.
- Authentication flow design is outside the current trip bootstrap scope, but request handling may rely on a current-user accessor abstraction.

## Workflow and Quality Gates

- One `speckit.tasks` task per session; avoid unrelated scope.
- Before implementation or commit readiness, `dotnet build --no-incremental`, `dotnet test --no-build`, and `dotnet format --verify-no-changes` must pass with zero new warnings.
- Planning artifacts must resolve major architectural questions before implementation tasks are generated.
- Repository changes must preserve clean separation between domain, application, infrastructure, and API concerns where those layers exist.

## Governance

This constitution supersedes conflicting local habits for this repository. Amendments must be reflected in this file before implementation relies on them. Every plan and review must explicitly check compliance with these principles and document any justified exception.

**Version**: 1.0.0 | **Ratified**: 2026-03-14 | **Last Amended**: 2026-03-14
