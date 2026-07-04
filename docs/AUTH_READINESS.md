# Halleus Auth Readiness

This phase prepares authentication without enabling real login yet.

## What was added

- Auth provider types.
- Auth driver contract.
- Preview auth driver.
- Auth driver factory.
- Auth readiness report.
- Provider options and decision notes.
- Local-preview to account migration helpers.

## Current state

Halleus still uses preview/local mode.

Real login is intentionally not enabled yet. The database/auth direction is now selected as Supabase Auth + Supabase/Postgres, but the implementation remains selected-not-enabled until secrets, driver wiring, and migration review exist.

## Why this matters

Authentication should be introduced as a driver, not scattered across UI components.

This keeps the product path clean:

1. preview session
2. selected auth driver
3. real account session
4. report records attached to user id
5. local preview reports migrated into the account


## v0.1.181 auth driver stub checkpoint

What changed:
- A Supabase auth driver stub exists behind the auth driver contract.
- The stub returns preview/local sessions and unavailable sign-in results.
- `canEnableRealLogin` stays false.
- `getAuthDriver()` still falls back to preview unless guarded stub config is explicitly enabled.

What did not change:
- No real login.
- No Supabase client package.
- No production session creation.
