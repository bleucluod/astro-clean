# Halleus Auth Provider Decision Matrix

No provider is selected yet.

## Recommended shortlist

### Supabase Auth + Supabase/Postgres

Best if the next goal is shipping database-backed accounts with fewer moving pieces.

### Auth.js + Postgres

Best if provider portability matters more than speed.

### Clerk + Postgres

Best if polished account UI matters early and managed auth is acceptable.

## Product-specific decision criteria

- Can it support Persian-first UI without forcing English-only flows?
- Can report ownership map cleanly to a stable user id?
- Can local-preview reports be migrated safely?
- Can it work well with Render deployment?
- Can secrets live outside Git?
- Can payment/subscription logic be added later without rewriting auth?

## Suggested next decision

Choose either:

1. Supabase for speed and integrated auth/database.
2. Auth.js + Postgres for flexibility and ownership.

Do not add payments before this decision is made.
