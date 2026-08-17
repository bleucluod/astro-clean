-- HALLEUS_WIKI_OUTGOING_MIN_OPTIONAL
-- Forward-only rule-version change: outgoing contextual article links are optional.
-- Preserve every other active Wiki link rule exactly as configured.
-- Apply after 0022_wiki_link_rule_min3_unbounded.sql.

begin;

do $halleus_outgoing_optional$
declare
  active_count integer;
  current_config jsonb;
  target_config jsonb;
begin
  if to_regclass('halleus_private.wiki_link_rule_versions') is null then
    raise exception 'Wiki link rule storage is required before 0023.';
  end if;

  select count(*)
    into active_count
  from halleus_private.wiki_link_rule_versions
  where is_active = true;

  if active_count <> 1 then
    raise exception '0023 requires exactly one active Wiki link rule version; found %.', active_count;
  end if;

  select config
    into current_config
  from halleus_private.wiki_link_rule_versions
  where is_active = true
  order by version desc
  limit 1;

  target_config := jsonb_set(current_config, '{outgoingMin}', '0'::jsonb, true);

  if current_config = target_config then
    return;
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
    'Outgoing contextual article links are optional; preserve all other active Wiki link rules'
  );
end;
$halleus_outgoing_optional$;

commit;
