-- Halleus development seed placeholders.
-- Keep this file free of real personal data.

insert into halleus_users (
  id,
  email,
  display_name,
  provider,
  status,
  plan,
  created_at,
  updated_at
)
values (
  'local-preview-user',
  null,
  'Preview User',
  'local-preview',
  'preview',
  'preview',
  now(),
  now()
)
on conflict (id) do nothing;
