# Trip API Contract Summary

Source of truth: [trip.yml](/home/sicor/local-repos/maletapp/spec/trip.yml)

## Endpoints

### `POST /trips` (`createTrip`)

- Purpose: Create a new trip for the current user.
- Request body:
  - `destination`: required string
  - `startDate`: optional date
  - `endDate`: optional date
- Success response:
  - `201 Created`
  - Response body contains trip `id`, `destination`, `startDate`, and `endDate`
- Failure outcomes:
  - `400 Bad Request` for invalid input
  - `401 Unauthorized` when no current user can be resolved
  - `500 Internal Server Error` for unexpected failures

### `GET /trips` (`getTrips`)

- Purpose: Retrieve the current user's trip list.
- Success response:
  - `200 OK`
  - Response body is an array of trip objects
- Failure outcomes:
  - `401 Unauthorized` when no current user can be resolved
  - `500 Internal Server Error` for unexpected failures

### `GET /trips/{tripId}` (`getTripById`)

- Purpose: Retrieve a single trip by identifier for the current user.
- Path parameter:
  - `tripId`: required UUID string
- Success response:
  - `200 OK`
  - Response body contains trip `id`, `destination`, `startDate`, and `endDate`
- Failure outcomes:
  - `401 Unauthorized` when no current user can be resolved
  - `403 Forbidden` when the trip exists but belongs to another user
  - `404 Not Found` when the trip does not exist
  - `500 Internal Server Error` for unexpected failures

## Ownership Rules

- Trip creation always assigns ownership to the current user.
- Trip list results include only trips owned by the current user.
- Trip detail access is restricted to the owning user.
