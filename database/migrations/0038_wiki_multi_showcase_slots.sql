-- EW-01: multiple independent showcase slots per Wiki article.
-- Keeps every existing placement and proposal. Run only after a verified backup.
begin;

alter table halleus_private.wiki_shop_showcases
  add column if not exists id uuid;
update halleus_private.wiki_shop_showcases
  set id = gen_random_uuid() where id is null;
alter table halleus_private.wiki_shop_showcases
  alter column id set default gen_random_uuid(),
  alter column id set not null;
alter table halleus_private.wiki_shop_showcases
  alter column article_id set not null;
alter table halleus_private.wiki_shop_showcases
  drop constraint wiki_shop_showcases_pkey;
alter table halleus_private.wiki_shop_showcases
  add constraint wiki_shop_showcases_pkey primary key (id);
create unique index wiki_shop_showcases_article_slot_unique
  on halleus_private.wiki_shop_showcases (article_id, after_section_index);
create index wiki_shop_showcases_article_idx
  on halleus_private.wiki_shop_showcases (article_id);

alter table halleus_private.wiki_shop_showcase_proposals
  drop constraint wiki_shop_showcase_proposals_source_batch_id_article_id_key;
create unique index wiki_shop_showcase_proposals_batch_slot_unique
  on halleus_private.wiki_shop_showcase_proposals
    (source_batch_id, article_id, after_section_index);
create unique index wiki_shop_showcase_proposals_batch_skip_unique
  on halleus_private.wiki_shop_showcase_proposals (source_batch_id, article_id)
  where status = 'skipped';

alter table halleus_private.wiki_shop_showcase_exports
  add column if not exists product_minimums jsonb not null default '{}'::jsonb;
comment on column halleus_private.wiki_shop_showcase_exports.product_minimums is
  'Owner-specified per-product AI proposal targets in the selected export, not enforced purchases.';

commit;
