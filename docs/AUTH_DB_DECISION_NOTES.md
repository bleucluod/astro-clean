# Halleus Auth and Database Decision Notes

Provider direction selected in v0.1.180: Supabase Auth + Supabase/Postgres. This is selected-not-enabled; real login and production writes are still off.

## Requirements

- Persian-first UI must stay independent of auth provider.
- Reports must attach to a stable user id.
- Local preview reports must be importable after login.
- Database storage must support report JSON, notes, favorites, and birth profile metadata.
- Payments should not be added before account storage and report quality are stable.

## Candidate directions

### Supabase

Good when auth and database should come from one place.

### Auth.js + Postgres

Good when keeping provider choices flexible.

### Clerk + Postgres

Good when fast account UX matters more than owning auth details.

## Recommended next decision

Pick the database/auth pair before adding real login UI.
