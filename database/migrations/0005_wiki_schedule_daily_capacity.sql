-- Halleus Batch 3 follow-up: human daily scheduling capacity for the Wiki CMS.
-- Additive migration. Apply after 0004_full_wiki_cms.sql.

begin;

do $$
begin
  if to_regclass('halleus_private.wiki_schedule_settings') is null then
    raise exception 'Apply 0004_full_wiki_cms.sql first.';
  end if;
end;
$$;

alter table halleus_private.wiki_schedule_settings
  add column if not exists max_articles_per_day integer not null default 1;

alter table halleus_private.wiki_schedule_settings
  drop constraint if exists wiki_schedule_settings_max_articles_per_day_check;
alter table halleus_private.wiki_schedule_settings
  add constraint wiki_schedule_settings_max_articles_per_day_check
  check (max_articles_per_day between 1 and 12);

alter table halleus_private.wiki_schedule_settings
  drop constraint if exists wiki_schedule_settings_articles_per_week_check;
alter table halleus_private.wiki_schedule_settings
  add constraint wiki_schedule_settings_articles_per_week_check
  check (articles_per_week between 1 and 84);

update halleus_private.wiki_schedule_settings
set max_articles_per_day = case when one_per_day then 1 else least(12, greatest(1, articles_per_week)) end,
    articles_per_week = case
      when one_per_day then jsonb_array_length(allowed_weekdays)
      else least(84, greatest(1, articles_per_week))
    end
where singleton = true;

comment on column halleus_private.wiki_schedule_settings.max_articles_per_day is
  'Maximum scheduled publications on each selected local calendar day.';
comment on column halleus_private.wiki_schedule_settings.articles_per_week is
  'Derived weekly ceiling: selected weekdays multiplied by daily capacity.';

commit;

select 'HALLEUS_V01328C_WIKI_DAILY_CAPACITY_MIGRATION=SUCCESS' as marker;
