# Data Model: Item Check Counter

## Trip

- Purpose: Represents the ownership boundary for all item operations, including the item check flow.
- Fields:
  - `Id`: Unique trip identifier.
  - `OwnerId`: User identifier used to authorize access to the trip and its items.
  - `Destination`: Required destination label.
  - `StartDate`: Optional trip start date.
  - `EndDate`: Optional trip end date.
- Relationships:
  - One trip belongs to one user.
  - One trip can contain many baggages.
  - One trip can contain many items through its baggages.
- Validation rules:
  - `Destination` is required and cannot be blank.
  - If both dates are present, `StartDate` must be on or before `EndDate`.
- State transitions relevant to this feature:
  - Retrieved as the ownership source when a user checks an item.
  - Unchanged by a successful check action other than reflecting the updated nested item count value.

## Baggage

- Purpose: Contains items within a trip and preserves the item's physical packing context.
- Fields:
  - `Id`: Unique baggage identifier.
  - `TripId`: Identifier of the owning trip.
  - `Name`: Baggage label.
  - `IsDefaultBaggage`: Marks the trip's default baggage for item creation.
- Relationships:
  - One baggage belongs to one trip.
  - One baggage can contain many items.
- Validation rules:
  - `Name` is required and cannot be blank.
  - A baggage must remain associated with exactly one trip.
- State transitions relevant to this feature:
  - Unchanged by item check actions.
  - Continues to be returned as the item's owning baggage reference.

## Item

- Purpose: Represents a packing-list entry that users can mark as packed multiple times across outbound and return packing passes.
- Fields:
  - `Id`: Unique item identifier.
  - `TripId`: Identifier of the owning trip exposed in item responses.
  - `BaggageId`: Identifier of the baggage that contains the item.
  - `Name`: User-facing item name.
  - `CheckCount`: Non-negative cumulative count of completed packing checks.
  - `DefaultItemId`: Optional reference to a predefined item.
- Relationships:
  - One item belongs to one baggage.
  - One item belongs to one trip through its baggage.
- Validation rules:
  - `Name` remains required and cannot be blank.
  - `CheckCount` starts at `0` on creation.
  - `CheckCount` may only increase by one per successful check action in this feature.
  - `CheckCount` must never become negative.
  - `DefaultItemId`, when present, must remain a valid identifier value.
- State transitions:
  - `Unchecked`: `CheckCount = 0`; item exists but has not been marked as packed.
  - `Packed Once`: `CheckCount = 1`; item has been confirmed packed for one packing pass.
  - `Packed Multiple Times`: `CheckCount >= 2`; item has been confirmed packed across repeated packing passes such as the return trip.
  - Transition rule: each successful `checkItem` action moves the item from `n` to `n + 1` without changing `Id`, `TripId`, `BaggageId`, `Name`, or `DefaultItemId`.

## Current User Context

- Purpose: Represents the authenticated request user used to authorize access to the target item.
- Fields:
  - `UserId`: Unique identifier used to verify ownership through the related trip.
- Relationships:
  - One current-user context maps to zero or more owned trips.
- Validation rules:
  - Requests without a resolved current user are invalid for item check operations.

## Request and Response Shapes

### Check Item Input

- Fields:
  - None in the request body.
- Validation rules:
  - The path must contain a valid item identifier.
  - The item must exist and belong to a trip owned by the current user.

### Item Output

- Fields:
  - `Id`
  - `TripId`
  - `BaggageId`
  - `Name`
  - `CheckCount`
  - `DefaultItemId`
- Notes:
  - `CheckCount` is system-controlled and visible after both check and retrieval operations.
  - Ownership is enforced through the related trip and is not returned as a separate field.
