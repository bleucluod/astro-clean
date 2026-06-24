# Halleus Product Status

This document is a working map, not a promise.

## Current stage

Halleus is in public preview MVP.

It is usable enough to demo the main flow:
birth input -> symbolic report -> report archive -> notes/favorites -> export/import.

It is not yet a commercial astrology product because the real chart engine, accounts, database, and payment layer are not implemented yet.

## Progress estimate

| Area | Progress |
| --- | ---: |
| Public deploy and domain | 95% |
| Homepage and brand presentation | 75% |
| Local report flow | 85% |
| Reports archive UX | 75% |
| Development safety checks | 85% |
| Location foundation | 80% |
| Real chart engine | 20% |
| Account and database | 0% |
| Payments and SaaS layer | 0% |
| Commercial MVP overall | 38% |

## What changed with full city data

The location foundation is no longer just a small city preview. The user-provided city dataset is now the product dataset for birth city selection and future chart calculation.

## Next phases

1. Add a storage adapter so browser storage can later become database storage.
2. Decide database and auth stack.
3. Add real chart calculation path.
4. Add account-based saved reports.
5. Add paid report layers only after the report quality is high enough.

## Storage foundation update

The next durable milestone is Storage Adapter v1.

This creates the product contract that will let local preview storage become database-backed account storage later.

Target after this milestone:

| Area | Progress |
| --- | ---: |
| Storage architecture | 35% |
| Database readiness | 15% |
| Account readiness | 10% |

## Storage adapter implementation update

Storage Adapter Implementation v1 adds the first real repository implementation.

The app can now move toward repository-backed UI without changing user-facing behavior.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Storage architecture | 55% |
| Database readiness | 25% |
| Account readiness | 12% |
