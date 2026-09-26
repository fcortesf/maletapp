# Data Model: Trip API Bootstrap

## Trip

- Purpose: Represents a travel plan owned by a single user.
- Fields:
  - `Id`: Unique trip identifier.
  - `OwnerId`: User identifier for ownership and filtering.
  - `Destination`: Required trip destination.
  - `StartDate`: Optional trip start date.
  - `EndDate`: Optional trip end date.
- Relationships:
  - Many trips can belong to one user identity.
- Validation rules:
  - `Destination` is required and cannot be blank.
  - `StartDate` may be omitted.
  - `EndDate` may be omitted.
  - If both dates are present, `StartDate` must be on or before `EndDate`.
- State transitions:
  - Created: Trip is instantiated and persisted for the current user.
  - Retrieved in list: Trip appears only in the owning user's collection view.
  - Retrieved in detail: Trip is returned only when the current user owns it.

## Current User Context

- Purpose: Represents the user identity available for the active request.
- Fields:
  - `UserId`: Unique identifier used to scope trip creation and retrieval.
- Relationships:
  - One current-user context maps to zero or more owned trips.
- Validation rules:
  - A request without a determinable user identity is invalid for all trip endpoints in this feature.

## Request and Response Shapes

### New Trip Input

- Fields:
  - `Destination`: Required text value.
  - `StartDate`: Optional calendar date.
  - `EndDate`: Optional calendar date.
- Validation rules:
  - Input must include `Destination`.
  - Date ordering must be valid when both dates are provided.

### Trip Output

- Fields:
  - `Id`
  - `Destination`
  - `StartDate`
  - `EndDate`
- Notes:
  - Ownership metadata is enforced by the system but is not required in the public response for this phase.
