# Quickstart: Trip API Bootstrap

## Goal

Implement the first Trips API slice so a current user can create trips, list their trips, and fetch a trip detail using a repository-backed Entity Framework in-memory store.

## Implementation Sequence

1. Replace the starter endpoint in `src/Trip.API/Program.cs` with trip endpoint registration and common middleware.
2. Add application abstractions for trip repository access and current-user access.
3. Add or align the trip domain model so destination and date validation match the feature spec and contract.
4. Add Entity Framework persistence with an in-memory database and a repository implementation for trips.
5. Add request and response DTOs for `createTrip`, `getTrips`, and `getTripById`.
6. Add endpoint handlers that resolve the current user, call application logic, and return contract-aligned responses.
7. Add typed failure handling so invalid input, unauthorized access, forbidden access, and not-found cases return problem details.
8. Add unit tests for trip validation and application behavior.
9. Add integration tests that exercise the three HTTP endpoints against the in-memory data store.

## Verification

1. Run `dotnet build --no-incremental`.
2. Run `dotnet test --no-build`.
3. Run `dotnet format --verify-no-changes`.
4. Manually verify Swagger or HTTP calls for:
   - creating a trip with required destination
   - listing only the current user's trips
   - retrieving an owned trip by id
   - receiving failure responses for invalid input, missing user context, foreign trip access, and missing trips

## Notes

- Keep authentication implementation out of scope; use a replaceable current-user accessor.
- Keep Items and Trips isolated.
- Treat the in-memory database as a temporary infrastructure choice for this phase, not a long-term domain assumption.
