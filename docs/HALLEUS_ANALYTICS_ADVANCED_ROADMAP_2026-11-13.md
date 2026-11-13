# Halleus advanced analytics — active roadmap (2026-11-13)

## Goal and release boundary

Replace the basic four-screen internal analytics interface with one actionable, Persian-first analytics workspace. The tracking and business data stay on Halleus's self-hosted VPS/PostgreSQL. No GA4 data is read for this workspace. This roadmap is **one implementation/release slice**; do not ship intermediary commits, tags or deployments.

Base: `eee77ac98411fb9ef9f1ab40005edb98d1f2785d`. Previous first-party schema: `database/migrations/0040_first_party_analytics.sql`. Additive new schema: `database/migrations/0041_analytics_engagement_and_hourly.sql`.

## Delivered design and measurement contract

- Seven analytics subsections: overview, live visitors, acquisition, content, time spent, shop/sales, and chart/relationship tools.
- Presets 1/7/30/90 days, custom up-to-90-day range, equal-length previous-period comparison, and interactive trends.
- Hourly activity and minute-level approximate presence. Presence is session-based, not an exact number of humans; multiple tabs are de-duplicated at the server.
- **Every visited permitted public page** for a selected Tehran calendar day: active time sum, views, average active time, scroll depth and page-level daily timeline. Page tables support sorting, searching and pagination; no 35-row cutoff.
- Referrers are reduced client-side to coarse channels. A whitelisted paid-medium indicator and a short-lived anonymous, browser-local first/returning indicator are aggregated without storing names, IPs, account IDs, birth inputs, full referrers or report URLs.
- Time is an estimate derived only from visible/active foreground periods, sent in at most 20-second increments and bounded server-side by elapsed time under a per-session transaction lock.
- Scroll milestones deduplicated per temporary page/session/day. Temporary live sessions, minute presence, and scroll state expire after approximately 48 hours; daily/hourly aggregate history contains no visitor IDs.
- Chart start and completion recorded at valid generation/save boundaries; relationship start/completion recorded in the verified comparison flow; checkout review recorded only after a valid quote. Orders, verified revenue and product orders come directly from existing private shop data and require owner permission.
- Sales-stage numbers are independent aggregates, not a personally attributed conversion funnel. Historic visits prior to this migration cannot provide retroactive engagement time.
- Existing Wiki showcase metrics are **read and reused**, not double-counted.

## Safety, database and release

- The `0041` schema is additive and must **not** be applied by a code build or Pull. After source QA, back up the actual running PostgreSQL database, validate the archive with a compatible `pg_restore`, verify the previously applied `0040` schema, and apply `0041` transactionally with preflight/column/RLS/index checks.
- Before the migration, GET admin analytics should show a friendly not-ready state rather than inventing zeros. Keep the live service on the previous release until database activation has been explicitly approved.
- Commit/push source in one reviewed implementation boundary. Separate code sync, DB migration, and official `ops/vps/halleus-release.sh` deploy; do not automatically alter production.
- Relevant focused checks: `node scripts/check-halleus-analytics.mjs`, `node scripts/check-privacy-conscious-analytics.mjs`, `node scripts/check-ga4-public-analytics.mjs`, admin UI guards, affected ESLint, TypeScript, `git diff --check`; release engine performs build/atomic activation/rollback smoke.
- Current state until runtime confirmation: **source implementation candidate**; production migration/deployment and live browser verification **pending**.

## Operational follow-up

1. Finish source review and one scoped commit/push after authorization.
2. Source-only VPS Pull and independent QA; capture **all** root causes before fixing.
3. Explicitly authorized backup/migration/official release.
4. Verify current/previous release, auth boundary, live visit count, active time accumulation for a consenting public browser, daily page metrics and privacy opt-out. Only then declare `ROADMAP_COMPLETE`.
