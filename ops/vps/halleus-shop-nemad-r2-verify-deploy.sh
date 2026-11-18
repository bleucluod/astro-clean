#!/usr/bin/env bash
# R2: resume R1 candidate, discover all independent failures, then release if green.
set -Eeuo pipefail
set +x
umask 077
SOURCE=/srv/halleus/source
R1=4d24b436860f476f4f4181a200335c8459161de5
SCRIPT=ops/vps/halleus-shop-nemad-r2-verify-deploy.sh
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
[ "$(git diff-tree --no-commit-id --name-only -r "$PIN" | wc -l)" -eq 12 ] ||
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
LOG="$HOME/.halleus-qa/nemad-r2-logs-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$LOG"
failures=()
passed=()
run_check() {
 local name="$1" rc
 shift
 echo "R2_CHECK_BEGIN: $name"
 if "$@" >"$LOG/$name.log" 2>&1; then
   echo "R2_PASS: $name"
   passed+=("$name")
 else
   rc=$?
   echo "R2_FAIL: $name rc=$rc"
   failures+=("$name:$rc")
   tail -n 100 "$LOG/$name.log" || true
 fi
}
run_check typescript timeout 240s bash -c 'cd "$1"; exec "$2" exec tsc -p tsconfig.json --noEmit --pretty false' _ "$QA" "$PNPM"
run_check lint_scoped timeout 180s bash -c 'cd "$1"; shift; exec "$@"' _ "$QA" "$PNPM" exec eslint \
 components/shop/ProductDetail.tsx components/shop/ShopCheckoutFlow.tsx \
 components/shop/BirthSkyLiveProduct.tsx components/ChartMobileBirthPicker.tsx \
 lib/shop/nemad-man-bahman-preview.ts \
 scripts/check-shop-orders.mjs scripts/check-shop-p02-live-product.mjs \
 scripts/check-chart-mobile-journey.mjs scripts/check-chart-flow-mobile-qa.mjs \
 scripts/check-chart-city-pair-ux.mjs scripts/check-nemad-man-bahman-preview.mjs
for guard in \
 check-shop-nemad-selling \
 check-shop-mvp-activation \
 check-shop-checkout \
 check-shop-orders \
 check-shop-live-prices \
 check-shop-seo-slugs \
 check-shop-print-handoff \
 check-shop-private-print-originals \
 check-shop-manual-print-archive \
 check-shop-order-api-privacy \
 check-shop-p02-live-product \
 check-nemad-man-product-pages \
 check-nemad-man-bahman-preview \
 check-nemad-preview-alt-watermark \
 check-nemad-p02-live-renderer \
 check-chart-mobile-journey \
 check-chart-flow-mobile-qa \
 check-chart-city-pair-ux \
 check-jalali-birth-date-input; do
 run_check "$guard" timeout 180s bash -c 'cd "$1"; exec "$2" "scripts/$3.mjs"' _ "$QA" "$NODE" "$guard"
done
# R1 full legacy stress was killed (137). Run safe 10x15 native print smoke only.
# Nemad automatic printing stays disabled; its manual archive tests are above.
run_check final_print_small timeout 120s bash -c 'cd "$1"; exec "$2" scripts/check-shop-final-print.mjs --p02-10x15' _ "$QA" "$NODE"
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
 echo 'R2_BUILD=BLOCKED_BY_DEPENDENCY: independent failures remain'
fi
echo '---------- R2_CONSOLIDATED_FAILURES ----------'
printf 'R2_CHECKS_PASSED=%s\nR2_CHECKS_FAILED=%s\n' "${#passed[@]}" "${#failures[@]}"
for item in "${failures[@]}"; do echo "R2_FAILURE=$item"; done
printf 'R2_LOGS=%s\nR2_QA_PRESERVED=%s\n' "$LOG" "$QA"
echo 'R2_FULL_LEGACY_PRINT_STRESS=EXTERNAL_BLOCK_R1_137; targeted 10x15 check substituted'
[ "${#failures[@]}" -eq 0 ] || exit 1
[ "${#passed[@]}" -eq 25 ] || fatal 'R2 checks incomplete; no release.'
echo 'R2_ALL_REQUIRED_PREFLIGHT=PASS'
bash "$SOURCE/ops/vps/halleus-shop-nemad-0043-go-live.sh"
echo 'R2_RELEASE_AND_SALES=PASS'
