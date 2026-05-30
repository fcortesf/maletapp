## Why

Users need a reliable way to track which luggage items are already packed before a trip. The API currently exposes item creation and checking behavior, but it does not model the packed/unpacked state needed for packing workflows.

## What Changes

- Add an `isPacked` state to items exposed by API responses.
- Ensure newly created items start with `isPacked = false`.
- Add an item operation that lets the owning user set `isPacked` to either `true` or `false`.
- Return the updated item with `200 OK` when the current user owns the item.
- Return `404 Not Found` when the target item does not exist.
- Return `403 Forbidden` when the target item belongs to another user.
- Add domain unit tests for the packed state rule.
- Add integration tests for the successful owner update, cross-user forbidden update, and missing item flows.

## Capabilities

### New Capabilities

- `item-packed-state`: Defines item packed/unpacked state, default creation state, owner-only updates, and API response/error behavior.

### Modified Capabilities

None.

## Impact

- Updates the Items contract in `spec/item.yml` and the corresponding feature specification for item behavior in the same session.
- Affects item domain model, item creation, item response DTOs, item persistence mapping, item repository/application service behavior, and Minimal API endpoints.
- Adds or updates tests in the item domain/application test layer and API integration test layer.
- No new production dependencies are expected.
