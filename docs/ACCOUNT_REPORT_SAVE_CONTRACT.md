# Halleus Account Report Save Contract

## v0.1.182 scope

This batch prepares the account report save contract and migration preflight UI.

It does not enable:

```text
real login
account report writes
database migration execution
local-preview deletion
public/indexable reports
payment
SEO launch
```

## Active save mode

```text
activeSaveMode: local-preview
futureSaveMode: account-storage
canSaveToAccount: false
defaultVisibility: private
indexingPolicy: noindex
```

## Required before enabling account saves

1. Real Supabase auth must create stable user ids.
2. Account storage must be explicitly enabled after verification.
3. New report saves must route through a user-owned repository.
4. Local-preview fallback must remain available until account saves are verified.
5. Migration UI must show imported/skipped counts before account import.

## Preservation rules

- Keep reports private/noindex.
- Preserve report ids when possible.
- Preserve notes, favorites, createdAt, updatedAt, and report JSON.
- Never delete browser-local reports until account import succeeds.

## Migration preflight UI

Dashboard may show migration readiness:

- local report count
- migratable count
- favorite count
- note count
- private count
- disabled migration action
- safe next action: export JSON first

This is a preflight surface only; it must not write account records.

## v0.1.184 user-owned account report save path

New report saves may write an account copy only when all guards pass:

```text
activeSaveMode: local-preview-with-account-copy
futureSaveMode: account-storage
canSaveToAccount: guarded by env/session/storage
defaultVisibility: private
indexingPolicy: noindex
```

Required guards:
- `NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN=true`
- `NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true`
- `HALLEUS_ENABLE_ACCOUNT_STORAGE=true`
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- verified Supabase bearer token

Preservation rules:
- The browser local-preview save remains the fallback.
- Account records are owned by the authenticated Supabase user id.
- Account reports stay private/noindex.
- Migration still disabled; this path saves new reports only.
- Never delete browser-local reports after account save.
