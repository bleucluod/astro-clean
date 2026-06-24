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
