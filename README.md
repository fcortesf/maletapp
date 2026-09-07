# Maletapp API

Maletapp is a travel-planning API for organizing trips and the packing items associated with those trips.

The current implementation is an ASP.NET Core Minimal API on .NET 10 with Entity Framework Core and an in-memory database. It exposes a Trips sub-API and an Items sub-API, with ownership enforced through a request-scoped current user.

In the target architecture, this service is a private-by-default domain-oriented API. Public authentication is expected to happen at trusted edges, with the core receiving only trusted current-user context.

## Purpose

Based on the current specifications, the API is intended to let a traveler:

- create a trip with a destination and optional travel dates
- list only the trips they own
- retrieve one trip they own
- list packing items for one of their trips
- create a packing item directly under a trip, assigning it to that trip's default baggage
- retrieve one owned item
- partially update an owned item

The authentication mechanism is intentionally out of scope for now. In the current local and integration-test setup, user identity is usually supplied through the `X-Test-User-Id` request header. That header is a development-only shortcut, not a public production authentication contract.

## Current API Scope

The source-of-truth contracts live in:

- `spec/trip.yml`
- `spec/item.yml`

Implemented endpoints in the current codebase:

- `POST /trips`
- `GET /trips`
- `GET /trips/{tripId}`
- `GET /trips/{tripId}/items`
- `POST /trips/{tripId}/items`
- `GET /items/{itemId}`
- `PATCH /items/{itemId}`

Notes about scope:

- Trips and Items are treated as separate sub-APIs.
- Item access is enforced through trip ownership.
- `spec/item.yml` also defines baggage-based item routes and an item check action, but those routes are not part of the currently implemented slice.

## Tech Stack

- C# / .NET 10 (`net10.0`)
- ASP.NET Core Minimal API
- Entity Framework Core InMemory provider
- Swagger / OpenAPI via Swashbuckle

## Project Layout

- `src/Trip.API` - API application
- `tests/Trip.API.UnitTests` - unit tests
- `tests/Trip.API.IntegrationTests` - integration tests
- `spec` - OpenAPI contracts
- `specs` - feature specs, plans, and quickstarts

## Run Locally

Prerequisites:

- .NET 10 SDK

Start the API:

```bash
dotnet run --project src/Trip.API
```

The app enables Swagger UI in Development. The sample HTTP requests in `src/Trip.API/Trip.API.http` use the default local address `http://localhost:5110`.

## Access Model

- The current HTTP service should be treated as a private-by-default core API in the target architecture.
- Ownership and authorization remain inside the application layer and are expressed in business terms using the current user and resource ownership.
- Public consumers such as a frontend, MCP server, or LLM tool host should authenticate at a trusted edge and then invoke the core with trusted identity.
- `X-Test-User-Id` exists only for local development and integration testing until a production-facing auth edge is introduced.

## Example Requests

Create a trip:

```http
POST /trips
X-Test-User-Id: 11111111-1111-1111-1111-111111111111
Content-Type: application/json

{
  "destination": "Vienna",
  "startDate": "2026-06-01",
  "endDate": "2026-06-04"
}
```

Create an item in a trip:

```http
POST /trips/{tripId}/items
X-Test-User-Id: 11111111-1111-1111-1111-111111111111
Content-Type: application/json

{
  "name": "Passport",
  "defaultItemId": null
}
```

These examples use the development-only test header for local execution. They are not a recommended production exposure model.

## Verification

Build:

```bash
dotnet build --no-incremental
```

Test:

```bash
dotnet test --no-build
```

Format check:

```bash
dotnet format --verify-no-changes
```

## Item comments and quantities

Create items with optional nullable `notes` and `itemCount`:

```json
{ "name": "Socks", "notes": "Bring two spare pairs", "itemCount": 4 }
```

`itemCount` is a positive int32 (1–2147483647). Omitted or null values on
creation remain null; null means unspecified, not one. Both fields are returned
by item reads and can be edited with PATCH: omission preserves, explicit null
clears. `isPacked` remains independent of quantity. Swagger exposes the create,
patch and response fields; the source contract is `spec/item.yml`.

This is a breaking API change: the former check counter and check action have
been removed. Consumers must use `isPacked` for preparation status. Deploy the
matching MCP version with this API. No running containers are updated by these
source changes; recreating the in-memory domain discards its existing data.
