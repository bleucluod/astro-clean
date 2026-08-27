# Halleus Wiki Source Reality Lock - 2026-08-27

This document records the source reality before the safe-publish and discovery roadmap changes. It is intentionally descriptive: no production data or schema state is inferred beyond the checked code.

## Verified Public Read Path

- Public Wiki article reads are DB-first through `lib/wiki/wiki-repository.ts`.
- Public article eligibility requires `status = 'published'`, `is_indexable = true`, non-null `published_at`, no future `scheduled_for`, and no `deleted_at`.
- Public article pages render through `app/wiki/[slug]/page.tsx` and `components/wiki/WikiArticleRender.tsx`.
- Inline Wiki article links are rendered only when the target exists in the public article snapshot; missing or unpublished targets do not produce public anchors.
- Sitemap entries come from the same public eligibility path through `app/sitemap.ts`.

## Verified Publish Path

- Admin immediate publish is handled by `publishAdminWikiDraft` in `lib/wiki/wiki-cms-service.ts`.
- Scheduled publish is handled by `processDueWikiPublishJobs` in `lib/wiki/wiki-publisher.ts`.
- Both publish paths validate references before publishing and revalidate public Wiki paths after publication.
- Link maintenance already has admin scan, suggestion, approval, and trigger infrastructure in `lib/wiki/wiki-link-admin-service.ts` and `database/migrations/0019_wiki_internal_link_admin.sql`.

## Current Gaps Against The Roadmap

- Article publication and `public.wiki_internal_links` materialization shared the same publish transaction before the first safe-publish implementation slice.
- Runtime link lifecycle state on `public.wiki_internal_links` did not exist before the first safe-publish implementation slice.
- Unpublish was safe at public render time because targets leave the public snapshot, but it did not record or return the affected inbound source set before this slice.
- IndexNow discovery pings were not configured before this change.
- Google URL Inspection status is not integrated; the product must not claim Google indexing from sitemap or IndexNow submission.

## First Implementation Slice

- Add optional `HALLEUS_INDEXNOW_KEY` configuration.
- Serve `/indexnow-key.txt` only when a key is configured.
- Submit Wiki publish, rollback, scheduled-publish, and unpublish URLs to IndexNow as a best-effort side effect after public revalidation.
- Move normal admin and scheduled publish link-table materialization after the article publish commit as a best-effort side effect.
- Add link activation lifecycle columns and mark inbound links disabled when a target is unpublished.
- Keep sitemap and public HTML as the source of truth; IndexNow only notifies compatible engines about URL changes.