# Private physical-shop orders — implementation and release gate

Last edited: 2026-11-05. This is a source-code review candidate, **not a live store release**.

## Scope in this candidate

- Guest cart and shipping are priced by the server; checkout creates an idempotent order before showing bank-transfer details.
- The public order number and private 256-bit access code are separate. Guest lookups, transfer declarations and cancellation use both; no private fields are returned in guest tracking.
- Transfer evidence is a reference number **or** a transfer time. A declaration never automatically verifies payment.
- A guest can download a local UTF-8 receipt containing the order number, private access code and tracking address. The code remains out of the URL and public tracking response; the downloaded file is sensitive and must be kept private.
- Existing `/admini` gets an owner-only order workspace with search, detail, manual bank verification, rejection, preparation, dispatch with Post/Tipax tracking, delivery and cancellation review. Owner transitions append order and admin audit events.
- After manual payment verification, the owner can download a private per-order JSON **production brief** listing product, size, quantity, dates, city, names and short messages. The server rejects unpaid/canceled orders, limits access to the owner, records a download audit event, disables caching and omits recipient/shipping/bank/access-code fields. This brief is **not print-ready artwork**, is not an astronomical calculation, and is not uploaded to a public repository.
- Migration `0032_private_shop_orders_shared_numbers.sql` creates private order tables and one report/order display-number sequence, preserving report UUID/text IDs.
- **All shop pages and new guest/owner order APIs are still closed when `NODE_ENV=production`.** No production database or server was changed by committing the source.

## Required before live activation

1. Inspect the actual self-hosted VPS database (not a guessed cloud endpoint): current `public.halleus_reports` shape, report IDs/timestamps, grants, existing number columns, migrations applied, private schema roles, current maxima and backups. Validate `0032` against that reality before execution.
2. Exercise the migration on an isolated copy of the actual schema and test report/order numbering under concurrent inserts, replays, retries, failed transactions and partial migrations. Backfill and trigger behavior must not interrupt existing report writes.
3. Finish and verify the approved **server-canonical report persistence** gate (T02 in the historical shop plan). The chart form now rejects failed/preview-only engine output and requires a confirmed server-owned save in both normal and comparison modes; browser-only comparison saves and mock fallback were removed. **This is only a source-level gate:** full server generation/storage integrity and isolated authenticated/guest DB E2E remain unverified. The new sequence does not solve them.
4. Run isolated PostgreSQL-backed E2E for cart → quote → create → refresh/retry → transfer → owner verification → fulfillment → guest tracking and cancellation, including duplicate/invalid requests, owner role boundaries, audit immutability and secret leakage checks.
5. Decide and test guest order abuse/rate controls and real notification method. This candidate only records the phone for delivery coordination; it does **not** claim SMS delivery.
6. Complete the actual validated artwork renderer, physical print QA and **private** artwork retention for each custom product. The production brief alone must never be sent to a print shop as a finished design.
7. Reconcile remaining catalog/print-asset workflow, coupon/shipping campaigns and the shop master roadmap. Obtain explicit approval for the DB migration, opening production routes and release via `ops/vps/halleus-release.sh`.

## Check results for this source candidate

- TypeScript, changed-file ESLint, `scripts/check-shop-checkout.mjs`, `scripts/check-shop-orders.mjs`, `scripts/check-shop-print-handoff.mjs` (including mocked owner/payment/audit HTTP checks), admin Origin guard, and `git diff --check`: passed in the shop order source review.
- T02 chart source candidate: TypeScript, affected-file ESLint, `scripts/check-shop-t02-report-gate.mjs` (mocked real engine response/error/fallback cases), real-chart workbench, product-surface guard, encoding and `git diff --check`: **passed**. Actual server/database persistence E2E: **not run**.
- Isolated PostgreSQL E2E and production schema examination: **not run** (no DB connection/environment).
- Full webpack build: **unrelated baseline failures** from pre-existing CSS Module selectors in `app/sky/sky.module.css`, `components/app-shell.module.css`, and `components/report/human-first-report.module.css`.
- Existing admin core and admini UI guards: **unrelated baseline failures** on premium-consent copy and `components/SiteHeader.tsx` legacy `/admin` links.
- Other existing guard failures observed during T02 review: workflow-acceleration requires a missing PR workflow marker; predeploy-home-chart-performance expects older `AppShell.tsx` footer markers; local True Node fixture expects Lilith to remain deferred although the current engine now calculates it. These do not originate in the T02 chart change. No unrelated workflow, UI or engine files were edited.

Rollback is not an automatic `DROP TABLE`: once report/order numbering or private orders are in use, choose a verified backup/roll-forward plan based on the live records. Do not remove customer orders or their audit trail.
