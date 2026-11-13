# Halleus multi-surface shop showcases — one approved implementation slice

## Scope / current boundary
- One public showcase card and product catalogue source reused by Wiki, natal report reader, private synastry reading and /sky.
- Wiki continues to support multiple independently reviewed cards. The AI export supplies cumulative readable-text percentage after each section plus preferred windows: first 15–30%, second 60–80%. A short or unrelated article is not forced into two placements.
- Existing published Wiki cards are **not moved or overwritten automatically**. The admin panel exposes recommendations and allows reviewed/manual moves, preserving showcase IDs and metric history.
- New surfaces expose three independently editable content slots each. A page can show multiple distinct products, and adding products to the shop catalogue does not require editing a hard-coded showcase product list. The shop's own checkout activation rules still govern which products may be advertised for ordering.
- One AI ZIP schema v2 remains supported. It can contain selected articles and selected general surface templates, or surfaces alone. The proposal output may contain both wiki proposals and surfaceProposals. Public templates intentionally contain no natal, relationship, chart, visitor or report data.
- New surface AI suggestions import as **pending**, and only a write-capable admin can publish them. A missing/partial migration must never cause public report failures or silent publication.
- Showcases record anonymous **aggregate** impressions and clicks by day and placement, respecting the existing browser opt-out. No raw visitor/session/report IDs are persisted in the new metrics.
- Current Wiki metrics, contents, product offers and unrelated admin areas remain intact.

## Verified-source impact / new migration
- Source base: 0d075971eb4de7ea4d1cb3dc1bccaa4025b8cd38 (successful advanced analytics release).
- Additive production migration: database/migrations/0042_multi_surface_shop_showcases.sql.
- Adds four private/RLS-protected tables for placements, daily counters, AI export batches and reviewed proposals; replaces existing product-ID check constraints with a syntactic ID constraint so a newly registered catalogue product does not require a showcase-specific schema migration.
- **Pull does not apply the migration, activate a Next.js release, or write production data.** Until migration is approved/applied, the public surface endpoint returns an empty list and the admin surface section shows a not-ready message. Wiki keeps its earlier behavior.
- Before production migration: verify exact repository origin/main, source/active/previous SHA and clean tree; check installed PostgreSQL version, actual running app DB credentials, base tables/constraints, and candidate schema; take a root-private full PostgreSQL custom-format backup and validate with compatible pg_restore. Stop on partial schema, wrong DB or backup failure.
- After migration: use only ops/vps/halleus-release.sh, with pre-activation build/smoke and official automatic code rollback. Do not run Wiki repair implicitly. Verify active/previous links, service, public routes, unauthorized admin endpoints, aggregate tracking, opt-out, and real browser placements before declaring ROADMAP_COMPLETE.

## Source checks
- node scripts/check-shop-multi-surface-showcases.mjs
- node scripts/check-privacy-conscious-analytics.mjs
- node scripts/check-vps-release-workflow.mjs
- npx tsc --noEmit (or pnpm exec tsc --noEmit with locked dependencies)
- affected ESLint + git diff --check
- migration and runtime E2E only in the approved VPS release stage.

## Rollback
- Before production: revert staged source/commit (not a destructive DB rollback).
- After migration: rollback code via the canonical release engine; additive 0042 tables remain until a separately reviewed migration. Never drop data implicitly.
