# Quickstart: Trip Item Access

## Goal

Implement the item endpoints so the current user can list items for an owned trip, add an item directly to an owned trip, retrieve one owned item, and partially update one owned item while keeping authorization trip-based.

## Implementation Sequence

1. Extend the persistence model so trips can be stored and loaded with related baggages and items.
2. Expand repository abstractions and implementations to support trip item listing, trip item creation, item lookup, and item patch flows without exposing persistence details to endpoints.
3. Add or align item-focused application DTOs, commands, queries, results, and handlers under `src/Trip.API/Application/Items/`.
4. Add request and response models for `listItemsByTrip`, `createItemInTrip`, `getItem`, and `patchItem` that match the item contract.
5. Add item endpoint handlers under `src/Trip.API/Api/Items/` with names matching the OpenAPI `operationId` values.
6. Resolve the current user at each item endpoint, enforce ownership before completing the operation, and return typed failure outcomes for unauthorized, forbidden, validation, and not-found cases.
7. Reuse the trip domain's default-baggage behavior for direct trip item creation and preserve trip association during item updates.
8. Add unit tests for item validation, default-baggage behavior, and application ownership rules.
9. Add integration tests that exercise all four HTTP endpoints, including success cases and foreign-trip, missing-user, invalid-input, and missing-record failures.

## Verification

1. Run `dotnet build --no-incremental`.
2. Run `dotnet test --no-build`.
3. Run `dotnet format --verify-no-changes`.
4. Manually verify Swagger or HTTP calls for:
   - listing items for an owned trip
   - creating an item under an owned trip without supplying a baggage identifier
   - retrieving an owned item by id
   - patching an owned item name or default item reference
   - receiving `403 Forbidden` for another user's trip or item
   - receiving clear failures for invalid UUIDs, missing user context, bad request bodies, and missing records

## Notes

- Keep the authentication mechanism out of scope and continue using the current-user accessor abstraction.
- Keep the feature limited to the four item endpoints in the current spec.
- Preserve the repository boundary even if extending EF Core mappings for nested baggages and items requires broader infrastructure changes.
