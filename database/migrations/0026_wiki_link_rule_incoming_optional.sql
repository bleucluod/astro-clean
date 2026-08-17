-- HALLEUS_WIKI_INCOMING_MIN_OPTIONAL_TARGET3
-- Forward-only rule-version change: incoming backlinks are advisory for publication.
-- Keep the backlink quality target at 3 so Link Admin continues to warn and suggest.
-- Apply after 0025_wiki_shahrivar_1405_encoding_repair.sql.

begin;

do $halleus_incoming_optional$
declare
  active_count integer;
  current_config jsonb;
  target_config jsonb;
begin
  if to_regclass('halleus_private.wiki_link_rule_versions') is null then
    raise exception 'Wiki link rule storage is required before 0026.';
  end if;

  select count(*)
    into active_count
  from halleus_private.wiki_link_rule_versions
  where is_active = true;

  if active_count <> 1 then
    raise exception '0026 requires exactly one active Wiki link rule version; found %.', active_count;
  end if;

  select config
    into current_config
  from halleus_private.wiki_link_rule_versions
  where is_active = true
  order by version desc
  limit 1;

  if coalesce((current_config ->> 'outgoingMin')::integer, -1) <> 0 then
    raise exception '0026 expected outgoingMin=0 before incoming repair; found %.',
      current_config ->> 'outgoingMin';
  end if;

  if coalesce((current_config ->> 'incomingMin')::integer, -1) not in (0, 3) then
    raise exception '0026 expected incomingMin in (0,3); found %.',
      current_config ->> 'incomingMin';
  end if;

  if coalesce((current_config ->> 'incomingTarget')::integer, -1) <> 3 then
    raise exception '0026 preserves incomingTarget=3; found unexpected target %.',
      current_config ->> 'incomingTarget';
  end if;

  target_config := jsonb_set(current_config, '{incomingMin}', '0'::jsonb, true);

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
    'Incoming backlinks are advisory for publication; preserve incomingTarget=3 for Link Admin warnings and suggestions'
  );
end;
$halleus_incoming_optional$;

commit;