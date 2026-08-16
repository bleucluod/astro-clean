-- Halleus R20B6: forward-only Wiki link rule version normalization.
-- HALLEUS_BATCH4_R20B13_UNBOUNDED_CORE_LINKS
-- Apply after 0021_wiki_global_contextual_link_quota_repair.sql.
-- Preserves rule history; creates one new active rule version only when the
-- current active rule is the reviewed v0.1.407 rule or the target rule is not
-- already active.

begin;

do $halleus_r20b6$
declare
  active_count integer;
  current_config jsonb;
  target_config jsonb;
begin
  if to_regclass('halleus_private.wiki_link_rule_versions') is null then
    raise exception 'Wiki link rule storage is required before 0022.';
  end if;

  select count(*)
    into active_count
  from halleus_private.wiki_link_rule_versions
  where is_active = true;

  if active_count <> 1 then
    raise exception '0022 requires exactly one active Wiki link rule version; found %.', active_count;
  end if;

  target_config := jsonb_build_object(
    'outgoingMin', 3,
    'outgoingMax', 0,
    'incomingMin', 3,
    'incomingTarget', 3,
    'incomingMax', 0,
    'breadcrumbRequired', true,
    'categoryLinkMax', 1,
    'coreMax', 0,
    'coreRoutes', jsonb_build_array('/', '/chart', '/compare', '/sky', '/wiki'),
    'anchorMinChars', 3,
    'anchorMaxChars', 120,
    'oneWordCoreAllowlist', jsonb_build_array(U&'\0647\0627\0644\06CC\0648\0633'),
    'excludedStableIds', '[]'::jsonb,
    'prohibitSelf', true,
    'prohibitDuplicate', true,
    'prohibitUnpublishedTargets', true
  );

  select config
    into current_config
  from halleus_private.wiki_link_rule_versions
  where is_active = true
  order by version desc
  limit 1;

  if current_config = target_config then
    return;
  end if;

  if not (
    current_config ->> 'outgoingMin' = '3'
    and current_config ->> 'outgoingMax' = '5'
    and current_config ->> 'incomingMin' = '2'
    and current_config ->> 'incomingTarget' = '3'
    and current_config ->> 'incomingMax' = '6'
    and coalesce(current_config -> 'excludedStableIds', '[]'::jsonb) = jsonb_build_array(
      'active-receptive-energy-in-astrology',
      'missing-elements-in-natal-chart',
      'ordibehesht-birth-month-compatibility',
      'tir-born-traits'
    )
  ) then
    raise exception '0022 refuses to replace an unexpected active Wiki link rule configuration.';
  end if;

  update halleus_private.wiki_link_rule_versions
  set is_active = false
  where is_active = true;

  insert into halleus_private.wiki_link_rule_versions (
    config,
    is_active,
    reason
  )
  values (
    target_config,
    true,
    'R20B13 forward rule version: global contextual min3 with zero-sentinel unbounded maxima and core multiplicity'
  );
end;
$halleus_r20b6$;

commit;
