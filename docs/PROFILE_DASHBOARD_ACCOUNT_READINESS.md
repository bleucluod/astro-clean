# Halleus Profile and Dashboard Account Readiness

This milestone turns profile and dashboard into account-ready product surfaces.

## What changed

- Dashboard now reads report summaries through the storage query service.
- Dashboard shows report, favorite, note, privacy, and storage-driver status.
- Profile now reads the preview account session through the account repository.
- Profile shows plan entitlements and the next account migration steps.
- No real auth provider is enabled yet.

## Why this matters

The product now has account-shaped surfaces before real auth is introduced.

That makes the future auth/database work less disruptive because UI pages already speak in terms of sessions, plans, and repository-backed report summaries.

## Next phase

Choose the database/auth direction before adding real login.

Recommended order:

1. Database provider decision.
2. Auth provider decision.
3. Database schema migration.
4. Real account repository.
5. Report migration from local preview.
