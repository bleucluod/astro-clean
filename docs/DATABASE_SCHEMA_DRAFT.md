# Halleus Database Schema Draft

This draft is intentionally provider-neutral.

It can map to Supabase, Neon, Render Postgres, or another Postgres provider.

## report visibility

- private
- public

## report source

- local-preview
- account

## reports table draft

```sql
create table reports (
  id text primary key,
  user_id text not null,
  report_json jsonb not null,
  note text,
  favorite boolean not null default false,
  visibility text not null default 'private',
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## birth profiles table draft

```sql
create table birth_profiles (
  id text primary key,
  user_id text not null,
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
```

## import path

When accounts exist, imported local reports can be attached to the logged-in user.

The local report id should be preserved when possible to avoid duplicate reports.
