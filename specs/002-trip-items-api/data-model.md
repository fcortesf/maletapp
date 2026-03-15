# Data Model: Trip Item Access

## Trip

- Purpose: Represents a travel plan owned by a single user and serves as the ownership boundary for all item operations in this feature.
- Fields:
  - `Id`: Unique trip identifier.
  - `OwnerId`: User identifier used for ownership checks.
  - `Destination`: Required trip destination.
  - `StartDate`: Optional trip start date.
  - `EndDate`: Optional trip end date.
- Relationships:
  - One trip belongs to one user.
  - One trip can contain many baggages.
  - One trip can contain many items through its baggages.
- Validation rules:
  - `Destination` is required and cannot be blank.
  - If both dates are present, `StartDate` must be on or before `EndDate`.
- State transitions:
  - Retrieved for item listing: Trip is loaded and ownership is verified before its items are returned.
  - Used for item creation: Trip is loaded, ownership is verified, and the item is added to the trip's default baggage.

## Baggage

- Purpose: Groups items within a trip and provides the default assignment target for trip-level item creation.
- Fields:
  - `Id`: Unique baggage identifier.
  - `TripId`: Identifier of the owning trip.
  - `Name`: Baggage label.
  - `IsDefaultBaggage`: Indicates whether the baggage is the default destination for direct trip item creation.
- Relationships:
  - One baggage belongs to one trip.
  - One baggage can contain many items.
- Validation rules:
  - `Name` is required and cannot be blank.
  - At most one baggage should act as the trip's default baggage in this feature design.
- State transitions:
  - Existing default baggage reused during direct item creation.
  - Default baggage created on demand when a trip has no existing default baggage and the user creates an item directly under the trip.

## Item

- Purpose: Represents a packing-list entry that is owned indirectly through its trip association.
- Fields:
  - `Id`: Unique item identifier.
  - `TripId`: Identifier of the owning trip exposed in responses.
  - `BaggageId`: Identifier of the baggage containing the item.
  - `Name`: Item name.
  - `CheckCount`: Number of times the item has been marked as checked.
  - `DefaultItemId`: Optional reference to a predefined item identifier.
- Relationships:
  - One item belongs to one baggage.
  - One item belongs to one trip through its baggage.
- Validation rules:
  - `Name` is required on creation and cannot be blank on update.
  - `CheckCount` is non-negative and read-only for this feature.
  - `DefaultItemId`, when present, must be a UUID.
- State transitions:
  - Created: Item is added to the trip's default baggage with `CheckCount` starting at zero.
  - Retrieved: Item is returned only if its trip belongs to the current user.
  - Updated: Item name and other patchable contract fields may change without altering ownership or trip association.

## Current User Context

- Purpose: Represents the authenticated user identity available for the active request.
- Fields:
  - `UserId`: Unique identifier used to enforce trip ownership.
- Relationships:
  - One current-user context maps to zero or more owned trips.
- Validation rules:
  - A request without a determinable user identity is invalid for all four item endpoints in this feature.

## Request and Response Shapes

### New Item Input

- Fields:
  - `Name`: Required text value.
  - `DefaultItemId`: Optional UUID reference.
- Validation rules:
  - Input must include a non-blank `Name`.
  - `DefaultItemId`, when present, must be a UUID.

### Patch Item Input

- Fields:
  - `Name`: Optional replacement item name.
  - `DefaultItemId`: Optional replacement or clearing value for the predefined item reference.
- Validation rules:
  - If `Name` is provided, it cannot be blank.
  - If `DefaultItemId` is provided, it must be a UUID or an explicit null-equivalent allowed by the contract implementation.

### Item Output

- Fields:
  - `Id`
  - `TripId`
  - `BaggageId`
  - `Name`
  - `CheckCount`
  - `DefaultItemId`
- Notes:
  - Ownership is enforced through the related trip and is not returned as a separate field.
  - `Id`, `TripId`, `BaggageId`, and `CheckCount` are system-controlled values in this feature.
