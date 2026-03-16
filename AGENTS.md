# AGENTS.md

## Source of truth
- Cross-cutting architecture decisions: `speckit.constitution`
- Items sub-API spec & plan: `speckit/item.spec`, `speckit/item.plan`
- Trips sub-API spec & plan: `speckit/trip.spec`, `speckit/trip.plan`
- Active work: `speckit.tasks` (tasks are tagged [item] or [trip])
- API contracts:
  - `spec/item.yml` — Items contract, source of truth for that domain
  - `spec/trip.yml` — Trips contract, source of truth for that domain
- Do not modify any `.yml` without updating its corresponding `.spec` in the same session

## Contract boundary rule
- Items and Trips are separate sub-APIs — do not introduce cross-domain
  dependencies in the implementation without updating `speckit.constitution` first

## Build & verify
- Build: `dotnet build --no-incremental`
- Test: `dotnet test --no-build`
- Format check: `dotnet format --verify-no-changes`
- Treat warnings as errors — do not leave the build with new warnings

## Naming conventions
- Types, methods, public properties: `PascalCase`
- Local variables and parameters: `camelCase`
- Private fields: `_camelCase` with leading underscore
- Interfaces: `I` prefix → `IItemRepository`
- Constants: `PascalCase` (not ALL_CAPS)
- Async methods: always `Async` suffix → `GetItemByIdAsync`
- No abbreviations except universally known ones (Id, Url, Http, Dto)
- Endpoint names must match the `operationId` values in `openapi.yml` exactly

## Async / await
- All async methods return `Task` or `Task<T>` — never `async void`
  (sole exception: event handlers that cannot be avoided)
- `async void` in lambdas is forbidden — use `Func<Task>` instead
- Never use `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` — they propagate deadlocks
- Always propagate `CancellationToken` up to the endpoint; name it `cancellationToken`
- Use `ConfigureAwait(false)` in library/infrastructure code;
  not required in Minimal API endpoint handlers (no SynchronizationContext)
- Use `ValueTask<T>` only in hot paths with frequent synchronous returns (e.g. cache hits)
- For streams use `IAsyncEnumerable<T>` — .NET 10 native LINQ available via
  `System.Linq.AsyncEnumerable`, do not install `System.Linq.Async`
- Controlled parallelism: use `SemaphoreSlim` to throttle concurrency;
  do not fire N tasks without a limit

## Error handling
- Typed domain exceptions (`NotFoundException`, `ConflictException`, etc.)
  inheriting from a shared project base exception
- Minimal API handlers must never let exceptions escape —
  use `IProblemDetailsService` middleware (RFC 9457)
- Use `try/catch` only where you can add context or recover;
  never catch generic `Exception` without re-throwing or logging
- Structured logging with `ILogger<T>` — no `Console.WriteLine`
- In async code: place `try/catch` inside the async method,
  not around the `await` call at the call site

## Code style
- Nullable reference types enabled (`<Nullable>enable</Nullable>`) — no `!` without justification
- `var` only when the type is obvious from the right-hand side
- Prefer pattern matching over chains of `if` for type checks
- Use records for DTOs and immutable value objects
- No magic strings — use constants or strongly-typed options
- One responsibility per file; no god classes

## Scope
- One task from `speckit.tasks` per session — no scope creep
- Do not add production dependencies to `.csproj` without asking first
- Changes to `openapi.yml` require updating `speckit.spec` in the same session
- Commit work in smaller increments during task execution instead of waiting for a large final commit.
- Use $git-workflow to apply this repository's branch, commit, push, and PR conventions.

## Active Technologies
- C# with .NET 10 (`net10.0`) + ASP.NET Core Minimal API, Entity Framework Core, EF Core InMemory provider, OpenAPI/Swagger tooling (001-add-trip-api)
- Entity Framework in-memory database for the current phase (001-add-trip-api)
- Entity Framework in-memory database for the current phase, expanded to persist trips with related baggages and items (002-trip-items-api)
- Entity Framework in-memory database for the current phase, persisting trips with owned baggages and items including `checkCount` (003-item-check-counter)

## Recent Changes
- 001-add-trip-api: Added C# with .NET 10 (`net10.0`) + ASP.NET Core Minimal API, Entity Framework Core, EF Core InMemory provider, OpenAPI/Swagger tooling

## Self-Improvement loop
- After ANY correction from the user: update `memory/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project 
