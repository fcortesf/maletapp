# Quickstart: User Access Layer Strategy

## Goal

Apply a user/access-layer strategy that keeps Maletapp's trip and item capabilities reusable across frontend, MCP, and LLM tool consumers while preserving a private-by-default core and keeping authentication at trusted edges.

## Implementation Sequence

1. Confirm the target architecture:
   - the current `Trip.API` service is private-by-default
   - authentication is validated at trusted edges
   - identity is translated into internal `UserId` before the core is invoked
   - authorization remains in application/business terms
2. Review the current-user seam in `src/Trip.API/Application/Abstractions/IUserContextAccessor.cs` and `src/Trip.API/Infrastructure/UserContext/HttpUserContextAccessor.cs`.
3. Clarify development-only identity injection so it remains available for local and test usage without implying a production contract.
4. Review `Program.cs` and endpoint wiring to ensure the API host does not couple application handlers to HTTP-specific identity concerns.
5. Update documentation so the README, feature artifacts, and HTTP examples consistently describe:
   - the private/public boundary
   - the identity-validation boundary
   - the identity-translation boundary
   - the authorization boundary
6. Add or update tests proving:
   - requests without resolved current user fail as unauthorized
   - owned-resource access still works through the current-user seam
   - foreign-resource access still fails as forbidden
   - application handlers remain independent from direct HTTP auth parsing
7. Defer any BFF, MCP adapter, or function-calling runtime project until a concrete consumer requires it.

## Manual Verification Checklist

1. Review the repository docs and confirm they describe the current API as private-by-default in the target state.
2. Review the current-user infrastructure and confirm development-only header usage is clearly separated from production trust assumptions.
3. Confirm application handlers still depend only on the internal current-user abstraction.
4. Confirm unauthorized and forbidden flows are still covered by tests.
5. Confirm no domain or application code depends on a concrete external auth provider, token format, or UI-specific contract shape.
6. Confirm adapter-specific concerns are documented outside the core contract rather than merged into `spec/trip.yml` or `spec/item.yml`.

## Verification

1. Run `dotnet build --no-incremental`.
2. Run `dotnet test --no-build`.
3. Run `dotnet format --verify-no-changes`.
4. Manually review:
   - `/home/sicor/local-repos/maletapp/README.md`
   - `/home/sicor/local-repos/maletapp/src/Trip.API/Infrastructure/UserContext/HttpUserContextAccessor.cs`
   - `/home/sicor/local-repos/maletapp/src/Trip.API/Program.cs`
   - `/home/sicor/local-repos/maletapp/src/Trip.API/Trip.API.http`
   - `/home/sicor/local-repos/maletapp/specs/004-user-access-layer-strategy/contracts/access-boundaries.md`

## Notes

- The MVP for this feature is a stable and explicit architectural boundary, not a new public runtime component.
- Keep the current HTTP API useful as a domain-oriented internal adapter unless a later feature explicitly promotes a public-facing subset.
- If a frontend, MCP server, or LLM tool needs a different contract shape, add that shape in an adapter layer first rather than modifying the core contract by default.
