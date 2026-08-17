-- HALLEUS_WIKI_SHAHRIVAR_1405_ENCODING_REPAIR
-- Forward-only repair for the UTF-8 mojibake introduced by 0024.
-- 0024 remains historical evidence. This migration repairs the published row
-- and appends one published revision without changing stable_id, slug,
-- category, publication state, related links, CTA, or link-rule configuration.

begin;

do $halleus_shahrivar_encoding_schema$
begin
  if to_regclass('public.wiki_articles') is null
    or to_regclass('public.wiki_article_revisions') is null
    or to_regclass('public.wiki_article_drafts') is null
    or to_regclass('public.wiki_internal_links') is null
    or to_regclass('halleus_private.wiki_publish_jobs') is null then
    raise exception 'Wiki storage/CMS migrations must be applied before 0025.';
  end if;
end;
$halleus_shahrivar_encoding_schema$;

create or replace function pg_temp.halleus_decode_windows1252_mojibake(value text)
returns text
language plpgsql
immutable
strict
as $halleus_decode$
declare
  normalized text := value;
begin
  -- Reverse the Windows-1252 display mapping for bytes 0x80..0x9F, then
  -- reinterpret the resulting Latin-1 byte sequence as UTF-8.
  normalized := replace(normalized, '€', chr(128));
  normalized := replace(normalized, '‚', chr(130));
  normalized := replace(normalized, 'ƒ', chr(131));
  normalized := replace(normalized, '„', chr(132));
  normalized := replace(normalized, '…', chr(133));
  normalized := replace(normalized, '†', chr(134));
  normalized := replace(normalized, '‡', chr(135));
  normalized := replace(normalized, 'ˆ', chr(136));
  normalized := replace(normalized, '‰', chr(137));
  normalized := replace(normalized, 'Š', chr(138));
  normalized := replace(normalized, '‹', chr(139));
  normalized := replace(normalized, 'Œ', chr(140));
  normalized := replace(normalized, 'Ž', chr(142));
  normalized := replace(normalized, '‘', chr(145));
  normalized := replace(normalized, '’', chr(146));
  normalized := replace(normalized, '“', chr(147));
  normalized := replace(normalized, '”', chr(148));
  normalized := replace(normalized, '•', chr(149));
  normalized := replace(normalized, '–', chr(150));
  normalized := replace(normalized, '—', chr(151));
  normalized := replace(normalized, '˜', chr(152));
  normalized := replace(normalized, '™', chr(153));
  normalized := replace(normalized, 'š', chr(154));
  normalized := replace(normalized, '›', chr(155));
  normalized := replace(normalized, 'œ', chr(156));
  normalized := replace(normalized, 'ž', chr(158));
  normalized := replace(normalized, 'Ÿ', chr(159));

  return convert_from(convert_to(normalized, 'LATIN1'), 'UTF8');
exception
  when character_not_in_repertoire then
    raise exception '0025 refused to decode a value outside the expected Windows-1252/Latin-1 mojibake shape.';
end;
$halleus_decode$;

do $halleus_shahrivar_encoding_preflight$
declare
  article_count integer;
  article_version integer;
  open_draft_count integer;
  active_job_count integer;
  inline_count integer;
  current_title text;
  repaired_title text;
  repaired_short_title text;
  repaired_seo_title text;
  repaired_meta text;
  repaired_summary text;
  repaired_body text;
  repaired_intro text;
  repaired_key_points jsonb;
  repaired_sections jsonb;
  repaired_tags jsonb;
  repaired_sources jsonb;
begin
  select count(*)
    into article_count
  from public.wiki_articles
  where stable_id = 'shahrivar-1405-transit-guide';

  if article_count <> 1 then
    raise exception '0025 requires exactly one shahrivar-1405-transit-guide row; found %.', article_count;
  end if;

  select content_version, title
    into article_version, current_title
  from public.wiki_articles
  where stable_id = 'shahrivar-1405-transit-guide';

  if article_version not in (2, 3) then
    raise exception '0025 requires Shahrivar content_version 2 or repaired version 3; found %.', article_version;
  end if;

  if not exists (
    select 1
    from public.wiki_articles
    where stable_id = 'shahrivar-1405-transit-guide'
      and slug = 'shahrivar-1405-transit-guide'
      and category_id = 'transits'
      and status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
  ) then
    raise exception '0025 requires the existing article to remain current-public, indexable, and in transits.';
  end if;

  select count(*)
    into open_draft_count
  from public.wiki_article_drafts draft
  join public.wiki_articles article on article.id = draft.article_id
  where article.stable_id = 'shahrivar-1405-transit-guide';

  if open_draft_count <> 0 then
    raise exception '0025 refuses to overwrite an open draft for shahrivar-1405-transit-guide.';
  end if;

  select count(*)
    into active_job_count
  from halleus_private.wiki_publish_jobs job
  join public.wiki_articles article on article.id = job.article_id
  where article.stable_id = 'shahrivar-1405-transit-guide'
    and job.status in ('queued', 'running', 'retry');

  if active_job_count <> 0 then
    raise exception '0025 refuses to race an active publish job for shahrivar-1405-transit-guide.';
  end if;

  select count(*)
    into inline_count
  from public.wiki_internal_links link
  join public.wiki_articles article on article.id = link.source_article_id
  where article.stable_id = 'shahrivar-1405-transit-guide'
    and link.link_kind = 'inline';

  if inline_count <> 6 then
    raise exception '0025 requires the existing six inline article-link rows; found %.', inline_count;
  end if;

  if article_version = 3 then
    if current_title <> 'ترنزیت شهریور ۱۴۰۵؛ ماه‌گرفتگی، طالع‌بینی و پیش‌بینی ۱۲ نشان' then
      raise exception '0025 found content_version 3 without the repaired Persian title.';
    end if;
    return;
  end if;

  -- Version 2 is the known 0024 result. It must be mojibake, not already
  -- correct Persian, before any transformation is allowed.
  if current_title ~ '[ء-ی]' then
    raise exception '0025 refuses to transform version 2 because the title already contains Persian text.';
  end if;

  select
    pg_temp.halleus_decode_windows1252_mojibake(title),
    pg_temp.halleus_decode_windows1252_mojibake(short_title),
    pg_temp.halleus_decode_windows1252_mojibake(seo_title),
    pg_temp.halleus_decode_windows1252_mojibake(meta_description),
    pg_temp.halleus_decode_windows1252_mojibake(summary),
    pg_temp.halleus_decode_windows1252_mojibake(body_markdown),
    pg_temp.halleus_decode_windows1252_mojibake(intro),
    pg_temp.halleus_decode_windows1252_mojibake(key_points::text)::jsonb,
    pg_temp.halleus_decode_windows1252_mojibake(sections::text)::jsonb,
    pg_temp.halleus_decode_windows1252_mojibake(tags::text)::jsonb,
    pg_temp.halleus_decode_windows1252_mojibake(sources::text)::jsonb
  into
    repaired_title,
    repaired_short_title,
    repaired_seo_title,
    repaired_meta,
    repaired_summary,
    repaired_body,
    repaired_intro,
    repaired_key_points,
    repaired_sections,
    repaired_tags,
    repaired_sources
  from public.wiki_articles
  where stable_id = 'shahrivar-1405-transit-guide';

  if repaired_title <> 'ترنزیت شهریور ۱۴۰۵؛ ماه‌گرفتگی، طالع‌بینی و پیش‌بینی ۱۲ نشان' then
    raise exception '0025 decoded title does not match the approved Persian title.';
  end if;

  if repaired_short_title <> 'ترنزیت‌های شهریور ۱۴۰۵' then
    raise exception '0025 decoded short title does not match the approved Persian short title.';
  end if;

  if repaired_seo_title <> 'طالع‌بینی شهریور ۱۴۰۵؛ ماه‌گرفتگی و پیش‌بینی ۱۲ نشان | هالیوس' then
    raise exception '0025 decoded SEO title does not match the approved Persian SEO title.';
  end if;

  if repaired_meta <> 'طالع‌بینی و ترنزیت شهریور ۱۴۰۵ برای ۱۲ نشان؛ زمان ماه‌گرفتگی ۶ شهریور، ماه نو سنبله، رترو اورانوس و مهم‌ترین تاریخ‌های ماه را بخوانید.' then
    raise exception '0025 decoded meta description does not match the approved Persian meta description.';
  end if;

  if repaired_summary <> 'راهنمای کامل آسمان شهریور ۱۴۰۵؛ از خسوف ۶ شهریور و ماه نو سنبله تا رترو اورانوس، تاریخ ترنزیت‌های مهم و خوانش جداگانه برای ۱۲ رایزینگ.' then
    raise exception '0025 decoded summary does not match the approved Persian summary.';
  end if;

  if repaired_body not like 'ترنزیت‌های شهریور ۱۴۰۵ با فصل سنبله شروع می‌شوند%'
    or repaired_body not like '%[[page:/chart|ساخت چارت تولد و دیدن ترنزیت‌های شخصی شهریور]]%'
    or repaired_body not like '%[[article:mordad-1405-transit-guide|ترنزیت‌های مرداد ۱۴۰۵]]%'
    or repaired_body not like '%[[article:important-transits-tir-1405|ترنزیت‌های تیر ۱۴۰۵]]%' then
    raise exception '0025 decoded body does not match the approved Persian content anchors.';
  end if;

  if repaired_intro not like 'ترنزیت‌های شهریور ۱۴۰۵ با فصل سنبله شروع می‌شوند%' then
    raise exception '0025 decoded intro does not match the approved Persian intro.';
  end if;

  if jsonb_array_length(repaired_key_points) <> 3
    or jsonb_array_length(repaired_sections) <> 31
    or jsonb_array_length(repaired_tags) <> 8
    or jsonb_array_length(repaired_sources) <> 3 then
    raise exception '0025 decoded structured payload shape changed unexpectedly.';
  end if;

  if repaired_tags ->> 0 <> 'ترنزیت شهریور ۱۴۰۵'
    or repaired_tags ->> 1 <> 'طالع‌بینی شهریور ۱۴۰۵'
    or repaired_tags ->> 2 <> 'ماه‌گرفتگی شهریور ۱۴۰۵' then
    raise exception '0025 decoded tags do not match the approved Persian tags.';
  end if;

  if repaired_sections::text !~ '[ء-ی]'
    or repaired_key_points::text !~ '[ء-ی]'
    or repaired_sources::text !~ '[ء-ی]' then
    raise exception '0025 decoded structured fields are missing expected Persian text.';
  end if;
end;
$halleus_shahrivar_encoding_preflight$;

lock table public.wiki_articles in share row exclusive mode;
lock table public.wiki_article_revisions in share row exclusive mode;

create temporary table halleus_shahrivar_encoding_target on commit drop as
select
  article.*,
  pg_temp.halleus_decode_windows1252_mojibake(article.title) as repaired_title,
  pg_temp.halleus_decode_windows1252_mojibake(article.short_title) as repaired_short_title,
  pg_temp.halleus_decode_windows1252_mojibake(article.seo_title) as repaired_seo_title,
  pg_temp.halleus_decode_windows1252_mojibake(article.meta_description) as repaired_meta_description,
  pg_temp.halleus_decode_windows1252_mojibake(article.summary) as repaired_summary,
  pg_temp.halleus_decode_windows1252_mojibake(article.body_markdown) as repaired_body_markdown,
  pg_temp.halleus_decode_windows1252_mojibake(article.intro) as repaired_intro,
  pg_temp.halleus_decode_windows1252_mojibake(article.key_points::text)::jsonb as repaired_key_points,
  pg_temp.halleus_decode_windows1252_mojibake(article.sections::text)::jsonb as repaired_sections,
  pg_temp.halleus_decode_windows1252_mojibake(article.tags::text)::jsonb as repaired_tags,
  pg_temp.halleus_decode_windows1252_mojibake(article.sources::text)::jsonb as repaired_sources,
  article.content_version + 1 as repaired_content_version
from public.wiki_articles article
where article.stable_id = 'shahrivar-1405-transit-guide'
  and article.content_version = 2;

with inserted_revision as (
  insert into public.wiki_article_revisions (
    article_id,
    revision_number,
    snapshot,
    change_note,
    created_by,
    revision_status,
    published_at
  )
  select
    target.id,
    (
      select coalesce(max(existing.revision_number), 0)::integer + 1
      from public.wiki_article_revisions existing
      where existing.article_id = target.id
    ),
    jsonb_build_object(
      'stableId', target.stable_id,
      'slug', target.slug,
      'title', target.repaired_title,
      'shortTitle', target.repaired_short_title,
      'seoTitle', target.repaired_seo_title,
      'metaDescription', target.repaired_meta_description,
      'categoryId', target.category_id,
      'tags', target.repaired_tags,
      'summary', target.repaired_summary,
      'intro', target.repaired_intro,
      'readingMinutes', target.reading_minutes,
      'publicationPriority', target.publication_priority,
      'contentCluster', coalesce(target.content_cluster, target.category_id),
      'articleRole', target.article_role,
      'relatedArticleIds', target.related_article_ids,
      'indexable', target.is_indexable,
      'bodyMarkdown', target.repaired_body_markdown,
      'keyPoints', target.repaired_key_points,
      'sections', target.repaired_sections,
      'contextLinks', target.context_links,
      'sources', target.repaired_sources,
      'callToAction', target.call_to_action,
      'contentVersion', target.repaired_content_version
    ),
    'Repair Shahrivar 1405 UTF-8 mojibake from 0024',
    null,
    'published',
    now()
  from halleus_shahrivar_encoding_target target
  returning article_id
)
update public.wiki_articles article
set
  title = target.repaired_title,
  short_title = target.repaired_short_title,
  seo_title = target.repaired_seo_title,
  meta_description = target.repaired_meta_description,
  summary = target.repaired_summary,
  body_markdown = target.repaired_body_markdown,
  intro = target.repaired_intro,
  key_points = target.repaired_key_points,
  sections = target.repaired_sections,
  tags = target.repaired_tags,
  sources = target.repaired_sources,
  content_version = target.repaired_content_version
from halleus_shahrivar_encoding_target target
where article.id = target.id
  and exists (
    select 1
    from inserted_revision revision
    where revision.article_id = article.id
  );

do $halleus_shahrivar_encoding_verify$
declare
  inline_count integer;
  latest_change_note text;
begin
  if not exists (
    select 1
    from public.wiki_articles
    where stable_id = 'shahrivar-1405-transit-guide'
      and slug = 'shahrivar-1405-transit-guide'
      and category_id = 'transits'
      and status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
      and content_version = 3
      and title = 'ترنزیت شهریور ۱۴۰۵؛ ماه‌گرفتگی، طالع‌بینی و پیش‌بینی ۱۲ نشان'
      and short_title = 'ترنزیت‌های شهریور ۱۴۰۵'
      and seo_title = 'طالع‌بینی شهریور ۱۴۰۵؛ ماه‌گرفتگی و پیش‌بینی ۱۲ نشان | هالیوس'
      and meta_description = 'طالع‌بینی و ترنزیت شهریور ۱۴۰۵ برای ۱۲ نشان؛ زمان ماه‌گرفتگی ۶ شهریور، ماه نو سنبله، رترو اورانوس و مهم‌ترین تاریخ‌های ماه را بخوانید.'
      and summary = 'راهنمای کامل آسمان شهریور ۱۴۰۵؛ از خسوف ۶ شهریور و ماه نو سنبله تا رترو اورانوس، تاریخ ترنزیت‌های مهم و خوانش جداگانه برای ۱۲ رایزینگ.'
      and body_markdown like 'ترنزیت‌های شهریور ۱۴۰۵ با فصل سنبله شروع می‌شوند%'
      and body_markdown like '%[[page:/chart|ساخت چارت تولد و دیدن ترنزیت‌های شخصی شهریور]]%'
      and jsonb_array_length(key_points) = 3
      and jsonb_array_length(sections) = 31
      and jsonb_array_length(tags) = 8
      and jsonb_array_length(sources) = 3
  ) then
    raise exception '0025 postcondition failed for repaired Persian article content.';
  end if;

  select count(*)
    into inline_count
  from public.wiki_internal_links link
  join public.wiki_articles article on article.id = link.source_article_id
  where article.stable_id = 'shahrivar-1405-transit-guide'
    and link.link_kind = 'inline';

  if inline_count <> 6 then
    raise exception '0025 must preserve exactly six inline article-link rows; found %.', inline_count;
  end if;

  select revision.change_note
    into latest_change_note
  from public.wiki_article_revisions revision
  join public.wiki_articles article on article.id = revision.article_id
  where article.stable_id = 'shahrivar-1405-transit-guide'
  order by revision.revision_number desc
  limit 1;

  if latest_change_note <> 'Repair Shahrivar 1405 UTF-8 mojibake from 0024' then
    raise exception '0025 latest revision does not record the encoding repair.';
  end if;
end;
$halleus_shahrivar_encoding_verify$;

commit;
