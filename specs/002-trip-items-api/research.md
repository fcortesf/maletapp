# Research: Trip Item Access

## Decision 1: Reuse the existing trip aggregate to create and authorize items

- Decision: Keep item creation and ownership checks rooted in the existing `Trip` aggregate instead of introducing a separate ownership source.
- Rationale: The current domain already models `Trip`, `Baggage`, and `Item`, and the feature requirement says authorization must be based on whether the related trip belongs to the authenticated user. Reusing that aggregate keeps authorization logic coherent and avoids cross-domain coupling.
- Alternatives considered: A standalone item ownership store was rejected because it duplicates trip ownership and makes authorization harder to reason about. A baggage-first ownership model was rejected because the user-facing contract is trip-scoped for creation and listing.

## Decision 2: Extend repository persistence to include baggages and items in the same API boundary

- Decision: Expand the existing repository and persistence model so trips can be loaded and saved together with baggages and items needed for the four item endpoints.
- Rationale: The current `TripRepository` and in-memory EF setup already anchor trip storage. Extending that shape preserves the constitution's repository rule and avoids bypassing the current persistence layer from handlers.
- Alternatives considered: Direct `DbContext` access from item handlers was rejected because it would break repository discipline. Creating a second, unrelated item persistence path was rejected because the current domain entities already place items under trips and baggages.

## Decision 3: Use the trip's default baggage behavior for direct trip item creation

- Decision: Implement `POST /trips/{tripId}/items` by using the trip's default baggage behavior so the item is assigned automatically without a baggage selection step.
- Rationale: The OpenAPI contract explicitly states that trip-level item creation assigns the item to a default baggage internally, and the current domain already contains `AddItemToDefaultBaggage` behavior that either uses or creates that default baggage.
- Alternatives considered: Requiring the client to submit a baggage identifier was rejected because it would violate the contract. Failing all creates unless a default baggage already exists was rejected because the current domain model already supports creating the default baggage on demand.

## Decision 4: Enforce ownership uniformly through current-user resolution plus typed failures

- Decision: Resolve the current user at the endpoint boundary, pass it into item handlers, and return typed unauthorized, forbidden, validation, and not-found failures through the existing exception handling pipeline.
- Rationale: The existing trip endpoints already follow this pattern, and the feature requires ownership checks on all four item endpoints, including item retrieval and patch. A uniform failure model keeps behavior predictable and testable.
- Alternatives considered: Delaying ownership checks until after data mutation was rejected because the requirement says to verify ownership before performing operations. Returning ambiguous empty success responses was rejected because the spec calls for clear forbidden and not-found outcomes.

## Decision 5: Keep endpoint names and route contracts aligned with the OpenAPI item specification

- Decision: Name the public item endpoint handlers to match `listItemsByTrip`, `createItemInTrip`, `getItem`, and `patchItem`, and keep request and response payloads aligned with `NewItem`, `PatchItem`, and `Item`.
- Rationale: The constitution requires endpoint names to match the OpenAPI `operationId` values exactly, and the user explicitly asked for schema compliance with the current item contract.
- Alternatives considered: Reusing file or method names based on internal conventions alone was rejected because it would drift from the contract. Broadening the scope to baggage item endpoints or check-item behavior was rejected because this feature is explicitly limited to four item endpoints.

## Decision 6: Cover the feature with both unit and integration tests

- Decision: Add unit tests for item validation, default-baggage creation, and authorization-oriented application behavior, plus integration tests covering successful and failing HTTP flows for all four endpoints.
- Rationale: The constitution requires both unit and integration tests. This feature has domain rules, application ownership checks, and externally visible API behavior that each need direct coverage.
- Alternatives considered: Unit tests only were rejected because they would not verify route wiring, serialization, and problem responses. Integration tests only were rejected because they would make domain rule failures slower to isolate.
