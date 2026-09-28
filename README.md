# Maletapp

Maletapp is a trip planning system with a domain API, an authentication gateway,
an MCP server, and a working web PoC. All components are maintained together
in this repository.

## Components

- [`api/`](api/README.md) — ASP.NET Core domain API and its OpenAPI contracts.
- [`gateway/`](gateway/README.md) — TypeScript authentication gateway and local
  Keycloak Compose stack.
- [`mcp/`](mcp/README.md) — TypeScript MCP server and client examples.
- [`web/`](web/README.md) — React/Vite SPA with Keycloak login and same-user MCP live updates; original design prototypes are preserved.

## Run the integrated stack

Requirements: Docker with Compose, .NET 10 SDK, and Node.js 24 or newer for host
development.

The stack uses the existing local gateway settings. From `gateway/`, run:

```sh
docker compose --profile mcp up --build
```

The gateway is available at `http://localhost:5000`, Keycloak at
`http://localhost:8080`, and MCP at `http://localhost:5001/mcp`. The domain API
is private to the Compose network. See the component READMEs for setup, OAuth,
and verification details.

For the browser app, follow the additive Keycloak setup in `web/README.md`, then
run `npm ci` and `npm run dev` from `web/`. Open `http://localhost:5173`.
See [web acceptance evidence](web/docs/acceptance.md) for verified behavior and
the deliberate single-instance, in-memory limits.

## Repository layout

```text
api/       .NET domain API, contracts, and API development specifications
gateway/   TypeScript gateway, Keycloak configuration, and Compose stack
mcp/       TypeScript MCP server
web/       React/Vite web PoC and preserved design prototypes
```
