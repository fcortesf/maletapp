# Research: Item Check Counter

## Decision 1: Model the packing action as an increment-only item behavior

- Decision: Treat each check action as one additional packing confirmation that increments `checkCount` by exactly 1.
- Rationale: The feature specification and item contract both define packing progress as a cumulative counter rather than a boolean status, and the return-trip use case depends on preserving prior packing history.
- Alternatives considered: A boolean checked flag was rejected because it cannot represent multiple packing passes. A client-supplied counter value was rejected because it would allow overwriting history instead of recording a new check event.

## Decision 2: Reuse the existing item retrieval contract instead of introducing a new progress view

- Decision: Keep `checkCount` in the existing item response shape for list and single-item retrieval and rely on those views to communicate packing progress after check actions.
- Rationale: The current item contract already exposes `checkCount` as part of `Item`, so the feature can stay contract-first without creating a separate progress resource or alternate response model.
- Alternatives considered: A separate progress endpoint was rejected because it would duplicate data already present on the item contract. Returning only a success code from the check action was rejected because the feature requires users to see the updated count immediately.

## Decision 3: Keep ownership and authorization anchored to the item's owning trip

- Decision: Authorize `checkItem` through the same trip ownership rules already used for other item endpoints.
- Rationale: The constitution allows item behavior to share the trip-owned aggregate boundary, and existing item operations already rely on the current-user accessor plus trip ownership to determine access.
- Alternatives considered: A standalone item ownership rule was rejected because it would duplicate the current ownership model. Skipping authorization for check actions was rejected because it would break consistency with the rest of the item API.

## Decision 4: Implement the check flow through existing repository and persistence paths

- Decision: Extend the current repository-backed item update flow to load the owned item, increment `checkCount`, and persist the updated aggregate.
- Rationale: The constitution requires repository abstractions rather than direct persistence access from handlers, and the current service already uses a repository-backed trip aggregate for item operations.
- Alternatives considered: Direct `DbContext` access from the endpoint or handler was rejected because it would bypass repository discipline. A separate write-only persistence path for checks was rejected because it would split item mutation behavior across multiple infrastructure patterns.

## Decision 5: Cover the feature with both domain/application and HTTP-level tests

- Decision: Add unit tests for increment and ownership-related rules plus integration tests for successful, unauthorized, forbidden, and missing-item check flows.
- Rationale: The constitution requires unit and integration coverage, and this feature has both business rules (`checkCount` increments, item immutability outside the counter) and externally visible API behavior (`checkItem` route and updated response content).
- Alternatives considered: Unit tests only were rejected because they would not verify routing, serialization, and exception mapping. Integration tests only were rejected because they would make the core increment rule slower to isolate when it fails.
