# Halleus Billing and Pricing Readiness

This milestone defines pricing and payment readiness without enabling real payments.

## What was added

- Billing types.
- Public billing plan catalog.
- Feature gate helpers.
- Payment driver contract.
- Preview payment driver.
- Billing readiness report.
- Pricing page.

## Current state

Payments are not enabled.

The preview plan stays free while report quality, auth, and database storage are still being prepared.

## Why this matters

Plans and gates should not be scattered through UI components.

They should be defined once and referenced by product surfaces.
