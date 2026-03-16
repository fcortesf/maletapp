# Quickstart: Delete Trip

## Goal

Implement trip deletion so the current user can remove one owned obsolete trip in a single request and have all baggages and items under that trip removed with it.

## Implementation Sequence

1. Confirm the existing trip contract in `spec/trip.yml` remains the source of truth for `deleteTrip`, including `204`, `401`, `403`, and `404` outcomes.
2. Add application command, result, and handler logic under `src/Trip.API/Application/Trips/` for the delete-trip flow, including current-user ownership enforcement and typed failure outcomes.
3. Extend `ITripRepository` and `TripRepository` so a single owned trip aggregate can be removed through the repository boundary.
4. Add the `deleteTrip` Minimal API endpoint under `src/Trip.API/Api/Trips/` with a public handler name matching the OpenAPI `operationId`.
5. Register the delete-trip handler and endpoint wiring in `src/Trip.API/Program.cs` and existing trip endpoint route-builder extensions.
6. Keep cancellation propagation, structured logging, and existing problem-details exception mapping consistent with the rest of the API.
7. Add unit tests for handler behavior covering:
   - successful deletion of an owned trip
   - missing-trip failure
   - forbidden deletion of another user's trip
8. Add integration tests for:
   - successful deletion returning `204 No Content`
   - the deleted trip no longer being retrievable
   - unauthorized requests
   - forbidden requests for another user's trip
   - missing-trip requests
   - deletion of a trip that contains baggages and items

## Verification

1. Run `dotnet build --no-incremental`.
2. Run `dotnet test --no-build`.
3. Run `dotnet format --verify-no-changes`.
4. Manually verify HTTP or Swagger flows for:
   - deleting an owned trip and receiving `204 No Content`
   - requesting the deleted trip afterward and receiving `404 Not Found`
   - confirming another trip and its items remain intact after deleting the target trip
   - receiving `403 Forbidden` for another user's trip
   - receiving `401 Unauthorized` when no current user is present

## Notes

- Keep the feature limited to the existing trip delete contract and aggregate cleanup of trip-contained baggages and items.
- Do not introduce a soft-delete state or recovery workflow in this feature.
- Preserve the repository boundary even if persistence needs a small extension to support aggregate removal.
