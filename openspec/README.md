# Cross-component OpenSpec changes

The root `openspec/` directory coordinates changes spanning the Maletapp services.
Run its commands from the repository root. The first proposal is
[implement-web-poc](changes/implement-web-poc/proposal.md), with
[design decisions](changes/implement-web-poc/design.md), capability specifications
under its `specs/` directory and [implementation tasks](changes/implement-web-poc/tasks.md).
These are planning artifacts; unchecked tasks have not been implemented.

The existing `api/openspec/` catalog and archive remain in place. Use `api/` as
the command directory for those existing API-local changes. Do not create a
second copy of their packed-state specification in the root catalog.

Root proposals do not supersede `api/spec/item.yml`, `api/spec/trip.yml` or the
API constitution. An implementation changing those contracts must update their
related API specifications in the same session. Component documentation remains
with each service as required by the root AGENTS.md.

Validate the current proposal without implementing it:

```sh
openspec validate implement-web-poc --strict
openspec status --change implement-web-poc
```
