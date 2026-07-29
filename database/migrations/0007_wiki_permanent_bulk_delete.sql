-- Halleus Wiki: owner-only permanent deletion primitive.
-- Apply after 0004_full_wiki_cms.sql.

begin;

create or replace function halleus_private.reject_wiki_revision_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE'
    and current_setting('halleus.wiki_permanent_delete', true) = 'on' then
    return old;
  end if;
  raise exception 'wiki_article_revisions is append-only';
end;
$$;

create or replace function halleus_private.permanently_delete_wiki_articles(
  requested_article_ids uuid[],
  audit_actor_user_id uuid,
  audit_actor_role text,
  audit_reason text,
  audit_correlation_id text
)
returns table (deleted_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public, halleus_private
as $$
declare
  normalized_ids uuid[];
  selected_count integer;
  live_inbound_count integer;
  selected_stable_ids text[];
  selected_slugs text[];
begin
  if audit_actor_role <> 'owner' then
    raise exception 'Only the owner can permanently delete Wiki articles.';
  end if;
  if audit_reason is null or length(btrim(audit_reason)) = 0 then
    raise exception 'A permanent deletion reason is required.';
  end if;

  select array_agg(distinct article_id order by article_id)
  into normalized_ids
  from unnest(requested_article_ids) as article_id;
  if normalized_ids is null or cardinality(normalized_ids) < 1
    or cardinality(normalized_ids) > 100 then
    raise exception 'Permanent deletion requires between 1 and 100 unique articles.';
  end if;

  perform 1
  from public.wiki_articles
  where id = any(normalized_ids)
  order by id
  for update;

  select count(*), array_agg(stable_id order by id), array_agg(slug order by id)
  into selected_count, selected_stable_ids, selected_slugs
  from public.wiki_articles
  where id = any(normalized_ids)
    and status = 'archived'
    and deleted_at is not null;
  if selected_count <> cardinality(normalized_ids) then
    raise exception 'Every article must be soft-deleted and archived before permanent deletion.';
  end if;

  select count(*)
  into live_inbound_count
  from public.wiki_internal_links as link
  join public.wiki_articles as source on source.id = link.source_article_id
  where link.target_stable_id = any(selected_stable_ids)
    and source.id <> all(normalized_ids)
    and source.deleted_at is null;
  if live_inbound_count > 0 then
    raise exception 'Remove live inbound Wiki links before permanent deletion.';
  end if;

  if exists (
    select 1 from halleus_private.wiki_publish_jobs
    where article_id = any(normalized_ids) and status = 'running'
    for update
  ) then
    raise exception 'A running Wiki publish job blocks permanent deletion.';
  end if;

  perform set_config('halleus.wiki_permanent_delete', 'on', true);
  delete from public.wiki_redirects where target_article_id = any(normalized_ids);
  delete from public.wiki_internal_links
  where source_article_id = any(normalized_ids)
     or target_stable_id = any(selected_stable_ids);
  update halleus_private.wiki_import_items
  set article_id = null
  where article_id = any(normalized_ids);
  delete from halleus_private.wiki_publish_jobs
  where article_id = any(normalized_ids);
  delete from public.wiki_article_drafts
  where article_id = any(normalized_ids);
  delete from public.wiki_article_revisions
  where article_id = any(normalized_ids);
  delete from public.wiki_articles
  where id = any(normalized_ids);

  insert into halleus_private.admin_audit_events (
    actor_user_id, actor_role, action, target_type, target_id,
    before_summary, after_summary, reason, success, request_correlation_id
  ) values (
    audit_actor_user_id, audit_actor_role,
    'admin.wiki.articles_bulk_permanently_deleted', 'wiki_article_batch',
    array_to_string(normalized_ids, ','),
    jsonb_build_object(
      'articleIds', normalized_ids,
      'stableIds', selected_stable_ids,
      'slugs', selected_slugs,
      'count', selected_count
    ),
    jsonb_build_object('deleted', true, 'count', selected_count),
    audit_reason, true, audit_correlation_id
  );

  return query select selected_count;
end;
$$;

revoke all on function halleus_private.permanently_delete_wiki_articles(
  uuid[], uuid, text, text, text
) from public;
grant execute on function halleus_private.permanently_delete_wiki_articles(
  uuid[], uuid, text, text, text
) to service_role;

commit;

select 'HALLEUS_WIKI_PERMANENT_BULK_DELETE_MIGRATION=SUCCESS' as marker;
