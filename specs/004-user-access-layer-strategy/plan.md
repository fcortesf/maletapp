# Implementation Plan: User Access Layer Strategy

**Branch**: `004-user-access-layer-strategy` | **Date**: 2026-03-16 | **Spec**: [spec.md](/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/spec.md)
**Input**: Feature specification from `/specs/004-user-access-layer-strategy/spec.md`

## Summary

Define and incrementally implement a user/access-layer architecture that keeps Maletapp's trip and item business capabilities reusable across frontend, MCP, and LLM function-calling consumers. The plan preserves the current repository's core direction by keeping authentication concerns at trusted edges, maintaining authorization in business terms through the current-user abstraction, treating the current HTTP API as private-by-default, and evolving the application layer toward a clearer reusable capability surface for future adapters.

## Technical Context

**Language/Version**: C# with .NET 10 (`net10.0`)  
**Primary Dependencies**: ASP.NET Core Minimal API, Entity Framework Core, EF Core InMemory provider, OpenAPI/Swagger tooling  
**Storage**: Entity Framework in-memory database for the current phase  
**Testing**: .NET test runner with unit tests for domain/application behavior and integration tests for HTTP endpoint behavior, ownership rules, and persistence wiring  
**Target Platform**: Linux-hosted ASP.NET Core web service with future adapter consumers  
**Project Type**: Web service evolving toward a reusable domain/application core with multiple possible adapters  
**Performance Goals**: Preserve current lightweight request handling while enabling future consumer adapters without duplicating core business rules  
**Constraints**: Preserve Items/Trips contract separation, avoid coupling domain/application code to a specific auth provider, keep authorization in `UserId` and ownership terms, maintain replaceable current-user access seams, preserve local testability, and keep warnings at zero  
**Scale/Scope**: Cross-cutting architectural work touching documentation, user-context seams, API exposure decisions, and optional adapter preparation rather than one new endpoint slice

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `Contract-First Delivery`: Pass. The plan is driven by [spec.md](/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/spec.md) and does not change the current Trips or Items contracts in this phase.
- `Domain Separation`: Pass. The plan preserves Items and Trips as separate sub-APIs at the contract surface and treats the access-layer decision as a cross-cutting architectural concern rather than new cross-domain behavior.
- `Repository and Persistence Discipline`: Pass. The plan does not bypass repository boundaries and keeps authentication concerns out of persistence and domain layers.
- `Testable by Default`: Pass. The plan includes verification of current-user seams, HTTP behavior, and adapter-facing boundaries where implementation work is introduced.
- `Operational Consistency`: Pass. The target design keeps Minimal API handlers, typed failures, structured logging, explicit trust boundaries, and current-user authorization behavior aligned with the repository conventions.

Post-design re-check: Pass. The selected direction keeps the existing domain/application/infrastructure separation intact and does not require constitutional exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/004-user-access-layer-strategy/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
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
    │   ├── Items/
    │   └── Trips/
    ├── Infrastructure/
    │   ├── Persistence/
    │   ├── Repositories/
    │   └── UserContext/
    └── Api/
        ├── Items/
        └── Trips/

tests/
├── Trip.API.UnitTests/
└── Trip.API.IntegrationTests/
```

**Structure Decision**: Keep the single deployable API project as the current implementation host while formalizing its role as a private-by-default domain-oriented adapter. Avoid introducing new runtime projects until a public edge, MCP adapter, or LLM tool adapter is actually needed. Use the existing `Application`, `Infrastructure/UserContext`, and `Api` seams as the primary places to harden the access model.

## Implementation Phases

### Phase 0 - Architectural Documentation and Trust Model

Document the target architecture, trust boundaries, and rollout strategy so future implementation work follows one clear direction.

- Confirm and document that the current API is private-by-default in the target state.
- Document that authentication is validated at edge adapters, not in domain entities or application handlers.
- Document how validated external identity is translated into internal `UserId`.
- Document where consumer-specific contracts belong and when a BFF or gateway becomes justified.

### Phase 1 - Stabilize the Current-User Seam

Harden the existing `IUserContextAccessor` seam so the application layer remains reusable and independent from HTTP-specific identity mechanisms.

- Review the current `IUserContextAccessor` and `HttpUserContextAccessor` contracts.
- Decide whether the seam stays as `UserId`-only or evolves to a richer internal principal abstraction.
- Keep test and development identity injection available without letting it become the production trust model.
- Ensure application handlers continue to depend only on the abstraction rather than raw `HttpContext`, headers, or claims.

### Phase 2 - Clarify API Exposure and Internal Trust Assumptions

Define how the current HTTP service is exposed operationally and what requests it is allowed to trust.

- Mark development-only identity header behavior as non-production.
- Decide whether the current Minimal API remains internal-only immediately or temporarily serves dual roles.
- Define the trusted caller model for any internal identity propagation into the service.
- Ensure direct public access cannot rely on caller-controlled user identity.

### Phase 3 - Prepare for Adapter Reuse

Make the application layer a clearer reusable capability surface so future frontend, MCP, and LLM adapters do not need to depend on transport-specific API shapes.

- Review existing handlers as reusable use-case entry points.
- Identify any HTTP-specific assumptions that should be moved out of shared business paths.
- Document a thin-adapter pattern for future MCP and function-calling layers.
- Keep Trips and Items contracts stable in the core while allowing external consumer contracts to diverge outside the core.

### Phase 4 - Add Public Edge or Consumer Adapters Only When Needed

Introduce a BFF, gateway, MCP adapter, or tool layer only when a real consumer requires it.

- Add a frontend-facing edge if UI-oriented aggregation or public auth becomes necessary.
- Add an MCP adapter when agent workflows need tool-oriented access to the same core use cases.
- Add LLM function-calling tools with narrower action-oriented schemas where safety or ergonomics differ from raw REST contracts.
- Keep each adapter responsible for auth validation and identity translation before invoking the core.

### Phase 5 - Verification and Operational Hardening

Verify the trust model, adapter seam, and documentation remain aligned as implementation evolves.

- Add or update tests around current-user resolution and unauthorized/forbidden flows when seam changes are introduced.
- Verify current ownership enforcement remains in application/business paths.
- Validate that no domain or application code has become coupled to one auth provider or public consumer type.
- Keep verification gates green with build, tests, and format checks.

## Design Decisions

### Decision 1 - Private Core by Default

The current API should be treated as an internal or private domain-facing surface unless a later explicit decision promotes some part of it to public use.

### Decision 2 - Authentication at the Edge

Authentication belongs in trusted edge adapters or gateways. The core should receive trusted current-user context, not raw external credentials.

### Decision 3 - Authorization in Business Terms

Ownership and access checks stay in the application layer and continue to use business concepts such as `UserId`, trip ownership, and item ownership.

### Decision 4 - Consumer-Specific Contracts Outside the Core

Frontend aggregations, MCP tool shapes, and LLM function-calling schemas should live in adapter layers unless they become genuine domain contracts.

### Decision 5 - Incremental Evolution Over Rewrite

The plan intentionally evolves the existing repository seams instead of introducing a full service split immediately.

## Implementation Strategy

### Recommended Delivery Order

1. Complete documentation and trust-boundary decisions.
2. Harden the current-user seam and mark development identity injection as non-production.
3. Clarify internal/private API exposure assumptions.
4. Prepare the application layer for adapter reuse.
5. Add a public edge, BFF, MCP adapter, or tool layer only when an actual consumer requires it.

### MVP Interpretation

For this feature, the MVP is not a new runtime component. The MVP is a documented and enforced architectural direction:

- private-by-default core API
- edge-auth model
- stable internal current-user seam
- application-layer authorization in business terms

### Incremental Delivery

- The first increment is documentation and seam hardening only.
- The second increment is operational trust-boundary clarification.
- The third increment is adapter readiness.
- Later increments add concrete adapters based on actual product demand.

## Verification Strategy

- Unit tests should continue to validate ownership behavior through application handlers independent of HTTP auth details.
- Integration tests should continue to validate unauthorized and forbidden HTTP outcomes through the current user-context seam.
- Any future adapter should have tests proving it authenticates external callers and translates identity before invoking the core.
- The repository verification commands remain required:
  - `dotnet build --no-incremental`
  - `dotnet test --no-build`
  - `dotnet format --verify-no-changes`

## Risks and Mitigations

### Risk: The private/public boundary stays ambiguous

**Mitigation**: Document the target trust model early and avoid calling development identity headers a production contract.

### Risk: Consumer-specific needs leak into the core API

**Mitigation**: Keep tool schemas and UI-shaped responses in adapters unless they represent true shared business contracts.

### Risk: The current-user seam becomes too narrow or too provider-specific

**Mitigation**: Evolve the abstraction only when concrete use cases require it, and keep the application layer independent from external provider types.

### Risk: Premature infrastructure expansion

**Mitigation**: Delay new runtime projects such as a BFF or dedicated gateway until an external consumer justifies the added complexity.

## Complexity Tracking

No constitutional violations or justified exceptions are required for this plan.
