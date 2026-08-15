-- HALLEUS_FREE_ALL_ACCESS_MODE_MIGRATION_BATCH1_R1
-- Activate FREE_ALL in the existing versioned report_access_policy source of truth.
-- Credit balances, credit ledger, purchase requests/history, unlock rows, publication and report rows are untouched.
begin;

do $$
begin
  if not exists (
    select 1
    from halleus_private.report_access_policy
    where singleton_id = 1
  ) then
    raise exception 'report_access_policy singleton is required before 0016';
  end if;
end
$$;

with previous as (
  select version, config
  from halleus_private.report_access_policy
  where singleton_id = 1
    and coalesce(config ->> 'monetizationMode', 'CONFIGURED') <> 'FREE_ALL'
  for update
), updated as (
  update halleus_private.report_access_policy policy
  set
    version = policy.version + 1,
    config = jsonb_set(
      policy.config,
      '{monetizationMode}',
      to_jsonb('FREE_ALL'::text),
      true
    ),
    updated_at = now(),
    updated_by = null
  from previous
  where policy.singleton_id = 1
  returning policy.version, policy.updated_at
)
insert into halleus_private.admin_audit_events (
  actor_user_id,
  actor_role,
  action,
  target_type,
  target_id,
  before_summary,
  after_summary,
  reason,
  success,
  request_correlation_id
)
select
  null,
  null,
  'system.monetization.access_mode_initialized',
  'report_access_policy',
  updated.version::text,
  jsonb_build_object(
    'version', previous.version,
    'monetizationMode', coalesce(previous.config ->> 'monetizationMode', 'CONFIGURED')
  ),
  jsonb_build_object(
    'version', updated.version,
    'monetizationMode', 'FREE_ALL',
    'updatedAt', updated.updated_at
  ),
  'Batch 1 production activation of FREE_ALL. No credit, unlock, purchase or publication state changed.',
  true,
  'migration:0016:free_all'
from previous
cross join updated;

commit;
