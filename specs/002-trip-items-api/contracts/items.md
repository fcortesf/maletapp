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
  - `notes`: optional nullable string; comments about the item
  - `itemCount`: optional nullable integer from 1 to 2147483647; number of units to bring
- Success response:
  - `201 Created`
  - Response body contains item `id`, `tripId`, `baggageId`, `name`, `isPacked`, nullable `notes` and `itemCount`, and optional `defaultItemId`
  - New items start with `isPacked` set to `false`
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
  - Response body contains item `id`, `tripId`, `baggageId`, `name`, `isPacked`, nullable `notes` and `itemCount`, and optional `defaultItemId`
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
  - `notes`: optional nullable string; comments about the item
  - `itemCount`: optional nullable integer from 1 to 2147483647; number of units to bring
  - `isPacked`: optional boolean
- Success response:
  - `200 OK`
  - Response body contains the updated item object
- Failure outcomes:
  - `400 Bad Request` for invalid input
  - `401 Unauthorized` when no current user can be resolved
  - `403 Forbidden` when the related trip belongs to a different user
  - `404 Not Found` when the item does not exist
  - `500 Internal Server Error` for unexpected failures

### `DELETE /items/{itemId}` (`deleteItem`)

- Purpose: Delete a single item when its trip is owned by the current user.
- Path parameter:
  - `itemId`: required UUID string
- Success response:
  - `204 No Content`, with no response body
  - Only the selected item is deleted; its trip, baggage and other items are preserved, including their `isPacked` state, notes and quantity
- Failure outcomes:
  - `401 Unauthorized` when no current user can be resolved
  - `403 Forbidden` when the related trip belongs to a different user
  - `404 Not Found` when the item does not exist or has already been deleted
  - `500 Internal Server Error` for unexpected failures

## Ownership Rules

- Every supported item endpoint must resolve the current user before performing the requested operation.
- Trip-scoped item list and create operations are allowed only when the requested trip belongs to the current user.
- Single-item retrieve, patch and delete operations are allowed only when the item's associated trip belongs to the current user.
- Requests for another user's trip or item return `403 Forbidden`.

## Response Shape Notes

- `Item` responses include `id`, `tripId`, `baggageId`, `name`, `isPacked`, nullable `notes` and `itemCount`, and optional `defaultItemId`.
- `NewItem` requires `name` and allows optional `defaultItemId`, `notes`, and `itemCount`.
- `PatchItem` supports partial changes and must not allow client control over `id`, `tripId`, or `baggageId`.
- `PatchItem` allows the owning user to set `isPacked` to either `true` or `false`.

- Omitted or null `notes` and `itemCount` on creation are stored as null.
- PATCH omission preserves existing values; explicit null clears notes or quantity.
- A null quantity is unspecified, not an implicit 1. Invalid quantities return 400.
