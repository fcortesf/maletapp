# ADR 0001: Map external identities to internal user IDs

Status: Accepted; implementation pending.

Date: 2026-09-05.

## Context

Maletapp represents user IDs and trip ownership as GUIDs. Its current HTTP accessor reads `X-Test-User-Id` and parses a GUID. The gateway currently forwards a validated GUID `sub` unchanged and rejects non-GUID subjects with 403. Typical Auth0 subjects do not satisfy this contract.

Changing domain IDs to provider subjects would couple ownership to external account identifiers. Renaming the header alone would not resolve the value-type mismatch. OIDC identifies an external user by the combination of issuer and subject, not subject alone; see [OIDC claim stability](https://openid.net/specs/openid-connect-core-1_0.html#ClaimStability).

## Decision

Keep the domain's internal GUID user IDs. Add a persistent identity resolver behind the gateway's shared authentication middleware, used by all BFF adapters. Resolve identity only after validating the JWT.

```text
Validated JWT (iss, sub)
    -> persistent identity resolver
    -> Maletapp user ID (GUID)
    -> trusted identity header
    -> domain ownership checks
```

The mapping stores `issuer`, `subject`, and `user_id`, with a unique constraint on `(issuer, subject)`. Multiple verified external identities may reference one internal user ID. Preserve issuer and subject values exactly; do not lowercase or otherwise normalize them.

For a new account, atomically create the mapping and internal GUID on first authenticated access. Concurrent first requests must resolve to the same internal ID. Persist mappings across restarts and share them across gateway instances; do not use an in-memory map or derive IDs by hashing provider subjects. If resolution fails, do not forward an unresolved identity to the domain.

Account linking requires an explicit flow that verifies control of the accounts. Matching email addresses alone must never grant access to an existing user's data.

## Consequences and follow-up

- Existing domain GUIDs and ownership checks remain intact. The cost is a persistent store and a resolution lookup.
- Before enabling the resolver for existing users, seed mappings from their verified current issuer/subject to their existing internal GUIDs. Otherwise, newly generated GUIDs would disconnect them from their trips.
- Provider migration must explicitly associate verified new identities with existing internal user IDs. Changing `KEYCLOAK_AUTHORITY` alone does not migrate accounts.
- Replace `X-Test-User-Id` with an explicit trusted gateway header in a separate coordinated gateway/domain change, and remove the test-header fallback from deployed environments. This does not change the GUID value model or remove the need for private domain access.
- Choose the datastore, schema migration mechanism, account-linking flow, and resolver outage response during implementation. A separate identity microservice is not required by this decision.

This ADR records an agreed direction, not completed functionality or authorization to modify the domain repository. The current scaffold still forwards GUID subjects directly; identity mapping and header migration remain unimplemented.
