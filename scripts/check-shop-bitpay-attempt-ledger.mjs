import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const source = readFileSync(resolve(root, 'lib/shop/shop-bitpay-attempt-store.ts'), 'utf8');
const migration = readFileSync(resolve(root, 'database/migrations/0034_private_shop_bitpay_attempts.sql'), 'utf8');
const gateway = readFileSync(resolve(root, 'lib/shop/shop-payment-gateway.ts'), 'utf8');
const api = readFileSync(resolve(root, 'app/api/shop/orders/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: 'shop-bitpay-attempt-store.ts', reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
assert.equal((compiled.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0);

const orderId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const attemptId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const hash = x => x.repeat(64);
let state;
let failEvent = false;
const reset = () => {
  state = { order: { id: orderId, display_number: '987654321012345678', guest_access_hash: hash('a'),
    total_toman: 100000, status: 'awaiting_transfer', version: 1 }, attempts: [], events: [] };
  failEvent = false;
};
const clone = obj => JSON.parse(JSON.stringify(obj));
function handle(strings, ...values) {
  const q = strings.join('?').replace(/\s+/g, ' ').trim().toLowerCase();
  const order = state.order;
  if (q.includes('from halleus_private.shop_orders') && q.startsWith('select')) {
    if (q.includes('guest_access_hash') && (values[0] !== order.display_number || values[1] !== order.guest_access_hash)) return [];
    if (q.includes('where display_number') && values[0] !== order.display_number) return [];
    if (q.includes('where id') && values[0] !== order.id) return [];
    return [clone(order)];
  }
  if (q.includes('from halleus_private.shop_payment_attempts') && q.startsWith('select')) {
    if (q.includes('where order_id')) {
      return state.attempts.filter(a => a.order_id === values[0] && !['failed'].includes(a.status)).map(clone);
    }
    if (q.includes('where id')) {
      return state.attempts.filter(a => a.id === values[0]
        && (!q.includes('and order_id') || a.order_id === values[1])).map(clone);
    }
  }
  if (q.startsWith('insert into halleus_private.shop_payment_attempts')) {
    const item = { id: attemptId, order_id: values[0], idempotency_hash: values[1],
      callback_token_hash: values[2], factor_id: values[3], amount_toman: values[4],
      amount_rial: Number(values[5]) * 10, status: 'created', provider_payment_id: null,
      provider_transaction_id: null };
    state.attempts.push(item);
    return [clone(item)];
  }
  if (q.startsWith('update halleus_private.shop_payment_attempts')) {
    const attempt = state.attempts.find(a => a.id === (q.includes('verified_at') ? values[1] : values[1]));
    if (!attempt) throw new Error('fixture attempt missing');
    if (q.includes("status = 'verified'")) {
      attempt.status = 'verified'; attempt.provider_transaction_id = values[0];
    } else {
      attempt.status = 'redirect_ready'; attempt.provider_payment_id = values[0];
    }
    return [];
  }
  if (q.startsWith('update halleus_private.shop_orders')) {
    if (values[0] !== order.id) throw new Error('fixture order missing');
    order.status = 'payment_verified'; order.version += 1;
    return [];
  }
  if (q.startsWith('insert into halleus_private.shop_order_events')) {
    if (failEvent) throw new Error('synthetic event write failed');
    state.events.push({ order_id: values[0], action: 'bitpay.payment.verified',
      before: values[1], after: 'payment_verified' });
    return [];
  }
  throw new Error('Unexpected SQL in fixture: ' + q);
}
const database = { begin: async fn => {
  const snapshot = clone(state);
  try { return await fn(handle); }
  catch (error) { state = snapshot; throw error; }
}};
const mod = { exports: {} };
const factory = vm.runInNewContext('(function(module, exports, require) {\n' + compiled.outputText + '\n})');
factory(mod, mod.exports, spec => {
  if (spec === '@/lib/admin/admin-database') return { getAdminDatabase: () => database };
  throw new Error('Unexpected dependency ' + spec);
});
const store = mod.exports;
const reserveInput = { orderNumber: '987654321012345678', guestAccessHash: hash('a'),
  idempotencyHash: hash('b'), callbackTokenHash: hash('c') };
const verifiedInput = { attemptId, orderNumber: reserveInput.orderNumber, providerPaymentId: '12345678',
  trustedVerification: { status: 'paid', providerReference: '557788', confirmedAmountToman: 100000 } };

reset();
const first = await store.reserveBitPayAttempt(reserveInput);
assert.equal(first.id, attemptId);
assert.equal(first.status, 'created');
assert.equal(state.attempts.length, 1);
assert.equal(state.attempts[0].amount_rial, 1000000);
await store.reserveBitPayAttempt(reserveInput);
assert.equal(state.attempts.length, 1, 'idempotent reservation');
await assert.rejects(store.reserveBitPayAttempt({ ...reserveInput, idempotencyHash: hash('d') }));
await assert.rejects(store.reserveBitPayAttempt({ ...reserveInput, guestAccessHash: hash('e') }));
await assert.rejects(store.reserveBitPayAttempt({ ...reserveInput, callbackTokenHash: hash('d') }));
assert.equal(state.attempts.length, 1);
await store.recordBitPayRedirect({ attemptId, providerPaymentId: '12345678' });
await store.recordBitPayRedirect({ attemptId, providerPaymentId: '12345678' });
assert.equal(state.attempts[0].status, 'redirect_ready');
await assert.rejects(store.recordBitPayRedirect({ attemptId, providerPaymentId: '99888' }));
await assert.rejects(store.settleVerifiedBitPayAttempt({ ...verifiedInput,
  trustedVerification: { ...verifiedInput.trustedVerification, confirmedAmountToman: 100001 } }));
await assert.rejects(store.settleVerifiedBitPayAttempt({ ...verifiedInput,
  trustedVerification: { status: 'unconfirmed', providerReference: null } }));
await assert.rejects(store.settleVerifiedBitPayAttempt({ ...verifiedInput, providerPaymentId: '12121' }));
assert.equal(state.order.status, 'awaiting_transfer');
assert.equal(state.events.length, 0);
assert.equal(await store.settleVerifiedBitPayAttempt(verifiedInput), 'verified');
assert.equal(state.order.status, 'payment_verified');
assert.equal(state.attempts[0].status, 'verified');
assert.equal(state.events.length, 1);
assert.equal(state.events[0].before, 'awaiting_transfer');
assert.equal(await store.settleVerifiedBitPayAttempt(verifiedInput), 'already_verified');
assert.equal(state.events.length, 1, 'duplicate callback must not double-count');
await assert.rejects(store.settleVerifiedBitPayAttempt({ ...verifiedInput,
  trustedVerification: { ...verifiedInput.trustedVerification, providerReference: '665588' } }));
reset();
await store.reserveBitPayAttempt(reserveInput);
await store.recordBitPayRedirect({ attemptId, providerPaymentId: '12345678' });
state.order.status = 'transfer_declared';
await assert.rejects(store.settleVerifiedBitPayAttempt(verifiedInput));
assert.equal(state.events.length, 0, 'manual transfer pending must never be silently verified');
reset();
await store.reserveBitPayAttempt(reserveInput);
await store.recordBitPayRedirect({ attemptId, providerPaymentId: '12345678' });
failEvent = true;
await assert.rejects(store.settleVerifiedBitPayAttempt(verifiedInput));
assert.equal(state.attempts[0].status, 'redirect_ready', 'transaction rollback of attempt');
assert.equal(state.order.status, 'awaiting_transfer', 'transaction rollback of order');
assert.equal(state.events.length, 0, 'transaction rollback of events');
reset();
state.order.status = 'canceled';
await assert.rejects(store.reserveBitPayAttempt(reserveInput));

// Structural DB boundary checks: this is not a replacement for isolated PostgreSQL integration.
assert.match(migration, /references halleus_private\.shop_orders\(id\) on delete restrict/);
assert.match(migration, /unique index shop_bitpay_one_unresolved_per_order/);
assert.match(migration, /amount_rial = amount_toman::bigint \* 10/);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on halleus_private\.shop_payment_attempts from public, anon, authenticated/);
assert.match(migration, /callback_token_hash text not null unique/);
assert.match(migration, /provider_transaction_id text unique/);
assert.match(source, /for update/g);
assert.match(source, /insert into halleus_private\.shop_order_events/);
assert.doesNotMatch(source, /process\.env|console\.(?:log|warn|error)|fetch\(/);
assert.match(gateway, /SHOP_ONLINE_GATEWAY_ENABLED = process\.env\.HALLEUS_BITPAY_SOURCE_READY === 'true'/);
assert.doesNotMatch(api, /BitPay|bitpay|shop-bitpay/);
console.log('BITPAY_ATTEMPT_LEDGER_R2=PASS: synthetic lifecycle, idempotency, fallback, duplicates, mismatch, rollback, private migration boundary');
