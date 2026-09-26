# Maletapp

Maletapp is a trip planning system with a domain API, an authentication gateway,
an MCP server, and a web app prototype. All components are maintained together
in this repository.

## Components

- [`api/`](api/README.md) — ASP.NET Core domain API and its OpenAPI contracts.
- [`gateway/`](gateway/README.md) — TypeScript authentication gateway and local
  Keycloak Compose stack.
- [`mcp/`](mcp/README.md) — TypeScript MCP server and client examples.
- [`web/`](web/app-design/README.md) — current web app design prototype.

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

## Repository layout

```text
api/       .NET domain API, contracts, and API development specifications
gateway/   TypeScript gateway, Keycloak configuration, and Compose stack
mcp/       TypeScript MCP server
web/       web app prototype
```
