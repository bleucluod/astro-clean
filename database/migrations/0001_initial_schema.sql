-- Halleus initial database schema draft
-- Provider-neutral Postgres-compatible SQL.
-- Do not run in production before choosing the final auth/user id strategy.

create table if not exists halleus_users (
  id text primary key,
  email text unique,
  display_name text,
  provider text not null default 'email',
  status text not null default 'active',
  plan text not null default 'personal',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists halleus_birth_profiles (
  id text primary key,
  user_id text not null references halleus_users(id) on delete cascade,
  name text,
  birth_date text not null,
  birth_time text not null,
  birth_city text not null,
  birth_country text not null,
  birth_city_id text,
  birth_latitude double precision,
  birth_longitude double precision,
  birth_timezone text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists halleus_reports (
  id text primary key,
  user_id text not null references halleus_users(id) on delete cascade,
  report_json jsonb not null,
  note text,
  favorite boolean not null default false,
  visibility text not null default 'private',
  source text not null default 'account',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists halleus_reports_user_created_idx
  on halleus_reports(user_id, created_at desc);

create index if not exists halleus_reports_user_favorite_idx
  on halleus_reports(user_id, favorite);

create index if not exists halleus_birth_profiles_user_idx
  on halleus_birth_profiles(user_id, created_at desc);
