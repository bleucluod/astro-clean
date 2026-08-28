with classified_links as (
  select
    link.source_article_id,
    link.target_stable_id,
    link.link_kind,
    link.source_token,
    case
      when target.id is not null then 'active'
      else 'pending'
    end as next_activation_status
  from public.wiki_internal_links as link
  left join public.wiki_articles as target
    on target.stable_id = link.target_stable_id
   and target.status = 'published'
   and target.is_indexable = true
   and target.published_at is not null
   and target.published_at <= now()
   and target.scheduled_for is null
   and target.deleted_at is null
)
update public.wiki_internal_links as link
set activation_status = classified.next_activation_status,
    activated_at = case
      when classified.next_activation_status = 'active' then now()
      else link.activated_at
    end,
    last_verified_at = now(),
    activation_error = case
      when classified.next_activation_status = 'active' then null
      else 'target-not-public-ready'
    end,
    disabled_at = case
      when classified.next_activation_status = 'active' then null
      else link.disabled_at
    end
from classified_links as classified
where link.source_article_id = classified.source_article_id
  and link.target_stable_id = classified.target_stable_id
  and link.link_kind = classified.link_kind
  and link.source_token = classified.source_token;
