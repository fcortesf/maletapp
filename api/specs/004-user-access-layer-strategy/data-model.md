# Data Model: User Access Layer Strategy

## Current User Context

- Purpose: Represents the internal identity information required by the application layer to evaluate ownership and access rules.
- Fields:
  - `UserId`: Internal user identifier used by trip and item use cases.
- Relationships:
  - One current-user context can own many trips.
  - One current-user context may access items only through owned trips under the current product rules.
- Validation rules:
  - Requests that cannot resolve a current user are unauthorized.
  - The internal current-user model must not depend on external token or provider SDK types.
- State transitions relevant to this feature:
  - `Unresolved`: no trusted identity has been supplied to the core; request fails as unauthorized.
  - `Resolved`: trusted identity has been translated into internal `UserId`; application handlers may evaluate ownership and proceed.

## Trusted Edge Adapter

- Purpose: Represents the public-facing or integration-facing boundary that authenticates external callers before invoking the core.
- Responsibilities:
  - Validate external credentials such as bearer tokens, sessions, or integration secrets.
  - Map validated external identity into internal current-user context.
  - Invoke the private core through trusted internal paths.
- Relationships:
  - One trusted edge adapter can serve one or more consumer types.
  - Multiple edge adapters may reuse the same core business capabilities.
- Validation rules:
  - Must not forward caller-controlled identity without validation.
  - Must not require domain or application code to parse external auth artifacts.

## Core Domain/API Layer

- Purpose: Represents the reusable trip and item business capabilities currently implemented inside `Trip.API`.
- Fields:
  - `Trips API Contract`: Resource-oriented trip operations defined in `spec/trip.yml`.
  - `Items API Contract`: Resource-oriented item operations defined in `spec/item.yml`.
  - `Application Use Cases`: Handler-based business entry points operating on `UserId`, trips, and items.
- Relationships:
  - Receives trusted current-user context from adapters.
  - Enforces authorization using ownership and business rules.
  - Remains reusable across multiple consumer adapters.
- Validation rules:
  - Must preserve separation between Trips and Items at the contract surface.
  - Must remain independent from external auth-provider SDKs and transport-specific identity parsing.

## Consumer-Specific Contract

- Purpose: Represents a contract shaped for one consumer type rather than for the core domain resource model.
- Examples:
  - frontend-friendly aggregated responses
  - MCP tool operations
  - LLM function-calling schemas
- Relationships:
  - Maps to one or more core use cases.
  - Lives in an adapter or BFF unless it becomes a true shared domain contract.
- Validation rules:
  - Must not force the core contract to absorb consumer-specific ergonomics without clear shared business value.

## Trust Boundaries

### Public Boundary

- Purpose: The entry point reachable by external clients such as frontend applications, MCP clients, or LLM tool hosts.
- Allowed concerns:
  - external authentication
  - rate limiting
  - request shaping
  - consumer-specific response composition

### Identity Validation Boundary

- Purpose: The place where external credentials are verified.
- Output:
  - trusted authenticated principal data suitable for translation into internal identity

### Identity Translation Boundary

- Purpose: Converts validated external identity into the internal `UserId`-based current-user context used by the application layer.
- Output:
  - resolved internal current-user context

### Authorization Boundary

- Purpose: Enforces product rules such as trip ownership and item ownership.
- Location:
  - application layer and related business paths

### Private Boundary

- Purpose: The internal surface that trusts only validated internal callers or adapters.
- Allowed concerns:
  - domain resource contracts
  - application use cases
  - repository-backed business behavior

## Request and Flow Model

### External Consumer Request

- Input:
  - request from frontend, MCP client, or LLM tool host
  - external credentials appropriate to that consumer
- Validation rules:
  - request must first pass through a trusted edge adapter or an explicitly trusted internal path

### Internal Core Invocation

- Input:
  - trusted current-user context
  - core trip or item command/query input
- Validation rules:
  - core handlers must continue to authorize in business terms
  - direct public reliance on development-only identity injection is invalid for production

### Core Response

- Output:
  - domain-oriented trip or item result from the application/core layer
- Notes:
  - the raw core response may be returned internally as-is
  - public adapters may reshape it into consumer-specific contracts when needed
