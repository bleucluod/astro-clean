# Halleus Local Preview to Account Migration

This is the migration plan for moving browser-local reports into a real account.

## Migration target

A logged-in user should be able to import local-preview report records into account storage.

## Data to preserve

- report id
- generated report JSON
- birth input
- favorite status
- private note
- created date
- updated date
- visibility

## Rules

- Keep report ids when possible.
- Default migrated reports to private.
- Do not delete local reports until account import succeeds.
- Show imported/skipped counts.
- Keep an export backup path available.


## v0.1.180 migration lock

Selected direction:
- Supabase Auth + Supabase/Postgres.
- Current app mode remains local-preview.
- Real account import is not enabled yet.

Migration guard:
- The user must review imported/skipped counts before account import.
- Imported reports must stay private/noindex.
- Local reports must not be deleted until account import succeeds.
- Export backup should stay available before migration.
