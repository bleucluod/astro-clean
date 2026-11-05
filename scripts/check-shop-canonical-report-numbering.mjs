// Execute the real natal/comparison SQL writers and shop create flow against a
// shared-sequence test double. No PostgreSQL connection or migration is made.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');
const migration = source('database/migrations/0032_private_shop_orders_shared_numbers.sql');
const ownerRoute = source('app/api/reports/owner/route.ts');
const clientSave = source('lib/storage/account-report-save-client.ts');
const serverSave = source('lib/storage/server-report-persistence.ts');
const repository = source('lib/storage/database-report-repository.ts');

assert.match(clientSave, /return postOwnerReport\(report\)/);
assert.match(clientSave, /fetch\("\/api\/reports\/owner"/);
assert.match(ownerRoute, /await saveServerGeneratedReport\(/);
assert.match(ownerRoute, /await saveComparisonAccountReport\(/);
assert.match(ownerRoute, /await saveGuestComparisonReport\(/);
assert.match(ownerRoute, /assertOwnerPrivateReportParity\(report, reportRecord\.report\)/);
assert.match(serverSave, /return repository\.saveReport\(report\)/);
assert.match(repository, /return driver\.upsertReport\(/);
assert.match(migration, /lock table public\.halleus_reports in access exclusive mode/);
assert.match(migration, /new\.display_number := nextval\('halleus_private\.shared_display_numbers_seq'::regclass\)/);
assert.match(migration, /new\.display_number is distinct from old\.display_number/);
assert.match(migration, /before insert or update of display_number on public\.halleus_reports/);
assert.match(migration, /display_number bigint not null unique default nextval\('halleus_private\.shared_display_numbers_seq'::regclass\)/);
assert.match(migration, /revoke all on sequence halleus_private\.shared_display_numbers_seq from public, anon, authenticated/);

function loadSource(path, dependencies = {}) {
  const compiled = ts.transpileModule(source(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const factory = vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`);
  factory(mod, mod.exports, (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Unexpected dependency in ${path}: ${name}`);
  });
  return mod.exports;
}

const reports = new Map();
const orders = new Map();
const orderEvents = [];
let sequence = 0;

function normalizedQuery(parts) {
  return parts.join(' ? ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function assertNoExplicitNumberWrite(query) {
  const insertColumns = query.match(/insert into (?:public\.)?halleus_reports\s*\(([^)]+)\)/)?.[1] ?? '';
  const updates = query.match(/on conflict \(id\) do update(?: set)?([\s\S]*?)returning/)?.[1] ?? '';
  assert.ok(insertColumns, 'report writer must issue INSERT on the canonical table');
  assert.doesNotMatch(insertColumns, /\bdisplay_number\b/, 'number assigned by DB, not app');
  assert.doesNotMatch(updates, /\bdisplay_number\b/, 'existing number must not be overwritten');
}

function execute(parts, ...values) {
  const query = normalizedQuery(parts);
  if (query.startsWith('insert into halleus_reports')) {
    assertNoExplicitNumberWrite(query);
    const keys = query.match(/insert into halleus_reports\s*\(([^)]+)\)/)[1]
      .split(',').map((key) => key.trim());
    assert.equal(keys.length + 1, values.length, 'natal query binds columns and an owner conflict guard');
    assert.equal(values.at(-1), values[1], 'upsert conflict guard must use the inserted owner');
    const incoming = Object.fromEntries(keys.map((key, index) => [key, values[index]]));
    const old = reports.get(incoming.id);
    const attemptNumber = ++sequence; // BEFORE INSERT triggers also run on ON CONFLICT.
    if (old && old.user_id !== incoming.user_id) return Promise.resolve([]);
    const row = old
      ? { ...old, ...incoming, created_at: old.created_at, display_number: old.display_number }
      : { ...incoming, display_number: attemptNumber };
    reports.set(row.id, row);
    return Promise.resolve([row]);
  }
  if (query.startsWith('insert into public.halleus_reports')) {
    assertNoExplicitNumberWrite(query);
    assert.equal(values.length, 7, 'comparison writer must bind canonical private fields');
    const [id, userId, title, reportJson, ownerKind, tier, createdAt] = values;
    const old = reports.get(id);
    const attemptNumber = ++sequence;
    if (old && old.user_id !== userId) return Promise.resolve([]);
    const row = old
      ? { ...old, report_json: reportJson, title, publication_owner_kind: ownerKind,
          access_tier: tier, visibility: 'private', publication_state: 'private' }
      : { id, user_id: userId, title, report_json: reportJson, note: null, favorite: false,
          visibility: 'private', publication_owner_kind: ownerKind, access_tier: tier,
          publication_state: 'private', created_at: createdAt,
          updated_at: '2026-11-05T12:00:00Z', display_number: attemptNumber };
    reports.set(id, row);
    return Promise.resolve([row]);
  }
  if (query.startsWith('insert into halleus_private.shop_orders')) {
    assert.match(query, /on conflict \(idempotency_hash\) do nothing/);
    const [idempotencyHash, guestAccessHash, payloadHash] = values;
    const attemptNumber = ++sequence;
    if (orders.has(idempotencyHash)) return Promise.resolve([]);
    const row = { id: `order-${attemptNumber}`, display_number: attemptNumber,
      idempotency_hash: idempotencyHash, guest_access_hash: guestAccessHash,
      payload_hash: payloadHash, status: 'awaiting_transfer' };
    orders.set(idempotencyHash, row);
    return Promise.resolve([row]);
  }
  if (query.startsWith('insert into halleus_private.shop_order_events')) {
    orderEvents.push(values[0]);
    return Promise.resolve([]);
  }
  if (query.startsWith('select display_number, guest_access_hash, payload_hash, status')) {
    const row = orders.get(values[0]);
    return Promise.resolve(row ? [row] : []);
  }
  if (query.includes('from halleus_reports') && query.includes('where user_id =')) {
    const row = reports.get(values[1]);
    return Promise.resolve(row?.user_id === values[0] ? [row] : []);
  }
  throw new Error(`Unmodeled canonical write/read: ${query.slice(0, 145)}`);
}

execute.json = (value) => value;
execute.begin = (work) => work(execute);
const rowMapper = loadSource('lib/database/report-row-mapper.ts');
const { createPostgresReportDatabaseDriver } = loadSource(
  'lib/database/postgres-report-database-driver.ts', {
    postgres: { __esModule: true, default: () => execute },
    '@/lib/database/report-row-mapper': rowMapper,
  },
);
const { saveComparisonAccountReport, saveGuestComparisonReport } = loadSource(
  'lib/comparison/comparison-account-persistence.ts', {
    '@/lib/admin/admin-database': {
      asNullableString: (value) => typeof value === 'string' ? value : null,
      asRecord: (value) => value && typeof value === 'object' ? value : {},
      asString: (value) => String(value ?? ''),
      getAdminDatabase: () => execute,
    },
    '@/types/storage': { STORED_COMPARISON_REPORT_VERSION: 'comparison-report-v1' },
  },
);
const { createShopOrder } = loadSource('lib/shop/shop-order-store.ts', {
  '@/lib/admin/admin-database': { getAdminDatabase: () => execute },
});

const driver = createPostgresReportDatabaseDriver('isolated-test-double-only');
const publication = {
  policyVersion: '1', ownerKind: 'guest', accessTier: 'free',
  publicationIntent: 'unpublish', publicationState: 'unpublished',
  publicationConsentState: 'not-required', identityConsentState: 'withheld',
};
const natalRecord = {
  id: 'natal-test-1', userId: 'guest-user-1', report: { id: 'natal-test-1', input: { name: 'Synthetic' } },
  source: 'account', favorite: false, visibility: 'unpublished', publication,
  createdAt: '2026-11-05T10:00:00Z', updatedAt: '2026-11-05T10:00:00Z',
};
const first = await driver.upsertReport('guest-user-1', natalRecord);
assert.equal(first.id, natalRecord.id);
assert.equal(first.visibility, 'unpublished');
assert.equal(reports.get(natalRecord.id).display_number, 1);

const shopDraft = {
  idempotencyHash: 'hash-idempotency-synthetic', guestAccessHash: 'hash-access-synthetic',
  payloadHash: 'hash-payload-synthetic',
  shipping: { name: 'Synthetic', mobile: '9123456789', province: 'Test', city: 'Test',
    address: 'Synthetic only', postalCode: '1234567890', note: '', carrier: 'post' },
  items: [], quote: { itemCount: 1, subtotal: 10, shippingAndPackaging: 2, total: 12 },
};
const order = await createShopOrder(shopDraft);
assert.equal(order.orderNumber, '2');
assert.equal(orderEvents.length, 1);
const replay = await createShopOrder(shopDraft);
assert.equal(replay.created, false);
assert.equal(replay.orderNumber, '2');

const updated = await driver.upsertReport('guest-user-1', { ...natalRecord, favorite: true });
assert.equal(updated.favorite, true);
assert.equal(reports.get(natalRecord.id).display_number, 1, 'upsert replay must not replace number');
await assert.rejects(
  driver.upsertReport('another-owner', natalRecord),
  /Report could not be saved for the current user/,
);
assert.equal(reports.get(natalRecord.id).user_id, 'guest-user-1');

const comparison = {
  id: 'comparison-test-1', createdAt: '2026-11-05T11:00:00Z',
  chartALabel: 'Test A', chartBLabel: 'Test B', relationshipContext: 'synthetic',
};
const accountComparison = await saveComparisonAccountReport({
  userId: 'account-user-1', comparison, accessTier: 'free',
});
assert.equal(accountComparison.id, comparison.id);
assert.equal(accountComparison.visibility, 'private');
const compareNumber = reports.get(comparison.id).display_number;
assert.ok(compareNumber > Number(order.orderNumber));
await saveComparisonAccountReport({ userId: 'account-user-1', comparison, accessTier: 'free' });
assert.equal(reports.get(comparison.id).display_number, compareNumber);
await assert.rejects(
  saveGuestComparisonReport({ userId: 'another-guest', comparison }),
  /ownership constraints/,
);
const guestComparison = await saveGuestComparisonReport({
  userId: 'guest-user-2', comparison: { ...comparison, id: 'comparison-test-2' },
});
assert.equal(guestComparison.publication.ownerKind, 'guest');
assert.ok(reports.get('comparison-test-2').display_number > compareNumber);
assert.equal(new Set([...reports.values(), ...orders.values()].map((row) => row.display_number)).size,
  reports.size + orders.size, 'report/order numbers must be distinct');

console.log('Shop S2 canonical source execution: natal guest save/update/owner guard, account + guest comparison, order create/replay and shared-sequence identity passed.');
console.log('BLOCKED_BY_DEPENDENCY: this is an in-memory SQL/sequence double, NOT PostgreSQL migration, RLS, trigger or canonical HTTP/DB E2E evidence.');
