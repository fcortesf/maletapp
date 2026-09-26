# Repository guidance

Maletapp is a monorepo containing independently built services. Keep service-
specific implementation rules in the component's `AGENTS.md` and update the
relevant component documentation when changing behavior.

## Components and sources of truth

- `api/` — .NET domain API. Its contracts are `api/spec/item.yml` and
  `api/spec/trip.yml`; see `api/AGENTS.md`.
- `gateway/` — TypeScript authentication gateway and local Compose stack.
- `mcp/` — TypeScript MCP service.
- `web/` — web app prototype.

Changes that cross service boundaries must update the affected contracts or
documentation in each component. Keep local secrets in ignored `.env` files;
commit only `.env.example` templates.

## Integrated stack

The Compose project is `gateway/docker-compose.yml`. Run it from `gateway/`.
It builds the domain API from the repository root and includes MCP with the
`mcp` profile.
