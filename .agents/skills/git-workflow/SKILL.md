---
name: git-workflow
description: Enforce repository Git workflow conventions for branch naming, branch scope, commits, push timing, and pull request hygiene. Use when Codex is creating a branch, preparing commits, deciding whether work is ready to commit or push, or checking that a proposed Git workflow matches project rules.
---

# Git Workflow

Apply these repository rules whenever Git actions are part of the task.

## Branches

Create one branch per `speckit.tasks` task. Do not mix domains or unrelated concerns on the same branch.

Use exactly one of these prefixes:

- `feat/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`
- `spec/<sub-api>-<short>`

Keep branch names lowercase. Do not use spaces. Do not add slashes beyond the required prefix.

If `speckit.tasks` uses numbered task ids, include the id in the branch name.

Examples:

- `feat/add-item-endpoint`
- `fix/item-not-found-response`
- `chore/update-dependencies`
- `spec/item-pagination`
- `feat/item-042-get-by-id`

## Commits

Use the subject format `<type>(<scope>): <imperative description>`.

Allowed types:

- `feat`
- `fix`
- `chore`
- `test`
- `docs`
- `refactor`

Allowed scopes:

- `item`
- `trip`
- `shared`
- `spec`
- `infra`

Commit subject rules:

- Keep the subject at 72 characters or fewer.
- Do not end the subject with a period.
- Add a body only when the reason is not obvious.
- Keep one logical change per commit.
- Do not bundle unrelated changes.

Examples:

- `feat(item): add GET /items/{id} endpoint`
- `fix(trip): return 404 as Problem Details on missing trip`
- `chore(infra): update .NET SDK to 10.0.1`

## Readiness Gates

Commit only after all of these are true:

- `dotnet build --no-incremental` passes with zero warnings.
- `dotnet test --no-build` passes.
- The `speckit.tasks` task is no longer in an in-progress state.

## Push Rules

Push only after a full `speckit.tasks` task is complete and verified.

Never force-push to `main` or `develop`.

Force-push on feature branches is allowed before a PR is open.

## Pull Requests

Open one pull request per branch and per task.

Set the PR title to the squash commit subject exactly.

Link the `speckit.tasks` task id in the PR description.

Do not merge your own PR without a second review. If this is a solo project with no reviewers, wait 24 hours before self-merging.

## Never Commit

Do not commit:

- `appsettings.*.json` files with real secrets
- `.env` files
- Binary files that are not explicitly tracked
- Generated files that belong in `.gitignore`
