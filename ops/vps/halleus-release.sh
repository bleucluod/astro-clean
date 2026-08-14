#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/srv/halleus"
SOURCE="$ROOT/source"
RELEASES="$ROOT/releases"
CURRENT="$ROOT/current"
PREVIOUS="$ROOT/previous"
SERVICE="halleus.service"
ENV_FILE="/etc/halleus/halleus.env"
LOCK_FILE="/run/lock/halleus-release.lock"
DEPLOY_USER="deploy"
DEPLOY_GROUP="deploy"
NODE_BIN="/usr/local/bin/node"
HOST="127.0.0.1"
PORT="3000"
DEPLOY_RELEASE_DIR=""
DEPLOY_ACTIVATED=0
DEPLOY_WORKTREE_CREATED=0

fail() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

usage() {
    cat <<'EOF'
Usage:
  sudo bash ops/vps/halleus-release.sh deploy --commit <40-char-sha> --tag <tag>
  sudo bash ops/vps/halleus-release.sh rollback
  sudo bash ops/vps/halleus-release.sh status

The deploy command:
- fetches and verifies the exact commit/tag
- builds in a detached Git worktree under /srv/halleus/releases
- runs encoding, diff, and production-build checks before activation
- atomically updates current/previous symlinks
- restarts Halleus and rolls back automatically if smoke tests fail

The rollback command swaps current and previous, restarts Halleus, and restores
the original state if smoke tests fail.
EOF
}

require_root() {
    [ "${EUID}" -eq 0 ] || fail "Run this script with sudo/root."
}

as_deploy() {
    runuser -u "$DEPLOY_USER" -- "$@"
}

assert_base_layout() {
    test -d "$SOURCE/.git" || fail "Missing Git source repository: $SOURCE"
    test -f "$ENV_FILE" || fail "Missing production environment file: $ENV_FILE"
    test -x "$NODE_BIN" || fail "Missing Node binary: $NODE_BIN"
    getent passwd "$DEPLOY_USER" >/dev/null || fail "Missing deploy user: $DEPLOY_USER"
    getent group "$DEPLOY_GROUP" >/dev/null || fail "Missing deploy group: $DEPLOY_GROUP"

    install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 0755 "$RELEASES"
}

assert_source_clean() {
    local status
    status="$(as_deploy git -C "$SOURCE" status --porcelain=v1 --untracked-files=all)"
    [ -z "$status" ] || {
        printf '%s\n' "$status" >&2
        fail "VPS source repository is not clean."
    }
}

resolve_pnpm() {
    local pnpm_bin
    pnpm_bin="$(as_deploy bash -lc 'command -v pnpm')"
    [ -n "$pnpm_bin" ] || fail "pnpm was not found for the deploy user."
    printf '%s\n' "$pnpm_bin"
}

validate_runtime_target() {
    local target="$1"
    test -d "$target" || fail "Runtime target does not exist: $target"
    test -f "$target/.next/BUILD_ID" || fail "Runtime target is missing .next/BUILD_ID: $target"
    test -f "$target/node_modules/next/dist/bin/next" || fail "Runtime target is missing Next.js runtime: $target"

    if [ "$target" != "$SOURCE" ]; then
        test -f "$target/.halleus-release" || fail "Release metadata is missing: $target"
    fi
}

validate_release_target() {
    local target="$1"
    validate_runtime_target "$target"
    test -f "$target/.halleus-release" || fail "Release metadata is missing: $target"
}

current_target() {
    readlink -f "$CURRENT" 2>/dev/null || true
}

previous_target() {
    readlink -f "$PREVIOUS" 2>/dev/null || true
}

atomic_link() {
    local target="$1"
    local link_path="$2"
    local temp_link="${link_path}.next.$$"

    rm -f "$temp_link"
    ln -s "$target" "$temp_link"
    mv -Tf "$temp_link" "$link_path"
}

wait_http_code() {
    local expected="$1"
    local label="$2"
    shift 2

    local code=""
    local attempt
    for attempt in $(seq 1 45); do
        code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$@" || true)"
        if [ "$code" = "$expected" ]; then
            printf 'PASS %-42s HTTP %s\n' "$label" "$code"
            return 0
        fi
        sleep 1
    done

    printf 'FAIL %-42s expected=%s actual=%s\n' "$label" "$expected" "$code" >&2
    return 1
}

assert_local_wiki_catalog() {
    local wiki_html
    local wiki_count

    wiki_html="$(curl --silent --show-error --fail "http://$HOST:$PORT/wiki?release_smoke=$(date +%s)")" || return 1

    wiki_count="$(
        printf '%s' "$wiki_html" |
            "$NODE_BIN" -e '
let html = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { html += chunk; });
process.stdin.on("end", () => {
  const slugs = [...html.matchAll(/href="\/wiki\/([^"?#/]+)"/g)].map((match) => match[1]);
  process.stdout.write(String(new Set(slugs).size));
});
'
    )"

    if ! [[ "$wiki_count" =~ ^[0-9]+$ ]]; then
        printf 'FAIL %-42s invalid-count=%s marker=HALLEUS_WIKI_FALLBACK_CATALOG\n' "local wiki catalog" "$wiki_count" >&2
        return 1
    fi

    if [ "$wiki_count" -le 19 ]; then
        printf 'FAIL %-42s articles=%s marker=HALLEUS_WIKI_FALLBACK_CATALOG\n' "local wiki catalog" "$wiki_count" >&2
        return 1
    fi

    printf 'PASS %-42s articles=%s\n' "local wiki catalog" "$wiki_count"
    return 0
}

smoke_release() {
    systemctl is-active --quiet "$SERVICE" || return 1

    wait_http_code 200 "localhost homepage" "http://$HOST:$PORT/" || return 1
    wait_http_code 200 "localhost wiki" "http://$HOST:$PORT/wiki" || return 1
    assert_local_wiki_catalog || return 1
    wait_http_code 200 "public homepage" "https://halleus.ir/" || return 1
    wait_http_code 200 "public chart" "https://halleus.ir/chart" || return 1
    wait_http_code 200 "public wiki" "https://halleus.ir/wiki" || return 1
    wait_http_code 200 "robots" "https://halleus.ir/robots.txt" || return 1
    wait_http_code 200 "sitemap" "https://halleus.ir/sitemap.xml" || return 1
    wait_http_code 200 "Sky Pulse API" "https://halleus.ir/api/sky-pulse/today" || return 1
    wait_http_code 400 "real chart validation path" \
        --request POST \
        --header "Content-Type: application/json" \
        --data "{}" \
        "https://halleus.ir/api/engine/real-chart" || return 1

    return 0
}

restart_and_smoke() {
    systemctl restart "$SERVICE"
    smoke_release
}

write_release_metadata() {
    local release_dir="$1"
    local commit="$2"
    local tag="$3"
    local build_id="$4"
    local created_utc="$5"

    cat > "$release_dir/.halleus-release" <<EOF
commit=$commit
tag=$tag
build_id=$build_id
created_utc=$created_utc
EOF
    chown "$DEPLOY_USER:$DEPLOY_GROUP" "$release_dir/.halleus-release"
    chmod 0644 "$release_dir/.halleus-release"
}

deploy_release() {
    local commit=""
    local tag=""

    while [ "$#" -gt 0 ]; do
        case "$1" in
            --commit)
                [ "$#" -ge 2 ] || fail "--commit requires a value."
                commit="$2"
                shift 2
                ;;
            --tag)
                [ "$#" -ge 2 ] || fail "--tag requires a value."
                tag="$2"
                shift 2
                ;;
            *)
                fail "Unknown deploy argument: $1"
                ;;
        esac
    done

    [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || fail "Commit must be a lowercase 40-character SHA."
    [[ "$tag" =~ ^v[0-9A-Za-z._-]+$ ]] || fail "Tag format is not allowed: $tag"

    assert_base_layout
    assert_source_clean

    printf '%s\n' "Fetching origin and tags..."
    as_deploy git -C "$SOURCE" fetch --tags --prune origin

    local resolved_commit
    local resolved_tag_commit
    resolved_commit="$(as_deploy git -C "$SOURCE" rev-parse "${commit}^{commit}")"
    [ "$resolved_commit" = "$commit" ] || fail "Commit did not resolve exactly."

    resolved_tag_commit="$(as_deploy git -C "$SOURCE" rev-list -n 1 "$tag")"
    [ "$resolved_tag_commit" = "$commit" ] || fail "Tag $tag does not point to $commit."

    local safe_tag
    local short_sha
    local release_name
    local release_dir
    safe_tag="${tag//[^0-9A-Za-z._-]/-}"
    short_sha="${commit:0:12}"
    release_name="${safe_tag}-${short_sha}"
    release_dir="$RELEASES/$release_name"
    DEPLOY_RELEASE_DIR="$release_dir"

    [ ! -e "$release_dir" ] || fail "Release directory already exists: $release_dir"

    local old_current
    DEPLOY_ACTIVATED=0
    DEPLOY_WORKTREE_CREATED=0
    old_current="$(current_target)"

    cleanup_failed_deploy() {
        local rc=$?
        trap - EXIT

        if [ "$rc" -ne 0 ] && [ "$DEPLOY_ACTIVATED" -eq 0 ] && [ "$DEPLOY_WORKTREE_CREATED" -eq 1 ] && [ -n "$DEPLOY_RELEASE_DIR" ]; then
            printf '%s\n' "Cleaning failed, non-active release worktree..."
            as_deploy git -C "$SOURCE" worktree remove --force "$DEPLOY_RELEASE_DIR" || true
        fi

        exit "$rc"
    }
    trap cleanup_failed_deploy EXIT

    printf 'Creating detached release worktree: %s\n' "$release_dir"
    as_deploy git -C "$SOURCE" worktree add --detach "$release_dir" "$commit"
    DEPLOY_WORKTREE_CREATED=1

    local pnpm_bin
    pnpm_bin="$(resolve_pnpm)"

    printf '%s\n' "Installing locked dependencies..."
    as_deploy "$pnpm_bin" --dir "$release_dir" install --frozen-lockfile --prod=false

    printf '%s\n' "Running release checks..."
    as_deploy bash -lc "cd '$release_dir' && '$pnpm_bin' run check:encoding"
    as_deploy git -C "$release_dir" --no-pager diff --check

    printf '%s\n' "Building release before activation..."
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    as_deploy bash -lc "cd '$release_dir'; '$pnpm_bin' build"

    local build_id
    local created_utc
    build_id="$(cat "$release_dir/.next/BUILD_ID")"
    [ -n "$build_id" ] || fail "Build ID is empty."
    created_utc="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    write_release_metadata "$release_dir" "$commit" "$tag" "$build_id" "$created_utc"
    validate_release_target "$release_dir"

    [ -n "$old_current" ] || fail "Current symlink is missing. Run the controlled VPS bootstrap first."
    validate_runtime_target "$old_current"

    printf 'Activating release: %s\n' "$release_dir"
    atomic_link "$old_current" "$PREVIOUS"
    atomic_link "$release_dir" "$CURRENT"
    DEPLOY_ACTIVATED=1

    if ! restart_and_smoke; then
        printf '%s\n' "Activation smoke test failed. Restoring previous release..." >&2
        atomic_link "$old_current" "$CURRENT"
        systemctl restart "$SERVICE" || true

        if ! smoke_release; then
            fail "Activation failed and the automatic rollback smoke test also failed."
        fi

        DEPLOY_ACTIVATED=0
        fail "Activation failed; previous release was restored successfully."
    fi

    trap - EXIT
    printf '%s\n' "HALLEUS_RELEASE_DEPLOY_OK"
    printf 'current=%s\n' "$(current_target)"
    printf 'previous=%s\n' "$(previous_target)"
    printf 'commit=%s\n' "$commit"
    printf 'tag=%s\n' "$tag"
    printf 'build_id=%s\n' "$build_id"
}

rollback_release() {
    assert_base_layout

    local old_current
    local old_previous
    old_current="$(current_target)"
    old_previous="$(previous_target)"

    [ -n "$old_current" ] || fail "Current release symlink is missing."
    [ -n "$old_previous" ] || fail "Previous release symlink is missing."
    [ "$old_current" != "$old_previous" ] || fail "Current and previous point to the same release."

    validate_runtime_target "$old_current"
    validate_runtime_target "$old_previous"

    printf 'Rolling back current=%s to previous=%s\n' "$old_current" "$old_previous"
    atomic_link "$old_previous" "$CURRENT"
    atomic_link "$old_current" "$PREVIOUS"

    if ! restart_and_smoke; then
        printf '%s\n' "Rollback smoke test failed. Restoring original current release..." >&2
        atomic_link "$old_current" "$CURRENT"
        atomic_link "$old_previous" "$PREVIOUS"
        systemctl restart "$SERVICE" || true

        if ! smoke_release; then
            fail "Rollback failed and restoration smoke test also failed."
        fi

        fail "Rollback failed; original current release was restored successfully."
    fi

    printf '%s\n' "HALLEUS_RELEASE_ROLLBACK_OK"
    printf 'current=%s\n' "$(current_target)"
    printf 'previous=%s\n' "$(previous_target)"
}

show_status() {
    assert_base_layout

    local current
    local previous
    current="$(current_target)"
    previous="$(previous_target)"

    printf 'current=%s\n' "${current:-MISSING}"
    printf 'previous=%s\n' "${previous:-MISSING}"
    printf 'service_active=%s\n' "$(systemctl is-active "$SERVICE" 2>/dev/null || true)"
    printf 'service_enabled=%s\n' "$(systemctl is-enabled "$SERVICE" 2>/dev/null || true)"

    if [ -n "$current" ] && [ -f "$current/.halleus-release" ]; then
        printf '%s\n' "-- current metadata --"
        cat "$current/.halleus-release"
    fi

    if [ -n "$previous" ] && [ -f "$previous/.halleus-release" ]; then
        printf '%s\n' "-- previous metadata --"
        cat "$previous/.halleus-release"
    fi
}

main() {
    require_root
    exec 9>"$LOCK_FILE"
    flock -n 9 || fail "Another Halleus release operation is already running."

    local command="${1:-}"
    case "$command" in
        deploy)
            shift
            deploy_release "$@"
            ;;
        rollback)
            shift
            [ "$#" -eq 0 ] || fail "rollback does not accept arguments."
            rollback_release
            ;;
        status)
            shift
            [ "$#" -eq 0 ] || fail "status does not accept arguments."
            show_status
            ;;
        -h|--help|help|"")
            usage
            ;;
        *)
            fail "Unknown command: $command"
            ;;
    esac
}

main "$@"
