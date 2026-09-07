## 1. Contract And Specification

- [x] 1.1 Update `spec/item.yml` so the `Item` schema includes required read-only `isPacked` and `PatchItem` accepts optional `isPacked`.
- [x] 1.2 Update the corresponding item feature specification and contract summary under `specs/002-trip-items-api/` to document `isPacked`, default creation state, and `patchItem` packed-state updates.
- [x] 1.3 Confirm endpoint naming remains aligned with existing OpenAPI operation ids, using `patchItem` for packed-state updates.

## 2. Domain And Persistence

- [x] 2.1 Add `IsPacked` to `src/Trip.API/Domain/Entities/Item.cs`, default new items to unpacked, and add a domain method to set packed state.
- [x] 2.2 Extend item rehydration to restore persisted packed state while preserving other item metadata.
- [x] 2.3 Add `IsPacked` to `src/Trip.API/Infrastructure/Persistence/ItemDataModel.cs`.
- [x] 2.4 Update repository mapping in `src/Trip.API/Infrastructure/Repositories/TripRepository.cs` so packed state is saved and loaded.

## 3. Application And API

- [x] 3.1 Add optional `IsPacked` support to `PatchItemDto` and `PatchItemRequest`.
- [x] 3.2 Update `PatchItemHandler` to set packed state only after the existing not-found and ownership checks pass.
- [x] 3.3 Add `IsPacked` to `ItemDto` and `ItemResponse`.
- [x] 3.4 Update all item response construction paths under `src/Trip.API/Api/Items/` and `src/Trip.API/Application/Items/` to include packed state.
- [x] 3.5 Register any required handler or request changes without adding production dependencies.

## 4. Tests

- [x] 4.1 Add domain unit tests in `tests/Trip.API.UnitTests/Domain/ItemTests.cs` for default unpacked state, setting packed, setting unpacked, and rehydration.
- [x] 4.2 Add or update application unit tests for `PatchItemHandler` to cover owner update behavior and preservation of existing patch fields.
- [x] 4.3 Update existing item integration response contracts and assertions so create, list, get, patch, and check responses include `isPacked`.
- [x] 4.4 Add integration tests for `PATCH /items/{itemId}` returning `200 OK` with `isPacked = true` and `isPacked = false` for the owner.
- [x] 4.5 Add integration tests for `PATCH /items/{itemId}` returning `403 Forbidden` for another user's item and preserving the original packed state.
- [x] 4.6 Add integration tests for `PATCH /items/{itemId}` returning `404 Not Found` when the item does not exist.

## 5. Verification

- [x] 5.1 Run `dotnet build --no-incremental` and fix any warnings or errors.
- [x] 5.2 Run `dotnet test --no-build` and fix any failing tests.
- [x] 5.3 Run `dotnet format --verify-no-changes` and fix any formatting drift.
- [x] 5.4 Review the final diff for contract/spec consistency and avoid unrelated refactors.
