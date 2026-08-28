begin;

create table if not exists halleus_private.wiki_indexnow_submissions (
  id uuid primary key default gen_random_uuid(),
  reason text not null,
  ok boolean not null,
  skipped boolean not null default false,
  url_count integer not null default 0 check (url_count >= 0),
  status_code integer,
  error_summary text,
  submitted_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(submitted_urls) = 'array'),
  created_at timestamptz not null default now()
);

create index if not exists wiki_indexnow_submissions_created_idx
  on halleus_private.wiki_indexnow_submissions (created_at desc);

revoke all on halleus_private.wiki_indexnow_submissions from anon, authenticated;

commit;
