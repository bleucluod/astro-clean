-- Additive ownership extension. Existing account reports and payment references are preserved.
begin;
alter table halleus_private.vedic_d1_reports
  alter column owner_id drop not null,
  add column guest_owner_id uuid,
  add constraint vedic_d1_exactly_one_owner check ((owner_id is null) <> (guest_owner_id is null)),
  add constraint vedic_d1_guest_input_unique unique (guest_owner_id,input_hash);
create index vedic_d1_guest_created_idx on halleus_private.vedic_d1_reports (guest_owner_id,created_at desc,id) where guest_owner_id is not null;
commit;
