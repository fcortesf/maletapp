# Data Model: Delete Trip

## Trip

- Purpose: Represents the traveler-owned aggregate that is the target of the delete action.
- Fields:
  - `Id`: Unique trip identifier.
  - `OwnerId`: User identifier used to authorize deletion.
  - `Destination`: Required trip destination label.
  - `StartDate`: Optional trip start date.
  - `EndDate`: Optional trip end date.
- Relationships:
  - One trip belongs to one user.
  - One trip can contain many baggages.
  - One trip can contain many items through its baggages.
- Validation rules:
  - `Id` must identify an existing trip for successful deletion.
  - `OwnerId` must match the current user for deletion to be allowed.
  - If the trip does not exist, deletion fails with a not found outcome.
  - If the trip exists but belongs to another user, deletion fails with a forbidden outcome.
- State transitions relevant to this feature:
  - `Existing`: The trip is stored and can be retrieved.
  - `Deleted`: The trip is removed and can no longer be retrieved by ID.
  - Transition rule: a successful delete action moves the trip from `Existing` to `Deleted` and removes all nested baggages and items with it.

## Baggage

- Purpose: Represents a packing container owned by exactly one trip and removed when its parent trip is deleted.
- Fields:
  - `Id`: Unique baggage identifier.
  - `TripId`: Identifier of the owning trip.
  - `Name`: Baggage label.
  - `IsDefaultBaggage`: Indicates the default baggage for the trip.
- Relationships:
  - One baggage belongs to one trip.
  - One baggage can contain many items.
- Validation rules:
  - A baggage cannot outlive its owning trip in this feature.
- State transitions relevant to this feature:
  - `Existing`: The baggage is present under a trip.
  - `Deleted with Parent Trip`: The baggage is removed automatically when the owning trip is deleted.

## Item

- Purpose: Represents a packing-list entry owned by a trip and removed when its parent trip is deleted.
- Fields:
  - `Id`: Unique item identifier.
  - `TripId`: Identifier of the owning trip.
  - `BaggageId`: Identifier of the baggage that contains the item.
  - `Name`: User-facing item name.
  - `CheckCount`: Non-negative cumulative packing counter already supported by the item domain.
  - `DefaultItemId`: Optional predefined-item reference.
- Relationships:
  - One item belongs to one baggage.
  - One item belongs to one trip through that baggage and stored trip reference.
- Validation rules:
  - An item cannot remain accessible once its owning trip is deleted.
  - Deleting one trip must not remove items associated with a different trip.
- State transitions relevant to this feature:
  - `Existing`: The item is present under a trip.
  - `Deleted with Parent Trip`: The item is removed automatically when the owning trip is deleted.

## Current User Context

- Purpose: Represents the authenticated user attempting to delete a trip.
- Fields:
  - `UserId`: Unique identifier used to validate ownership.
- Relationships:
  - One current-user context maps to zero or more owned trips.
- Validation rules:
  - Requests without a resolved current user are invalid for trip deletion.

## Delete Request and Outcome

### Delete Trip Input

- Fields:
  - `tripId`: Required trip identifier in the request path.
- Validation rules:
  - The path must contain a valid trip identifier.
  - The trip must exist and belong to the current user for deletion to succeed.

### Delete Trip Result

- Success:
  - No response body is returned.
  - The deleted trip and its contained baggages and items are absent from subsequent retrieval flows.
- Failure outcomes:
  - `Unauthorized`: No current user could be resolved.
  - `Forbidden`: The trip belongs to a different user.
  - `Not Found`: The trip does not exist.
