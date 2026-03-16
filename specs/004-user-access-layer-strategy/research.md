# Research: User Access Layer Strategy

## Decision 1: Keep the current API private-by-default and authenticate at trusted edges

- Decision: Treat the existing `Trip.API` HTTP service as a private-by-default domain-oriented adapter rather than the final public product boundary.
- Rationale: The current repository already separates current-user resolution behind an abstraction and keeps ownership checks in application handlers. Preserving that direction keeps the core reusable across frontend, MCP, and LLM tool consumers.
- Alternatives considered: Making the current API public and provider-aware was rejected because it would couple the core to one auth shape too early. Splitting immediately into multiple deployable services was rejected because the current product stage does not justify that complexity yet.

## Decision 2: Keep authentication concerns outside domain and application layers

- Decision: Validate external identity in edge adapters or gateways and pass only trusted internal current-user context into the core.
- Rationale: Domain and application code should continue to reason in terms of `UserId`, ownership, and access rules rather than bearer tokens, cookies, or provider SDKs.
- Alternatives considered: Parsing tokens or provider claims directly in handlers was rejected because it would leak transport and provider concerns into business logic. Treating raw caller-supplied headers as production identity was rejected because it creates an unsafe trust boundary.

## Decision 3: Use the current-user abstraction as the stable identity seam

- Decision: Keep `IUserContextAccessor` or an equivalent internal principal abstraction as the only user-identity dependency visible to application handlers.
- Rationale: This seam already exists in the repository and supports testing, HTTP transport adaptation, and future non-HTTP adapters without changing business code.
- Alternatives considered: Passing `HttpContext` through handlers was rejected because it would make the application layer HTTP-bound. Making handlers depend on external provider models was rejected because it would reduce replaceability and testability.

## Decision 4: Keep authorization in business terms inside the application layer

- Decision: Continue to enforce ownership and access in application handlers and related business paths using `UserId`, trip ownership, and item ownership.
- Rationale: Authorization is part of business behavior here because the product rules are based on who owns trips and items. That logic belongs near the use cases, not only at the edge.
- Alternatives considered: Moving all authorization to the gateway was rejected because the gateway does not own the full business context. Moving authorization into persistence or domain entities directly was rejected because the current application-layer pattern is already clear and testable.

## Decision 5: Keep consumer-specific contracts outside the core by default

- Decision: Place frontend-specific aggregation, MCP tool schemas, and LLM function-calling shapes in adapters unless those shapes become true shared business contracts.
- Rationale: Different consumers will likely need different ergonomics. The core Trips and Items contracts should not become a compromise between UI convenience and tool safety unless there is clear shared domain value.
- Alternatives considered: Reusing the raw core API for every consumer was rejected because it would eventually force consumer concerns into the core. Creating all future adapter contracts now was rejected because there is not enough concrete product demand yet.

## Decision 6: Introduce a BFF or gateway only when a real consumer requires it

- Decision: Defer a dedicated public edge component until the frontend, MCP, or external integrations require public exposure, aggregation, or centralized auth handling.
- Rationale: The repository should avoid premature infrastructure expansion while still planning for that direction.
- Alternatives considered: Adding a BFF immediately was rejected as premature. Refusing to ever add a gateway was rejected because frontend and external-consumer needs may diverge meaningfully from the core contract.

## Decision 7: Prefer incremental seam hardening over a rewrite

- Decision: Start with documentation, trust-boundary clarification, and current-user seam hardening before introducing new runtime projects.
- Rationale: The current codebase already contains the essential architectural seam. The immediate need is to make the trust model explicit and keep future changes aligned with it.
- Alternatives considered: A full application-core extraction into separate libraries may be reasonable later, but it is not required to make the current design direction sound today.
