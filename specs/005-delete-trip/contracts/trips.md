# Trips API Contract Summary

Source of truth: [trip.yml](/home/sicor/local-repos/maletapp/spec/trip.yml)

## Endpoint In Scope

### `DELETE /trips/{tripId}` (`deleteTrip`)

- Purpose: Delete one trip owned by the current user.
- Path parameter:
  - `tripId`: required UUID string identifying the trip to delete
- Request body:
  - No request body
- Success response:
  - `204 No Content`
- Failure outcomes:
  - `401 Unauthorized` when no current user can be resolved
  - `403 Forbidden` when the trip belongs to a different user
  - `404 Not Found` when the trip does not exist
  - `500 Internal Server Error` for unexpected failures

## Behavioral Expectations

- Successful deletion removes the targeted trip from subsequent trip retrieval results.
- Successful deletion also removes baggages and items contained within the deleted trip.
- Deleting one trip must not alter any other trip or any baggage or item belonging to another trip.
- Repeating a delete request for a trip that was already removed results in `404 Not Found`.

## Ownership Rules

- The current user must be resolved before the delete action is attempted.
- The delete action is allowed only when the target trip belongs to the current user.
- Requests for another user's trip return `403 Forbidden`.

## Response Shape Notes

- The success response has no body.
- Failure responses follow the API's shared problem-details behavior.
