-- Halleus Batch 4 Slice A: permanent Wiki internal-link administration.
-- Additive only. Apply after 0017 and 0018. No production application from runners.

begin;

create table if not exists halleus_private.wiki_link_rule_versions (
  version integer generated always as identity primary key,
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  is_active boolean not null default false,
  reason text not null check (char_length(reason) between 1 and 1000),
  created_by uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists wiki_link_rule_one_active_idx
  on halleus_private.wiki_link_rule_versions ((is_active))
  where is_active = true;

create table if not exists halleus_private.wiki_link_scan_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_kind text not null check (trigger_kind in ('baseline','manual_full','manual_article','post_publish','periodic')),
  requested_article_stable_id text,
  status text not null check (status in ('running','completed','failed')),
  rules_version integer not null references halleus_private.wiki_link_rule_versions(version),
  baseline_key text unique,
  graph_sha256 text,
  article_count integer not null default 0 check (article_count >= 0),
  edge_count integer not null default 0 check (edge_count >= 0),
  finding_count integer not null default 0 check (finding_count >= 0),
  suggestion_count integer not null default 0 check (suggestion_count >= 0),
  kpis jsonb not null default '{}'::jsonb check (jsonb_typeof(kpis) = 'object'),
  error_summary text,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists halleus_private.wiki_link_graph_snapshots (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid not null references halleus_private.wiki_link_scan_runs(id) on delete restrict,
  source_article_id uuid not null references public.wiki_articles(id) on delete restrict,
  source_stable_id text not null,
  source_content_version integer not null check (source_content_version >= 1),
  source_body_sha256 text not null,
  contextual_edges jsonb not null check (jsonb_typeof(contextual_edges) = 'array'),
  classified_links jsonb not null check (jsonb_typeof(classified_links) = 'array'),
  article_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(article_summary) = 'object'),
  created_at timestamptz not null default now(),
  unique (scan_run_id, source_article_id)
);
create index if not exists wiki_link_graph_source_idx
  on halleus_private.wiki_link_graph_snapshots (source_stable_id, created_at desc);

create table if not exists halleus_private.wiki_link_findings (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid not null references halleus_private.wiki_link_scan_runs(id) on delete restrict,
  source_stable_id text not null,
  target_stable_id text,
  code text not null,
  severity text not null check (severity in ('warning','error')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists wiki_link_findings_scan_idx
  on halleus_private.wiki_link_findings (scan_run_id, source_stable_id, code);

create table if not exists halleus_private.wiki_link_suggestions (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid not null references halleus_private.wiki_link_scan_runs(id) on delete restrict,
  source_stable_id text not null,
  target_stable_id text not null,
  status text not null default 'suggested'
    check (status in ('suggested','edited','approved','rejected','conflict','applied','verified','rolled_back')),
  source_content_version integer not null check (source_content_version >= 1),
  source_body_sha256 text not null,
  current_anchor text not null,
  proposed_anchor text not null,
  current_paragraph text not null,
  proposed_paragraph text not null,
  placement text not null,
  reason text not null,
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  edited_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scan_run_id, source_stable_id, target_stable_id, proposed_paragraph)
);
create index if not exists wiki_link_suggestions_status_idx
  on halleus_private.wiki_link_suggestions (status, updated_at desc);

create table if not exists halleus_private.wiki_link_decisions (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references halleus_private.wiki_link_suggestions(id) on delete restrict,
  decision text not null check (decision in ('edited','approved','rejected','conflict','applied','verified','rolled_back')),
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  reason text,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists halleus_private.wiki_link_apply_results (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references halleus_private.wiki_link_suggestions(id) on delete restrict,
  action text not null check (action in ('apply','rollback')),
  status text not null check (status in ('applied','verified','conflict','rolled_back')),
  source_stable_id text not null,
  before_content_version integer,
  after_content_version integer,
  before_body_sha256 text,
  after_body_sha256 text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  actor_user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists wiki_link_apply_results_suggestion_idx
  on halleus_private.wiki_link_apply_results (suggestion_id, created_at desc);

create table if not exists halleus_private.wiki_link_scan_triggers (
  id uuid primary key default gen_random_uuid(),
  trigger_kind text not null check (trigger_kind in ('post_publish','periodic')),
  article_stable_id text,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  not_before timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  last_error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz
);
create unique index if not exists wiki_link_pending_trigger_unique_idx
  on halleus_private.wiki_link_scan_triggers (
    trigger_kind,
    coalesce(article_stable_id, '')
  )
  where status in ('pending','running');

drop trigger if exists wiki_link_suggestions_set_updated_at
  on halleus_private.wiki_link_suggestions;
create trigger wiki_link_suggestions_set_updated_at
before update on halleus_private.wiki_link_suggestions
for each row execute function halleus_private.set_updated_at();

alter table halleus_private.wiki_link_rule_versions enable row level security;
alter table halleus_private.wiki_link_scan_runs enable row level security;
alter table halleus_private.wiki_link_graph_snapshots enable row level security;
alter table halleus_private.wiki_link_findings enable row level security;
alter table halleus_private.wiki_link_suggestions enable row level security;
alter table halleus_private.wiki_link_decisions enable row level security;
alter table halleus_private.wiki_link_apply_results enable row level security;
alter table halleus_private.wiki_link_scan_triggers enable row level security;

revoke all on halleus_private.wiki_link_rule_versions from public, anon, authenticated;
revoke all on halleus_private.wiki_link_scan_runs from public, anon, authenticated;
revoke all on halleus_private.wiki_link_graph_snapshots from public, anon, authenticated;
revoke all on halleus_private.wiki_link_findings from public, anon, authenticated;
revoke all on halleus_private.wiki_link_suggestions from public, anon, authenticated;
revoke all on halleus_private.wiki_link_decisions from public, anon, authenticated;
revoke all on halleus_private.wiki_link_apply_results from public, anon, authenticated;
revoke all on halleus_private.wiki_link_scan_triggers from public, anon, authenticated;

insert into halleus_private.wiki_link_rule_versions (config, is_active, reason)
select jsonb_build_object(
  'outgoingMin', 3,
  'outgoingMax', 5,
  'incomingMin', 2,
  'incomingTarget', 3,
  'incomingMax', 6,
  'breadcrumbRequired', true,
  'categoryLinkMax', 1,
  'coreMax', 1,
  'coreRoutes', jsonb_build_array('/', '/chart', '/compare', '/sky', '/wiki'),
  'anchorMinChars', 3,
  'anchorMaxChars', 120,
  'oneWordCoreAllowlist', jsonb_build_array(U&'\0647\0627\0644\06CC\0648\0633'),
  'excludedStableIds', jsonb_build_array(
    'active-receptive-energy-in-astrology',
    'missing-elements-in-natal-chart',
    'ordibehesht-birth-month-compatibility',
    'tir-born-traits'
  ),
  'prohibitSelf', true,
  'prohibitDuplicate', true,
  'prohibitUnpublishedTargets', true
), true, 'Batch 4 Slice A default rules over the verified Batch 2/3 graph'
where not exists (
  select 1 from halleus_private.wiki_link_rule_versions where is_active = true
);

do $halleus_link_baseline$
declare
  rules_version_value integer;
  baseline_run_id uuid;
  baseline_article_count integer;
  baseline_edge_count integer;
  baseline_core_count integer;
  total_live_count integer;
begin
  if to_regclass('public.wiki_articles') is null then
    raise exception 'Wiki article storage is required before 0019.';
  end if;

  select version into rules_version_value
  from halleus_private.wiki_link_rule_versions
  where is_active = true
  order by version desc
  limit 1;

  create temporary table halleus_link_baseline_ids (
    stable_id text primary key
  ) on commit drop;

  insert into halleus_link_baseline_ids (stable_id) values
    ('birth-chart-basics'),
    ('sun-moon-rising'),
    ('astrology-houses'),
    ('major-aspects'),
    ('why-birth-time-matters'),
    ('why-birth-city-matters'),
    ('birth-chart-without-birth-time'),
    ('how-to-read-birth-chart'),
    ('what-is-birth-chart-interpretation'),
    ('planet-sign-house-difference'),
    ('why-sun-sign-is-not-enough'),
    ('planets-in-birth-chart'),
    ('what-is-moon-sign'),
    ('what-is-rising-sign'),
    ('tehran-birth-chart-difference'),
    ('what-is-astrology'),
    ('what-is-tropical-astrology'),
    ('what-is-sidereal-astrology'),
    ('what-is-vedic-astrology'),
    ('important-transits-tir-1405'),
    ('astrology-transits-explained'),
    ('first-house-in-natal-chart'),
    ('sixth-house-in-natal-chart'),
    ('seventh-house-in-natal-chart'),
    ('eighth-house-in-natal-chart'),
    ('ninth-house-in-natal-chart'),
    ('tenth-house-in-natal-chart'),
    ('four-elements-in-natal-chart'),
    ('lunar-nodes-in-natal-chart'),
    ('fourth-house-in-natal-chart'),
    ('eleventh-house-in-natal-chart'),
    ('twelfth-house-in-natal-chart'),
    ('empty-houses-in-natal-chart'),
    ('zodiac-modalities-in-natal-chart'),
    ('degrees-in-natal-chart'),
    ('north-node-vs-south-node'),
    ('mordad-1405-transit-guide'),
    ('transits-to-ascendant-and-midheaven'),
    ('jupiter-in-natal-chart'),
    ('retrograde-planets-explained'),
    ('stellium-in-natal-chart'),
    ('new-moon-vs-full-moon-astrology'),
    ('saturn-return-explained'),
    ('mercury-retrograde-guide'),
    ('natal-chart-vs-transit-chart'),
    ('astrology-aspect-orbs-explained'),
    ('conjunction-aspect-explained'),
    ('opposition-aspect-explained'),
    ('square-aspect-explained'),
    ('trine-aspect-explained'),
    ('sextile-aspect-explained'),
    ('mercury-in-natal-chart'),
    ('venus-in-natal-chart'),
    ('saturn-in-natal-chart'),
    ('why-transits-differ-by-person'),
    ('fast-vs-slow-astrology-transits'),
    ('second-house-in-natal-chart'),
    ('hard-aspects-explained'),
    ('mars-in-natal-chart'),
    ('uranus-in-natal-chart'),
    ('third-house-in-natal-chart'),
    ('fifth-house-in-natal-chart'),
    ('reading-multiple-aspects-together'),
    ('neptune-in-natal-chart'),
    ('combine-planet-sign-house-and-aspect'),
    ('pluto-in-natal-chart'),
    ('sun-moon-aspects-in-natal-chart'),
    ('venus-mars-aspects-in-natal-chart'),
    ('jupiter-saturn-aspects-in-natal-chart'),
    ('transits-to-natal-sun-and-moon'),
    ('natal-chart-uses-and-limits'),
    ('overall-chart-signature'),
    ('chart-ruler-in-natal-chart'),
    ('persian-birth-months-astrology-guide'),
    ('shahrivar-birth-month-compatibility'),
    ('mehr-born-traits'),
    ('mordad-woman-traits'),
    ('mordad-man-traits'),
    ('mordad-birth-month-compatibility'),
    ('ordibehesht-born-traits'),
    ('shahrivar-born-traits'),
    ('aban-born-traits'),
    ('khordad-born-traits'),
    ('mehr-woman-traits'),
    ('mehr-man-traits'),
    ('mehr-birth-month-compatibility'),
    ('esfand-born-traits'),
    ('farvardin-born-traits'),
    ('mordad-born-traits'),
    ('dey-born-traits'),
    ('ordibehesht-woman-traits'),
    ('ordibehesht-man-traits');

  select count(*) into baseline_article_count
  from public.wiki_articles as article
  join halleus_link_baseline_ids as expected on expected.stable_id = article.stable_id
  where article.status = 'published'
    and article.is_indexable = true
    and article.published_at is not null
    and article.scheduled_for is null
    and article.deleted_at is null;

  if baseline_article_count <> 92 then
    raise exception 'Batch 4 link-admin baseline requires all 92 verified public articles; found %.', baseline_article_count;
  end if;

  select count(*) into baseline_edge_count
  from public.wiki_articles as article
  join halleus_link_baseline_ids as expected on expected.stable_id = article.stable_id
  cross join lateral regexp_matches(
    coalesce(article.body_markdown, ''),
    '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
    'g'
  ) as edge(parts)
  where (edge.parts)[1] in (select stable_id from halleus_link_baseline_ids);

  if baseline_edge_count <> 292 then
    raise exception 'Batch 4 link-admin baseline graph must contain 292 contextual article edges; found %.', baseline_edge_count;
  end if;

  select count(*) into baseline_core_count
  from public.wiki_articles as article
  join halleus_link_baseline_ids as expected on expected.stable_id = article.stable_id
  cross join lateral regexp_matches(
    coalesce(article.body_markdown, ''),
    '\[\[page:(/(?:chart|compare|sky|wiki)?)(?:\|([^\]\r\n]+))\]\]',
    'g'
  ) as core(parts);

  if baseline_core_count <> 92 then
    raise exception 'Batch 4 link-admin baseline requires exactly 92 contextual core links; found %.', baseline_core_count;
  end if;

  if exists (
    select 1
    from public.wiki_articles as article
    join halleus_link_baseline_ids as expected on expected.stable_id = article.stable_id
    cross join lateral regexp_matches(
      coalesce(article.body_markdown, ''),
      '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
      'g'
    ) as edge(parts)
    where (edge.parts)[1] = article.stable_id
  ) then
    raise exception 'Batch 4 link-admin baseline contains a self-link.';
  end if;

  if exists (
    select 1
    from (
      select article.stable_id as source_id, (edge.parts)[1] as target_id, count(*) as pair_count
      from public.wiki_articles as article
      join halleus_link_baseline_ids as expected on expected.stable_id = article.stable_id
      cross join lateral regexp_matches(
        coalesce(article.body_markdown, ''),
        '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
        'g'
      ) as edge(parts)
      group by article.stable_id, (edge.parts)[1]
      having count(*) > 1
    ) as duplicate_pair
  ) then
    raise exception 'Batch 4 link-admin baseline contains duplicate source-target pairs.';
  end if;

  if not exists (
    select 1
    from halleus_private.wiki_link_scan_runs
    where baseline_key = 'batch2-final-292-v1'
  ) then
    select count(*) into total_live_count
    from public.wiki_articles
    where status = 'published' and is_indexable = true
      and published_at is not null and scheduled_for is null and deleted_at is null;

    insert into halleus_private.wiki_link_scan_runs (
      trigger_kind, status, rules_version, baseline_key, graph_sha256,
      article_count, edge_count, finding_count, suggestion_count, kpis, completed_at
    ) values (
      'baseline', 'completed', rules_version_value, 'batch2-final-292-v1',
      'e95b64f2d57b4b9a0e57dee0f80698c34f616924d9468e16dbe8c245e2368425',
      92, 292, 0, 0,
      jsonb_build_object(
        'liveArticleCount', total_live_count,
        'managedArticleCount', 92,
        'fullyCompliant', 92,
        'underInlinked', 0,
        'outgoingOutsideRange', 0,
        'missingCoreLink', 0,
        'breadcrumbIssue', 0,
        'internalTargetIssue', 0,
        'oneWordViolation', 0,
        'anchorCollision', 0,
        'selfLink', 0,
        'duplicate', 0,
        'overOrUnderlinked', 0
      ),
      now()
    )
    returning id into baseline_run_id;

    with article_edges as (
      select
        article.id as source_article_id,
        article.stable_id as source_stable_id,
        article.content_version,
        encode(sha256(convert_to(coalesce(article.body_markdown, ''), 'UTF8')), 'hex') as body_hash,
        coalesce(jsonb_agg(
          jsonb_build_object(
            'sourceStableId', article.stable_id,
            'targetStableId', (edge.parts)[1],
            'href', '/wiki/' || (edge.parts)[1],
            'anchor', coalesce(nullif((edge.parts)[2], ''), (edge.parts)[1]),
            'kind', 'article',
            'placement', 'baseline'
          )
          order by (edge.parts)[1], coalesce((edge.parts)[2], '')
        ) filter (where (edge.parts)[1] is not null), '[]'::jsonb) as contextual_edges
      from public.wiki_articles as article
      join halleus_link_baseline_ids as expected on expected.stable_id = article.stable_id
      cross join lateral regexp_matches(
        coalesce(article.body_markdown, ''),
        '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
        'g'
      ) as edge(parts)
      group by article.id, article.stable_id, article.content_version, article.body_markdown
    ),
    incoming_counts as (
      select target_id, count(*)::integer as incoming
      from (
        select (edge.parts)[1] as target_id
        from public.wiki_articles as article
        join halleus_link_baseline_ids as expected on expected.stable_id = article.stable_id
        cross join lateral regexp_matches(
          coalesce(article.body_markdown, ''),
          '\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]',
          'g'
        ) as edge(parts)
      ) as raw_edges
      group by target_id
    ),
    core_edges as (
      select
        article.stable_id,
        coalesce(jsonb_agg(
          jsonb_build_object(
            'sourceStableId', article.stable_id,
            'targetStableId', null,
            'href', (core.parts)[1],
            'anchor', (core.parts)[2],
            'kind', 'core',
            'placement', 'baseline'
          )
        ), '[]'::jsonb) as links,
        min((core.parts)[1]) as core_destination
      from public.wiki_articles as article
      join halleus_link_baseline_ids as expected on expected.stable_id = article.stable_id
      cross join lateral regexp_matches(
        coalesce(article.body_markdown, ''),
        '\[\[page:(/(?:chart|compare|sky|wiki)?)(?:\|([^\]\r\n]+))\]\]',
        'g'
      ) as core(parts)
      group by article.stable_id
    )
    insert into halleus_private.wiki_link_graph_snapshots (
      scan_run_id, source_article_id, source_stable_id, source_content_version,
      source_body_sha256, contextual_edges, classified_links, article_summary
    )
    select
      baseline_run_id,
      edge.source_article_id,
      edge.source_stable_id,
      edge.content_version,
      edge.body_hash,
      edge.contextual_edges,
      edge.contextual_edges || coalesce(core.links, '[]'::jsonb),
      jsonb_build_object(
        'stableId', edge.source_stable_id,
        'slug', article.slug,
        'title', article.title,
        'categoryId', article.category_id,
        'status', article.status,
        'indexable', article.is_indexable,
        'incoming', coalesce(incoming.incoming, 0),
        'outgoing', jsonb_array_length(edge.contextual_edges),
        'categoryLinks', 0,
        'coreDestination', core.core_destination,
        'breadcrumbOk', true,
        'findingCount', 0,
        'compliant', true
      )
    from article_edges as edge
    join public.wiki_articles as article on article.id = edge.source_article_id
    left join incoming_counts as incoming on incoming.target_id = edge.source_stable_id
    left join core_edges as core on core.stable_id = edge.source_stable_id;
  end if;
end;
$halleus_link_baseline$;

commit;

select 'HALLEUS_BATCH4_SLICE_A_LINK_ADMIN_MIGRATION=SUCCESS' as marker;
