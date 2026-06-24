# Halleus Account and Database Foundation

This milestone defines the account model before real authentication is introduced.

## What exists now

Halleus is still in local preview mode.

There is no real auth provider yet, no password flow, and no production user database.

## What this phase adds

- User profile type
- Auth session type
- Plan and entitlement types
- Preview account repository
- Account repository contract
- Brand/domain config
- Environment config documentation
- Account foundation checker

## Why this matters

The product should not invent account logic inside UI components.

Account-related UI should eventually call an account repository, the same way report UI is moving toward a report repository.

## Future implementation path

1. Keep preview account repository while product UI matures.
2. Choose auth provider.
3. Implement account repository backed by the provider.
4. Attach reports to authenticated users.
5. Add account migration/import from local preview.
6. Add payment plans only after report quality is strong enough.
