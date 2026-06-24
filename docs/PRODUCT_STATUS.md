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

## Repository-backed reports update

The reports list and report detail now use the report repository facade instead of direct localStorage calls.

Current behavior remains local-preview storage, but the UI path is now closer to a future database-backed account model.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Storage architecture | 65% |
| Database readiness | 30% |
| Account readiness | 15% |

## Storage UI completion update

The report creation path now uses the storage service/repository layer.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Storage architecture | 75% |
| Database readiness | 38% |
| Account readiness | 18% |
| Repository-backed UI | 55% |
| Commercial MVP overall | 41% |


## Account and database foundation update

Account foundations are now represented as typed contracts and preview repositories.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Account readiness | 28% |
| Database readiness | 42% |
| Product configuration | 70% |
| Commercial MVP overall | 43% |


## Profile and dashboard account readiness update

Dashboard and profile now use the account/storage foundation instead of acting like isolated placeholder pages.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Account readiness | 38% |
| Dashboard usefulness | 55% |
| Database readiness | 45% |
| Commercial MVP overall | 45% |


## Database readiness update

Database readiness now has a provider-neutral contract, schema draft, row mapper, env example, and runbook.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Database readiness | 58% |
| Account readiness | 42% |
| Storage architecture | 80% |
| Commercial MVP overall | 47% |


## Auth readiness update

Auth readiness now has typed driver contracts, preview driver, provider options, and local-to-account migration helpers.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Auth readiness | 45% |
| Account readiness | 50% |
| Database readiness | 60% |
| Commercial MVP overall | 49% |


## Billing and pricing readiness update

Billing now has plan definitions, feature gates, payment driver contracts, readiness checks, and a public pricing page.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Billing readiness | 42% |
| Payment readiness | 18% |
| SaaS packaging | 45% |
| Commercial MVP overall | 51% |


## Product surface cleanup update

The public product surface now has a coherent product map, roadmap, privacy page, wiki, and surface checker.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Public product surface | 78% |
| Demo readiness | 72% |
| Commercial MVP overall | 53% |


## Chart engine foundation update

Chart engine readiness now has typed contracts, preview driver, fixtures, strategy docs, and an engine readiness page.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Chart engine readiness | 35% |
| Mock replacement readiness | 28% |
| Report quality foundation | 32% |
| Commercial MVP overall | 55% |


## Report quality foundation update

Report quality now has section blueprints, tone rules, safety checks, quality checker, style guide, and a public quality page.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Report quality foundation | 55% |
| Interpretation readiness | 42% |
| Mock replacement readiness | 35% |
| Commercial MVP overall | 57% |


## Interpretation modules foundation update

Interpretation readiness now has module blueprints, driver contracts, sample preview, composition docs, and an interpretation page.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Interpretation readiness | 52% |
| Report composition readiness | 46% |
| Mock replacement readiness | 42% |
| Commercial MVP overall | 59% |


## Report output V2 integration update

New reports are now enhanced with sectioned preview output and report detail can render V2 sections.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Visible report experience | 45% |
| Report composition readiness | 55% |
| Mock replacement readiness | 48% |
| Commercial MVP overall | 61% |


## Report output V2 UX polish update

Report Output V2 now renders sectioned previews for existing and new reports, with a safer display component and export helper.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Visible report experience | 58% |
| Report output V2 readiness | 62% |
| Demo readiness | 78% |
| Commercial MVP overall | 63% |


## Report output V2 actions update

Report Output V2 now supports TXT download and copy actions directly from the report detail experience.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Visible report experience | 66% |
| Report export usefulness | 70% |
| Demo readiness | 82% |
| Commercial MVP overall | 64% |


## Report output V2 readability update

Report Output V2 now shows section count, word count, reading time, quality score, and a section selector.

Updated estimates:

| Area | Progress |
| --- | ---: |
| Visible report experience | 72% |
| Report readability | 68% |
| Demo readiness | 84% |
| Commercial MVP overall | 65% |
