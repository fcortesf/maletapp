# Feature Specification: User Access Layer Strategy

**Feature Branch**: `004-user-access-layer-strategy`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Analyze the purpose, and give me an strategy to implement the user layer. I want to use this API as a domain API and then using it to create => MCP server, Function Calling tool for LLMs and frontend. Maybe the API could stay pure and private with auth only on the edges... but i don't know what i want rigth now. So please, give me different options with pros and cons"

## Problem Statement

Maletapp currently exposes a Trips sub-API and an Items sub-API through a single ASP.NET Core Minimal API service. The service already relies on a current-user abstraction to enforce ownership rules, but it intentionally does not define a concrete authentication mechanism yet.

The product direction is broader than a single frontend client. The same business capabilities may later be consumed by:

- a browser or mobile frontend
- an MCP server
- LLM function-calling tools
- internal backend workflows

Without an explicit strategy, the repository risks coupling the core API to one consumer style or one authentication mechanism too early. That would reduce reuse, make trust boundaries unclear, and force future adapters to work around transport-specific or provider-specific decisions embedded in the domain-facing API.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reuse core business capabilities across consumers (Priority: P1)

As a product developer, I want the trip and item capabilities to remain reusable across frontend, MCP, and LLM tool integrations so I can add new consumers without redesigning the business core each time.

**Why this priority**: Reuse is the primary reason for making the user/access-layer decision now. If the wrong boundary is chosen, every future integration becomes more expensive.

**Independent Test**: Can be validated by confirming that the selected architecture allows at least two distinct consumer adapters to invoke the same core trip/item use cases without duplicating business rules or binding the core to a specific auth provider.

**Acceptance Scenarios**:

1. **Given** the same trip and item capabilities must serve both a frontend and an MCP consumer, **When** the architecture is applied, **Then** both consumers can use the same core business rules through stable internal interfaces.
2. **Given** a future LLM function-calling adapter is added, **When** it is integrated, **Then** it can authenticate and map identity without requiring provider-specific logic inside domain entities.

---

### User Story 2 - Keep authentication concerns outside the business core when possible (Priority: P1)

As a system architect, I want authentication mechanisms to be isolated from the core trip/item behavior so I can change identity providers or edge protocols without rewriting domain or application rules.

**Why this priority**: The repository already assumes that authentication flow is out of scope. Preserving that flexibility avoids unnecessary coupling and supports multiple edge types.

**Independent Test**: Can be validated by confirming that replacing the public-facing auth mechanism does not require changes to trip/item entities or ownership logic in application handlers.

**Acceptance Scenarios**:

1. **Given** one edge uses bearer tokens and another edge uses a different session model, **When** both provide a trusted current user, **Then** the core business logic behaves the same way.
2. **Given** the identity provider changes in the future, **When** the edge authentication implementation is updated, **Then** the core trip/item rules remain unchanged.

---

### User Story 3 - Define explicit trust and authorization boundaries (Priority: P2)

As a platform maintainer, I want a clear definition of where identity is validated, where it is translated into `UserId`, and where authorization is enforced so the system does not accidentally trust unvalidated callers.

**Why this priority**: A reusable architecture fails if the trust model is implicit. The current local development header is acceptable for testing but not as a production trust boundary.

**Independent Test**: Can be validated by reviewing the target architecture and confirming each request path has a defined answer for public exposure, identity validation, identity translation, and ownership enforcement.

**Acceptance Scenarios**:

1. **Given** an external request enters the system, **When** it reaches business handlers, **Then** identity validation has already happened in a defined boundary or trusted adapter.
2. **Given** a private internal API is called directly, **When** it receives a user context, **Then** the caller is a trusted internal system rather than an arbitrary public client.

### Edge Cases

- A public client can reach the domain API directly without going through the intended edge adapter.
- Different consumers need different request/response shapes for the same underlying use case.
- The frontend eventually needs aggregated responses that do not match the domain resource model.
- An MCP or LLM tool requires action-oriented commands that are less suitable as raw REST resources.
- The identity provider changes after consumer integrations have already been built.
- The system later needs stronger access rules than simple ownership, such as role-based admin access or shared trips.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define whether the current HTTP API is public, private, or internal-only in the recommended target architecture.
- **FR-002**: The system MUST define where external identity is authenticated for each supported consumer type, including frontend, MCP, and LLM tool integrations.
- **FR-003**: The system MUST define where authenticated identity is translated into the internal `UserId` used by the application layer.
- **FR-004**: The system MUST preserve authorization decisions in business terms such as current user, ownership, and access rules rather than identity-provider-specific claims.
- **FR-005**: The system MUST keep the domain and application layers independent from any specific authentication provider or token format.
- **FR-006**: The system MUST allow the same core trip/item behavior to be reused by multiple consumers without duplicating ownership rules.
- **FR-007**: The system MUST define whether consumer-specific contracts belong in the core API, in adapters, or in a dedicated BFF or gateway layer.
- **FR-008**: The system MUST explicitly describe the trust boundary for any identity header, claim, or context object passed into the core service.
- **FR-009**: The system MUST evaluate at least these architectural options: private core API with edge auth, auth inside the current API, BFF/gateway in front of a private core API, and application-layer-first adapters.
- **FR-010**: The system MUST recommend one target architecture and explain why it is preferred over the alternatives for the current repository stage.
- **FR-011**: The system MUST include a phased implementation strategy that can evolve from the current codebase without requiring an immediate large-scale rewrite.
- **FR-012**: The system MUST preserve the constitutional separation that Items and Trips remain separate sub-APIs at the contract surface.

### Architectural Constraints

- **AC-001**: The domain layer MUST NOT depend on HTTP-specific auth mechanisms, bearer token parsing, cookie/session infrastructure, or identity-provider SDKs.
- **AC-002**: The application layer MUST continue to express access control in terms of `UserId` and business authorization rules.
- **AC-003**: The current-user abstraction MAY evolve, but it MUST remain replaceable by different adapters and test doubles.
- **AC-004**: Any public consumer-specific contract that differs from the current domain API SHOULD live outside the core contract unless there is strong justification to merge it.
- **AC-005**: The target design MUST support future MCP and function-calling adapters without requiring the core business rules to become tool-specific.
- **AC-006**: The target design MUST allow the current local testing approach to remain available for development while not treating a raw user-id header as a production-facing trust mechanism.

### Key Entities *(include if feature involves data)*

- **Current User Context**: The internal representation of the authenticated caller that the application layer uses to evaluate ownership and access rules.
- **Trusted Edge Adapter**: A public-facing or integration-facing component that authenticates an external caller and passes trusted identity into the internal core.
- **Core Domain/API Layer**: The reusable trip and item business capabilities that should remain stable across multiple consumers.
- **Consumer-Specific Contract**: A request/response or tool schema optimized for one consumer such as a frontend, MCP server, or LLM function-calling interface.

## Options Analysis *(mandatory)*

### Option 1 - Keep the current API pure/private and put authentication only at the edges

Expose the current service as a private domain-oriented API or internal capability surface. Public consumers authenticate at edge adapters, which then pass trusted current-user context to the private core.

**Pros**:

- Preserves the current architecture direction already present in the repository.
- Maximizes reuse across frontend, MCP, and LLM tool adapters.
- Avoids coupling core trip/item behavior to one auth provider or one public API style.
- Keeps authentication evolution localized to edge components.

**Cons**:

- Requires a clear internal trust boundary and deployment discipline.
- Adds at least one more component between public consumers and the core.
- Can spread consumer-shaping logic across multiple adapters if not governed well.

### Option 2 - Add authentication directly inside the current API

Make the existing Minimal API both the public product API and the place where authentication is validated.

**Pros**:

- Fastest path for an MVP with a single client.
- Fewer moving parts at deployment time.
- Simplifies direct frontend consumption in the short term.

**Cons**:

- Couples the core API to transport and auth concerns sooner than necessary.
- Makes future MCP and function-calling consumers more likely to inherit web-specific assumptions.
- Increases the risk that business-layer changes become entangled with identity-provider changes.

### Option 3 - Introduce a BFF or gateway for external consumers while keeping the core API private

Place a dedicated public-facing layer in front of the core API. The BFF or gateway handles authentication, exposure rules, and consumer-specific shaping. The current API remains internal.

**Pros**:

- Strong separation between public-facing concerns and reusable business capabilities.
- Gives the frontend a place for aggregation and UI-oriented responses.
- Provides a natural place for external rate limits, auth policies, and contract shaping.

**Cons**:

- More infrastructure and operational complexity.
- Can be premature if only one consumer exists for a long time.
- Requires careful ownership of which logic belongs in the BFF versus the core.

### Option 4 - Treat the application layer as the true reusable core and make HTTP, MCP, and function-calling thin adapters

Use the application layer as the primary stable capability surface. The existing HTTP API becomes one adapter among several, rather than the only core integration point.

**Pros**:

- Best long-term reuse model for MCP and LLM tools.
- Keeps business use cases independent from one transport contract.
- Makes it easier to add consumer-specific adapters without distorting the REST API.

**Cons**:

- Requires some refactoring and clearer application-service boundaries.
- The existing repository is organized around one deployable HTTP service, so this adds architectural work now.
- Still may need a BFF or public API layer in addition to these adapters.

## Recommended Approach *(mandatory)*

The recommended target architecture is a staged combination of **Option 1** and **Option 4**, with **Option 3** added only when external-consumer requirements justify it.

### Recommendation Summary

- Keep the current trip/item core private by default.
- Preserve authentication at the edges rather than embedding provider-specific auth inside the domain-facing core.
- Treat the application layer as the reusable business capability surface over time.
- Use thin adapters for HTTP, MCP, and function-calling integrations.
- Add a BFF or gateway only when frontend or external-consumer shaping becomes materially different from the core contract.

### Why this is preferred now

- It matches the current codebase, which already uses a current-user abstraction instead of binding business logic to an auth provider.
- It gives the project the most flexibility while product direction is still evolving.
- It supports multiple future consumers without forcing the current core API to become a compromise between UI, agent, and domain needs.
- It avoids prematurely making raw internal identity propagation mechanisms public.

### Target Trust Boundary

- **Public boundary**: frontend-facing endpoints, MCP endpoints, and LLM tool adapters that external or semi-external callers can reach.
- **Identity validation boundary**: the edge adapter or gateway responsible for validating tokens, sessions, or integration credentials.
- **Identity translation boundary**: the adapter layer that maps validated identity into the internal `UserId` or equivalent current-user context.
- **Authorization boundary**: the application layer, which enforces ownership and domain access rules using business concepts.
- **Private boundary**: the current domain-oriented API and application services, which trust only validated internal callers or adapters.

### Contract Placement Decision

- Keep Trips and Items resource contracts in the core API while they remain useful as domain-oriented internal contracts.
- Place consumer-specific contracts outside the core when they are shaped primarily for frontend convenience, MCP ergonomics, or LLM tool safety.
- Do not force tool schemas or UI-optimized aggregation into the core domain contract unless those shapes become true business-level contracts.

## Impact on Existing Layers *(mandatory)*

### Domain

- No direct authentication provider concerns should be introduced.
- Domain entities should continue to model ownership-related rules only in business terms.

### Application

- Keep `UserId`-based ownership checks as the main authorization mechanism for current features.
- Evolve the current-user abstraction carefully if richer principal data is needed later.
- Consider making the application use cases a clearer first-class capability surface for non-HTTP adapters.

### API

- The current Minimal API should be treated as an internal or domain-oriented adapter by default unless a later decision explicitly promotes it to a public API.
- Public consumer adapters should not rely on development-only identity injection mechanisms.

### Infrastructure

- Identity extraction from HTTP should remain replaceable and environment-sensitive.
- Future edge adapters may authenticate through different mechanisms but must converge on the same internal current-user model.

## Acceptance Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The approved architecture identifies one recommended trust model and states which boundaries are public versus private.
- **SC-002**: The approved architecture allows at least two distinct consumer types to reuse the same core trip/item business rules without duplicating ownership logic.
- **SC-003**: Replacing one external authentication mechanism does not require changes to domain entities or provider-specific branching inside application handlers.
- **SC-004**: Consumer-specific contracts for frontend, MCP, or LLM tools can be added without requiring the core Trips and Items contracts to absorb those shapes by default.
- **SC-005**: The phased plan can be executed incrementally from the current repository state without an all-at-once rewrite.

## Non-Goals

- Defining a final production identity provider.
- Choosing a specific JWT, OAuth, session, or third-party auth SDK.
- Designing every future consumer contract in detail.
- Implementing shared-trip or role-based access control in this decision.
- Replacing the current API project structure in one step.

## Migration and Rollout Considerations

### Phase 1 - Stabilize the internal user-context seam

- Keep the current development approach for tests and local execution.
- Clarify in documentation that raw user-id headers are development-only and not a public production contract.
- Ensure the current-user abstraction remains the only identity dependency visible to application handlers.

### Phase 2 - Separate public and private access paths

- Decide whether the current HTTP API is internal-only or temporarily dual-purpose.
- If public exposure is needed, introduce a thin edge adapter or gateway that authenticates callers and forwards trusted identity.

### Phase 3 - Add consumer-specific adapters

- Create an MCP adapter that maps tool calls to core application use cases.
- Create LLM function-calling tools with narrower schemas than the raw core API where safety or ergonomics require it.
- Introduce a frontend BFF only if frontend composition needs diverge from the core resource model.

### Phase 4 - Harden the trust model

- Remove any production reliance on caller-controlled identity headers.
- Standardize trusted identity propagation between adapters and the private core.
- Document operational guarantees around internal-only access and caller trust.

## Assumptions

- The current single-service repository will remain the implementation host for the near term.
- Future consumers will not all want exactly the same contract shape.
- Ownership remains the primary authorization rule for the current product phase.
- Stronger authorization models may be added later but should not drive the initial access-layer strategy.

## Open Questions

- Should the current HTTP API be treated as internal-only immediately, or temporarily exposed while the first public edge is still being built?
- Will the first external consumer be the frontend, an MCP server, or an LLM tool adapter?
- Does the product need a single gateway for all consumers, or will separate thin adapters be easier to evolve at the current stage?
- Is there a near-term need for richer principal data than `UserId`, such as scopes, roles, or tenancy?
