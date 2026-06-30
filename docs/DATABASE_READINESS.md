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


## v0.1.106 Database MVP contract checkpoint

The next database phase is server-saved report persistence, not a final account/profile system.

Current lock:

- Keep the active app on local preview storage until a database driver is implemented and verified.
- Preserve the repository contract; do not rewrite report UI for database access.
- Store versioned report snapshots first.
- Keep all database-saved reports private/noindex until explicit public consent UX exists.
- Do not start auth, payment, public/indexable report routes, or profile normalization in the first persistence batch.
