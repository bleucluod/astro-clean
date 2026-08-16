-- Halleus Batch 4 Slice A: permanent Wiki internal-link administration.
-- HALLEUS_BATCH4_R20_MIN3_NO_HARD_MAX_RULES
-- HALLEUS_BATCH4_R6_AUTHORITY_BASELINE: freeze the exact Batch 2 92/292 authority graph; runtime scans may contain later body links.
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
  'outgoingMax', 0,
  'incomingMin', 3,
  'incomingTarget', 3,
  'incomingMax', 0,
  'breadcrumbRequired', true,
  'categoryLinkMax', 1,
  'coreMax', 1,
  'coreRoutes', jsonb_build_array('/', '/chart', '/compare', '/sky', '/wiki'),
  'anchorMinChars', 3,
  'anchorMaxChars', 120,
  'oneWordCoreAllowlist', jsonb_build_array(U&'\0647\0627\0644\06CC\0648\0633'),
  'excludedStableIds', '[]'::jsonb,
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
  authority_edge_count integer;
  authority_source_count integer;
  authority_present_count integer;
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

  create temporary table halleus_link_authority_edges (
    source_stable_id text not null,
    target_stable_id text not null,
    anchor text not null,
    primary key (source_stable_id, target_stable_id)
  ) on commit drop;

  insert into halleus_link_authority_edges (source_stable_id, target_stable_id, anchor)
  select edge->>0, edge->>1, edge->>2
  from jsonb_array_elements(
$halleus_authority_edges$
[["birth-chart-basics","astrology-houses","\u0645\u0639\u0646\u06cc \u062e\u0627\u0646\u0647\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["birth-chart-basics","stellium-in-natal-chart","\u0631\u0648\u0634 \u062e\u0648\u0627\u0646\u062f\u0646 \u0627\u0633\u062a\u0644\u06cc\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a"],["birth-chart-basics","overall-chart-signature","\u0631\u0648\u0634 \u062a\u0634\u062e\u06cc\u0635 \u0627\u0645\u0636\u0627\u06cc \u06a9\u0644\u06cc \u0686\u0627\u0631\u062a"],["sun-moon-rising","jupiter-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0634\u062a\u0631\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sun-moon-rising","mercury-in-natal-chart","\u0645\u0639\u0646\u06cc \u0639\u0637\u0627\u0631\u062f \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sun-moon-rising","saturn-in-natal-chart","\u0645\u0639\u0646\u06cc \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["astrology-houses","eighth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0647\u0634\u062a\u0645"],["astrology-houses","ninth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0646\u0647\u0645"],["astrology-houses","empty-houses-in-natal-chart","\u062e\u0627\u0644\u06cc\u200c\u0628\u0648\u062f\u0646 \u06cc\u06a9 \u062e\u0627\u0646\u0647"],["astrology-houses","second-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u062f\u0648\u0645"],["astrology-houses","third-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0633\u0648\u0645"],["major-aspects","conjunction-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0647\u0645\u200c\u0646\u0634\u06cc\u0646\u06cc \u06cc\u0627 Conjunction"],["major-aspects","opposition-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0645\u0642\u0627\u0628\u0644\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["major-aspects","square-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0645\u0631\u0628\u0639 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["major-aspects","trine-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u062a\u062b\u0644\u06cc\u062b \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["major-aspects","sextile-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0633\u06a9\u0633\u062a\u0627\u06cc\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["why-birth-time-matters","why-birth-city-matters","\u062a\u0623\u062b\u06cc\u0631 \u0634\u0647\u0631 \u062a\u0648\u0644\u062f \u0628\u0631 \u0645\u062d\u0627\u0633\u0628\u0647\u0654 \u0686\u0627\u0631\u062a"],["why-birth-time-matters","birth-chart-without-birth-time","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u0628\u062f\u0648\u0646 \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["why-birth-time-matters","what-is-birth-chart-interpretation","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["why-birth-city-matters","birth-chart-without-birth-time","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u0628\u062f\u0648\u0646 \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["why-birth-city-matters","how-to-read-birth-chart","\u0631\u0648\u0634 \u062e\u0648\u0627\u0646\u062f\u0646 \u0686\u0627\u0631\u062a \u0628\u0627 \u062f\u0627\u062f\u0647\u0654 \u0645\u06a9\u0627\u0646\u06cc \u062f\u0642\u06cc\u0642"],["why-birth-city-matters","tehran-birth-chart-difference","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u062a\u0647\u0631\u0627\u0646 \u0628\u0627 \u0634\u0647\u0631\u0647\u0627\u06cc \u062f\u06cc\u06af\u0631"],["birth-chart-without-birth-time","why-birth-city-matters","\u062a\u0623\u062b\u06cc\u0631 \u0634\u0647\u0631 \u062a\u0648\u0644\u062f \u0628\u0631 \u0645\u062d\u0627\u0633\u0628\u0647 \u0686\u0627\u0631\u062a"],["birth-chart-without-birth-time","what-is-birth-chart-interpretation","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["birth-chart-without-birth-time","tehran-birth-chart-difference","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u062a\u0647\u0631\u0627\u0646 \u0628\u0627 \u0634\u0647\u0631\u0647\u0627\u06cc \u062f\u06cc\u06af\u0631"],["how-to-read-birth-chart","birth-chart-basics","\u0627\u062c\u0632\u0627\u06cc \u067e\u0627\u06cc\u0647\u0654 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["how-to-read-birth-chart","empty-houses-in-natal-chart","\u062e\u0627\u0646\u0647\u200c\u0647\u0627\u06cc \u062e\u0627\u0644\u06cc"],["how-to-read-birth-chart","degrees-in-natal-chart","\u0645\u0639\u0646\u06cc \u062f\u0631\u062c\u0647\u200c\u0647\u0627\u06cc \u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["what-is-birth-chart-interpretation","how-to-read-birth-chart","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a"],["what-is-birth-chart-interpretation","what-is-moon-sign","\u0645\u0627\u0647 \u062f\u0631 \u062b\u0648\u0631"],["what-is-birth-chart-interpretation","overall-chart-signature","\u0631\u0648\u0634 \u062a\u0634\u062e\u06cc\u0635 \u0627\u0645\u0636\u0627\u06cc \u06a9\u0644\u06cc \u0686\u0627\u0631\u062a"],["planet-sign-house-difference","what-is-moon-sign","\u0646\u0634\u0627\u0646 \u0645\u0627\u0647 \u0686\u06cc\u0633\u062a \u0648 \u0686\u06af\u0648\u0646\u0647 \u0645\u062d\u0627\u0633\u0628\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f"],["planet-sign-house-difference","lunar-nodes-in-natal-chart","\u0645\u0639\u0646\u06cc \u06af\u0631\u0647\u200c\u0647\u0627\u06cc \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["planet-sign-house-difference","combine-planet-sign-house-and-aspect","\u062a\u0631\u06a9\u06cc\u0628 \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646\u060c \u062e\u0627\u0646\u0647 \u0648 \u062c\u0646\u0628\u0647"],["why-sun-sign-is-not-enough","lunar-nodes-in-natal-chart","\u0645\u0639\u0646\u06cc \u06af\u0631\u0647\u200c\u0647\u0627\u06cc \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["why-sun-sign-is-not-enough","degrees-in-natal-chart","\u0645\u0639\u0646\u06cc \u062f\u0631\u062c\u0647\u200c\u0647\u0627\u06cc \u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["why-sun-sign-is-not-enough","persian-birth-months-astrology-guide","\u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["planets-in-birth-chart","venus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0648\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["planets-in-birth-chart","uranus-in-natal-chart","\u0627\u0648\u0631\u0627\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["planets-in-birth-chart","neptune-in-natal-chart","\u0646\u067e\u062a\u0648\u0646 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["planets-in-birth-chart","pluto-in-natal-chart","\u067e\u0644\u0648\u062a\u0648 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["what-is-moon-sign","jupiter-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0634\u062a\u0631\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["what-is-moon-sign","saturn-in-natal-chart","\u0645\u0639\u0646\u06cc \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["what-is-moon-sign","mars-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["what-is-rising-sign","tehran-birth-chart-difference","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u062a\u0647\u0631\u0627\u0646 \u0628\u0627 \u0634\u0647\u0631\u0647\u0627\u06cc \u062f\u06cc\u06af\u0631"],["what-is-rising-sign","first-house-in-natal-chart","\u062e\u0627\u0646\u0647\u200c\u06cc \u0627\u0648\u0644"],["what-is-rising-sign","chart-ruler-in-natal-chart","\u0645\u0639\u0646\u06cc \u062d\u0627\u06a9\u0645 \u0686\u0627\u0631\u062a \u0648 \u0631\u0648\u0634 \u067e\u06cc\u062f\u0627 \u06a9\u0631\u062f\u0646 \u0622\u0646"],["tehran-birth-chart-difference","why-birth-time-matters","\u0627\u0647\u0645\u06cc\u062a \u0633\u0627\u0639\u062a \u062f\u0642\u06cc\u0642 \u062a\u0648\u0644\u062f \u062f\u0631 \u0686\u0627\u0631\u062a"],["tehran-birth-chart-difference","why-birth-city-matters","\u0645\u062e\u062a\u0635\u0627\u062a \u062c\u063a\u0631\u0627\u0641\u06cc\u0627\u06cc\u06cc"],["tehran-birth-chart-difference","birth-chart-without-birth-time","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u0628\u062f\u0648\u0646 \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["what-is-astrology","what-is-tropical-astrology","\u062a\u0641\u0627\u0648\u062a \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u062a\u0631\u0648\u067e\u06cc\u06a9\u0627\u0644 \u0648 \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-astrology","what-is-sidereal-astrology","\u0645\u0628\u0646\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-astrology","what-is-vedic-astrology","\u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0648\u062f\u06cc\u06a9"],["what-is-tropical-astrology","what-is-astrology","\u0645\u0628\u0627\u0646\u06cc \u0648 \u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc"],["what-is-tropical-astrology","what-is-sidereal-astrology","\u0645\u0628\u0646\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-tropical-astrology","what-is-vedic-astrology","\u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0648\u062f\u06cc\u06a9 \u0648 \u062a\u0641\u0627\u0648\u062a \u0622\u0646 \u0628\u0627 \u062a\u0631\u0648\u067e\u06cc\u06a9\u0627\u0644"],["what-is-sidereal-astrology","what-is-astrology","\u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627 \u0648 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a\u200c\u0647\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc"],["what-is-sidereal-astrology","what-is-tropical-astrology","\u062a\u0641\u0627\u0648\u062a \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u062a\u0631\u0648\u067e\u06cc\u06a9\u0627\u0644 \u0648 \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-sidereal-astrology","what-is-vedic-astrology","\u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0648\u062f\u06cc\u06a9"],["what-is-vedic-astrology","what-is-astrology","\u0686\u0627\u0631\u0686\u0648\u0628 \u06a9\u0644\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc"],["what-is-vedic-astrology","what-is-tropical-astrology","\u062a\u0641\u0627\u0648\u062a \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u062a\u0631\u0648\u067e\u06cc\u06a9\u0627\u0644 \u0648 \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-vedic-astrology","what-is-sidereal-astrology","\u0645\u0628\u0646\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["important-transits-tir-1405","astrology-transits-explained","\u062a\u0631\u0646\u0632\u06cc\u062a \u062f\u0631 \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0686\u06cc\u0633\u062a \u0648 \u0686\u06af\u0648\u0646\u0647 \u062e\u0648\u0627\u0646\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f"],["important-transits-tir-1405","mordad-1405-transit-guide","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0631\u062f\u0627\u062f \u06f1\u06f4\u06f0\u06f5"],["important-transits-tir-1405","mercury-retrograde-guide","\u0639\u0637\u0627\u0631\u062f \u0631\u062a\u0631\u0648 \u0686\u06cc\u0633\u062a \u0648 \u0686\u0647 \u0645\u0639\u0646\u0627\u06cc\u06cc \u062f\u0627\u0631\u062f"],["astrology-transits-explained","important-transits-tir-1405","\u062a\u0642\u0648\u06cc\u0645 \u062a\u0631\u0646\u0632\u06cc\u062a \u062a\u06cc\u0631 \u06f1\u06f4\u06f0\u06f5"],["astrology-transits-explained","why-transits-differ-by-person","\u062a\u0631\u0646\u0632\u06cc\u062a \u0639\u0645\u0648\u0645\u06cc"],["astrology-transits-explained","fast-vs-slow-astrology-transits","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0633\u0631\u06cc\u0639 \u0648 \u06a9\u0646\u062f"],["first-house-in-natal-chart","seventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0641\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["first-house-in-natal-chart","tenth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["first-house-in-natal-chart","fourth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0686\u0647\u0627\u0631\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sixth-house-in-natal-chart","tenth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sixth-house-in-natal-chart","twelfth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u062f\u0648\u0627\u0632\u062f\u0647\u0645"],["sixth-house-in-natal-chart","second-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["seventh-house-in-natal-chart","eighth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0634\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["seventh-house-in-natal-chart","fifth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u067e\u0646\u062c\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["seventh-house-in-natal-chart","chart-ruler-in-natal-chart","\u0645\u0639\u0646\u06cc \u062d\u0627\u06a9\u0645 \u0686\u0627\u0631\u062a \u0648 \u0631\u0648\u0634 \u067e\u06cc\u062f\u0627 \u06a9\u0631\u062f\u0646 \u0622\u0646"],["eighth-house-in-natal-chart","seventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0641\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["eighth-house-in-natal-chart","fourth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0686\u0647\u0627\u0631\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["eighth-house-in-natal-chart","twelfth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0648\u0627\u0632\u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["ninth-house-in-natal-chart","tenth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["ninth-house-in-natal-chart","eleventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u06cc\u0627\u0632\u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["ninth-house-in-natal-chart","third-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0633\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["tenth-house-in-natal-chart","sixth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0634\u0634\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["tenth-house-in-natal-chart","ninth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0646\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["tenth-house-in-natal-chart","fourth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0686\u0647\u0627\u0631\u0645"],["four-elements-in-natal-chart","zodiac-modalities-in-natal-chart","\u06a9\u06cc\u0641\u06cc\u062a\u200c\u0647\u0627\u06cc \u0633\u0647\u200c\u06af\u0627\u0646\u0647"],["four-elements-in-natal-chart","persian-birth-months-astrology-guide","\u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["four-elements-in-natal-chart","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["four-elements-in-natal-chart","ordibehesht-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["lunar-nodes-in-natal-chart","planet-sign-house-difference","\u062a\u0641\u0627\u0648\u062a \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646 \u0648 \u062e\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["lunar-nodes-in-natal-chart","north-node-vs-south-node","\u06af\u0631\u0647\u0654 \u0634\u0645\u0627\u0644\u06cc \u0648 \u062c\u0646\u0648\u0628\u06cc"],["lunar-nodes-in-natal-chart","new-moon-vs-full-moon-astrology","\u0645\u0627\u0647 \u0646\u0648 \u06cc\u0627 \u0645\u0627\u0647 \u06a9\u0627\u0645\u0644"],["fourth-house-in-natal-chart","first-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0627\u0648\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["fourth-house-in-natal-chart","eighth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0634\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["fourth-house-in-natal-chart","twelfth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0648\u0627\u0632\u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["eleventh-house-in-natal-chart","empty-houses-in-natal-chart","\u0631\u0648\u0634 \u062a\u0641\u0633\u06cc\u0631 \u062e\u0627\u0646\u0647 \u062e\u0627\u0644\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a"],["eleventh-house-in-natal-chart","third-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0633\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["eleventh-house-in-natal-chart","fifth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u067e\u0646\u062c\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["twelfth-house-in-natal-chart","sixth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0634\u0634\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["twelfth-house-in-natal-chart","eighth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0634\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["twelfth-house-in-natal-chart","fourth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0686\u0647\u0627\u0631\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["empty-houses-in-natal-chart","astrology-houses","\u0645\u0639\u0646\u06cc \u062e\u0627\u0646\u0647\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["empty-houses-in-natal-chart","what-is-rising-sign","\u0645\u0639\u0646\u06cc \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u0648 \u0631\u0648\u0634 \u0645\u062d\u0627\u0633\u0628\u0647 \u0622\u0646"],["empty-houses-in-natal-chart","chart-ruler-in-natal-chart","\u0645\u0639\u0646\u06cc \u062d\u0627\u06a9\u0645 \u0686\u0627\u0631\u062a \u0648 \u0631\u0648\u0634 \u067e\u06cc\u062f\u0627 \u06a9\u0631\u062f\u0646 \u0622\u0646"],["zodiac-modalities-in-natal-chart","planet-sign-house-difference","\u062a\u0641\u0627\u0648\u062a \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646 \u0648 \u062e\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["zodiac-modalities-in-natal-chart","four-elements-in-natal-chart","\u0645\u0639\u0646\u06cc \u0639\u0646\u0627\u0635\u0631 \u0686\u0647\u0627\u0631\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["zodiac-modalities-in-natal-chart","persian-birth-months-astrology-guide","\u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["degrees-in-natal-chart","north-node-vs-south-node","\u06af\u0631\u0647\u0654 \u0634\u0645\u0627\u0644\u06cc \u0648 \u062c\u0646\u0648\u0628\u06cc"],["degrees-in-natal-chart","retrograde-planets-explained","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0647 \u0631\u062a\u0631\u0648\u06af\u0631\u0627\u062f \u062f\u0631 \u0686\u0627\u0631\u062a"],["degrees-in-natal-chart","natal-chart-uses-and-limits","\u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627 \u0648 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["north-node-vs-south-node","lunar-nodes-in-natal-chart","\u0645\u0639\u0646\u06cc \u06af\u0631\u0647\u200c\u0647\u0627\u06cc \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["north-node-vs-south-node","retrograde-planets-explained","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0647 \u0631\u062a\u0631\u0648\u06af\u0631\u0627\u062f \u062f\u0631 \u0686\u0627\u0631\u062a"],["north-node-vs-south-node","natal-chart-uses-and-limits","\u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627 \u0648 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["mordad-1405-transit-guide","important-transits-tir-1405","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0647\u0645 \u062a\u06cc\u0631 \u06f1\u06f4\u06f0\u06f5"],["mordad-1405-transit-guide","new-moon-vs-full-moon-astrology","\u062a\u0641\u0627\u0648\u062a \u0645\u0627\u0647 \u0646\u0648 \u0648 \u0645\u0627\u0647 \u06a9\u0627\u0645\u0644"],["mordad-1405-transit-guide","natal-chart-vs-transit-chart","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0648 \u0686\u0627\u0631\u062a \u062a\u0631\u0646\u0632\u06cc\u062a"],["transits-to-ascendant-and-midheaven","why-birth-time-matters","\u0627\u0647\u0645\u06cc\u062a \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["transits-to-ascendant-and-midheaven","what-is-rising-sign","\u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u06cc\u0627 \u0637\u0627\u0644\u0639"],["transits-to-ascendant-and-midheaven","transits-to-natal-sun-and-moon","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f\u06cc"],["jupiter-in-natal-chart","sun-moon-rising","\u062a\u0641\u0627\u0648\u062a \u062e\u0648\u0631\u0634\u06cc\u062f\u060c \u0645\u0627\u0647 \u0648 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af"],["jupiter-in-natal-chart","ninth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0646\u0647\u0645"],["jupiter-in-natal-chart","saturn-in-natal-chart","\u0645\u0639\u0646\u06cc \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["retrograde-planets-explained","degrees-in-natal-chart","\u0645\u0639\u0646\u06cc \u062f\u0631\u062c\u0647\u200c\u0647\u0627\u06cc \u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["retrograde-planets-explained","north-node-vs-south-node","\u062a\u0641\u0627\u0648\u062a \u0646\u0648\u062f \u0634\u0645\u0627\u0644\u06cc \u0648 \u062c\u0646\u0648\u0628\u06cc"],["retrograde-planets-explained","natal-chart-uses-and-limits","\u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627 \u0648 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["stellium-in-natal-chart","retrograde-planets-explained","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0647 \u0631\u062a\u0631\u0648\u06af\u0631\u0627\u062f \u062f\u0631 \u0686\u0627\u0631\u062a"],["stellium-in-natal-chart","combine-planet-sign-house-and-aspect","\u062a\u0631\u06a9\u06cc\u0628 \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646\u060c \u062e\u0627\u0646\u0647 \u0648 \u062c\u0646\u0628\u0647"],["stellium-in-natal-chart","overall-chart-signature","\u0631\u0648\u0634 \u062a\u0634\u062e\u06cc\u0635 \u0627\u0645\u0636\u0627\u06cc \u06a9\u0644\u06cc \u0686\u0627\u0631\u062a"],["new-moon-vs-full-moon-astrology","mordad-1405-transit-guide","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0647\u0645 \u0645\u0631\u062f\u0627\u062f \u06f1\u06f4\u06f0\u06f5"],["new-moon-vs-full-moon-astrology","saturn-return-explained","\u0645\u0639\u0646\u06cc \u0628\u0627\u0632\u06af\u0634\u062a \u0632\u062d\u0644 \u0648 \u0633\u0646 \u0648\u0642\u0648\u0639 \u0622\u0646"],["new-moon-vs-full-moon-astrology","mercury-retrograde-guide","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u0639\u0637\u0627\u0631\u062f \u0631\u062a\u0631\u0648 \u0648 \u0627\u0634\u062a\u0628\u0627\u0647\u200c\u0647\u0627\u06cc \u0631\u0627\u06cc\u062c"],["saturn-return-explained","important-transits-tir-1405","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0647\u0645 \u062a\u06cc\u0631 \u06f1\u06f4\u06f0\u06f5"],["saturn-return-explained","mercury-retrograde-guide","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u0639\u0637\u0627\u0631\u062f \u0631\u062a\u0631\u0648 \u0648 \u0627\u0634\u062a\u0628\u0627\u0647\u200c\u0647\u0627\u06cc \u0631\u0627\u06cc\u062c"],["saturn-return-explained","why-transits-differ-by-person","\u0639\u0644\u062a \u062a\u0641\u0627\u0648\u062a \u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0631\u0627\u06cc \u0647\u0631 \u0641\u0631\u062f"],["mercury-retrograde-guide","mordad-1405-transit-guide","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0647\u0645 \u0645\u0631\u062f\u0627\u062f \u06f1\u06f4\u06f0\u06f5"],["mercury-retrograde-guide","saturn-return-explained","\u0645\u0639\u0646\u06cc \u0628\u0627\u0632\u06af\u0634\u062a \u0632\u062d\u0644 \u0648 \u0633\u0646 \u0648\u0642\u0648\u0639 \u0622\u0646"],["mercury-retrograde-guide","natal-chart-vs-transit-chart","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0648 \u0686\u0627\u0631\u062a \u062a\u0631\u0646\u0632\u06cc\u062a"],["natal-chart-vs-transit-chart","astrology-transits-explained","\u0686\u0627\u0631\u062a \u062a\u0631\u0646\u0632\u06cc\u062a"],["natal-chart-vs-transit-chart","why-transits-differ-by-person","\u062a\u0631\u0646\u0632\u06cc\u062a \u0639\u0645\u0648\u0645\u06cc"],["natal-chart-vs-transit-chart","transits-to-natal-sun-and-moon","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f\u06cc"],["astrology-aspect-orbs-explained","sextile-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0633\u06a9\u0633\u062a\u0627\u06cc\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["astrology-aspect-orbs-explained","venus-mars-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0648\u0646\u0648\u0633 \u0648 \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a"],["astrology-aspect-orbs-explained","jupiter-saturn-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0645\u0634\u062a\u0631\u06cc \u0648 \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a"],["conjunction-aspect-explained","astrology-aspect-orbs-explained","\u0645\u062d\u0627\u0633\u0628\u0647 \u0627\u0648\u0631\u0628 \u062c\u0646\u0628\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["conjunction-aspect-explained","trine-aspect-explained","\u062c\u0646\u0628\u0647 \u062a\u062b\u0644\u06cc\u062b \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["conjunction-aspect-explained","sextile-aspect-explained","\u062c\u0646\u0628\u0647 \u062a\u0633\u062f\u06cc\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["opposition-aspect-explained","astrology-aspect-orbs-explained","\u0645\u062d\u0627\u0633\u0628\u0647 \u0627\u0648\u0631\u0628 \u062c\u0646\u0628\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["opposition-aspect-explained","square-aspect-explained","\u062c\u0646\u0628\u0647 \u0645\u0631\u0628\u0639 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["opposition-aspect-explained","trine-aspect-explained","\u062c\u0646\u0628\u0647 \u062a\u062b\u0644\u06cc\u062b \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["square-aspect-explained","major-aspects","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0627\u0635\u0644\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["square-aspect-explained","opposition-aspect-explained","\u062c\u0646\u0628\u0647 \u0645\u0642\u0627\u0628\u0644\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["square-aspect-explained","hard-aspects-explained","\u0641\u0634\u0627\u0631 \u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0633\u062e\u062a"],["trine-aspect-explained","major-aspects","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0627\u0635\u0644\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["trine-aspect-explained","sun-moon-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["trine-aspect-explained","venus-mars-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0648\u0646\u0648\u0633 \u0648 \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a"],["sextile-aspect-explained","major-aspects","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0627\u0635\u0644\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sextile-aspect-explained","hard-aspects-explained","\u0631\u0648\u0634 \u062e\u0648\u0627\u0646\u062f\u0646 \u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0633\u062e\u062a \u062f\u0631 \u0686\u0627\u0631\u062a"],["sextile-aspect-explained","jupiter-saturn-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0645\u0634\u062a\u0631\u06cc \u0648 \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a"],["mercury-in-natal-chart","what-is-moon-sign","\u0645\u0639\u0646\u06cc \u0646\u0634\u0627\u0646 \u0645\u0627\u0647 \u0648 \u0631\u0648\u0634 \u0645\u062d\u0627\u0633\u0628\u0647 \u0622\u0646"],["mercury-in-natal-chart","venus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0648\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["mercury-in-natal-chart","mars-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["venus-in-natal-chart","mercury-in-natal-chart","\u0645\u0639\u0646\u06cc \u0639\u0637\u0627\u0631\u062f \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["venus-in-natal-chart","mars-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["venus-in-natal-chart","fifth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u067e\u0646\u062c\u0645"],["saturn-in-natal-chart","sun-moon-rising","\u062a\u0641\u0627\u0648\u062a \u062e\u0648\u0631\u0634\u06cc\u062f\u060c \u0645\u0627\u0647 \u0648 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af"],["saturn-in-natal-chart","jupiter-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0634\u062a\u0631\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["saturn-in-natal-chart","saturn-return-explained","\u0628\u0627\u0632\u06af\u0634\u062a \u0632\u062d\u0644"],["why-transits-differ-by-person","astrology-transits-explained","\u062a\u0631\u0646\u0632\u06cc\u062a \u062f\u0631 \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0686\u06cc\u0633\u062a \u0648 \u0686\u06af\u0648\u0646\u0647 \u062e\u0648\u0627\u0646\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f"],["why-transits-differ-by-person","transits-to-ascendant-and-midheaven","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u0648 \u0645\u06cc\u0627\u0646\u0647 \u0622\u0633\u0645\u0627\u0646"],["why-transits-differ-by-person","fast-vs-slow-astrology-transits","\u0633\u0631\u0639\u062a \u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627"],["fast-vs-slow-astrology-transits","transits-to-ascendant-and-midheaven","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u0648 \u0645\u06cc\u0627\u0646\u0647 \u0622\u0633\u0645\u0627\u0646"],["fast-vs-slow-astrology-transits","natal-chart-vs-transit-chart","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0648 \u0686\u0627\u0631\u062a \u062a\u0631\u0646\u0632\u06cc\u062a"],["fast-vs-slow-astrology-transits","transits-to-natal-sun-and-moon","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f\u06cc"],["second-house-in-natal-chart","sixth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0634\u0634\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["second-house-in-natal-chart","eighth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0634\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["second-house-in-natal-chart","fifth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u067e\u0646\u062c\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["hard-aspects-explained","sun-moon-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["hard-aspects-explained","venus-mars-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0648\u0646\u0648\u0633 \u0648 \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a"],["hard-aspects-explained","jupiter-saturn-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0645\u0634\u062a\u0631\u06cc \u0648 \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a"],["mars-in-natal-chart","planets-in-birth-chart","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0627\u062a \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["mars-in-natal-chart","mercury-in-natal-chart","\u0645\u0639\u0646\u06cc \u0639\u0637\u0627\u0631\u062f \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["mars-in-natal-chart","venus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0648\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["uranus-in-natal-chart","planets-in-birth-chart","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0627\u062a \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["uranus-in-natal-chart","neptune-in-natal-chart","\u0645\u0639\u0646\u06cc \u0646\u067e\u062a\u0648\u0646 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["uranus-in-natal-chart","pluto-in-natal-chart","\u0645\u0639\u0646\u06cc \u067e\u0644\u0648\u062a\u0648 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["third-house-in-natal-chart","sixth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0634\u0634\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["third-house-in-natal-chart","ninth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0646\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["third-house-in-natal-chart","eleventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u06cc\u0627\u0632\u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["fifth-house-in-natal-chart","seventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0641\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["fifth-house-in-natal-chart","eleventh-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u06cc\u0627\u0632\u062f\u0647\u0645"],["fifth-house-in-natal-chart","second-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["reading-multiple-aspects-together","stellium-in-natal-chart","\u0627\u0633\u062a\u0644\u06cc\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["reading-multiple-aspects-together","astrology-aspect-orbs-explained","\u0627\u0648\u0631\u0628 \u062f\u0631 \u062c\u0646\u0628\u0647\u200c\u0647\u0627 \u0686\u06cc\u0633\u062a\u061f"],["reading-multiple-aspects-together","hard-aspects-explained","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0633\u062e\u062a \u0686\u0647 \u0645\u0639\u0646\u0627\u06cc\u06cc \u062f\u0627\u0631\u0646\u062f\u061f"],["neptune-in-natal-chart","sun-moon-rising","\u062a\u0641\u0627\u0648\u062a \u062e\u0648\u0631\u0634\u06cc\u062f\u060c \u0645\u0627\u0647 \u0648 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af"],["neptune-in-natal-chart","uranus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0627\u0648\u0631\u0627\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["neptune-in-natal-chart","pluto-in-natal-chart","\u0645\u0639\u0646\u06cc \u067e\u0644\u0648\u062a\u0648 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["combine-planet-sign-house-and-aspect","astrology-houses","\u062e\u0627\u0646\u0647\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["combine-planet-sign-house-and-aspect","planets-in-birth-chart","\u0633\u06cc\u0627\u0631\u0627\u062a \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["combine-planet-sign-house-and-aspect","reading-multiple-aspects-together","\u062e\u0648\u0627\u0646\u062f\u0646 \u0647\u0645\u200c\u0632\u0645\u0627\u0646 \u0686\u0646\u062f \u062c\u0646\u0628\u0647"],["pluto-in-natal-chart","eighth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0647\u0634\u062a\u0645"],["pluto-in-natal-chart","uranus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0627\u0648\u0631\u0627\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["pluto-in-natal-chart","neptune-in-natal-chart","\u0645\u0639\u0646\u06cc \u0646\u067e\u062a\u0648\u0646 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sun-moon-aspects-in-natal-chart","major-aspects","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0627\u0635\u0644\u06cc \u0686\u0627\u0631\u062a"],["sun-moon-aspects-in-natal-chart","new-moon-vs-full-moon-astrology","\u062a\u0641\u0627\u0648\u062a \u0645\u0627\u0647 \u0646\u0648 \u0648 \u0645\u0627\u0647 \u06a9\u0627\u0645\u0644"],["sun-moon-aspects-in-natal-chart","reading-multiple-aspects-together","\u062e\u0648\u0627\u0646\u062f\u0646 \u0647\u0645\u200c\u0632\u0645\u0627\u0646 \u0686\u0646\u062f \u062c\u0646\u0628\u0647"],["venus-mars-aspects-in-natal-chart","conjunction-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0627\u062a\u0635\u0627\u0644 \u0686\u06cc\u0633\u062a\u061f"],["venus-mars-aspects-in-natal-chart","opposition-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0645\u0642\u0627\u0628\u0644\u0647 \u0686\u06cc\u0633\u062a\u061f"],["venus-mars-aspects-in-natal-chart","reading-multiple-aspects-together","\u062e\u0648\u0627\u0646\u062f\u0646 \u0647\u0645\u200c\u0632\u0645\u0627\u0646 \u0686\u0646\u062f \u062c\u0646\u0628\u0647"],["jupiter-saturn-aspects-in-natal-chart","conjunction-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0627\u062a\u0635\u0627\u0644 \u0686\u06cc\u0633\u062a\u061f"],["jupiter-saturn-aspects-in-natal-chart","square-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0645\u0631\u0628\u0639 \u0686\u06cc\u0633\u062a\u061f"],["jupiter-saturn-aspects-in-natal-chart","reading-multiple-aspects-together","\u062e\u0648\u0627\u0646\u062f\u0646 \u0647\u0645\u200c\u0632\u0645\u0627\u0646 \u0686\u0646\u062f \u062c\u0646\u0628\u0647"],["transits-to-natal-sun-and-moon","transits-to-ascendant-and-midheaven","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u0648 \u0645\u06cc\u0627\u0646\u0647 \u0622\u0633\u0645\u0627\u0646"],["transits-to-natal-sun-and-moon","fast-vs-slow-astrology-transits","\u062a\u0631\u0646\u0632\u06cc\u062a \u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627\u06cc \u0633\u0631\u06cc\u0639 \u0648 \u06a9\u0646\u062f"],["transits-to-natal-sun-and-moon","sun-moon-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647"],["natal-chart-uses-and-limits","birth-chart-basics","\u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0686\u06cc\u0633\u062a\u061f"],["natal-chart-uses-and-limits","why-birth-time-matters","\u0627\u0647\u0645\u06cc\u062a \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["natal-chart-uses-and-limits","how-to-read-birth-chart","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u062e\u0648\u0627\u0646\u062f\u0646 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["natal-chart-uses-and-limits","what-is-birth-chart-interpretation","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["overall-chart-signature","birth-chart-basics","\u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0686\u06cc\u0633\u062a\u061f"],["overall-chart-signature","four-elements-in-natal-chart","\u0639\u0646\u0627\u0635\u0631 \u0686\u0647\u0627\u0631\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["overall-chart-signature","zodiac-modalities-in-natal-chart","\u06a9\u06cc\u0641\u06cc\u062a\u200c\u0647\u0627\u06cc \u0633\u0647\u200c\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["overall-chart-signature","stellium-in-natal-chart","\u0627\u0633\u062a\u0644\u06cc\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["chart-ruler-in-natal-chart","planet-sign-house-difference","\u062a\u0641\u0627\u0648\u062a \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646 \u0648 \u062e\u0627\u0646\u0647"],["chart-ruler-in-natal-chart","what-is-rising-sign","\u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u06cc\u0627 \u0637\u0627\u0644\u0639"],["chart-ruler-in-natal-chart","first-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0627\u0648\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["chart-ruler-in-natal-chart","combine-planet-sign-house-and-aspect","\u062a\u0631\u06a9\u06cc\u0628 \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646\u060c \u062e\u0627\u0646\u0647 \u0648 \u062c\u0646\u0628\u0647"],["persian-birth-months-astrology-guide","shahrivar-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0634\u0647\u0631\u06cc\u0648\u0631"],["persian-birth-months-astrology-guide","aban-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0622\u0628\u0627\u0646"],["persian-birth-months-astrology-guide","khordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062e\u0631\u062f\u0627\u062f"],["persian-birth-months-astrology-guide","esfand-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0633\u0641\u0646\u062f"],["persian-birth-months-astrology-guide","farvardin-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0641\u0631\u0648\u0631\u062f\u06cc\u0646"],["shahrivar-birth-month-compatibility","shahrivar-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0634\u0647\u0631\u06cc\u0648\u0631 \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["shahrivar-birth-month-compatibility","khordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062e\u0631\u062f\u0627\u062f"],["shahrivar-birth-month-compatibility","esfand-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0633\u0641\u0646\u062f"],["shahrivar-birth-month-compatibility","farvardin-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0641\u0631\u0648\u0631\u062f\u06cc\u0646 \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["shahrivar-birth-month-compatibility","dey-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062f\u06cc \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["mehr-born-traits","mehr-woman-traits","\u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-born-traits","mehr-man-traits","\u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-born-traits","mehr-birth-month-compatibility","\u0631\u0627\u0628\u0637\u0647 \u0628\u0627 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mordad-woman-traits","mordad-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-woman-traits","mordad-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["mordad-woman-traits","mordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0631\u062f\u0627\u062f"],["mordad-man-traits","mordad-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-man-traits","mordad-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-man-traits","mordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0631\u062f\u0627\u062f"],["mordad-birth-month-compatibility","mordad-woman-traits","\u0632\u0646 \u0645\u0631\u062f\u0627\u062f\u06cc"],["mordad-birth-month-compatibility","mordad-man-traits","\u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-birth-month-compatibility","mordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0631\u062f\u0627\u062f \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["ordibehesht-born-traits","zodiac-modalities-in-natal-chart","\u0645\u062f\u0627\u0644\u06cc\u062a\u0647\u200c\u0647\u0627\u06cc \u06a9\u0627\u0631\u062f\u06cc\u0646\u0627\u0644\u060c \u062b\u0627\u0628\u062a \u0648 \u0645\u062a\u063a\u06cc\u0631"],["ordibehesht-born-traits","ordibehesht-woman-traits","\u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-born-traits","ordibehesht-man-traits","\u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["shahrivar-born-traits","shahrivar-birth-month-compatibility","\u0631\u0627\u0628\u0637\u0647 \u0628\u0627 \u0645\u062a\u0648\u0644\u062f \u0634\u0647\u0631\u06cc\u0648\u0631"],["shahrivar-born-traits","dey-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062f\u06cc"],["shahrivar-born-traits","ordibehesht-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["aban-born-traits","why-sun-sign-is-not-enough","\u0686\u0631\u0627 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f \u0628\u0631\u0627\u06cc \u0634\u0646\u0627\u062e\u062a \u0634\u062e\u0635\u06cc\u062a \u06a9\u0627\u0641\u06cc \u0646\u06cc\u0633\u062a"],["aban-born-traits","persian-birth-months-astrology-guide","\u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["aban-born-traits","esfand-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0633\u0641\u0646\u062f"],["khordad-born-traits","four-elements-in-natal-chart","\u0639\u0646\u0627\u0635\u0631 \u0686\u0647\u0627\u0631\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["khordad-born-traits","persian-birth-months-astrology-guide","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u06a9\u0627\u0645\u0644 \u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u06f1\u06f2 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["mehr-woman-traits","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["mehr-woman-traits","mehr-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-woman-traits","mehr-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631 \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["mehr-man-traits","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["mehr-man-traits","mehr-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-man-traits","mehr-birth-month-compatibility","\u0631\u0627\u0628\u0637\u0647 \u0628\u0627 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-birth-month-compatibility","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["mehr-birth-month-compatibility","mehr-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-birth-month-compatibility","mehr-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["esfand-born-traits","why-sun-sign-is-not-enough","\u0686\u0631\u0627 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f \u0628\u0631\u0627\u06cc \u0634\u0646\u0627\u062e\u062a \u0634\u062e\u0635\u06cc\u062a \u06a9\u0627\u0641\u06cc \u0646\u06cc\u0633\u062a"],["esfand-born-traits","aban-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0622\u0628\u0627\u0646"],["farvardin-born-traits","why-sun-sign-is-not-enough","\u0686\u0631\u0627 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f \u0628\u0631\u0627\u06cc \u0634\u0646\u0627\u062e\u062a \u0634\u062e\u0635\u06cc\u062a \u06a9\u0627\u0641\u06cc \u0646\u06cc\u0633\u062a"],["farvardin-born-traits","persian-birth-months-astrology-guide","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u06a9\u0627\u0645\u0644 \u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u06f1\u06f2 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["mordad-born-traits","mordad-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-born-traits","mordad-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-born-traits","mordad-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["dey-born-traits","shahrivar-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0634\u0647\u0631\u06cc\u0648\u0631 \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["dey-born-traits","shahrivar-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0634\u0647\u0631\u06cc\u0648\u0631"],["dey-born-traits","ordibehesht-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-woman-traits","ordibehesht-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-woman-traits","dey-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062f\u06cc"],["ordibehesht-woman-traits","ordibehesht-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-man-traits","ordibehesht-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-man-traits","shahrivar-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0634\u0647\u0631\u06cc\u0648\u0631"],["ordibehesht-man-traits","ordibehesht-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["khordad-born-traits","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["esfand-born-traits","four-elements-in-natal-chart","\u0639\u0646\u0627\u0635\u0631 \u0686\u0647\u0627\u0631\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["farvardin-born-traits","mordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0631\u062f\u0627\u062f"],["mordad-born-traits","farvardin-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0641\u0631\u0648\u0631\u062f\u06cc\u0646"],["mehr-born-traits","khordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062e\u0631\u062f\u0627\u062f"],["four-elements-in-natal-chart","aban-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0622\u0628\u0627\u0646"]]
$halleus_authority_edges$::jsonb
  ) as authority(edge);

  select count(*)::integer, count(distinct source_stable_id)::integer
    into authority_edge_count, authority_source_count
  from halleus_link_authority_edges;

  if authority_edge_count <> 292 or authority_source_count <> 92 then
    raise exception 'Batch 4 authority payload must contain 292 exact pairs from 92 sources; got % / %.', authority_edge_count, authority_source_count;
  end if;

  if exists (
    select 1
    from halleus_link_authority_edges as authority
    where authority.source_stable_id = authority.target_stable_id
       or authority.source_stable_id not in (select stable_id from halleus_link_baseline_ids)
       or authority.target_stable_id not in (select stable_id from halleus_link_baseline_ids)
  ) then
    raise exception 'Batch 4 authority payload contains an invalid source/target pair.';
  end if;

  select count(*)::integer into authority_present_count
  from halleus_link_authority_edges as authority
  join public.wiki_articles as article on article.stable_id = authority.source_stable_id
  where strpos(
    coalesce(article.body_markdown, ''),
    '[[article:' || authority.target_stable_id || '|' || authority.anchor || ']]'
  ) > 0;

  if authority_present_count <> 292 then
    raise exception 'Batch 4 current bodies must still contain all 292 exact authority markers; found %.', authority_present_count;
  end if;
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

  select count(*)::integer into baseline_edge_count
  from halleus_link_authority_edges;

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
    select 1 from halleus_link_authority_edges
    where source_stable_id = target_stable_id
  ) then
    raise exception 'Batch 4 link-admin baseline contains a self-link.';
  end if;

  if (select count(*) from halleus_link_authority_edges) <> 292 then
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
        jsonb_agg(
          jsonb_build_object(
            'sourceStableId', article.stable_id,
            'targetStableId', authority.target_stable_id,
            'href', '/wiki/' || authority.target_stable_id,
            'anchor', authority.anchor,
            'kind', 'article',
            'placement', 'baseline'
          )
          order by authority.target_stable_id, authority.anchor
        ) as contextual_edges
      from public.wiki_articles as article
      join halleus_link_baseline_ids as expected on expected.stable_id = article.stable_id
      join halleus_link_authority_edges as authority on authority.source_stable_id = article.stable_id
      group by article.id, article.stable_id, article.content_version, article.body_markdown
    ),
    incoming_counts as (
      select target_stable_id as target_id, count(*)::integer as incoming
      from halleus_link_authority_edges
      group by target_stable_id
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
