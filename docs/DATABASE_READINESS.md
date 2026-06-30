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


## v0.1.108 Postgres driver checkpoint

A Postgres report database driver now exists behind the existing database contract.

Current lock:

- If `DATABASE_URL` is missing, Halleus still returns the not-configured driver.
- If `DATABASE_URL` is present, `getReportDatabaseDriver()` returns the Postgres driver.
- Product UI and active local preview storage are not wired to database persistence yet.
- The driver supports report list/get/upsert/delete for the existing `halleus_reports` foundation table.
- This step does not run migrations and does not read `.env` secrets in checks.


## v0.1.109 Database repository checkpoint

The database report repository now implements the existing `ReportRepository` contract behind the Postgres driver.

Current lock:

- `createDatabaseReportRepository({ userId })` requires an explicit user id.
- Active product UI still uses local preview storage through `getReportRepository()`.
- This checkpoint does not switch report creation, report list, or report detail to database storage.
- The database repository is ready for controlled server persistence routes/services in the next batch.
- Reports remain private by default and imported reports are forced to account/private storage.


## v0.1.110 Server persistence service checkpoint

A controlled server persistence service now exists behind the database repository.

Current lock:

- `saveServerGeneratedReport({ userId, report })` saves a generated report through the database repository.
- `getServerStoredReport({ userId, reportId })` reads one saved report record through the database repository.
- `listServerReportSummaries({ userId })` returns report summaries through the database repository.
- The active browser UI still uses local preview storage.
- No public route, auth/profile model, migration, payment, or public report visibility was added in this checkpoint.


## v0.1.111 Guarded beta API checkpoint

A disabled-by-default guarded beta API route now exists for server report persistence.

Current lock:

- Route: `app/api/reports/beta/route.ts`.
- The route stays disabled unless `DATABASE_URL`, `HALLEUS_ENABLE_BETA_PERSISTENCE=true`, and `HALLEUS_BETA_PERSISTENCE_USER_ID` are configured.
- `POST` accepts `{ report }` and saves through `saveServerGeneratedReport`.
- `GET` lists summaries or reads one report by `?reportId=`.
- Active `/chart`, `/reports`, and `/reports/[reportId]` still use local preview storage.
- This checkpoint does not add auth, profile accounts, public/indexable reports, payment, migration changes, or UI wiring.


## v0.1.112 Beta API verification runbook checkpoint

A manual verification runbook now exists for the guarded beta report persistence API.

Current lock:

- Runbook: `docs/BETA_API_VERIFICATION_RUNBOOK.md`.
- The runbook verifies disabled mode, enabled local/staging save, enabled read-by-id, and enabled list behavior.
- It explicitly forbids printing or sharing `.env` secrets and real user birth data.
- Active `/chart`, `/reports`, and `/reports/[reportId]` still use local preview storage.
- UI database wiring remains blocked until the runbook passes against local/staging database config.
