-- ONE-TIME OWNER BOOTSTRAP TEMPLATE
-- Copy this file into Supabase SQL Editor.
-- Replace only REPLACE_WITH_SUPABASE_USER_UUID locally.
-- Never commit a real user UUID.

begin;

do $$
declare
  owner_user_id_text text := 'REPLACE_WITH_SUPABASE_USER_UUID';
  owner_user_id uuid;
  previous_membership jsonb;
begin
  if owner_user_id_text = 'REPLACE_WITH_SUPABASE_USER_UUID' then
    raise exception 'Replace REPLACE_WITH_SUPABASE_USER_UUID before executing.';
  end if;

  owner_user_id := owner_user_id_text::uuid;

  if not exists (select 1 from auth.users where id = owner_user_id) then
    raise exception 'Supabase auth user % does not exist.', owner_user_id;
  end if;

  select to_jsonb(m)
    into previous_membership
  from halleus_private.admin_memberships m
  where m.user_id = owner_user_id;

  insert into halleus_private.admin_memberships (
    user_id,
    role,
    status,
    created_by,
    updated_by,
    revoked_at,
    revoked_by
  )
  values (
    owner_user_id,
    'owner',
    'active',
    owner_user_id,
    owner_user_id,
    null,
    null
  )
  on conflict (user_id) do update
  set role = 'owner',
      status = 'active',
      updated_at = now(),
      updated_by = owner_user_id,
      revoked_at = null,
      revoked_by = null;

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
  values (
    owner_user_id,
    'owner',
    'admin.owner_bootstrap',
    'admin_membership',
    owner_user_id::text,
    previous_membership,
    jsonb_build_object('role', 'owner', 'status', 'active'),
    'One-time owner bootstrap executed in Supabase SQL Editor.',
    true,
    'sql-editor-owner-bootstrap'
  );
end;
$$;

commit;
