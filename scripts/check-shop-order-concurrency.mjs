// Transactional test double for the actual shop-order-store functions.
// Not a PostgreSQL test: the double serializes transactions and models UNIQUE,
// FOR UPDATE and rollback. The real DB migration and lock behavior still require E2E.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/shop/shop-order-store.ts'), 'utf8');
const migration = readFileSync(resolve(root, 'database/migrations/0032_private_shop_orders_shared_numbers.sql'), 'utf8');
assert.match(migration, /display_number bigint not null unique default nextval\('halleus_private\.shared_display_numbers_seq'::regclass\)/);
assert.match(migration, /new\.display_number := nextval\('halleus_private\.shared_display_numbers_seq'::regclass\)/);
assert.match(migration, /create unique index if not exists halleus_reports_display_number_unique/);
assert.match(migration, /create table if not exists halleus_private\.shop_orders \([\s\S]*?idempotency_hash text not null unique/);
assert.match(source, /on conflict \(idempotency_hash\) do nothing/);
assert.equal((source.match(/for update/g) ?? []).length, 3);

class TransactionalShopDouble {
  orders = [];
  events = [];
  audits = [];
  lastNumber = 2000;
  queue = Promise.resolve();
  failOnce = null;

  async begin(work) {
    let unlock;
    const next = new Promise((done) => { unlock = done; });
    const previous = this.queue;
    this.queue = next;
    await previous;
    const copy = structuredClone({ orders: this.orders, events: this.events, audits: this.audits });
    try {
      const result = await work((parts, ...values) => this.query(copy, parts, values));
      Object.assign(this, copy);
      return result;
    } finally { unlock(); }
  }

  query(state, parts, values) {
    const sql = parts.join(' ? ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (this.failOnce && sql.includes(this.failOnce)) {
      this.failOnce = null;
      throw new Error('simulated transaction write failure');
    }
    if (sql.startsWith('insert into halleus_private.shop_orders')) {
      if (state.orders.some((row) => row.idempotency_hash === values[0])) return [];
      if (state.orders.some((row) => row.guest_access_hash === values[1])) throw new Error('23505 guest_access_hash');
      const number = ++this.lastNumber; // PostgreSQL sequences do not roll back.
      const id = `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
      state.orders.push({ id, display_number: number, idempotency_hash: values[0],
        guest_access_hash: values[1], payload_hash: values[2],
        status: 'awaiting_transfer', version: 1, transfer_reference: null,
        transfer_time: null, cancel_origin_status: null, tracking_code: null });
      return [{ id, display_number: number }];
    }
    if (sql.startsWith('select display_number, guest_access_hash, payload_hash')) {
      const found = state.orders.find((row) => row.idempotency_hash === values[0]);
      return found ? [found] : [];
    }
    if (sql.startsWith('select id, status, transfer_reference, transfer_time')) {
      return state.orders.filter((row) => String(row.display_number) === values[0]
        && row.guest_access_hash === values[1]);
    }
    if (sql.startsWith('select id, status from halleus_private.shop_orders')) {
      return state.orders.filter((row) => String(row.display_number) === values[0]
        && row.guest_access_hash === values[1]);
    }
    if (sql.startsWith('select status, version, cancel_origin_status')) {
      return state.orders.filter((row) => row.id === values[0]);
    }
    if (sql.startsWith('update halleus_private.shop_orders')) {
      const id = values.at(-1);
      const row = state.orders.find((entry) => entry.id === id);
      assert.ok(row, 'updates only target a locked existing order');
      if (sql.includes("set status = 'transfer_declared'")) {
        Object.assign(row, { status: 'transfer_declared', transfer_reference: values[0], transfer_time: values[1] });
      } else if (sql.includes('cancel_origin_status =') && !sql.includes('tracking_code =')) {
        Object.assign(row, { status: values[0], cancel_origin_status: values[1] });
      } else {
        Object.assign(row, { status: values[0], tracking_code: values[1] === 'mark_shipped'
          ? values[2] : row.tracking_code, cancel_origin_status: null });
      }
      row.version++;
      return [];
    }
    if (sql.startsWith('insert into halleus_private.shop_order_events')) {
      const action = sql.includes("'order.created'") ? 'order.created'
        : sql.includes("'transfer.declared'") ? 'transfer.declared'
          : sql.includes("'order.cancel_requested'") ? 'order.cancel_requested' : values[2];
      state.events.push({ order_id: values[0], action });
      return [];
    }
    if (sql.startsWith('insert into halleus_private.admin_audit_events')) {
      state.audits.push({ action: values[2], target: values[4] });
      return [];
    }
    throw new Error(`Unmodeled shop query: ${sql.slice(0, 120)}`);
  }
}

const db = new TransactionalShopDouble();
const compiled = ts.transpileModule(source, {
  fileName: 'shop-order-store.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleObject = { exports: {} };
const factory = vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`);
factory(moduleObject, moduleObject.exports, (name) => {
  if (name === '@/lib/admin/admin-database') return { getAdminDatabase: () => db };
  throw new Error(`Unexpected runtime dependency: ${name}`);
});
const { createShopOrder, declareShopTransfer, cancelGuestShopOrder, applyAdminShopAction } = moduleObject.exports;
const makeDraft = (index) => ({
  idempotencyHash: `id-${index}`, guestAccessHash: `access-${index}`, payloadHash: `payload-${index}`,
  shipping: { name: 'Synthetic', mobile: '9123456789', province: 'Test', city: 'Test',
    address: 'Synthetic test only', postalCode: '1234567890', note: '', carrier: 'post' },
  items: [], quote: { itemCount: 1, subtotal: 10, shippingAndPackaging: 2, total: 12 },
});
const draft = makeDraft(1);

// Lost response / multiple tabs: only one order and one creation event.
const replays = await Promise.all(Array.from({ length: 12 }, () => createShopOrder(draft)));
assert.equal(new Set(replays.map((item) => item.orderNumber)).size, 1);
assert.equal(replays.filter((item) => item.created).length, 1);
assert.equal(db.orders.length, 1);
assert.equal(db.events.filter((event) => event.action === 'order.created').length, 1);
await assert.rejects(createShopOrder({ ...draft, payloadHash: 'changed' }), { status: 409 });
await assert.rejects(createShopOrder({ ...draft, guestAccessHash: 'changed' }), { status: 409 });
assert.equal(db.orders.length, 1);

// Independent requests must not collide or reuse an already issued number.
const other = await Promise.all(Array.from({ length: 10 }, (_, i) => createShopOrder(makeDraft(i + 2))));
assert.equal(new Set(other.map((item) => item.orderNumber)).size, 10);
assert.equal(new Set(db.orders.map((row) => row.display_number)).size, 11);
assert.equal(db.events.filter((event) => event.action === 'order.created').length, 11);

const receipt = { orderNumber: replays[0].orderNumber, accessHash: draft.guestAccessHash };
const evidence = { ...receipt, reference: '12345', time: '12:34' };
const transferReplays = await Promise.all(Array.from({ length: 8 }, () => declareShopTransfer(evidence)));
assert.ok(transferReplays.every((result) => result.status === 'transfer_declared'));
assert.equal(db.events.filter((event) => event.action === 'transfer.declared').length, 1);
await assert.rejects(declareShopTransfer({ ...evidence, reference: '99999' }), { status: 409 });

const owner = { userId: 'owner-test-id', role: 'owner', correlationId: 'correlation-test' };
const id = db.orders[0].id;
const action = { id, actor: owner, action: 'verify_payment', version: 2, reason: 'Synthetic transfer verified' };
const settled = await Promise.allSettled(Array.from({ length: 7 }, () => applyAdminShopAction(action)));
assert.equal(settled.filter((result) => result.status === 'fulfilled').length, 1);
assert.ok(settled.filter((result) => result.status === 'rejected').every((result) => result.reason.status === 409));
assert.equal(db.orders[0].status, 'payment_verified');
assert.equal(db.orders[0].version, 3);
assert.equal(db.events.filter((event) => event.action === 'verify_payment').length, 1);
assert.equal(db.audits.length, 1);
await assert.rejects(cancelGuestShopOrder(receipt), { status: 409 });

// Failed event/audit writes must roll back the whole transaction, not leave
// partially advanced status, idempotency rows, or duplicate audit events.
const failedDraft = makeDraft(50);
db.failOnce = 'insert into halleus_private.shop_order_events';
await assert.rejects(createShopOrder(failedDraft), /simulated transaction write failure/);
assert.equal(db.orders.some((row) => row.idempotency_hash === failedDraft.idempotencyHash), false);
const failedSequenceNumber = db.lastNumber;
const retry = await createShopOrder(failedDraft);
assert.equal(retry.created, true);
assert.ok(Number(retry.orderNumber) > failedSequenceNumber, 'sequence gaps after rollback are normal');
const retryReceipt = { orderNumber: retry.orderNumber, accessHash: failedDraft.guestAccessHash };
await declareShopTransfer({ ...retryReceipt, reference: null, time: '10:01' });
const retryId = db.orders.find((row) => String(row.display_number) === retry.orderNumber).id;
db.failOnce = 'insert into halleus_private.admin_audit_events';
await assert.rejects(applyAdminShopAction({ ...action, id: retryId }), /simulated transaction write failure/);
const retryRow = db.orders.find((row) => row.id === retryId);
assert.equal(retryRow.status, 'transfer_declared');
assert.equal(retryRow.version, 2);
assert.equal(db.events.filter((event) => event.order_id === retryId && event.action === 'verify_payment').length, 0);
assert.equal(db.audits.length, 1);
assert.equal((await applyAdminShopAction({ ...action, id: retryId })).status, 'payment_verified');

const canceledDraft = makeDraft(60);
const canceled = await createShopOrder(canceledDraft);
const cancelReceipt = { orderNumber: canceled.orderNumber, accessHash: canceledDraft.guestAccessHash };
const cancellations = await Promise.all(Array.from({ length: 5 }, () => cancelGuestShopOrder(cancelReceipt)));
assert.ok(cancellations.every((result) => result.status === 'canceled'));
assert.equal(db.events.filter((event) => event.order_id === db.orders.at(-1).id && event.action === 'order.cancel_requested').length, 1);
await assert.rejects(declareShopTransfer({ ...cancelReceipt, reference: '1', time: null }), { status: 409 });

console.log('Shop S2 mocked concurrent execution: 12 same-key replays, 10 unique creates, transfer/cancel replays, stale owner writes, injected rollback and retry passed.');
console.log('EXTERNAL_BLOCK: this is a serialized transaction test double, NOT real PostgreSQL sequence/locking/migration E2E.');
