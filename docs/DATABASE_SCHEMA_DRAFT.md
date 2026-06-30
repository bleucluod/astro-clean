# Halleus Database Schema Draft

This draft is intentionally provider-neutral.

It can map to Supabase, Neon, Render Postgres, or another Postgres provider after the provider decision is made.

## v0.1.106 Database MVP contract

The current database milestone is not a final user/profile/report schema.

The MVP database goal is narrower:

```text
persist generated report snapshots on the server
open saved report detail again by id
keep reports private/noindex by default
connect a report to a manual fuller-report request
avoid locking the final profile, account, payment, or public report model too early
```

## Scalability rule

Save reports as versioned snapshots first.

Do not over-normalize report sections, astrology placements, copy blocks, or future paid/private/public behavior before the report generation model is stable.

Every stored report should keep enough metadata to be readable later even if the engine changes:

- output version
- generation contract version
- generation status
- calculation source
- input snapshot
- engine snapshot when available
- final output snapshot
- visibility/indexing/consent snapshot

## MVP visibility states

Use a conservative database visibility layer first:

- server-private
- public-consent-required
- public-indexable
- paid-private
- unpublished

Current implementation target:

```text
server-private only
noindex by default
no public route
no indexable user-generated report
no public report without future explicit consent UX
```

This maps safely to the current report-generation contract, which already separates local preview, public consent, public indexable, paid private, and manual review private visibility concepts.

## reports table MVP draft

This is a contract draft, not a production migration.

```sql
create table halleus_reports (
  id text primary key,
  owner_user_id text,
  access_scope text not null default 'server-private',
  status text not null default 'active',
  output_version text not null,
  contract_version text not null,
  generation_status text not null,
  calculation_source text not null,
  input_snapshot jsonb not null,
  engine_snapshot jsonb,
  output_snapshot jsonb not null,
  report_json jsonb not null,
  note text,
  favorite boolean not null default false,
  visibility text not null default 'server-private',
  indexing_policy text not null default 'noindex',
  public_slug text unique,
  consent_snapshot jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## order_requests table MVP draft

Manual fuller-report requests should persist separately from payment/auth.

```sql
create table halleus_order_requests (
  id text primary key,
  report_id text not null,
  contact_name text,
  contact_email text,
  contact_handle text,
  request_note text,
  status text not null default 'new',
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

## birth profiles

Birth profiles remain later-stage.

For database MVP, birth data should live inside `input_snapshot` on the report record.

Create a separate `birth_profiles` table only when account/profile UX is ready.

## Existing migration note

`database/migrations/0001_initial_schema.sql` is still an initial foundation draft.

Do not treat it as production-ready until the provider, auth/user id strategy, and report access model are chosen.

## import path

When accounts exist, imported local reports can be attached to the logged-in user.

The local report id should be preserved when possible to avoid duplicate reports.
