// Stage-1 source/behavior fixture. The DB double is NOT PostgreSQL E2E.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const runtimeEnv = { NODE_ENV: 'development' };
const state = new Map();
let timestamp = Date.parse('2026-11-06T10:00:00.000Z');
let writes = 0;
let failNextSql = false;
const sql = async (strings, ...values) => {
  if (failNextSql) { failNextSql = false; throw new Error('synthetic DB unavailable'); }
  const statement = strings.join('?').toLowerCase();
  assert.match(statement, /insert into halleus_private\.shop_rate_limits/);
  assert.match(statement, /on conflict \(scope_hash\) do update/);
  assert.match(statement, /where bucket\.hits < \?/);
  const [hash, windowSeconds, , maxHits] = values;
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(windowSeconds) && windowSeconds > 0);
  assert.ok(Number.isInteger(maxHits) && maxHits > 0);
  writes++;
  const prior = state.get(hash);
  if (!prior || prior.started + windowSeconds * 1000 <= timestamp) {
    state.set(hash, { hits: 1, started: timestamp });
    return [{ hits: 1 }];
  }
  if (prior.hits >= maxHits) return [];
  prior.hits++;
  return [{ hits: prior.hits }];
};

class ShopOrderStateError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}

function load(sourceFile, dependencies) {
  const compiled = ts.transpileModule(read(sourceFile), {
    fileName: sourceFile,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const factory = vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`, {
    process: { env: runtimeEnv }, URL, Request, Response, Buffer, TextDecoder,
  });
  factory(mod, mod.exports, (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected import ${sourceFile}: ${name}`);
    return dependencies[name];
  });
  return mod.exports;
}

function loadLimiter() {
  return load('lib/shop/shop-shared-rate-limit.ts', {
    'node:crypto': { createHmac }, 'node:net': { isIP },
    '@/lib/admin/admin-database': { getAdminDatabase: () => sql },
    './shop-order-store': { ShopOrderStateError },
  }).enforceShopSharedRateLimit;
}

const firstWorker = loadLimiter();
const secondWorker = loadLimiter();
function guest(path, headers = {}) {
  return new Request(`https://halleus.ir${path}`, {
    method: 'POST', headers: { 'x-halleus-shop-client-ip': '203.0.113.40', ...headers },
  });
}
const orderRequest = guest('/api/shop/orders');
await firstWorker(orderRequest);
assert.equal(writes, 0, 'Default-disabled limiter must not touch a database');

runtimeEnv.HALLEUS_SHOP_SHARED_RATE_ENABLED = 'true';
await assert.rejects(firstWorker(orderRequest), { status: 503 });
runtimeEnv.HALLEUS_SHOP_TRUSTED_CLIENT_IP = 'nginx-overwrite-v1';
await assert.rejects(firstWorker(orderRequest), { status: 503 });
runtimeEnv.HALLEUS_SHOP_RATE_SECRET = 'not-long-enough';
await assert.rejects(firstWorker(orderRequest), { status: 503 });
runtimeEnv.HALLEUS_SHOP_RATE_SECRET = 'synthetic-development-secret-not-for-production';

await assert.rejects(firstWorker(guest('/api/shop/orders', {
  'x-halleus-shop-client-ip': '', 'x-forwarded-for': '203.0.113.40',
})), { status: 503 }, 'Forwarded client IP must never be trusted');
await assert.rejects(firstWorker(guest('/api/shop/orders', {
  'x-halleus-shop-client-ip': '198.51.100.6, 203.0.113.40',
})), { status: 503 }, 'Only a single overwritten IP is accepted');
assert.equal(writes, 0, 'Fail-closed identity checks must precede DB access');

// Two separate loaded modules simulate separate workers sharing one atomic DB.
for (let index = 0; index < 20; index++) {
  await (index % 2 ? firstWorker : secondWorker)(orderRequest);
}
await assert.rejects(secondWorker(orderRequest), { status: 429 });
assert.equal(state.size, 1);
const onlyHash = [...state.keys()][0];
assert.equal(onlyHash.length, 64);
assert.ok(!onlyHash.includes('203.0.113.40'));
const before = state.size;
await firstWorker(guest('/api/shop/quote'));
await firstWorker(guest('/api/shop/orders', { 'x-halleus-shop-client-ip': '2001:db8::5' }));
assert.equal(state.size, before + 2, 'Independent scopes and valid IPv6 have distinct buckets');

timestamp += 901_000;
await secondWorker(orderRequest);
assert.equal(state.get(onlyHash).hits, 1, 'Expired window restarts');
timestamp += 901_000;
const parallel = await Promise.allSettled(Array.from({ length: 25 }, (_, index) =>
  (index % 2 ? firstWorker : secondWorker)(orderRequest)));
assert.equal(parallel.filter((result) => result.status === 'fulfilled').length, 20);
assert.ok(parallel.filter((result) => result.status === 'rejected').every((result) =>
  result.reason.status === 429));
failNextSql = true;
await assert.rejects(firstWorker(guest('/api/shop/orders/track')), /synthetic DB unavailable/);
const priorWrites = writes;
await firstWorker(guest('/api/admin/shop/orders'));
assert.equal(writes, priorWrites, 'Owner routes are not secretly subject to guest limits');

const activation = load('lib/shop/shop-mvp-activation.ts', {});
const http = load('lib/shop/shop-order-http.ts', {
  '@/lib/admin/admin-origin': { isTrustedAdminRequestOrigin: () => true },
  '@/lib/config/env': { getHalleusRuntimeEnv: () => ({ siteUrl: 'https://halleus.ir' }) },
  './shop-order-contract': { ShopOrderInputError: class extends Error {} },
  './shop-order-store': { ShopOrderStateError },
  './shop-shared-rate-limit': { enforceShopSharedRateLimit: firstWorker },
  './shop-mvp-activation': activation,
});
const parsed = await http.readShopRequest(new Request('https://halleus.ir/api/shop/quote', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-halleus-shop-client-ip': '203.0.113.40' },
  body: JSON.stringify({ itemCount: 1 }),
}));
assert.equal(parsed.itemCount, 1, 'Actual common request parser enforces limit before body decoding');

const migration = read('database/migrations/0033_private_shop_shared_rate_limits.sql');
assert.match(migration, /create table if not exists halleus_private\.shop_rate_limits/);
assert.match(migration, /revoke all on halleus_private\.shop_rate_limits from public, anon, authenticated/);
assert.match(migration, /enable row level security/);
assert.doesNotMatch(migration, /\b(?:recipient|address|mobile|raw_ip|guest_access_code)\b/i);

console.log('PASS: PostgreSQL-atomic shared limiter source, two-worker synthetic replay, separate IP/scope, expiration, missing/forged ingress fail-closed, no raw IP and HTTP parser integration.');
console.log('EXTERNAL_BLOCK: synthetic SQL double does not verify production Nginx overwrites, actual DB schema/migration or PostgreSQL concurrent transactions.');
