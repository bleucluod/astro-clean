# Private physical-shop orders — implementation and release gate

Last edited: 2026-11-05. This is a source-code review candidate, **not a live store release**.

## Scope in this candidate

- Guest cart and shipping are priced by the server; checkout creates an idempotent order before showing bank-transfer details.
- The public order number and private 256-bit access code are separate. Guest lookups, transfer declarations and cancellation use both; no private fields are returned in guest tracking.
- Transfer evidence is a reference number **or** a transfer time. A declaration never automatically verifies payment.
- Existing `/admini` gets an owner-only order workspace with search, detail, manual bank verification, rejection, preparation, dispatch with Post/Tipax tracking, delivery and cancellation review. Owner transitions append order and admin audit events.
- Migration `0032_private_shop_orders_shared_numbers.sql` creates private order tables and one report/order display-number sequence, preserving report UUID/text IDs.
- **All shop pages and new guest/owner order APIs are still closed when `NODE_ENV=production`.** No production database or server was changed by committing the source.

## Required before live activation

1. Inspect the actual self-hosted VPS database (not a guessed cloud endpoint): current `public.halleus_reports` shape, report IDs/timestamps, grants, existing number columns, migrations applied, private schema roles, current maxima and backups. Validate `0032` against that reality before execution.
2. Exercise the migration on an isolated copy of the actual schema and test report/order numbering under concurrent inserts, replays, retries, failed transactions and partial migrations. Backfill and trigger behavior must not interrupt existing report writes.
3. Finish and verify the approved **server-canonical report persistence** gate (T02 in the historical shop plan); the new sequence does not solve local-only report generation.
4. Run isolated PostgreSQL-backed E2E for cart → quote → create → refresh/retry → transfer → owner verification → fulfillment → guest tracking and cancellation, including duplicate/invalid requests, owner role boundaries, audit immutability and secret leakage checks.
5. Decide and test guest order abuse/rate controls and real notification method. This candidate only records the phone for delivery coordination; it does **not** claim SMS delivery.
6. Reconcile remaining catalog/print-asset workflow, coupon/shipping campaigns and the shop master roadmap. Obtain explicit approval for the DB migration, opening production routes and release via `ops/vps/halleus-release.sh`.

## Check results for this source candidate

- TypeScript, changed-file ESLint, `scripts/check-shop-checkout.mjs`, `scripts/check-shop-orders.mjs`, admin Origin guard, and `git diff --check`: passed.
- Isolated PostgreSQL E2E and production schema examination: **not run** (no DB connection/environment).
- Full webpack build: **unrelated baseline failures** from pre-existing CSS Module selectors in `app/sky/sky.module.css`, `components/app-shell.module.css`, and `components/report/human-first-report.module.css`.
- Existing admin core and admini UI guards: **unrelated baseline failures** on premium-consent copy and `components/SiteHeader.tsx` legacy `/admin` links.

Rollback is not an automatic `DROP TABLE`: once report/order numbering or private orders are in use, choose a verified backup/roll-forward plan based on the live records. Do not remove customer orders or their audit trail.
