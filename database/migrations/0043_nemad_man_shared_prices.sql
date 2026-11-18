-- Shared Nemad Man price group; independent of P01 and P02.
-- Do not auto-apply on Git pull or server start.
-- Production application requires actual-schema preflight, DB backup and separate owner approval.
begin;
do $$
begin
  if to_regclass('halleus_private.shop_price_overrides') is null
     or to_regclass('halleus_private.shop_price_change_events') is null then
    raise exception 'Verify migration 0035 before applying 0043';
  end if;
  if not exists (select 1 from pg_constraint where
      conrelid = 'halleus_private.shop_price_overrides'::regclass
      and conname = 'shop_price_overrides_product_id_check')
     or not exists (select 1 from pg_constraint where
      conrelid = 'halleus_private.shop_price_change_events'::regclass
      and conname = 'shop_price_change_events_product_id_check') then
    raise exception '0035 price constraints differ: verify live schema first';
  end if;
end $$;
alter table halleus_private.shop_price_overrides
  drop constraint shop_price_overrides_product_id_check;
alter table halleus_private.shop_price_overrides
  add constraint shop_price_overrides_product_id_check
  check (product_id in ('p01', 'p02', 'nm'));
alter table halleus_private.shop_price_change_events
  drop constraint shop_price_change_events_product_id_check;
alter table halleus_private.shop_price_change_events
  add constraint shop_price_change_events_product_id_check
  check (product_id in ('p01', 'p02', 'nm'));
commit;
