# Quickstart: Item Check Counter

## Goal

Implement the item check workflow so the current user can mark an owned item as packed, receive the updated item with an incremented `checkCount`, and continue to see that cumulative count in existing item retrieval endpoints.

## Implementation Sequence

1. Confirm the existing item contract and response model continue to expose `checkCount` on item list and single-item retrieval responses.
2. Extend the item domain behavior so an item can record one additional packing check without changing any other item field.
3. Add application command, result, and handler logic under `src/Trip.API/Application/Items/` for the `checkItem` flow, including current-user ownership enforcement and typed failure outcomes.
4. Extend repository abstractions and implementations so the owned item can be loaded, updated, and saved through the existing persistence boundary.
5. Add the `checkItem` Minimal API endpoint under `src/Trip.API/Api/Items/` with a public handler name matching the OpenAPI `operationId`.
6. Keep cancellation propagation, structured logging, and existing problem-details exception mapping consistent with the rest of the API.
7. Add unit tests for item increment behavior and application-level ownership or missing-item failures.
8. Add integration tests for:
   - successful item checking
   - repeated checks accumulating count
   - unauthorized requests
   - forbidden requests for another user's item
   - missing-item requests
   - retrieval endpoints returning the latest `checkCount`

## Verification

1. Run `dotnet build --no-incremental`.
2. Run `dotnet test --no-build`.
3. Run `dotnet format --verify-no-changes`.
4. Manually verify HTTP or Swagger flows for:
   - checking an owned item once and receiving `checkCount = 1`
   - checking the same owned item multiple times and receiving cumulative counts
   - retrieving the checked item through existing list and single-item endpoints
   - receiving `403 Forbidden` for another user's item
   - receiving clear failures for invalid identifiers, missing user context, and missing items

## Notes

- Keep the feature limited to the `checkItem` route plus existing response visibility of `checkCount`.
- Do not introduce a boolean packed flag or a client-supplied counter update path.
- Preserve the repository boundary even if the persistence layer needs small extensions to support the new mutation flow.
