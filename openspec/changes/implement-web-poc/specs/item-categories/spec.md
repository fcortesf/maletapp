## ADDED Requirements

### Requirement: Stable domain category values
Every Item representation SHALL include non-null `category` with one of
`documents`, `clothing`, `toiletries`, `electronics`, `health`, `accessories`,
`other`. The domain SHALL persist the value in its current in-memory model and
preserve it through aggregate updates. Translated labels SHALL remain client data.

#### Scenario: Create with category
- **WHEN** an owner creates an item with `category: clothing`
- **THEN** create, get and trip-item list responses include `category: clothing`
- **THEN** later packing, quantity or lifecycle operations preserve that category

#### Scenario: Existing client omits category
- **WHEN** an item is created without category or a legacy object lacking it is rehydrated
- **THEN** the item category is `other` and all response shapes include it

### Requirement: Category patch presence and validation
PATCH omission SHALL preserve category; explicit `other` SHALL reset it. Null,
unknown, empty, numeric and incorrectly cased codes MUST return 400 and MUST NOT
partially apply other fields in that request. Existing ownership rules apply.

#### Scenario: Partial changes preserve unrelated fields
- **WHEN** an owner submits a category-only patch
- **THEN** the category changes while name, notes, itemCount, defaultItemId and isPacked remain unchanged

#### Scenario: Omission differs from invalid null
- **WHEN** a patch omits category
- **THEN** the existing category remains unchanged
- **WHEN** a patch sends category null together with a valid new name
- **THEN** the API returns 400 and neither field changes

#### Scenario: Explicit reset and invalid values
- **WHEN** the owner patches category to `other`
- **THEN** the API returns 200 with category `other`
- **WHEN** the owner supplies `Clothing`, an empty string, a number or an unknown code
- **THEN** the API returns 400 problem details and preserves the item

#### Scenario: Ownership and missing item
- **WHEN** a category patch targets another user's item or a missing item
- **THEN** the API returns respectively 403 or 404 and no mutation occurs

### Requirement: MCP and browser use the same categories
MCP add_item/edit_item SHALL expose the same enum, allow category-only edits and
preserve PATCH omission. The browser SHALL translate labels, group by these codes,
and save local suggestions as ordinary items without invented defaultItemId values.

#### Scenario: Agent category edit appears in browser
- **WHEN** MCP edit_item sets an owned item's category to `electronics`
- **THEN** a browser refetch places it in Electronics and retains the same item ID

#### Scenario: Local suggestion creates shared data
- **WHEN** a user saves a translated suggestion
- **THEN** the API receives its name and category as normal item creation fields
- **THEN** MCP reads the resulting persisted category and name

### Requirement: Existing optional fields retain their semantics
Notes and itemCount SHALL remain nullable; PATCH omission SHALL preserve them,
explicit null SHALL clear, and count SHALL be a positive int32 when specified.
Category work MUST preserve new items' unpacked state and explicit packed updates.

#### Scenario: Category edit preserves nullable details
- **WHEN** an item with notes and unspecified itemCount is moved to another category
- **THEN** notes are preserved, itemCount remains null, and packed state is unchanged

#### Scenario: Clearing optional inputs
- **WHEN** an owner explicitly clears notes and quantity in an edit
- **THEN** the browser sends null for those dirty fields and their persisted values become null
