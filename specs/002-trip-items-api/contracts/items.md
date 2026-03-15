# Items API Contract Summary

Source of truth: [item.yml](/home/sicor/local-repos/maletapp/spec/item.yml)

## Endpoints

### `GET /trips/{tripId}/items` (`listItemsByTrip`)

- Purpose: Retrieve all items associated with one trip owned by the current user.
- Path parameter:
  - `tripId`: required UUID string
- Success response:
  - `200 OK`
  - Response body is an array of item objects
- Failure outcomes:
  - `401 Unauthorized` when no current user can be resolved
  - `403 Forbidden` when the trip belongs to a different user
  - `404 Not Found` when the trip does not exist
  - `500 Internal Server Error` for unexpected failures

### `POST /trips/{tripId}/items` (`createItemInTrip`)

- Purpose: Create a new item directly under a trip owned by the current user.
- Path parameter:
  - `tripId`: required UUID string
- Request body:
  - `name`: required string
  - `defaultItemId`: optional UUID string
- Success response:
  - `201 Created`
  - Response body contains item `id`, `tripId`, `baggageId`, `name`, `checkCount`, and optional `defaultItemId`
- Failure outcomes:
  - `400 Bad Request` for invalid input
  - `401 Unauthorized` when no current user can be resolved
  - `403 Forbidden` when the trip belongs to a different user
  - `404 Not Found` when the trip does not exist
  - `500 Internal Server Error` for unexpected failures

### `GET /items/{itemId}` (`getItem`)

- Purpose: Retrieve a single item by identifier when its trip is owned by the current user.
- Path parameter:
  - `itemId`: required UUID string
- Success response:
  - `200 OK`
  - Response body contains item `id`, `tripId`, `baggageId`, `name`, `checkCount`, and optional `defaultItemId`
- Failure outcomes:
  - `401 Unauthorized` when no current user can be resolved
  - `403 Forbidden` when the related trip belongs to a different user
  - `404 Not Found` when the item does not exist
  - `500 Internal Server Error` for unexpected failures

### `PATCH /items/{itemId}` (`patchItem`)

- Purpose: Partially update a single owned item by identifier.
- Path parameter:
  - `itemId`: required UUID string
- Request body:
  - `name`: optional string
  - `defaultItemId`: optional UUID string
- Success response:
  - `200 OK`
  - Response body contains the updated item object
- Failure outcomes:
  - `400 Bad Request` for invalid input
  - `401 Unauthorized` when no current user can be resolved
  - `403 Forbidden` when the related trip belongs to a different user
  - `404 Not Found` when the item does not exist
  - `500 Internal Server Error` for unexpected failures

## Ownership Rules

- Every supported item endpoint must resolve the current user before performing the requested operation.
- Trip-scoped item list and create operations are allowed only when the requested trip belongs to the current user.
- Single-item retrieve and patch operations are allowed only when the item's associated trip belongs to the current user.
- Requests for another user's trip or item return `403 Forbidden`.

## Response Shape Notes

- `Item` responses include `id`, `tripId`, `baggageId`, `name`, `checkCount`, and optional `defaultItemId`.
- `NewItem` requires `name` and allows an optional `defaultItemId`.
- `PatchItem` supports partial changes and must not allow client control over `id`, `tripId`, `baggageId`, or `checkCount`.
