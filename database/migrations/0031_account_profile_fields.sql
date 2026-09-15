-- Halleus account profile fields: DOB + current residence.
-- Additive only. No historical backfill and no report snapshot rewrite.

begin;

alter table public.halleus_users
  add column if not exists profile_birth_date date,
  add column if not exists residence_city text,
  add column if not exists residence_country text,
  add column if not exists residence_city_id text,
  add column if not exists residence_latitude double precision,
  add column if not exists residence_longitude double precision,
  add column if not exists residence_timezone text,
  add column if not exists profile_updated_at timestamptz;

comment on column public.halleus_users.profile_birth_date is
  'Editable account DOB. First authenticated natal save initializes it only when null; later report saves never overwrite it.';
comment on column public.halleus_users.residence_city is
  'Current residence city for the account profile. Distinct from report-time birth city.';
comment on column public.halleus_users.residence_city_id is
  'Canonical Halleus city id for current residence when selected from the shared location catalog.';
comment on column public.halleus_users.profile_updated_at is
  'Last account-profile DOB/residence update; report snapshots remain immutable.';

commit;