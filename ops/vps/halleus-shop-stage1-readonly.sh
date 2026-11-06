#!/usr/bin/env bash
# Run on the actual Halleus VPS as root ONLY to collect non-secret stage-1 facts.
# It has no writes, no environment dumps, no customer/report-row reads and no
# migrations. Copy/paste its body into `sudo bash -s` if this branch is not on VPS.
set -Eeuo pipefail
set +x

if [ "${EUID}" -ne 0 ]; then
  printf '%s\n' 'SAFETY_FATAL: root needed to inspect the existing root-owned env/Nginx metadata.'
  exit 2
fi

echo 'HALLEUS_SHOP_S1_READONLY_V1'
if systemctl is-active --quiet halleus.service >/dev/null 2>&1; then
  echo 'service_active=yes'
else
  echo 'service_active=no_or_unavailable'
fi
if systemctl is-enabled --quiet halleus.service >/dev/null 2>&1; then
  echo 'service_enabled=yes'
else
  echo 'service_enabled=no_or_unavailable'
fi
if [ -d /srv/halleus/source/.git ]; then
  printf 'source_head=%s\n' "$(git -C /srv/halleus/source rev-parse --verify HEAD 2>/dev/null || echo unavailable)"
else
  echo 'source_head=unavailable'
fi
for label in current previous; do
  path="/srv/halleus/${label}"
  if [ -L "$path" ]; then
    # Do not expose deployment directory names; verify only link existence.
    printf '%s_release_link=present\n' "$label"
  else
    printf '%s_release_link=missing\n' "$label"
  fi
done

if command -v nginx >/dev/null 2>&1; then
  nginx -T 2>/dev/null | awk '
    /^[[:space:]]*proxy_pass[[:space:]]/ { proxy_pass++ }
    /^[[:space:]]*proxy_set_header[[:space:]]+X-Halleus-Shop-Client-IP[[:space:]]+\$remote_addr[[:space:]]*;/ { shop_header++ }
    /^[[:space:]]*real_ip_header[[:space:]]/ { real_ip++ }
    /^[[:space:]]*set_real_ip_from[[:space:]]/ { real_ip_trust++ }
    END { printf "nginx_proxy_pass_count=%d\nnginx_shop_ip_overwrite_marker_count=%d\nnginx_real_ip_header_count=%d\nnginx_real_ip_trust_count=%d\n", proxy_pass, shop_header, real_ip, real_ip_trust }
  ' || echo 'nginx_config=unavailable'
else
  echo 'nginx_config=unavailable'
fi

env_file=/etc/halleus/halleus.env
if [ ! -f "$env_file" ]; then
  echo 'env_file=missing'
  echo 'database_metadata=BLOCKED_BY_DEPENDENCY'
  echo 'HALLEUS_SHOP_S1_READONLY_DONE'
  exit 0
fi
echo 'env_file=present'
for name in DATABASE_URL NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY \
  HALLEUS_SHOP_PRINT_ARCHIVE_ROOT HALLEUS_SHOP_PRINT_ORIGINALS_DIR \
  HALLEUS_SHOP_SHARED_RATE_ENABLED HALLEUS_SHOP_TRUSTED_CLIENT_IP HALLEUS_SHOP_RATE_SECRET; do
  if grep -Eq "^[[:space:]]*${name}=" "$env_file"; then
    printf 'env_key_%s=present\n' "$name"
  else
    printf 'env_key_%s=absent\n' "$name"
  fi
done

# Parse one EnvironmentFile assignment as data, NOT shell code. Never print it.
database_url=''
archive_root=''
originals_root=''
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    DATABASE_URL=*) database_url="${line#DATABASE_URL=}" ;;
    HALLEUS_SHOP_PRINT_ARCHIVE_ROOT=*) archive_root="${line#*=}" ;;
    HALLEUS_SHOP_PRINT_ORIGINALS_DIR=*) originals_root="${line#*=}" ;;
  esac
done < "$env_file"
database_url="${database_url%$'\r'}"
if [[ "$database_url" == '"'*'"' && ${#database_url} -ge 2 ]]; then
  database_url="${database_url:1:${#database_url}-2}"
fi

for label in archive originals; do
  if [ "$label" = archive ]; then
    candidate="$archive_root"
    marker='.halleus-private-shop-archive'
    expected='HALLEUS_PRIVATE_SHOP_ARCHIVE_V1'
  else
    candidate="$originals_root"
    marker='.halleus-shop-private-originals'
    expected='HALLEUS_SHOP_PRIVATE_ORIGINALS_V1'
  fi
  candidate="${candidate%$'\r'}"
  if [[ "$candidate" == '"'*'"' && ${#candidate} -ge 2 ]]; then
    candidate="${candidate:1:${#candidate}-2}"
  fi
  if [[ "$candidate" != /* ]] || [ -L "$candidate" ] || [ ! -d "$candidate" ]; then
    printf 'shop_%s_private_root=not_ready\n' "$label"
  elif [[ "$(stat -c %a -- "$candidate")" != '700' ]] || [ -L "$candidate/$marker" ] \
    || [ ! -f "$candidate/$marker" ] || [[ "$(stat -c %a -- "$candidate/$marker")" != '600' ]] \
    || [ "$(head -n 1 -- "$candidate/$marker")" != "$expected" ]; then
    printf 'shop_%s_private_root=marker_or_mode_unverified\n' "$label"
  else
    printf 'shop_%s_private_root=marker_and_mode_present\n' "$label"
  fi
done

if [ -z "$database_url" ]; then
  echo 'database_metadata=BLOCKED_BY_DEPENDENCY:db_url_unreadable'
elif ! command -v psql >/dev/null 2>&1; then
  echo 'database_metadata=BLOCKED_BY_DEPENDENCY:psql_missing'
else
  # Libpq environment, not a URL on the process command line. No SQL data rows.
  export PGDATABASE="$database_url"
  if psql -X -q -v ON_ERROR_STOP=1 -A -t >/dev/null 2>&1 <<'SQL_PROBE'
begin transaction read only;
select current_setting('server_version_num');
rollback;
SQL_PROBE
  then
    echo 'database_connection=ok'
    psql -X -q -v ON_ERROR_STOP=1 -A -F '|' <<'SQL_METADATA' || echo 'database_metadata=EXTERNAL_BLOCK:read_only_sql_failed'
begin transaction isolation level repeatable read read only;
select 'database', current_setting('server_version_num'),
  to_regclass('public.halleus_reports') is not null,
  to_regclass('auth.users') is not null,
  to_regnamespace('halleus_private') is not null,
  to_regclass('halleus_private.shop_orders') is not null,
  to_regclass('halleus_private.shop_order_events') is not null,
  to_regclass('halleus_private.shared_display_numbers_seq') is not null,
  to_regclass('halleus_private.shop_rate_limits') is not null;
select 'roles', to_regrole('anon') is not null,
  to_regrole('authenticated') is not null,
  to_regprocedure('halleus_private.reject_audit_event_mutation()') is not null;
select 'column', n.nspname, c.relname, a.attname,
  format_type(a.atttypid, a.atttypmod)
from pg_catalog.pg_attribute a
join pg_catalog.pg_class c on c.oid = a.attrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where a.attnum > 0 and not a.attisdropped
  and ((n.nspname = 'public' and c.relname = 'halleus_reports'
       and a.attname in ('id','created_at','display_number','user_id'))
    or (n.nspname = 'halleus_private' and c.relname in
      ('shop_orders','shop_order_events','shop_rate_limits')
      and a.attname in ('id','display_number','version','scope_hash','hits')))
order by n.nspname, c.relname, a.attname;
rollback;
SQL_METADATA
  else
    echo 'database_metadata=EXTERNAL_BLOCK:connection_failed'
  fi
  unset PGDATABASE database_url
fi
echo 'HALLEUS_SHOP_S1_READONLY_DONE'
