'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import styles from './shop-orders-workspace.module.css';

type ShopOrderRow = {
  id: string; display_number: string; status: string; recipient_name: string;
  recipient_mobile: string; carrier: string; total_toman: number;
  item_count: number; version: number; created_at: string;
};
type PrintItem = {
  key: string; productId: string; size: string; quantity: number;
  details: { calendar: string; date: string; time: string; city: string; names: string; message: string };
};
type ShopOrderDetail = ShopOrderRow & {
  province: string; city: string; address: string; postal_code: string;
  delivery_note: string | null; items: PrintItem[]; transfer_reference: string | null;
  transfer_time: string | null; tracking_code: string | null;
  events: { action: string; before_status: string | null; after_status: string; reason: string | null; created_at: string }[];
};
type Action = 'verify_payment' | 'reject_payment' | 'start_preparation'
  | 'mark_shipped' | 'mark_delivered' | 'cancel' | 'resume_cancel';

const labels: Record<string, string> = {
  awaiting_transfer: 'در انتظار واریز', transfer_declared: 'اعلام واریز شده',
  payment_verified: 'پرداخت تأییدشده', payment_rejected: 'پرداخت نیازمند بررسی',
  preparing: 'در حال آماده‌سازی', shipped: 'ارسال‌شده', delivered: 'تحویل‌شده',
  cancel_requested: 'درخواست لغو', canceled: 'لغوشده',
};
const productNames: Record<string, string> = { p01: 'ماه آن روز', p02: 'آسمان تولد', p03: 'شبِ ما' };

const actions: Record<string, { action: Action; label: string }[]> = {
  awaiting_transfer: [{ action: 'cancel', label: 'لغو سفارش' }],
  transfer_declared: [
    { action: 'verify_payment', label: 'تأیید دریافت وجه' },
    { action: 'reject_payment', label: 'رد اعلام واریز' },
    { action: 'cancel', label: 'لغو سفارش' },
  ],
  payment_rejected: [{ action: 'cancel', label: 'لغو سفارش' }],
  payment_verified: [{ action: 'start_preparation', label: 'شروع آماده‌سازی' }],
  preparing: [{ action: 'mark_shipped', label: 'ثبت تحویل به شرکت حمل' }],
  shipped: [{ action: 'mark_delivered', label: 'ثبت تحویل به مشتری' }],
  cancel_requested: [
    { action: 'cancel', label: 'تأیید لغو' },
    { action: 'resume_cancel', label: 'ادامهٔ بررسی پرداخت' },
  ],
};

function formatNumber(value: number | string) { return Number(value).toLocaleString('fa-IR'); }

export function ShopOrdersWorkspace({ accessToken }: { accessToken: string }) {
  const [rows, setRows] = useState<ShopOrderRow[]>([]);
  const [detail, setDetail] = useState<ShopOrderDetail | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reason, setReason] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [refresh, setRefresh] = useState(0);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(path, {
      ...init, cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok || !data?.ok) {
      throw new Error(typeof data?.error === 'string' ? data.error : `دریافت سفارش انجام نشد (${response.status}).`);
    }
    return data;
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), status, search });
    request(`/api/admin/shop/orders?${query}`).then((data) => {
      if (!active) return;
      setRows(data.orders as ShopOrderRow[]); setTotal(Number(data.total)); setError('');
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'دریافت فهرست انجام نشد.');
    });
    return () => { active = false; };
  }, [request, page, status, search, refresh]);

  async function selectOrder(id: string) {
    setBusy(true); setError(''); setSuccess('');
    try {
      const data = await request(`/api/admin/shop/orders/${id}`);
      setDetail(data.order as ShopOrderDetail); setReason(''); setTrackingCode('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'سفارش باز نشد.'); }
    finally { setBusy(false); }
  }

  async function runAction(action: Action) {
    if (!detail || busy) return;
    if (action === 'verify_payment' && !window.confirm('دریافت مبلغ را در حساب بانکی واقعاً تأیید کرده‌ای؟')) return;
    if (action === 'mark_shipped' && !trackingCode.trim()) { setError('کد رهگیری پست یا تیپاکس را وارد کن.'); return; }
    if (action === 'cancel' && !window.confirm('از لغو سفارش مطمئنی؟')) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await request(`/api/admin/shop/orders/${detail.id}`, {
        method: 'PATCH', body: JSON.stringify({
          action, version: detail.version, reason: reason.trim() || 'ثبت تصمیم مالک فروشگاه', trackingCode: trackingCode.trim(),
        }),
      });
      const data = await request(`/api/admin/shop/orders/${detail.id}`);
      setDetail(data.order as ShopOrderDetail);
      setReason(''); setTrackingCode(''); setSuccess('وضعیت سفارش ثبت شد.');
      setRefresh((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ثبت تغییر انجام نشد.'); }
    finally { setBusy(false); }
  }

  function doSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPage(1); setSearch(searchDraft.trim());
  }

  return <div className={styles.workspace} dir="rtl">
    <div className={styles.toolbar}>
      <form onSubmit={doSearch} className={styles.search}>
        <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={64} placeholder="شماره سفارش، نام یا موبایل" aria-label="جست‌وجوی سفارش" />
        <button type="submit">جست‌وجو</button>
      </form>
      <select aria-label="فیلتر وضعیت سفارش" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
        <option value="">همهٔ وضعیت‌ها</option>
        {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <button type="button" onClick={() => setRefresh((value) => value + 1)}>تازه‌سازی</button>
    </div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {success ? <p className={styles.success} role="status">{success}</p> : null}
    <div className={styles.tableScroll}>
      <table>
        <thead><tr><th>شماره</th><th>مشتری</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th><th>جزئیات</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <td>{formatNumber(row.display_number)}</td><td>{row.recipient_name}</td>
          <td>{formatNumber(row.total_toman)} تومان</td><td>{labels[row.status] ?? row.status}</td>
          <td>{new Date(row.created_at).toLocaleDateString('fa-IR')}</td>
          <td><button type="button" disabled={busy} onClick={() => void selectOrder(row.id)}>باز کردن</button></td>
        </tr>)}</tbody>
      </table>
      {!rows.length ? <p>سفارشی با این مشخصات پیدا نشد.</p> : null}
    </div>
    <div className={styles.pagination}>
      <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>صفحه قبل</button>
      <span>صفحه {formatNumber(page)} · {formatNumber(total)} سفارش</span>
      <button type="button" disabled={page * 25 >= total} onClick={() => setPage((value) => value + 1)}>صفحه بعد</button>
    </div>
    {detail ? <section className={styles.detail}>
      <div className={styles.heading}><h3>سفارش {formatNumber(detail.display_number)} · {labels[detail.status] ?? detail.status}</h3><button type="button" onClick={() => setDetail(null)}>بستن</button></div>
      <div className={styles.info}>
        <p><strong>گیرنده:</strong> {detail.recipient_name} · <bdi>{detail.recipient_mobile}</bdi></p>
        <p><strong>نشانی:</strong> {detail.province}، {detail.city}، {detail.address} · {detail.postal_code}</p>
        {detail.delivery_note ? <p><strong>توضیح تحویل:</strong> {detail.delivery_note}</p> : null}
        <p><strong>ارسال:</strong> {detail.carrier === 'post' ? 'پست پیشتاز' : 'تیپاکس'} · <strong>مبلغ:</strong> {formatNumber(detail.total_toman)} تومان</p>
        <p><strong>مستند واریز:</strong> {detail.transfer_reference ? `شماره ${detail.transfer_reference}` : ''} {detail.transfer_time ? `ساعت ${detail.transfer_time}` : ''}</p>
        {detail.tracking_code ? <p><strong>کد رهگیری مرسوله:</strong> {detail.tracking_code}</p> : null}
      </div>
      <h4>مشخصات محصولات</h4>
      <div className={styles.items}>{detail.items.map((item) => <article key={item.key}>
        <strong>{productNames[item.productId] ?? item.productId} · {item.size} سانتی‌متر · {formatNumber(item.quantity)} عدد</strong>
        {item.details.date ? <p>تاریخ: {item.details.date} ({item.details.calendar === 'jalali' ? 'شمسی' : 'میلادی'})</p> : null}
        {item.details.time ? <p>ساعت: {item.details.time}</p> : null}
        {item.details.city ? <p>شهر: {item.details.city}</p> : null}
        {item.details.names ? <p>نام: {item.details.names}</p> : null}
        {item.details.message ? <p>متن روی تابلو: {item.details.message}</p> : null}
      </article>)}</div>
      <h4>سوابق سفارش</h4>
      <div className={styles.history}>{detail.events.map((event, index) => <p key={`${event.created_at}-${index}`}>{new Date(event.created_at).toLocaleString('fa-IR')} · {event.action} · {labels[event.after_status] ?? event.after_status}{event.reason ? ` · ${event.reason}` : ''}</p>)}</div>
      {actions[detail.status]?.length ? <div className={styles.actions}>
        <label>یادداشت تصمیم (اختیاری)<input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="توضیحات مربوط به این اقدام" /></label>
        {detail.status === 'preparing' ? <label>کد رهگیری مرسوله<input value={trackingCode} maxLength={100} onChange={(event) => setTrackingCode(event.target.value)} placeholder="کد پست یا تیپاکس" /></label> : null}
        <div>{actions[detail.status].map(({ action, label }) => <button key={action} type="button" disabled={busy} onClick={() => void runAction(action)}>{label}</button>)}</div>
        <small>تأیید پرداخت فقط پس از بررسی واقعی ورود وجه به حساب بانکی انجام شود.</small>
      </div> : null}
    </section> : null}
  </div>;
}
