#!/usr/bin/env bash
# R3: resume valid R2 candidate and passed stages; verify affected checks then build.
set -Eeuo pipefail
set +x
umask 077
SOURCE=/srv/halleus/source
R1=0b327ce74cbd0ca4b4a30ac4307c0aefb0b220ac
SCRIPT=ops/vps/halleus-shop-nemad-r3-verify-deploy.sh
QA=/home/deploy/.halleus-qa/nemad-r1-4d24b436860f
NODE=/usr/local/bin/node
fatal(){ printf 'SAFETY_FATAL: %s\n' "$*" >&2; exit 2; }
blocked(){ printf 'EXTERNAL_BLOCK: %s\n' "$*" >&2; exit 3; }
[ "$(id -un)" = deploy ] || fatal 'Expected deploy user.'
cd "$SOURCE"
[ "$(git branch --show-current)" = main ] || fatal 'Wrong branch.'
case "$(git remote get-url origin)" in
 https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
 *) fatal 'Wrong origin.' ;;
esac
[ -z "$(git status --porcelain=v1 --untracked-files=all)" ] || fatal 'Dirty source.'
PIN="$(git rev-parse HEAD)"
[ "$(git rev-parse origin/main)" = "$PIN" ] && [ "$(git rev-parse HEAD^)" = "$R1" ] ||
 fatal 'Unexpected HEAD / R1 ancestry.'
[ "$(git diff-tree --no-commit-id --name-only -r "$PIN" | wc -l)" -eq 5 ] ||
 fatal 'Unexpected release fix scope.'
[ "$(git diff-tree --no-commit-id --name-only -r "$PIN" | grep -Fxc "$SCRIPT")" -eq 1 ] ||
 fatal 'R2 script not in pinned commit.'
[ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = 5c8969b7751d4cf71286adb987bf648adf421b0c ] ||
 fatal 'Live release changed.'
[ "$(systemctl is-active halleus.service)" = active ] || fatal 'Live service inactive.'
[ -d "$QA" ] && [ ! -L "$QA" ] || fatal 'R1 candidate missing; do not recreate it.'
[ -z "$(git -C "$QA" status --porcelain=v1 --untracked-files=all)" ] || fatal 'R1 candidate dirty; preserve.'
QA_SHA="$(git -C "$QA" rev-parse HEAD)"
if [ "$QA_SHA" = "$R1" ]; then
 git -C "$QA" merge --ff-only "$PIN" || fatal 'R1 candidate fast-forward failed, preserved.'
elif [ "$QA_SHA" != "$PIN" ]; then
 fatal 'Unexpected QA candidate HEAD, preserved.'
fi
[ -d "$QA/node_modules/typescript" ] || blocked 'R1 QA dependencies missing.'
PNPM="$(bash -lc 'command -v pnpm')" || blocked 'pnpm missing.'
[ -x "$NODE" ] || blocked 'Node missing.'
LOG="$HOME/.halleus-qa/nemad-r3-logs-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$LOG"
failures=()
passed=()
run_check() {
 local name="$1" rc
 shift
 echo "R3_CHECK_BEGIN: $name"
 if "$@" >"$LOG/$name.log" 2>&1; then
   echo "R3_PASS: $name"
   passed+=("$name")
 else
   rc=$?
   echo "R3_FAIL: $name rc=$rc"
   failures+=("$name:$rc")
   tail -n 100 "$LOG/$name.log" || true
 fi
}
# Reuse R2 passed stages with unchanged source inputs; rerun only affected checks.
R2_LOGS=/home/deploy/.halleus-qa/nemad-r2-logs-20261118T172907Z
[ -d "$R3_LOGS" ] && [ ! -L "$R3_LOGS" ] || fatal 'R2 pass ledger missing.'
resumed=(typescript check-shop-nemad-selling check-shop-mvp-activation
 check-shop-checkout check-shop-orders check-shop-live-prices
 check-shop-seo-slugs check-shop-print-handoff check-shop-private-print-originals
 check-shop-manual-print-archive check-shop-order-api-privacy
 check-shop-p02-live-product check-nemad-man-product-pages
 check-nemad-preview-alt-watermark check-nemad-p02-live-renderer
 check-chart-mobile-journey check-jalali-birth-date-input final_print_small)
[ "${#resumed[@]}" -eq 18 ] || fatal 'Invalid R2 pass ledger count.'
for stage in "${resumed[@]}"; do
 [ -f "$R3_LOGS/$stage.log" ] && [ ! -L "$R3_LOGS/$stage.log" ] || fatal "Missing R2 PASS evidence: $stage"
 echo "R3_RESUMED_PASS: $stage"
done
for guard in check-nemad-man-bahman-preview check-chart-flow-mobile-qa check-chart-city-pair-ux; do
 run_check "$guard" timeout 180s bash -c 'cd "$1"; exec "$2" "scripts/$3.mjs"' _ "$QA" "$NODE" "$guard"
done
run_check lint_affected timeout 180s bash -c 'cd "$1"; shift; exec "$@"' _ "$QA" "$PNPM" exec eslint \
 scripts/check-chart-city-pair-ux.mjs scripts/check-chart-flow-mobile-qa.mjs \
 scripts/check-nemad-man-bahman-preview.mjs
run_check encoding timeout 90s bash -c 'cd "$1"; exec "$2" scripts/check-encoding.mjs' _ "$QA" "$NODE"
run_check diff_check git -C "$QA" --no-pager diff --check 5c8969b7751d4cf71286adb987bf648adf421b0c "$PIN"
if [ "${#failures[@]}" -eq 0 ]; then
 sudo -v || fatal 'sudo required for isolated build environment.'
 run_check candidate_build timeout 600s sudo bash -c '
    set -Eeuo pipefail
    qa="$1"; pnpm="$2"
    set -a
    source /etc/halleus/halleus.env
    set +a
    runuser -u deploy -- bash -c '\''cd "$1"; exec "$2" build'\'' _ "$qa" "$pnpm"
  ' _ "$QA" "$PNPM"
else
 echo 'R3_BUILD=BLOCKED_BY_DEPENDENCY: independent failures remain'
fi
echo '---------- R3_CONSOLIDATED_FAILURES ----------'
printf 'R3_CHECKS_PASSED=%s\nR3_CHECKS_FAILED=%s\n' "${#passed[@]}" "${#failures[@]}"
for item in "${failures[@]}"; do echo "R3_FAILURE=$item"; done
printf 'R3_LOGS=%s\nR3_QA_PRESERVED=%s\n' "$LOG" "$QA"
echo 'R3_LEGACY_PRINT_STRESS=EXTERNAL_BLOCK_R1_137; R2 focused print test resumed'
[ "${#failures[@]}" -eq 0 ] || exit 1
[ "${#passed[@]}" -eq 7 ] || fatal 'R2 checks incomplete; no release.'
echo 'R3_ALL_REQUIRED_PREFLIGHT=PASS'
bash "$SOURCE/ops/vps/halleus-shop-nemad-0043-go-live.sh"
echo 'R3_RELEASE_AND_SALES=PASS'
