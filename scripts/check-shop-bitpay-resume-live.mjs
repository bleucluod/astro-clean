import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const path = resolve(root, 'ops/vps/halleus-bitpay-resume-live.sh');
const source = readFileSync(path, 'utf8');
const syntax = spawnSync('bash', ['-n', path], { encoding: 'utf8' });
assert.equal(syntax.status, 0, `Bash syntax error: ${syntax.stderr}`);
for (const marker of [
  'ACTIVE_SHA=7cc562d9feb3b6d48796257e71a900aa0974b359',
  'flock -n 9',
  'BITPAY_RESUME: ONLINE_GATE_ENABLED=PASS',
  'original private env',
  'ENV_ACTIVATED=1',
  'systemctl restart "$SERVICE"',
  'read -r -s -p',
  'HALLEUS_BITPAY_SOURCE_READY=true',
  'HALLEUS_BITPAY_LEDGER_READY=true',
  'HALLEUS_BITPAY_PAYMENTS_ENABLED=true',
  'shop_payment_attempts',
  'shop_bitpay_one_unresolved_per_order',
  'pg_restore --list',
  'active-local-payment',
  'active-public-payment',
  'active-public-callback-invalid',
  'x-halleus-shop-client-ip: 127.0.0.1',
  'existing_backup=PASS migration=RESUMED_PASS code_release=RESUMED_PASS',
]) {
  assert.ok(source.includes(marker), `Missing activation guard: ${marker}`);
}
for (const forbidden of [
  'ops/vps/halleus-release.sh deploy', 'git reset --hard', 'git clean -fd',
  'git push', 'git tag ', 'sql.unsafe', 'APPLY-BITPAY-0034', 'ACTIVATE-REAL-PAYMENTS',
  'migration 0034 to',
]) {
  assert.ok(!source.includes(forbidden), `Live resume must not redo production operations: ${forbidden}`);
}
assert.match(source, /http_probe 'active-local-homepage' 200 75/);
assert.match(source, /http_probe 'active-public-payment' 200 30/);
assert.match(source, /http_probe 'active-public-callback-invalid' 409 8/);
assert.match(source, /if \[ "\$rc" -ne 0 \] && \[ "\$ENV_ACTIVATED" -eq 1 \]/);
assert.match(source, /install -o root -g root -m 0600 -- "\$ORIGINAL_ENV" "\$ENV_FILE"/);

const begin = source.indexOf('http_probe() {');
const end = source.indexOf('\ncleanup() {', begin);
assert.ok(begin > 0 && end > begin);
const functionText = source.slice(begin, end);
const fixtures = mkdtempSync(join(tmpdir(), 'halleus-http-probe-'));
try {
  const functionFile = join(fixtures, 'probe.sh');
  writeFileSync(functionFile, functionText, { mode: 0o600 });
  const runner = `
source "$1"
count_file="$2"
curl() {
  local count=0
  [ ! -f "$count_file" ] || count=$(cat "$count_file")
  count=$((count+1))
  printf '%s' "$count" > "$count_file"
  if [ "$count" -lt 3 ]; then printf '502'; else printf '200'; fi
}
sleep() { :; }
http_probe 'test-startup-retry' 200 5 'http://localhost/shop/payment'
[ "$(cat "$count_file")" = 3 ] || exit 77
rm -f "$count_file"
curl() { printf '503'; }
if http_probe 'test-fail-closed' 409 2 'http://localhost/api/shop/payments/bitpay/return'; then exit 78; fi
`;
  const test = spawnSync('bash', ['-c', runner, 'test', functionFile, join(fixtures, 'count')], {
    encoding: 'utf8', timeout: 7000,
  });
  assert.equal(test.status, 0, `Probe retry and fail-closed fixture: ${test.stdout}\n${test.stderr}`);
  assert.match(test.stdout, /test-startup-retry HTTP=200 attempts=3/);
  assert.match(test.stderr, /test-fail-closed expected=409 actual=503 attempts=2/);
} finally { rmSync(fixtures, { recursive: true, force: true }); }
console.log('BITPAY_LIVE_RESUME=PASS: syntax, pinned release, migration skip, backup and private key safety, HTTP retry and fail-closed status');
