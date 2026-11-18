#!/usr/bin/env bash
# R1 complete independent failure discovery; never deploy or mutate the database.
set -Eeuo pipefail
cd /srv/halleus/source
BASE=2e4b4338e4b965795c3aaf0f62a60693fb6fc279
SCRIPT=ops/vps/halleus-shop-nemad-r1-discover.sh
EXPECTED="$(git rev-parse HEAD)"
[ "$(id -un)" = deploy ] || { echo 'SAFETY_FATAL: expected deploy user'; exit 2; }
[ "$(git rev-parse HEAD^)" = "$BASE" ] || { echo 'SAFETY_FATAL: wrong R1 parent'; exit 2; }
[ "$(git diff-tree --no-commit-id --name-only -r "$EXPECTED")" = "$SCRIPT" ] || { echo 'SAFETY_FATAL: unexpected R1 commit files'; exit 2; }
case "$(git remote get-url origin)" in
  https://github.com/bleucluod/astro-clean|https://github.com/bleucluod/astro-clean.git|git@github.com:bleucluod/astro-clean.git) ;;
  *) echo 'SAFETY_FATAL: unexpected origin'; exit 2;;
esac
[ "$(git branch --show-current)" = main ] || { echo 'SAFETY_FATAL: wrong branch'; exit 2; }
[ -z "$(git status --porcelain=v1 --untracked-files=all)" ] || { echo 'SAFETY_FATAL: dirty source'; exit 2; }
[ "$(git rev-parse HEAD)" = "$EXPECTED" ] && [ "$(git rev-parse origin/main)" = "$EXPECTED" ] || {
  echo 'SAFETY_FATAL: source HEAD changed'; exit 2;
}
[ "$(sed -n 's/^commit=//p' /srv/halleus/current/.halleus-release)" = 5c8969b7751d4cf71286adb987bf648adf421b0c ] || {
  echo 'SAFETY_FATAL: live release changed'; exit 2;
}
[ "$(systemctl is-active halleus.service)" = active ] || { echo 'SAFETY_FATAL: service inactive'; exit 2; }
PNPM="$(bash -lc 'command -v pnpm')" || { echo 'EXTERNAL_BLOCK: pnpm unavailable'; exit 3; }
NODE=/usr/local/bin/node
[ -x "$NODE" ] || { echo 'EXTERNAL_BLOCK: Node unavailable'; exit 3; }
QA="$HOME/.halleus-qa/nemad-r1-${EXPECTED:0:12}"
mkdir -p "$HOME/.halleus-qa"
if [ -e "$QA" ]; then
  [ -d "$QA" ] && [ ! -L "$QA" ] && [ "$(git -C "$QA" rev-parse HEAD)" = "$EXPECTED" ] &&
    [ -z "$(git -C "$QA" status --porcelain=v1 --untracked-files=all)" ] || {
      echo 'SAFETY_FATAL: existing candidate unexpected; preserved'; exit 2;
    }
  echo 'R1_CANDIDATE=RESUMED'
else
  git worktree add --detach "$QA" "$EXPECTED"
  echo 'R1_CANDIDATE=CREATED'
fi
[ -d "$QA/node_modules/typescript" ] || "$PNPM" --dir "$QA" install --frozen-lockfile --prod=false
LOG="$HOME/.halleus-qa/nemad-r1-logs-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$LOG"
failed=()
passed=()
run_check() {
  local name="$1" rc
  shift
  echo "R1_CHECK_BEGIN: $name"
  if "$@" >"$LOG/$name.log" 2>&1; then
    echo "R1_PASS: $name"
    passed+=("$name")
  else
    rc=$?
    echo "R1_FAIL: $name rc=$rc"
    failed+=("$name:$rc")
    cat "$LOG/$name.log" || true
  fi
}
run_check encoding timeout 90s bash -c 'cd "$1"; exec "$2" scripts/check-encoding.mjs' _ "$QA" "$NODE"
run_check typescript timeout 240s bash -c 'cd "$1"; exec "$2" exec tsc -p tsconfig.json --noEmit --pretty false' _ "$QA" "$PNPM"
run_check eslint_scoped timeout 180s bash -c 'cd "$1"; shift; exec "$@"' _ "$QA" "$PNPM" exec eslint \
  components/shop/ProductDetail.tsx \
  components/shop/BirthSkyLiveProduct.tsx \
  components/shop/ShopCheckoutFlow.tsx \
  components/ChartMobileBirthPicker.tsx \
  lib/shop/shop-final-print.ts \
  lib/shop/shop-private-print-originals.ts \
  lib/shop/shop-price-store.ts \
  lib/shop/nemad-man-bahman-preview.ts \
  'app/api/admin/shop/orders/[id]/print/candidate/route.ts' \
  'app/shop/nemad-man/[month]/page.tsx' \
  scripts/check-shop-nemad-selling.mjs
for guard in \
  check-shop-nemad-selling \
  check-shop-mvp-activation \
  check-shop-checkout \
  check-shop-orders \
  check-shop-live-prices \
  check-shop-seo-slugs \
  check-shop-print-handoff \
  check-shop-final-print \
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
run_check diff_check git -C "$QA" --no-pager diff --check 5c8969b7751d4cf71286adb987bf648adf421b0c "$EXPECTED"
if [ "${#failed[@]}" -eq 0 ]; then
  echo 'R1_BUILD=NOT_RUN: production build requires secure release environment'
else
  echo 'R1_BUILD=BLOCKED_BY_DEPENDENCY: independent failures must be fixed together'
fi
echo '---------- R1_CONSOLIDATED_FAILURES ----------'
printf 'R1_CHECKS_PASSED=%s\n' "${#passed[@]}"
printf 'R1_CHECKS_FAILED=%s\n' "${#failed[@]}"
for item in "${failed[@]}"; do echo "R1_FAILURE=$item"; done
printf 'R1_LOGS=%s\nR1_CANDIDATE_PRESERVED=%s\n' "$LOG" "$QA"
echo 'R1_LIVE_SERVICE=UNTOUCHED; R1_DB=UNTOUCHED; R1_RELEASE=UNTOUCHED'
[ "${#failed[@]}" -eq 0 ] || exit 1
[ "${#passed[@]}" -eq 24 ] || { echo 'R1_ERROR: expected checks incomplete'; exit 1; }
echo 'R1_ALL_OBSERVABLE_CHECKS=PASS'
