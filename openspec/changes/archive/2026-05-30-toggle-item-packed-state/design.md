## Context

Items are currently modeled inside trip-owned baggages and exposed through the Items API. Item responses include identity, trip and baggage references, name and optional `defaultItemId`, but they do not expose whether the item has been packed.

The existing item update surface is `PATCH /items/{itemId}` (`patchItem`), which already resolves the current user, loads the trip by item id, returns `404` for missing items, returns `403` for another user's item, mutates item fields, and returns the updated item.

## Goals / Non-Goals

**Goals:**

- Persist `isPacked` as part of the item domain and data model.
- Default new items to `isPacked = false`.
- Expose `isPacked` in every API `Item` response.
- Allow the owning user to set `isPacked` to `true` or `false`.
- Preserve existing item ownership semantics and error behavior.
- Update `spec/item.yml` and the corresponding feature specification artifacts together.
- Add domain unit coverage and API integration coverage for `200`, `403`, and `404`.

**Non-Goals:**

- Introduce authentication changes beyond the existing current-user accessor.
- Add a new production dependency.
- Change the Items/Trips contract boundary or introduce cross-domain dependencies outside trip-owned containment.

## Decisions

1. Extend `PATCH /items/{itemId}` instead of adding a new route.

   `patchItem` is already the partial item update operation and already has the exact ownership and not-found behavior required for this capability. Adding optional `isPacked` to `PatchItem` keeps endpoint naming aligned with the existing OpenAPI `operationId` and avoids duplicating single-item authorization logic.

   Alternative considered: a dedicated route such as `PATCH /items/{itemId}/packed-state`. This was rejected because it would add a second mutation path for the same resource state without a distinct ownership model.

2. Add explicit domain behavior for packed state.

   `Item` should expose a read-only `IsPacked` property and a method such as `SetPackedState(bool isPacked)`. The constructor should initialize unpacked items, and rehydration should accept the stored value. This keeps state transitions inside the domain entity instead of letting handlers or persistence mutate raw state directly.

   Alternative considered: set the property directly from handlers. This was rejected because the acceptance criteria call for unit tests around the domain rule.

3. Flow `isPacked` through DTOs, responses, and persistence mappings.

   `ItemDto`, `ItemResponse`, `ItemDataModel`, repository mapping, and response construction should include `IsPacked`. All list, create, get and patch responses should return the field because they all serialize the shared `Item` contract.

   Alternative considered: only return `isPacked` from the update operation. This was rejected because the acceptance criteria require `Item` responses to expose the field, not only one endpoint.

4. Keep authorization in application handlers.

   The existing `PatchItemHandler` should continue loading the trip by item id, checking owner id against the current user, and throwing typed `NotFoundException` or `ForbiddenException`. The packed-state mutation should happen only after these checks.

   Alternative considered: checking ownership at the endpoint only. This was rejected because current item handlers already centralize ownership behavior and tests cover application semantics independently from HTTP wiring.

## Risks / Trade-offs

- Existing serialized item snapshots in tests will need updates → update all item response contracts and assertions together so every endpoint remains contract-consistent.
- EF InMemory schema changes do not require a migration now → keep persistence mapping explicit so a future relational provider can add the column cleanly.
- Extending `PATCH /items/{itemId}` means clients can update name/default item id and packed state in one request → handler logic must treat `isPacked` as optional and independent from existing patch fields.
