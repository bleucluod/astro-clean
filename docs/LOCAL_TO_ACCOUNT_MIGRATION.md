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


## v0.1.181 migration preflight checkpoint

Before migration can run:
- Real Supabase auth must create a stable user id.
- Account storage must be explicitly enabled.
- The user must review local report counts.
- Imported reports must stay private/noindex.
- Local-preview reports must remain available until account import succeeds.


## v0.1.182 migration preflight UI

What changed:
- Dashboard shows local report counts before any account migration.
- Preflight includes migratable count, favorites, notes, and private report count.
- The only safe action remains exporting JSON from reports.

Still blocked:
- No account import.
- No local-preview deletion.
- No public/indexable migration.
- No real database write.

Required before migration:
- Real Supabase login with stable user id.
- Account storage explicitly enabled.
- Imported/skipped counts confirmed by the user.
- Backup/export available before import.


## v0.1.183 migration review shell

What changed:
- Dashboard now has a migration review shell with would-import and would-skip counts.
- Backup/export is shown as the required safe step before migration.
- Supabase email/password login can be tested when public env config and the guarded login flag are set.

Still blocked:
- No account report import.
- No local-preview deletion.
- No account report writes.
- No public/indexable migration.
