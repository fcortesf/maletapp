# User Access Boundary Contract Summary

## Purpose

This document summarizes the recommended boundary contract for identity, trust, and consumer-specific access around the current Maletapp core.

## Core Decision

- `Trip.API` is the private-by-default core adapter in the target architecture.
- External authentication is validated outside the core.
- Internal business authorization remains inside the core.

## Boundary Definitions

### Public Boundary

- Intended consumers:
  - frontend applications
  - MCP-facing endpoints or servers
  - LLM function-calling hosts
- Responsibilities:
  - authenticate external callers
  - apply consumer-specific request and response shaping
  - forward only trusted internal identity to the core

### Private Core Boundary

- Intended consumers:
  - trusted internal adapters
  - trusted internal runtime paths
- Responsibilities:
  - execute trip and item business use cases
  - enforce ownership and business authorization rules
  - return domain-oriented results

## Identity Contract

### External Identity Input

- May vary by consumer:
  - bearer token
  - session/cookie
  - integration secret
  - tool-host credential
- Rule:
  - external identity formats must not leak into domain or application layers

### Internal Identity Output

- Internal shape:
  - resolved `UserId` through `IUserContextAccessor` or its future equivalent
- Rule:
  - the core trusts only validated identity provided by trusted internal callers or adapters

## Authorization Contract

- Authorization is enforced in business terms:
  - current user owns trip
  - current user owns item through trip ownership
- Authorization is not expressed in provider-specific terms:
  - raw JWT claims
  - cookie/session implementation details
  - third-party SDK principal types

## Consumer Contract Placement

### Contracts that stay in the core

- `spec/trip.yml` resource contracts
- `spec/item.yml` resource contracts
- application-layer commands, queries, and results used by the core business paths

### Contracts that belong in adapters

- frontend-oriented aggregated responses
- MCP tool contracts
- LLM function-calling schemas
- any safety, ergonomics, or orchestration shape not required as a shared business contract

## Allowed Internal Identity Propagation

- Trusted internal claim mapping
- Trusted internal header mapping in controlled environments
- Test and development-only user-id injection

## Disallowed Production Assumptions

- Public clients directly setting the effective production user id
- Domain or application handlers parsing raw external auth tokens
- Expanding core contracts primarily to satisfy one consumer's UX or tool ergonomics

## When to Introduce a BFF or Gateway

Introduce a BFF or gateway when one or more of these become true:

- the frontend needs aggregated or UI-specific contract shaping
- public authentication and rate limiting must be centralized
- multiple external consumers need one common public boundary
- consumer-specific policies differ materially from the private core contract

## When to Introduce MCP or LLM Tool Adapters

Introduce dedicated adapters when one or more of these become true:

- the consumer needs action-oriented tools instead of raw REST resources
- tool safety requires narrower schemas than the core API exposes
- orchestration or prompt-facing metadata is needed outside the core business contract
