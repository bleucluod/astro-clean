# Halleus Database Readiness

This phase prepares the database layer without choosing a provider yet.

## What was added

- Runtime environment helper.
- Database driver contract.
- Not-configured database driver.
- Report row mapper.
- Initial Postgres-compatible schema draft.
- Development seed placeholder.
- Environment example file.
- Database readiness checker.

## Why this matters

The codebase now has a stable place for database decisions.

When a provider is selected, the implementation should replace the driver, not rewrite report UI.

## Current state

No production database is connected yet.

The active app continues to use local preview storage.
