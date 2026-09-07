# Lessons

- When plan-level structure decisions mention test locations, include any cross-endpoint integration suites that tasks depend on so analysis does not flag artificial scope drift.
- When a requirement mentions an internal entity without a public API surface, explain in plan and task wording how that entity will be verified indirectly so observability expectations stay realistic.

- Before creating a feature branch, inspect current main and honor the user’s requested base; a previously unmerged branch may already have been merged.
