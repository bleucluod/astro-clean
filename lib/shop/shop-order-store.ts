import { getAdminDatabase } from '@/lib/admin/admin-database';
import type { VerifiedAdminActor } from '@/lib/admin/admin-auth';
import type { ShopOrderDraft } from './shop-order-contract';

export class ShopOrderStateError extends Error {
  constructor(message: string, readonly status = 409) { super(message); }
}

export type ShopOrderStatus =
  | 'awaiting_transfer' | 'transfer_declared' | 'payment_verified' | 'payment_rejected'
  | 'preparing' | 'shipped' | 'delivered' | 'cancel_requested' | 'canceled';

export type ShopOrderPublicState = {
  orderNumber: string;
  status: ShopOrderStatus;
  carrier: 'post' | 'tipax';
  itemCount: number;
  totalToman: number;
  trackingCode: string | null;
  onlinePaymentPending?: boolean;
  createdAt: string;
  updatedAt: string;
  events: { action: string; status: string; at: string }[];
};

export async function createShopOrder(draft: ShopOrderDraft) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const { shipping, quote } = draft;
    const inserted = await tx`
      insert into halleus_private.shop_orders (
        idempotency_hash, guest_access_hash, payload_hash,
        recipient_name, recipient_mobile, province, city, address, postal_code, delivery_note,
        carrier, items, item_count, subtotal_toman, shipping_and_packaging_toman, total_toman
      ) values (
        ${draft.idempotencyHash}, ${draft.guestAccessHash}, ${draft.payloadHash},
        ${shipping.name}, ${`+98${shipping.mobile}`}, ${shipping.province}, ${shipping.city},
        ${shipping.address}, ${shipping.postalCode}, ${shipping.note || null},
        ${shipping.carrier}, ${JSON.stringify(draft.items)}::text::jsonb,
        ${quote.itemCount}, ${quote.subtotal}, ${quote.shippingAndPackaging}, ${quote.total}
      ) on conflict (idempotency_hash) do nothing
      returning id, display_number
    `;
    if (inserted.length) {
      await tx`
        insert into halleus_private.shop_order_events (order_id, action, after_status)
        values (${inserted[0].id}::uuid, 'order.created', 'awaiting_transfer')
      `;
      return { orderNumber: String(inserted[0].display_number), created: true,
        status: 'awaiting_transfer' as const };
    }
    const rows = await tx`
      select display_number, guest_access_hash, payload_hash, status
      from halleus_private.shop_orders where idempotency_hash = ${draft.idempotencyHash} limit 1
    `;
    if (!rows.length || rows[0].guest_access_hash !== draft.guestAccessHash
        || rows[0].payload_hash !== draft.payloadHash) {
      throw new ShopOrderStateError('این سفارش تغییر کرده؛ لطفاً دوباره آن را بررسی کن.');
    }
    return { orderNumber: String(rows[0].display_number), created: false,
      status: rows[0].status as ShopOrderStatus };
  });
}

export async function declareShopTransfer(input: {
  orderNumber: string;
  accessHash: string;
  reference: string | null;
  time: string | null;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select id, status, transfer_reference, transfer_time
      from halleus_private.shop_orders
      where display_number = ${input.orderNumber}::bigint and guest_access_hash = ${input.accessHash}
      for update
    `;
    if (!rows.length) throw new ShopOrderStateError('سفارش پیدا نشد.', 404);
    const current = rows[0];
    if (current.status === 'transfer_declared'
        && current.transfer_reference === input.reference && current.transfer_time === input.time) {
      return { status: 'transfer_declared' as const };
    }
    if (current.status !== 'awaiting_transfer' && current.status !== 'payment_rejected') {
      throw new ShopOrderStateError('این سفارش در مرحلهٔ دیگری از بررسی است.');
    }
    const bitpayTable = await tx`select to_regclass('halleus_private.shop_payment_attempts') as ledger`;
    if (bitpayTable[0]?.ledger) {
      const online = await tx`
        select 1 from halleus_private.shop_payment_attempts
        where order_id = ${current.id}::uuid
          and status in ('created', 'redirect_ready', 'verify_pending', 'review_required', 'verified')
        limit 1
      `;
      if (online.length) throw new ShopOrderStateError('پرداخت آنلاین این سفارش در حال بررسی است؛ تا تعیین نتیجه امکان تغییر روش یا لغو وجود ندارد.');
    }
    await tx`
      update halleus_private.shop_orders
      set status = 'transfer_declared', transfer_reference = ${input.reference},
          transfer_time = ${input.time}, transfer_declared_at = now(), updated_at = now(),
          version = version + 1
      where id = ${current.id}::uuid
    `;
    await tx`
      insert into halleus_private.shop_order_events (order_id, action, before_status, after_status)
      values (${current.id}::uuid, 'transfer.declared', ${current.status}, 'transfer_declared')
    `;
    return { status: 'transfer_declared' as const };
  });
}

export async function cancelGuestShopOrder(input: { orderNumber: string; accessHash: string }) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select id, status from halleus_private.shop_orders
      where display_number = ${input.orderNumber}::bigint and guest_access_hash = ${input.accessHash}
      for update
    `;
    if (!rows.length) throw new ShopOrderStateError('سفارش پیدا نشد.', 404);
    const current = rows[0];
    if (current.status === 'canceled' || current.status === 'cancel_requested') return { status: current.status as ShopOrderStatus };
    const bitpayTable = await tx`select to_regclass('halleus_private.shop_payment_attempts') as ledger`;
    if (bitpayTable[0]?.ledger) {
      const online = await tx`
        select 1 from halleus_private.shop_payment_attempts
        where order_id = ${current.id}::uuid
          and status in ('created', 'redirect_ready', 'verify_pending', 'review_required', 'verified')
        limit 1
      `;
      if (online.length) throw new ShopOrderStateError('پرداخت آنلاین این سفارش در حال بررسی است؛ تا تعیین نتیجه امکان تغییر روش یا لغو وجود ندارد.');
    }
    let status: ShopOrderStatus;
    if (current.status === 'awaiting_transfer' || current.status === 'payment_rejected') status = 'canceled';
    else if (current.status === 'transfer_declared') status = 'cancel_requested';
    else throw new ShopOrderStateError('لغو این سفارش از طریق پشتیبانی بررسی می‌شود.');
    await tx`
      update halleus_private.shop_orders
      set status = ${status},
          cancel_origin_status = ${status === 'cancel_requested' ? current.status : null},
          updated_at = now(), version = version + 1
      where id = ${current.id}::uuid
    `;
    await tx`
      insert into halleus_private.shop_order_events (order_id, action, before_status, after_status)
      values (${current.id}::uuid, 'order.cancel_requested', ${current.status}, ${status})
    `;
    return { status };
  });
}

async function hasPendingShopBitPayAttempt(orderId: string): Promise<boolean> {
  const sql = getAdminDatabase();
  const table = await sql`select to_regclass('halleus_private.shop_payment_attempts') as ledger`;
  if (!table[0]?.ledger) return false;
  const rows = await sql`
    select 1 from halleus_private.shop_payment_attempts
    where order_id = ${orderId}::uuid
      and status in ('created', 'redirect_ready', 'verify_pending', 'review_required')
    limit 1
  `;
  return rows.length > 0;
}

export async function getGuestShopOrder(input: { orderNumber: string; accessHash: string }): Promise<ShopOrderPublicState | null> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select id, display_number, status, carrier, item_count, total_toman,
           tracking_code, created_at, updated_at
    from halleus_private.shop_orders
    where display_number = ${input.orderNumber}::bigint and guest_access_hash = ${input.accessHash}
    limit 1
  `;
  if (!rows.length) return null;
  const order = rows[0];
  const events = await sql`
    select action, after_status, created_at from halleus_private.shop_order_events
    where order_id = ${order.id}::uuid order by created_at asc, id asc
  `;
  return {
    orderNumber: String(order.display_number),
    status: order.status as ShopOrderStatus,
    carrier: order.carrier as 'post' | 'tipax',
    itemCount: Number(order.item_count), totalToman: Number(order.total_toman),
    trackingCode: order.tracking_code ?? null,
    onlinePaymentPending: await hasPendingShopBitPayAttempt(String(order.id)),
    createdAt: new Date(order.created_at).toISOString(),
    updatedAt: new Date(order.updated_at).toISOString(),
    events: events.map((event) => ({
      action: event.action, status: event.after_status,
      at: new Date(event.created_at).toISOString(),
    })),
  };
}


/** Read-only phone lookup, preserving the existing public status projection. */
export async function getGuestShopOrderByMobile(input: { orderNumber: string; recipientMobile: string }): Promise<ShopOrderPublicState | null> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select id, display_number, status, carrier, item_count, total_toman,
           tracking_code, created_at, updated_at
    from halleus_private.shop_orders
    where display_number = ${input.orderNumber}::bigint and recipient_mobile = ${input.recipientMobile}
    limit 1
  `;
  if (!rows.length) return null;
  const order = rows[0];
  const events = await sql`
    select action, after_status, created_at from halleus_private.shop_order_events
    where order_id = ${order.id}::uuid order by created_at asc, id asc
  `;
  return {
    orderNumber: String(order.display_number),
    status: order.status as ShopOrderStatus,
    carrier: order.carrier as 'post' | 'tipax',
    itemCount: Number(order.item_count), totalToman: Number(order.total_toman),
    trackingCode: order.tracking_code ?? null,
    onlinePaymentPending: await hasPendingShopBitPayAttempt(String(order.id)),
    createdAt: new Date(order.created_at).toISOString(),
    updatedAt: new Date(order.updated_at).toISOString(),
    events: events.map((event) => ({
      action: event.action, status: event.after_status,
      at: new Date(event.created_at).toISOString(),
    })),
  };
}

export async function listAdminShopOrders(input: { page: number; status: string; search: string }) {
  const sql = getAdminDatabase();
  const term = `%${input.search}%`;
  const offset = (input.page - 1) * 25;
  const rows = await sql`
    select id, display_number, status, recipient_name, recipient_mobile,
           carrier, total_toman, item_count, transfer_declared_at, created_at, version
    from halleus_private.shop_orders
    where (${input.status} = '' or status = ${input.status})
      and (${input.search} = '' or recipient_name ilike ${term}
        or recipient_mobile ilike ${term}
        or display_number::text = ${input.search})
    order by created_at desc, id desc limit 25 offset ${offset}
  `;
  const totals = await sql`
    select count(*)::int as count from halleus_private.shop_orders
    where (${input.status} = '' or status = ${input.status})
      and (${input.search} = '' or recipient_name ilike ${term}
        or recipient_mobile ilike ${term}
        or display_number::text = ${input.search})
  `;
  return { orders: rows.map((row) => ({ ...row, display_number: String(row.display_number) })),
    total: Number(totals[0]?.count ?? 0), page: input.page };
}

export async function getAdminShopOrder(id: string) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select * from halleus_private.shop_orders where id = ${id}::uuid limit 1
  `;
  if (!rows.length) return null;
  const events = await sql`
    select action, before_status, after_status, reason, created_at
    from halleus_private.shop_order_events where order_id = ${id}::uuid
    order by created_at asc, id asc
  `;
  const { idempotency_hash: _idempotency, guest_access_hash: _secret,
    payload_hash: _payload, ...order } = rows[0];
  void _idempotency; void _secret; void _payload;
  return { ...order, display_number: String(order.display_number), events };
}

export type AdminShopAction = 'verify_payment' | 'reject_payment' | 'start_preparation'
  | 'mark_shipped' | 'mark_delivered' | 'cancel' | 'resume_cancel';

export async function applyAdminShopAction(input: {
  id: string; actor: VerifiedAdminActor; action: AdminShopAction; version: number;
  reason: string; trackingCode?: string;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select status, version, cancel_origin_status, tracking_code from halleus_private.shop_orders
      where id = ${input.id}::uuid for update
    `;
    if (!rows.length) throw new ShopOrderStateError('سفارش پیدا نشد.', 404);
    const current = rows[0];
    if (Number(current.version) !== input.version) throw new ShopOrderStateError('سفارش تغییر کرده؛ یک‌بار تازه‌سازی کن.');
    const allowed: Record<AdminShopAction, readonly string[]> = {
      verify_payment: ['transfer_declared'], reject_payment: ['transfer_declared'],
      start_preparation: ['payment_verified'], mark_shipped: ['preparing'],
      mark_delivered: ['shipped'], cancel: ['awaiting_transfer', 'transfer_declared',
        'payment_rejected', 'cancel_requested'], resume_cancel: ['cancel_requested'],
    };
    if (!allowed[input.action].includes(current.status)) throw new ShopOrderStateError('این تغییر وضعیت مجاز نیست.');
    if (['verify_payment', 'reject_payment', 'cancel', 'resume_cancel'].includes(input.action)) {
      const bitpayTable = await tx`select to_regclass('halleus_private.shop_payment_attempts') as ledger`;
      if (bitpayTable[0]?.ledger) {
      const online = await tx`
        select 1 from halleus_private.shop_payment_attempts
        where order_id = ${input.id}::uuid
          and status in ('created', 'redirect_ready', 'verify_pending', 'review_required', 'verified')
        limit 1
      `;
      if (online.length) throw new ShopOrderStateError('پرداخت بیت‌پی هنوز باز یا تأییدشده است؛ این اقدام نیاز به بررسی وضعیت درگاه دارد.');
      }
    }
    const nextStatus: Record<AdminShopAction, ShopOrderStatus> = {
      verify_payment: 'payment_verified', reject_payment: 'payment_rejected',
      start_preparation: 'preparing', mark_shipped: 'shipped', mark_delivered: 'delivered',
      cancel: 'canceled', resume_cancel: current.cancel_origin_status as ShopOrderStatus,
    };
    const status = nextStatus[input.action];
    if (!status) throw new ShopOrderStateError('وضعیت لغو قابل بازیابی نیست.');
    const trackingCode = input.trackingCode?.trim() ?? '';
    if (input.action === 'mark_shipped' && (!trackingCode || trackingCode.length > 100)) {
      throw new ShopOrderStateError('کد رهگیری شرکت حمل را وارد کن.', 400);
    }
    await tx`
      update halleus_private.shop_orders set status = ${status},
        tracking_code = ${input.action === 'mark_shipped' ? trackingCode : current.tracking_code},
        handed_to_carrier_at = case when ${input.action} = 'mark_shipped' then now() else handed_to_carrier_at end,
        payment_verified_at = case when ${input.action} = 'verify_payment' then now() else payment_verified_at end,
        cancel_origin_status = null, cancellation_reason = ${input.action === 'cancel' ? input.reason : null},
        updated_at = now(), version = version + 1
      where id = ${input.id}::uuid
    `;
    await tx`
      insert into halleus_private.shop_order_events
        (order_id, actor_user_id, action, before_status, after_status, reason)
      values (${input.id}::uuid, ${input.actor.userId}::uuid, ${input.action},
        ${current.status}, ${status}, ${input.reason})
    `;
    await tx`
      insert into halleus_private.admin_audit_events
        (actor_user_id, actor_role, action, target_type, target_id,
         before_summary, after_summary, reason, success, request_correlation_id)
      values (${input.actor.userId}::uuid, ${input.actor.role}, ${`shop.${input.action}`},
        'shop_order', ${input.id},
        ${JSON.stringify({ status: current.status })}::jsonb,
        ${JSON.stringify({ status })}::jsonb, ${input.reason}, true, ${input.actor.correlationId})
    `;
    return { status, version: input.version + 1 };
  });
}
