#!/usr/bin/env bash
set -Eeuo pipefail

# Isolated, reversible PageSpeed comparison of two immutable Git commits.
# Nothing here touches /srv/halleus/current, /previous, /releases, or halleus.service.
REVISION=halleus-pagespeed-preview-20261122-r1
SOURCE=/srv/halleus/source
ROOT=/srv/halleus/perf-preview-20261122
A_SHA=cbc39dafbd08e876bf8d977eb3d02849d71f35a4
B_SHA=613b12c18b3bcfcc8a8d16a5c12a9de81d2ecb37
B_BRANCH=perf/20261122-chart-fast-mobile-wheel-labels
A_HOST=${HALLEUS_PREVIEW_A_HOST:-perf-a.halleus.ir}
B_HOST=${HALLEUS_PREVIEW_B_HOST:-perf-b.halleus.ir}
CERT=${HALLEUS_PREVIEW_CERT:-}
KEY=${HALLEUS_PREVIEW_KEY:-}
NGINX_CONF=/etc/nginx/conf.d/halleus-perf-preview-20261122.conf
UNIT_A=/etc/systemd/system/halleus-perf-preview-a.service
UNIT_B=/etc/systemd/system/halleus-perf-preview-b.service
FAILURES=()

log() { printf 'PREVIEW: %s\n' "$*"; }
die() { printf 'SAFETY_FATAL: %s\n' "$*" >&2; exit 2; }
usage() {
  cat <<'HELP'
Usage: sudo bash halleus-pagespeed-preview-20261122.sh inspect|prepare|expose|start-a|start-b|stop|status
  inspect   Read-only safety and resource checks (does not require DNS)
  prepare   Build original immutable commits into isolated git worktrees; no deploy
  expose    Install two HTTP-only preview hosts, or HTTPS when CERT/KEY are set;
            adds isolated systemd units and an Nginx config (does not start them)
  start-a   Stop preview B; start A on loopback 3217
  start-b   Stop preview A; start B on loopback 3218
  stop      Stop both preview services (leave files and builds intact)
  status    Show preview state, exact Git SHAs, and public URLs
Environment (optional):
  HALLEUS_PREVIEW_A_HOST=perf-a.halleus.ir
  HALLEUS_PREVIEW_B_HOST=perf-b.halleus.ir
  HALLEUS_PREVIEW_CERT=/absolute/path/to/cert.pem
  HALLEUS_PREVIEW_KEY=/absolute/path/to/key.pem
DNS A records must point to this VPS before expose. No DNS or certificates are created.
Only /chart, /_next/ and static assets are publicly served. No accounts, APIs or admin routes.
HELP
}

require_root() { [[ $EUID -eq 0 ]] || die 'Run through sudo'; }
require_cmds() {
  local tool
  for tool in git nginx systemctl systemd-run runuser node curl df awk ss getent; do
    command -v "$tool" >/dev/null 2>&1 || die "Missing executable: $tool"
  done
}
check_origin() {
  [[ -d $SOURCE/.git ]] || die "Source checkout missing: $SOURCE"
  local origin branch dirty
  origin=$(git -C "$SOURCE" remote get-url origin)
  case "$origin" in
    https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git|ssh://git@github.com/bleucluod/astro-clean.git) ;;
    *) die "Unexpected origin: $origin" ;;
  esac
  branch=$(git -C "$SOURCE" symbolic-ref --quiet --short HEAD || true)
  [[ $branch == main ]] || die "Unexpected source branch: $branch"
  dirty=$(git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)
  [[ -z $dirty ]] || die 'Production source checkout is dirty; refusing to proceed'
  [[ -f $SOURCE/ops/vps/halleus-release.sh ]] || die 'Release engine missing'
}
check_production() {
  systemctl is-active --quiet halleus.service || die 'Production service is not active'
  [[ -L /srv/halleus/current && -L /srv/halleus/previous ]] || die 'Production current/previous links missing'
  local code
  code=$(curl --silent --max-time 10 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:3000/chart || true)
  [[ $code == 200 ]] || die "Production chart health is $code (expected 200)"
}
check_root() {
  if [[ -e $ROOT || -L $ROOT ]]; then
    [[ -d $ROOT && ! -L $ROOT && -f $ROOT/.identity ]] || die 'Preview root exists but is not owned by this script'
    [[ $(cat "$ROOT/.identity") == "$REVISION" ]] || die 'Preview root marker differs'
  fi
}
check_resources() {
  local free_bytes available_kb
  free_bytes=$(df -B1 --output=avail /srv/halleus | awk 'NR==2 {print $1}')
  available_kb=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)
  [[ $free_bytes =~ ^[0-9]+$ && $available_kb =~ ^[0-9]+$ ]] || die 'Cannot read free storage/RAM'
  log "available_disk_bytes=$free_bytes available_memory_kb=$available_kb"
  ((free_bytes >= 6442450944)) || die 'Less than 6 GiB free disk; do not build previews here'
  ((available_kb >= 2550000)) || die 'Less than 2.43 GiB MemAvailable; avoid pressure on production'
}
check_refs() {
  git -C "$SOURCE" cat-file -e "${A_SHA}^{commit}" || die "Missing A commit: $A_SHA"
  git -C "$SOURCE" cat-file -e "${B_SHA}^{commit}" || die "Missing B commit: $B_SHA"
  local changed
  changed=$(git -C "$SOURCE" diff --name-only "$A_SHA" "$B_SHA")
  [[ $changed == components/ChartMobileBirthPicker.tsx ]] || die "Unexpected diff between candidates: $changed"
  git -C "$SOURCE" diff --check "$A_SHA" "$B_SHA" || die 'Candidate diff whitespace error'
  log 'candidate_difference=components/ChartMobileBirthPicker.tsx only'
}
check_hostnames() {
  [[ $A_HOST =~ ^[a-z0-9][a-z0-9.-]*[a-z0-9]$ ]] || die "Invalid host A: $A_HOST"
  [[ $B_HOST =~ ^[a-z0-9][a-z0-9.-]*[a-z0-9]$ ]] || die "Invalid host B: $B_HOST"
  [[ $A_HOST != "$B_HOST" && $A_HOST != halleus.ir && $B_HOST != halleus.ir ]] || die 'Preview host collides with production'
  getent ahostsv4 "$A_HOST" >/dev/null || die "DNS missing: $A_HOST"
  getent ahostsv4 "$B_HOST" >/dev/null || die "DNS missing: $B_HOST"
  if [[ -n $CERT || -n $KEY ]]; then
    [[ -n $CERT && -n $KEY && -f $CERT && -f $KEY ]] || die 'Both TLS certificate and key must exist'
    [[ $CERT =~ ^/[a-zA-Z0-9_./-]+$ && $KEY =~ ^/[a-zA-Z0-9_./-]+$ ]] || die 'Unsafe TLS path'
    command -v openssl >/dev/null || die 'openssl missing'
    openssl x509 -in "$CERT" -noout -checkhost "$A_HOST" | grep -q 'does match' || die 'TLS cert does not cover A'
    openssl x509 -in "$CERT" -noout -checkhost "$B_HOST" | grep -q 'does match' || die 'TLS cert does not cover B'
  else
    # HTTP preview subdomains are incompatible with parent HSTS includeSubDomains.
    local hsts
    local headers
    headers=$(curl --fail --max-time 10 --silent --show-error --head https://halleus.ir/) || die 'Cannot verify production HSTS; refusing HTTP preview'
    hsts=$(printf '%s\n' "$headers" | tr -d '\r' | tr '[:upper:]' '[:lower:]' | grep '^strict-transport-security:' || true)
    if [[ $hsts == *includesubdomains* ]]; then
      die 'Production HSTS includes subdomains; configure preview TLS CERT/KEY'
    fi
  fi
}
check_ports() {
  local port
  for port in 3217 3218; do
    if ss -H -ltn "sport = :$port" | grep -q .; then
      if ! systemctl is-active --quiet "halleus-perf-preview-$([[ $port == 3217 ]] && echo a || echo b).service"; then
        die "Port $port is used by an unrelated service"
      fi
    fi
  done
}
bootstrap_root() {
  if [[ ! -e $ROOT ]]; then
    mkdir -m 0750 "$ROOT"
    printf '%s\n' "$REVISION" > "$ROOT/.identity"
    chown root:deploy "$ROOT" "$ROOT/.identity"
  fi
  mkdir -p "$ROOT/logs"
  chown root:deploy "$ROOT/logs"
  chmod 0750 "$ROOT/logs"
}
setup_worktree() {
  local key=$1 sha=$2 dest="$ROOT/$1"
  if [[ -e $dest || -L $dest ]]; then
    [[ -d $dest && ! -L $dest && -f $dest/.git ]] || die "Unexpected worktree path: $dest"
    [[ $(git -C "$dest" rev-parse HEAD) == "$sha" ]] || die "Wrong candidate at $dest"
    [[ -z $(git -C "$dest" status --porcelain=v1 --untracked-files=all) ]] || die "Dirty preview worktree $dest"
    return
  fi
  git -C "$SOURCE" worktree add --detach "$dest" "$sha"
  chown -R deploy:deploy "$dest"
  log "worktree_${key}=$sha"
}
run_build() {
  local key=$1 host=$2 dest="$ROOT/$1" log_file="$ROOT/logs/$1-build.log" pnpm_bin=$3
  if [[ -f $dest/.next/BUILD_ID ]]; then
    log "RESUMED_PASS: existing build for $key ($(cat "$dest/.next/BUILD_ID"))"
    return
  fi
  log "Starting isolated, capped install/build of $key. See $log_file"
  local safe_path="$(dirname "$pnpm_bin"):/usr/local/bin:/usr/bin:/bin"
  if ! systemd-run --quiet --scope -p CPUQuota=70% -p MemoryMax=2200M \
       runuser -u deploy -- env -i HOME=/home/deploy USER=deploy PATH="$safe_path" \
       NEXT_PUBLIC_SITE_URL="http://$host" "$pnpm_bin" --dir "$dest" install --frozen-lockfile --prod=false \
       >"$log_file" 2>&1; then
    FAILURES+=("$key:dependency_install")
    return
  fi
  if ! systemd-run --quiet --scope -p CPUQuota=70% -p MemoryMax=2200M \
       runuser -u deploy -- env -i HOME=/home/deploy USER=deploy PATH="$safe_path" \
       NEXT_PUBLIC_SITE_URL="http://$host" "$pnpm_bin" --dir "$dest" build \
       >>"$log_file" 2>&1; then
    FAILURES+=("$key:next_build")
    return
  fi
  if [[ ! -f $dest/.next/BUILD_ID ]]; then
    FAILURES+=("$key:missing_build_id")
    return
  fi
  log "BUILD_PASS $key id=$(cat "$dest/.next/BUILD_ID")"
}
write_unit() {
  local key=$1 host=$2 port=$3 dest="$ROOT/$1" outfile=$4
  [[ ! -e $outfile ]] || { grep -q "^# $REVISION$" "$outfile" || die "Unexpected unit file: $outfile"; return; }
  cat > "$outfile" <<EOF
# $REVISION
[Unit]
Description=Halleus isolated PageSpeed preview $key
After=network.target
[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=$dest
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_SITE_URL=http://$host
ExecStart=/usr/local/bin/node $dest/node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port $port
Restart=no
MemoryMax=850M
CPUQuota=80%
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$dest/.next
ProtectHome=true
IPAddressDeny=any
IPAddressAllow=localhost
UMask=0027
EOF
}
write_nginx_server() {
  local host=$1 port=$2
  if [[ -n $CERT ]]; then
    cat <<EOF
server {
    listen 80;
    server_name $host;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name $host;
    ssl_certificate $CERT;
    ssl_certificate_key $KEY;
EOF
  else
    cat <<EOF
server {
    listen 80;
    server_name $host;
EOF
  fi
  cat <<EOF
    # $REVISION
    add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
    add_header Content-Security-Policy "script-src 'self' 'unsafe-inline'; connect-src 'self'" always;
    add_header Cache-Control "no-store" always;
    location = /chart {
        limit_except GET { deny all; }
        proxy_pass http://127.0.0.1:$port;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location ^~ /_next/ {
        limit_except GET { deny all; }
        proxy_pass http://127.0.0.1:$port;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location ~* ^/[a-zA-Z0-9_./-]+\\.(?:png|jpe?g|svg|webp|avif|gif|ico|woff2?|css|js)$ {
        limit_except GET { deny all; }
        proxy_pass http://127.0.0.1:$port;
        proxy_set_header Host \$host;
    }
    location / { return 404; }
}
EOF
}
install_exposure() {
  check_hostnames
  check_ports
  [[ -f $ROOT/a/.next/BUILD_ID && -f $ROOT/b/.next/BUILD_ID ]] || die 'Both builds are required before exposure'
  [[ -f /etc/nginx/nginx.conf ]] || die 'Nginx configuration missing'
  local expanded
  expanded=$(nginx -T 2>&1) || die 'Existing Nginx config invalid'
  grep -Fq '/etc/nginx/conf.d/*.conf' <<< "$expanded" || die 'Nginx does not load /etc/nginx/conf.d/*.conf'
  if [[ ! -e $NGINX_CONF ]]; then
    if grep -Eiq "server_name[[:space:]]+($A_HOST|$B_HOST)([[:space:];]|$)" <<< "$expanded"; then
      die 'A requested preview host is already configured in Nginx'
    fi
  else
    grep -q "$REVISION" "$NGINX_CONF" || die 'Preview Nginx config collision'
    grep -Fq "server_name $A_HOST;" "$NGINX_CONF" || die 'Existing preview A hostname changed'
    grep -Fq "server_name $B_HOST;" "$NGINX_CONF" || die 'Existing preview B hostname changed'
  fi
  if [[ -e $UNIT_A ]]; then
    grep -Fq "Environment=NEXT_PUBLIC_SITE_URL=http://$A_HOST" "$UNIT_A" || die 'Existing preview A unit changed'
  fi
  if [[ -e $UNIT_B ]]; then
    grep -Fq "Environment=NEXT_PUBLIC_SITE_URL=http://$B_HOST" "$UNIT_B" || die 'Existing preview B unit changed'
  fi
  local had_a=0 had_b=0 had_nginx=0
  [[ -e $UNIT_A ]] && had_a=1
  [[ -e $UNIT_B ]] && had_b=1
  [[ -e $NGINX_CONF ]] && had_nginx=1
  write_unit a "$A_HOST" 3217 "$UNIT_A"
  write_unit b "$B_HOST" 3218 "$UNIT_B"
  if [[ ! -e $NGINX_CONF ]]; then
    { write_nginx_server "$A_HOST" 3217; write_nginx_server "$B_HOST" 3218; } > "$NGINX_CONF"
  fi
  if ! nginx -t; then
    ((had_a)) || rm -f "$UNIT_A"
    ((had_b)) || rm -f "$UNIT_B"
    ((had_nginx)) || rm -f "$NGINX_CONF"
    die 'Nginx candidate invalid; new configuration rolled back'
  fi
  systemctl daemon-reload
  if ! systemctl reload nginx; then
    ((had_a)) || rm -f "$UNIT_A"
    ((had_b)) || rm -f "$UNIT_B"
    ((had_nginx)) || rm -f "$NGINX_CONF"
    nginx -t && systemctl reload nginx || true
    die 'Nginx reload failed; new configuration removed'
  fi
  log 'EXPOSE_READY (no preview process started)'
}
start_one() {
  local key=$1 other=a port=3218
  if [[ $key == a ]]; then other=b; port=3217; fi
  [[ -f $ROOT/$key/.next/BUILD_ID ]] || die "Preview $key not built"
  [[ -f $NGINX_CONF && -f $UNIT_A && -f $UNIT_B ]] || die 'Exposure not installed'
  systemctl stop "halleus-perf-preview-$other.service" || die "Cannot stop other preview $other"
  if systemctl is-active --quiet "halleus-perf-preview-$other.service"; then die "Other preview $other remains active"; fi
  systemctl start "halleus-perf-preview-$key.service" || die "Preview $key failed to start"
  local code='' i
  for i in $(seq 1 20); do
    code=$(curl --silent --max-time 5 --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:$port/chart" || true)
    [[ $code == 200 ]] && break
    sleep 1
  done
  [[ $code == 200 ]] || die "Preview $key startup smoke failed: $code"
  local hostname=$A_HOST
  [[ $key == b ]] && hostname=$B_HOST
  local proxy_code
  proxy_code=$(curl --silent --max-time 10 --header "Host: $hostname" --output /dev/null --write-out '%{http_code}' http://127.0.0.1/chart || true)
  [[ $proxy_code == 200 ]] || die "Preview $key Nginx route failed: $proxy_code"
  check_production
  log "READY http://$([[ $key == a ]] && printf '%s' "$A_HOST" || printf '%s' "$B_HOST")/chart"
}
print_status() {
  local key s
  log "production=$(systemctl is-active halleus.service || true)"
  for key in a b; do
    if [[ -d $ROOT/$key && -f $ROOT/$key/.git ]]; then
      s=$(git -C "$ROOT/$key" rev-parse HEAD)
      log "preview_$key sha=$s build=$([[ -f $ROOT/$key/.next/BUILD_ID ]] && cat "$ROOT/$key/.next/BUILD_ID" || echo NONE) service=$(systemctl is-active "halleus-perf-preview-$key.service" || true)"
    else
      log "preview_$key=NOT_PREPARED"
    fi
  done
  log "host_a=http://$A_HOST/chart host_b=http://$B_HOST/chart"
}
main() {
  local action=${1:-}
  [[ $# -eq 1 ]] || { usage; exit 1; }
  case "$action" in inspect|prepare|expose|start-a|start-b|stop|status) ;; *) usage; exit 1 ;; esac
  require_root
  require_cmds
  check_origin
  check_production
  check_root
  case "$action" in
    inspect)
      check_resources
      log "source_sha=$(git -C "$SOURCE" rev-parse HEAD)"
      log "origin=$(git -C "$SOURCE" remote get-url origin)"
      if git -C "$SOURCE" cat-file -e "${B_SHA}^{commit}" 2>/dev/null; then check_refs; else log 'B SHA not fetched yet; prepare will fetch from pinned branch'; fi
      print_status
      ;;
    prepare)
      check_resources
      [[ ! -e $UNIT_A && ! -e $UNIT_B && ! -e $NGINX_CONF ]] || log 'Existing preview exposure found; preserving it'
      git -C "$SOURCE" fetch origin "refs/heads/$B_BRANCH"
      [[ $(git -C "$SOURCE" rev-parse FETCH_HEAD) == "$B_SHA" ]] || die 'Candidate branch head has changed; refusing unknown SHA'
      check_refs
      bootstrap_root
      setup_worktree a "$A_SHA"
      setup_worktree b "$B_SHA"
      local pnpm_bin
      pnpm_bin=$(runuser -u deploy -- bash -lc 'command -v pnpm')
      [[ -n $pnpm_bin && -x $pnpm_bin ]] || die 'No executable pnpm for deploy user'
      run_build a "$A_HOST" "$pnpm_bin"
      run_build b "$B_HOST" "$pnpm_bin"
      print_status
      if (( ${#FAILURES[@]} > 0 )); then
        printf 'CANDIDATE_FAILURE: %s\n' "${FAILURES[*]}" >&2
        exit 1
      fi
      log 'BUILD_SET_PASS'
      ;;
    expose)
      install_exposure
      print_status
      ;;
    start-a) start_one a; print_status ;;
    start-b) start_one b; print_status ;;
    stop)
      systemctl stop halleus-perf-preview-a.service halleus-perf-preview-b.service || true
      check_production
      print_status
      ;;
    status) print_status ;;
  esac
}
main "$@"
