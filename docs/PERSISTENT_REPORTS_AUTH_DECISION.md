# Halleus Persistent Reports and Auth Decision

## Decision

Use a Supabase-first path for the next real account and persistent reports foundation.

This means:

```text
Auth direction: Supabase Auth
Storage direction: Supabase/Postgres-compatible report storage
Current app mode: local-preview
Current report visibility: private / noindex
Current implementation stage: selected-not-enabled
```

## Why this direction

Halleus needs saved private reports to move out of browser storage without turning the product into infrastructure work.

Supabase-first is the fastest coherent path because account identity and Postgres-backed report storage can move together while the existing repository contracts stay stable.

## What is not enabled yet

This decision does not enable:

```text
real login
real account dashboard data
production database writes
public/indexable reports
payment gating
hosting migration
```

## Required next implementation steps

1. Configure secrets outside Git.
2. Implement a Supabase auth driver behind `AuthDriver`.
3. Keep `preview` auth as the fallback until login is verified.
4. Connect `ReportRepository` writes to authenticated user ids.
5. Add a local-preview migration review step.
6. Import local reports only after the user explicitly confirms.
7. Keep all migrated reports private/noindex by default.

## Migration rules

- Preserve report ids when possible.
- Preserve report JSON, notes, favorites, created dates, and updated dates.
- Default migrated records to `private` and `account`.
- Do not delete browser-local reports until account import succeeds.
- Keep export backup available before migration.

## Product rule

This is a private-report foundation step.

Do not use this decision to start SEO, public report pages, payment, or public/indexable user-generated reports.
