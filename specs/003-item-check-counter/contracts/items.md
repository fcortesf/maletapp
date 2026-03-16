# Items API Contract Summary

Source of truth: [item.yml](/home/sicor/local-repos/maletapp/spec/item.yml)

## Endpoint In Scope

### `POST /items/{itemId}/check-item` (`checkItem`)

- Purpose: Record one additional packing check for an existing owned item.
- Path parameter:
  - `itemId`: required UUID string identifying the item to check
- Request body:
  - No request body
- Success response:
  - `200 OK`
  - Response body contains the updated item object with `id`, `tripId`, `baggageId`, `name`, `checkCount`, and optional `defaultItemId`
- Failure outcomes:
  - `400 Bad Request` for an invalid item identifier format or otherwise invalid request
  - `401 Unauthorized` when no current user can be resolved
  - `403 Forbidden` when the item belongs to a different user's trip
  - `404 Not Found` when the item does not exist
  - `500 Internal Server Error` for unexpected failures

## Related Retrieval Contract Expectations

- `GET /trips/{tripId}/items` and `GET /items/{itemId}` remain responsible for exposing the current `checkCount` value for each returned item.
- `checkCount` is read-only from the client perspective and must not be set directly through create or patch requests.
- A successful `checkItem` action changes only the `checkCount`; item identity, trip association, baggage association, name, and optional predefined-item reference remain unchanged.

## Ownership Rules

- The current user must be resolved before the check action is attempted.
- The check action is allowed only when the target item's related trip belongs to the current user.
- Requests for another user's item return `403 Forbidden`.

## Response Shape Notes

- `Item` responses include `id`, `tripId`, `baggageId`, `name`, `checkCount`, and optional `defaultItemId`.
- `checkCount` is a cumulative counter of successful packing confirmations, not a boolean done flag.
- The contract supports repeated checks of the same item so outbound and return packing history can be preserved.
