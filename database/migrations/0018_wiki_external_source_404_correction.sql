-- Halleus Batch 3: confirmed external-source 404 correction.
-- Candidate only; do not apply outside the normal final roadmap release.
-- Old IAU URL returned 404 in the Batch 3 live audit.

begin;

do $$
declare
  old_url constant text := 'https://www.iau.org/IAU/Iau/Science/What-we-do/The-Constellations.aspx';
  matched_count integer;
  matched_slugs text[];
begin
  if to_regclass('public.wiki_articles') is null
    or to_regclass('public.wiki_article_revisions') is null then
    raise exception 'Wiki storage/CMS migrations must be applied first.';
  end if;

  select count(*)::integer, array_agg(slug order by slug)
    into matched_count, matched_slugs
  from public.wiki_articles
  where deleted_at is null
    and sources is not null
    and sources::text like '%' || old_url || '%';

  if matched_count not in (0, 3) then
    raise exception 'Unexpected old IAU source count: %', matched_count;
  end if;

  if matched_count = 3 and matched_slugs <> array['what-is-astrology','what-is-sidereal-astrology','what-is-tropical-astrology']::text[] then
    raise exception 'Unexpected old IAU source slugs: %', matched_slugs;
  end if;
end;
$$;

lock table public.wiki_articles in share row exclusive mode;
lock table public.wiki_article_revisions in share row exclusive mode;

do $$
begin
  if exists (
    select 1
    from public.wiki_article_drafts as draft
    join public.wiki_articles as article on article.id = draft.article_id
    where article.slug = any(array['what-is-astrology','what-is-sidereal-astrology','what-is-tropical-astrology']::text[])
      and article.deleted_at is null
  ) then
    raise exception 'Target Wiki article has an active draft; resolve it before applying the source correction.';
  end if;

  if exists (
    select 1
    from halleus_private.wiki_publish_jobs as job
    join public.wiki_articles as article on article.id = job.article_id
    where article.slug = any(array['what-is-astrology','what-is-sidereal-astrology','what-is-tropical-astrology']::text[])
      and article.deleted_at is null
      and job.status in ('queued', 'running', 'retry', 'failed')
  ) then
    raise exception 'Target Wiki article has an active publish job; resolve it before applying the source correction.';
  end if;
end;
$$;

with target_rows as (
  select
    article.*,
    replace(article.sources::text, 'https://www.iau.org/IAU/Iau/Science/What-we-do/The-Constellations.aspx', 'https://www.iau.org/IAU/IAU/Astronomy-FAQs/FAQs.aspx')::jsonb as corrected_sources,
    article.content_version + 1 as corrected_version
  from public.wiki_articles as article
  where article.deleted_at is null
    and article.slug = any(array['what-is-astrology','what-is-sidereal-astrology','what-is-tropical-astrology']::text[])
    and article.sources is not null
    and article.sources::text like '%https://www.iau.org/IAU/Iau/Science/What-we-do/The-Constellations.aspx%'
), inserted_revisions as (
  insert into public.wiki_article_revisions (
    article_id, revision_number, snapshot, change_note, created_by,
    revision_status, published_at
  )
  select
    target.id,
    (select coalesce(max(existing.revision_number), 0)::integer + 1
     from public.wiki_article_revisions as existing
     where existing.article_id = target.id),
    case
      when target.body_markdown is not null then jsonb_build_object(
        'stableId', target.stable_id,
        'slug', target.slug,
        'title', target.title,
        'shortTitle', target.short_title,
        'seoTitle', target.seo_title,
        'metaDescription', coalesce(target.meta_description, target.summary),
        'categoryId', target.category_id,
        'tags', target.tags,
        'summary', target.summary,
        'intro', target.intro,
        'readingMinutes', target.reading_minutes,
        'publicationPriority', target.publication_priority,
        'contentCluster', coalesce(target.content_cluster, target.category_id),
        'articleRole', target.article_role,
        'relatedArticleIds', target.related_article_ids,
        'indexable', target.is_indexable,
        'bodyMarkdown', target.body_markdown,
        'keyPoints', target.key_points,
        'contextLinks', coalesce(target.context_links, '[]'::jsonb),
        'sources', target.corrected_sources,
        'callToAction', target.call_to_action,
        'contentVersion', target.corrected_version
      )
      else jsonb_build_object(
        'slug', target.slug,
        'sources', target.corrected_sources,
        'contentVersion', target.corrected_version,
        'batch3ExternalSourceCorrection', true
      )
    end,
    'Batch 3 confirmed external source 404 correction',
    null,
    'published',
    now()
  from target_rows as target
  returning article_id
)
update public.wiki_articles as article
set
  sources = target.corrected_sources,
  content_version = target.corrected_version
from target_rows as target
where article.id = target.id
  and exists (select 1 from inserted_revisions as revision where revision.article_id = article.id);

do $$
begin
  if exists (
    select 1 from public.wiki_articles
    where deleted_at is null
      and sources is not null
      and sources::text like '%https://www.iau.org/IAU/Iau/Science/What-we-do/The-Constellations.aspx%'
  ) then
    raise exception 'Old IAU source URL remains after correction.';
  end if;
end;
$$;

commit;

select 'HALLEUS_BATCH3_WIKI_EXTERNAL_SOURCE_404_CORRECTION=SUCCESS' as marker;
