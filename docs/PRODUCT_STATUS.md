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
