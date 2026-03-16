# Research: Delete Trip

## Decision 1: Keep deletion at the trip aggregate boundary

- Decision: Delete the trip as one aggregate operation that removes the trip and all contained baggages and items together.
- Rationale: The feature specification requires deleting the old trip with all of its items, and the constitution already allows trip-owned baggages and items to live inside the same ownership boundary.
- Alternatives considered: Deleting only the trip record while retaining nested packing data was rejected because it would leave orphaned baggages and items. Deleting items through a separate cleanup workflow was rejected because the feature requires one user action with no follow-up cleanup.

## Decision 2: Reuse the existing trip ownership pattern for authorization

- Decision: Resolve the current user at the endpoint and authorize deletion by comparing the requested trip's owner with the current user inside the application flow.
- Rationale: Existing trip and item endpoints already follow this pattern, and it keeps failure outcomes consistent across the API.
- Alternatives considered: Authorizing directly in the endpoint against persistence was rejected because it would bypass the application and repository boundaries. Skipping ownership validation was rejected because the trip contract requires forbidden outcomes for foreign trips.

## Decision 3: Add repository-backed trip removal instead of direct persistence access

- Decision: Extend `ITripRepository` and `TripRepository` with explicit deletion support for one trip aggregate.
- Rationale: The constitution requires repository abstractions between application logic and persistence, and the current codebase already routes trip and item operations through `ITripRepository`.
- Alternatives considered: Direct `TripDbContext` access from the handler was rejected because it would break repository discipline. A specialized item cleanup repository was rejected because deletion belongs to the trip aggregate, not an independent item workflow.

## Decision 4: Keep failure outcomes aligned to the existing trip contract

- Decision: Return `204 No Content` for successful owned-trip deletion, `401 Unauthorized` when no current user is resolved, `403 Forbidden` for foreign trips, and `404 Not Found` for missing trips.
- Rationale: These outcomes are already defined in `spec/trip.yml`, so the implementation can remain contract-first without any contract changes.
- Alternatives considered: Returning `200 OK` with a body was rejected because the contract defines a no-content success response. Returning `404 Not Found` for foreign trips was rejected because the current trip contract distinguishes forbidden access from missing resources.

## Decision 5: Verify cascade effects through both application and integration tests

- Decision: Add unit tests for handler decisions and integration tests that confirm the deleted trip disappears from retrieval flows and its nested packing data is no longer reachable.
- Rationale: The constitution requires both unit and integration coverage, and this feature must prove both business behavior and externally visible HTTP outcomes.
- Alternatives considered: Unit tests only were rejected because they would not verify route binding, status codes, or persistence effects. Integration tests only were rejected because they would make ownership and missing-trip rules slower to isolate when failures occur.
