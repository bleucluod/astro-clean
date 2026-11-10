// Stage-1 *real PostgreSQL* shop HTTP/SQL lifecycle. Deliberately opt-in only.
// Runs with a disposable, separately provisioned isolated DB; never run against
// a VPS production connection or data copy. It does not apply migrations.
// This is route-level HTTP behavior with a synthetic owner capability fixture,
// NOT an external Supabase authentication or production-browser acceptance.
import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import postgres from 'postgres';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const codeSmoke = process.argv.includes('--code-smoke');
const runtimeEnv = {
  NODE_ENV: 'development',
  HALLEUS_SHOP_SHARED_RATE_ENABLED: 'true',
  HALLEUS_SHOP_TRUSTED_CLIENT_IP: 'nginx-overwrite-v1',
  HALLEUS_SHOP_RATE_SECRET: randomBytes(48).toString('hex'),
};
const connection = process.env.HALLEUS_SHOP_E2E_DATABASE_URL;
const expectedName = process.env.HALLEUS_SHOP_E2E_DATABASE_NAME;
const confirmation = process.env.HALLEUS_SHOP_E2E_ISOLATED_CONFIRM;
const safeName = /^halleus_shop_e2e_[a-z0-9_]{4,32}$/;
if (!codeSmoke && (!connection || !expectedName || !safeName.test(expectedName) ||
    confirmation !== 'isolated-synthetic-db-only' ||
    connection === process.env.DATABASE_URL)) {
  console.error('EXTERNAL_BLOCK: explicit isolated shop E2E database and safety confirmation required.');
  process.exit(2);
}

if (!codeSmoke) {
  try {
    const parsed = new URL(connection);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) ||
        decodeURIComponent(parsed.pathname.slice(1)) !== expectedName ||
        !parsed.hostname) throw new Error('Unsafe database target');
  } catch {
    console.error('SAFETY_FATAL: shop E2E database target is not a verified isolated PostgreSQL name.');
    process.exit(2);
  }
}

const sql = codeSmoke ? null : postgres(connection, {
  max: 4, connect_timeout: 8, idle_timeout: 5, prepare: false,
});
let started = false;
const requireNode = createRequire(import.meta.url);
const cache = new Map();
const overrides = {};

function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const source = readFileSync(resolve(root, relative), 'utf8');
  const compiled = ts.transpileModule(source, { fileName: relative, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const record = { exports: {} };
  cache.set(relative, record.exports);
  const run = vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`, {
    Buffer, Date, URL, Request, Response, TextDecoder,
    process: { env: runtimeEnv },
  });
  run(record, record.exports, (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('node:')) return requireNode(name);
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) {
      const path = resolve(root, join(relative, '..', name));
      return load(`${path.slice(root.length + 1)}.ts`);
    }
    throw new Error(`Unexpected E2E dependency: ${relative} -> ${name}`);
  });
  return record.exports;
}

const senderIp = `2001:db8::${randomBytes(2).readUInt16BE(0).toString(16)}`;
const syntheticOwner = { role: 'owner', userId: randomUUID(),
  displayName: 'Isolated shop fixture', correlationId: randomUUID() };
let actingRole = 'owner';
function jsonResponse(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

async function verifyIsolationAndSchema() {
  assert.ok(sql, 'Database client unavailable in code-only smoke mode.');
  const rows = await sql.begin('read only', async (tx) => tx`
    select current_database() as database_name,
      to_regclass('public.halleus_reports') is not null as reports,
      to_regclass('halleus_private.shop_orders') is not null as orders,
      to_regclass('halleus_private.shop_order_events') is not null as events,
      to_regclass('halleus_private.shop_rate_limits') is not null as rate_limits,
      to_regclass('halleus_private.shared_display_numbers_seq') is not null as numbers,
      to_regclass('halleus_private.admin_audit_events') is not null as audit,
      to_regprocedure('halleus_private.reject_audit_event_mutation()') is not null as audit_guard
  `);
  const gate = rows[0];
  if (gate?.database_name !== expectedName ||
      !['reports', 'orders', 'events', 'rate_limits', 'numbers', 'audit', 'audit_guard']
        .every((name) => gate[name] === true)) {
    throw new Error('SAFETY_FATAL: isolated database identity or migration 0032/0033 prerequisites missing.');
  }
}

function post(route, path, body, extraHeaders = {}) {
  return route.POST(new Request(`https://halleus.ir${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json',
      'x-halleus-shop-client-ip': senderIp, ...extraHeaders },
    body: JSON.stringify(body),
  }));
}

async function requireStatus(response, code, label) {
  const data = await response.json();
  assert.equal(response.status, code, `${label}: unexpected HTTP status`);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/, label);
  return data;
}

async function exercise() {
  if (!codeSmoke) await verifyIsolationAndSchema();
  started = true;
  // The SQL client is the real postgres.js driver; no SQL, migration or store mock.
  overrides['@/lib/admin/admin-database'] = { getAdminDatabase: () => {
    if (!sql) throw new Error('Code-only smoke must not query PostgreSQL.');
    return sql;
  } };
  overrides['@/lib/config/env'] = { getHalleusRuntimeEnv: () => ({ siteUrl: 'https://halleus.ir' }) };
  overrides['@/lib/admin/admin-auth'] = {
    requireAdminCapability: async (_request, capability) => {
      assert.ok(['shop_orders.read', 'shop_orders.write'].includes(capability));
      return { ...syntheticOwner, role: actingRole };
    },
    assertAdminMutationRequest: (request) => {
      if (request.headers.get('origin') !== 'https://halleus.ir' ||
          request.headers.get('content-type') !== 'application/json') {
        throw new Error('Invalid synthetic owner request origin');
      }
    },
  };
  overrides['@/lib/admin/admin-http'] = {
    noStoreJsonResponse: jsonResponse,
    adminErrorResponse: () => jsonResponse({ ok: false }, 503),
  };

  // Build real request parsing and real route handlers from the candidate source.
  const productData = load('components/shop/product-detail-data.ts');
  const jalali = load('lib/date/jalali.ts');
  const iran = load('lib/locations/iran-cities.ts');
  const global = load('lib/locations/global-cities.ts');
  overrides['@/lib/locations/iran-cities'] = iran;
  overrides['@/lib/locations/global-cities'] = global;
  const cities = load('lib/locations/cities.ts');
  overrides['@/lib/locations/cities'] = cities;
  overrides['@/lib/date/jalali'] = jalali;
  load('lib/shop/shop-civil-time.ts');
  overrides['@/components/shop/product-detail-data'] = productData;
  const moment = load('lib/shop/shop-personalization.ts');
  overrides['@/lib/shop/shop-personalization'] = moment;
  const cart = load('components/shop/shop-cart.ts');
  overrides['@/components/shop/shop-cart'] = cart;
  const shipping = load('components/shop/shop-checkout-state.ts');
  overrides['@/components/shop/shop-checkout-state'] = shipping;
  const priceStore = load('lib/shop/shop-price-store.ts');
  overrides['./shop-price-store'] = priceStore;
  overrides['@/lib/shop/shop-price-store'] = priceStore;
  const quote = load('lib/shop/shop-quote.ts');
  overrides['./shop-quote'] = quote;
  const numbering = load('lib/shop/shop-order-number.ts');
  overrides['./shop-order-number'] = numbering;
  const payment = load('lib/shop/shop-payment-gateway.ts');
  overrides['./shop-payment-gateway'] = payment;
  const store = load('lib/shop/shop-order-store.ts');
  overrides['./shop-order-store'] = store;
  overrides['@/lib/shop/shop-order-store'] = store;
  const contract = load('lib/shop/shop-order-contract.ts');
  overrides['./shop-order-contract'] = contract;
  overrides['@/lib/shop/shop-order-contract'] = contract;
  const limiter = load('lib/shop/shop-shared-rate-limit.ts');
  overrides['./shop-shared-rate-limit'] = limiter;
  const origin = load('lib/admin/admin-origin.ts');
  overrides['@/lib/admin/admin-origin'] = origin;
  const http = load('lib/shop/shop-order-http.ts');
  overrides['@/lib/shop/shop-order-http'] = http;

  const routes = {
    quote: load('app/api/shop/quote/route.ts'),
    create: load('app/api/shop/orders/route.ts'),
    track: load('app/api/shop/orders/track/route.ts'),
    transfer: load('app/api/shop/orders/transfer/route.ts'),
    cancel: load('app/api/shop/orders/cancel/route.ts'),
    ownerDetail: load('app/api/admin/shop/orders/[id]/route.ts'),
    ownerList: load('app/api/admin/shop/orders/route.ts'),
  };
  if (codeSmoke) {
    for (const [name, route] of Object.entries(routes)) {
      assert.equal(typeof (route.POST ?? route.GET), 'function', `${name} route export`);
    }
    console.log('PASS: isolated E2E harness imported actual shop route/store/request contracts without a database connection.');
    return;
  }
  const detail = { calendar: 'jalali', date: '1403/08/15', time: '', city: '',
    names: 'آزمون هالیوس', message: '' };
  const item = { key: randomUUID(), productId: 'p01', size: '20x30', quantity: 1, details: detail };
  const address = { ...shipping.blankShipping,
    name: 'Synthetic E2E', mobile: '9123456789', province: 'تهران', city: 'تهران',
    address: 'نشانی کاملاً ساختگی برای آزمون مستقل فروشگاه',
    postalCode: '1234567890', note: 'synthetic only', carrier: 'post' };
  const quoteData = await requireStatus(await post(routes.quote, '/api/shop/quote', { items: [item] }), 200, 'quote');
  const credentials = { accessCode: randomBytes(32).toString('hex') };
  const body = { items: [item], shipping: address, expectedTotal: quoteData.quote.total,
    idempotencyKey: randomUUID(), guestAccessCode: credentials.accessCode };
  let response = await requireStatus(await post(routes.create, '/api/shop/orders', body), 201, 'create');
  assert.match(response.orderNumber, /^[1-9]\d*$/);
  credentials.orderNumber = response.orderNumber;
  const repeat = await requireStatus(await post(routes.create, '/api/shop/orders', body), 200, 'replay');
  assert.equal(repeat.orderNumber, response.orderNumber);
  assert.equal((await post(routes.create, '/api/shop/orders', {
    ...body, guestAccessCode: randomBytes(32).toString('hex'),
  })).status, 409, 'same idempotency key cannot switch guest secret');

  response = await requireStatus(await post(routes.track, '/api/shop/orders/track', credentials), 200, 'track');
  assert.equal(response.order.status, 'awaiting_transfer');
  for (const privateField of [address.name, address.mobile, address.address,
    address.postalCode, body.guestAccessCode]) {
    assert.ok(!JSON.stringify(response).includes(privateField), 'private order data leaked to guest');
  }
  assert.equal((await post(routes.track, '/api/shop/orders/track', {
    ...credentials, accessCode: randomBytes(32).toString('hex'),
  })).status, 404);
  assert.equal((await post(routes.transfer, '/api/shop/orders/transfer', {
    ...credentials, reference: 'E2E123456', time: '',
  })).status, 200);
  assert.equal((await post(routes.transfer, '/api/shop/orders/transfer', {
    ...credentials, reference: 'E2E123456', time: '',
  })).status, 200, 'identical declaration is idempotent');

  const row = await sql`
    select id, version from halleus_private.shop_orders
    where display_number = ${credentials.orderNumber}::bigint limit 1
  `;
  assert.equal(row.length, 1);
  const context = { params: Promise.resolve({ id: row[0].id }) };
  const ownerPath = `/api/admin/shop/orders/${row[0].id}`;
  const ownerRequest = () => new Request(`https://halleus.ir${ownerPath}`);
  actingRole = 'viewer';
  assert.equal((await routes.ownerDetail.GET(ownerRequest(), context)).status, 403);
  actingRole = 'owner';
  let owner = await requireStatus(await routes.ownerDetail.GET(ownerRequest(), context), 200, 'owner detail');
  assert.equal(owner.order.recipient_mobile, '+989123456789');
  assert.equal(owner.order.guest_access_hash, undefined);
  const ownerPatch = (action, version, extra = {}) => routes.ownerDetail.PATCH(new Request(
    `https://halleus.ir${ownerPath}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json', origin: 'https://halleus.ir' },
      body: JSON.stringify({ action, version, reason: 'synthetic E2E owner action', ...extra }),
    }), context);
  assert.equal((await ownerPatch('start_preparation', Number(row[0].version))).status, 409,
    'preparation before payment verification must be denied');
  for (const [action, status, extra] of [
    ['verify_payment', 'payment_verified', {}],
    ['start_preparation', 'preparing', {}],
    ['mark_shipped', 'shipped', { trackingCode: 'POST-SYNTH-001' }],
    ['mark_delivered', 'delivered', {}],
  ]) {
    const current = Number(owner.order.version);
    const update = await requireStatus(await ownerPatch(action, current, extra), 200, action);
    assert.equal(update.status, status);
    assert.equal((await ownerPatch(action, current, extra)).status, 409, 'stale version must be rejected');
    owner = await requireStatus(await routes.ownerDetail.GET(ownerRequest(), context), 200, 'owner refresh');
    assert.equal(owner.order.status, status);
  }
  response = await requireStatus(await post(routes.track, '/api/shop/orders/track', credentials), 200, 'shipped track');
  assert.equal(response.order.status, 'delivered');
  assert.equal(response.order.trackingCode, 'POST-SYNTH-001');
  assert.equal((await post(routes.cancel, '/api/shop/orders/cancel', credentials)).status, 409);
  const adminCount = await sql`
    select count(*)::int as n from halleus_private.admin_audit_events
    where actor_user_id = ${syntheticOwner.userId}::uuid and target_id = ${row[0].id}::text
  `;
  assert.equal(Number(adminCount[0].n), 4, 'one audited action per accepted transition');

  // Separate order proves cancellability before payment declaration.
  const cancellable = { ...body, idempotencyKey: randomUUID(), guestAccessCode: randomBytes(32).toString('hex') };
  const canceledOrder = await requireStatus(await post(routes.create, '/api/shop/orders', cancellable), 201, 'cancel fixture');
  response = await requireStatus(await post(routes.cancel, '/api/shop/orders/cancel', {
    orderNumber: canceledOrder.orderNumber, accessCode: cancellable.guestAccessCode,
  }), 200, 'guest cancel');
  assert.equal(response.status, 'canceled');
  assert.equal((await post(routes.transfer, '/api/shop/orders/transfer', {
    orderNumber: canceledOrder.orderNumber, accessCode: cancellable.guestAccessCode,
    reference: 'LATE', time: '',
  })).status, 409);
  // A transfer already declared requires an owner decision, not automatic cancellation.
  const reviewable = { ...body, idempotencyKey: randomUUID(), guestAccessCode: randomBytes(32).toString('hex') };
  const reviewOrder = await requireStatus(await post(routes.create, '/api/shop/orders', reviewable), 201, 'review fixture');
  const reviewCredentials = { orderNumber: reviewOrder.orderNumber, accessCode: reviewable.guestAccessCode };
  assert.equal((await post(routes.transfer, '/api/shop/orders/transfer', {
    ...reviewCredentials, reference: 'SYNTHETIC-TRANSFER', time: '',
  })).status, 200);
  response = await requireStatus(await post(routes.cancel, '/api/shop/orders/cancel',
    reviewCredentials), 200, 'request cancellation');
  assert.equal(response.status, 'cancel_requested');
  const reviewRows = await sql`
    select id, version from halleus_private.shop_orders
    where display_number = ${reviewOrder.orderNumber}::bigint limit 1
  `;
  assert.equal(reviewRows.length, 1);
  const reviewContext = { params: Promise.resolve({ id: reviewRows[0].id }) };
  const reviewUrl = `https://halleus.ir/api/admin/shop/orders/${reviewRows[0].id}`;
  const reviewPatch = (action, version) => routes.ownerDetail.PATCH(new Request(reviewUrl, {
    method: 'PATCH', headers: { 'content-type': 'application/json', origin: 'https://halleus.ir' },
    body: JSON.stringify({ action, version, reason: 'synthetic cancellation review' }),
  }), reviewContext);
  actingRole = 'viewer';
  assert.equal((await reviewPatch('resume_cancel', Number(reviewRows[0].version))).status, 403);
  actingRole = 'owner';
  response = await requireStatus(await reviewPatch('resume_cancel', Number(reviewRows[0].version)),
    200, 'resume requested cancellation');
  assert.equal(response.status, 'transfer_declared');
  response = await requireStatus(await reviewPatch('reject_payment', response.version),
    200, 'reject unverified transfer');
  assert.equal(response.status, 'payment_rejected');
  assert.equal((await post(routes.transfer, '/api/shop/orders/transfer', {
    ...reviewCredentials, reference: 'SYNTHETIC-SECOND-TRANSFER', time: '',
  })).status, 200, 'guest may redeclare after rejected payment');
  const afterRedeclare = await sql`
    select version from halleus_private.shop_orders
    where id = ${reviewRows[0].id}::uuid
  `;
  response = await requireStatus(await reviewPatch('cancel', Number(afterRedeclare[0].version)),
    200, 'owner cancellation');
  assert.equal(response.status, 'canceled');
  const overlap = await sql`
    select count(*)::int as n from public.halleus_reports r
    join halleus_private.shop_orders s on s.display_number = r.display_number
    where s.display_number in (${credentials.orderNumber}::bigint,
      ${canceledOrder.orderNumber}::bigint, ${reviewOrder.orderNumber}::bigint)
  `;
  assert.equal(Number(overlap[0].n), 0, 'new order numbers must not collide with report numbers');
  const ownerListing = await requireStatus(await routes.ownerList.GET(new Request(
    'https://halleus.ir/api/admin/shop/orders?page=1')), 200, 'owner list');
  assert.ok(ownerListing.orders.some((order) => order.id === row[0].id));

  // Exercise the real SQL ON CONFLICT limiter across two imported limiter instances.
  const rateProbe = new Request('https://halleus.ir/api/shop/orders', {
    method: 'POST', headers: { 'x-halleus-shop-client-ip': senderIp },
  });
  const bucket = createHmac('sha256', runtimeEnv.HALLEUS_SHOP_RATE_SECRET)
    .update(`halleus-shop-rate-v1\u0000orders\u0000${senderIp}`).digest('hex');
  const hits = await sql`
    select hits from halleus_private.shop_rate_limits where scope_hash = ${bucket}
  `;
  assert.equal(hits.length, 1);
  const already = Number(hits[0].hits);
  assert.ok(already > 0 && already < 20);
  const parallel = await Promise.allSettled(Array.from({ length: 21 - already }, () =>
    limiter.enforceShopSharedRateLimit(rateProbe)));
  assert.equal(parallel.filter((entry) => entry.status === 'fulfilled').length, 20 - already);
  assert.equal(parallel.filter((entry) => entry.status === 'rejected').length, 1);
  assert.ok(parallel.filter((entry) => entry.status === 'rejected').every((entry) =>
    entry.reason.status === 429));
  const after = await sql`
    select hits from halleus_private.shop_rate_limits where scope_hash = ${bucket}
  `;
  assert.equal(Number(after[0].hits), 20);
  assert.ok(isIP(senderIp));
  runtimeEnv.NODE_ENV = 'production';
  assert.equal((await post(routes.create, '/api/shop/orders', body)).status, 404);
  assert.equal((await routes.ownerDetail.GET(ownerRequest(), context)).status, 404);

  console.log('PASS: real isolated PostgreSQL shop HTTP quote/order/replay/transfer/owner lifecycle/audit/guest privacy/cancel/rate concurrency.');
  console.log('NOT VERIFIED: external Supabase login, production ingress, real payment, physical print or deployment.');
}

try {
  await exercise();
} catch (error) {
  // Avoid leaking SQL, connection strings and synthetic customer payloads in error text.
  console.error(started ? 'CANDIDATE_FAILURE: isolated PostgreSQL shop HTTP E2E failed.' :
    'EXTERNAL_BLOCK: isolated database prerequisites failed before any E2E order write.');
  console.error(`failure_type=${error?.name ?? 'Error'}`);
  process.exitCode = 1;
} finally {
  if (sql) await sql.end({ timeout: 5 }).catch(() => {});
}
