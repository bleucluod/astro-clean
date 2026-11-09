'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ShopCatalogReadiness } from './ShopCatalogReadiness';
import { formatShopInteger, formatShopOrderNumber } from '@/lib/shop/shop-order-number';
import { buildShopManualCustomerNotice } from '@/lib/shop/shop-manual-notice';
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
const printHandoffStatuses = new Set(['payment_verified', 'preparing', 'shipped', 'delivered']);

class ShopRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

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

function formatNumber(value: number | string) { return formatShopInteger(value); }

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
  const [ordersClosed, setOrdersClosed] = useState(false);
  const [sampleCalendar, setSampleCalendar] = useState<'jalali' | 'gregorian'>('jalali');
  const [sampleDate, setSampleDate] = useState('۱۴۰۳/۰۸/۱۵');
  const [sampleNames, setSampleNames] = useState('نام نمونه');
  const [sampleMessage, setSampleMessage] = useState('');
  const [sampleBusy, setSampleBusy] = useState(false);
  const [sampleFeedback, setSampleFeedback] = useState('');
  const [sampleError, setSampleError] = useState('');
  const [sampleSize, setSampleSize] = useState<'10x15' | '20x30' | '30x45'>('20x30');
  const [sampleCity, setSampleCity] = useState('');

  const [samplePreviewUrl, setSamplePreviewUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [generatedArtwork, setGeneratedArtwork] = useState<{ line: number; blob: Blob; url: string } | null>(null);
  const [uploadLine, setUploadLine] = useState(1);
  const [confirmOrderMatch, setConfirmOrderMatch] = useState(false);
  const [confirmLabPrint, setConfirmLabPrint] = useState(false);

  useEffect(() => {
    return () => { if (samplePreviewUrl) URL.revokeObjectURL(samplePreviewUrl); };
  }, [samplePreviewUrl]);
  useEffect(() => {
    return () => { if (generatedArtwork) URL.revokeObjectURL(generatedArtwork.url); };
  }, [generatedArtwork]);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(path, {
      ...init, cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok || !data?.ok) {
      throw new ShopRequestError(typeof data?.error === 'string' ? data.error : `دریافت سفارش انجام نشد (${response.status}).`, response.status);
    }
    return data;
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), status, search });
    request(`/api/admin/shop/orders?${query}`).then((data) => {
      if (!active) return;
      setRows(data.orders as ShopOrderRow[]); setTotal(Number(data.total)); setError(''); setOrdersClosed(false);
    }).catch((cause: unknown) => {
      if (!active) return;
      if (cause instanceof ShopRequestError && cause.status === 404) {
        setOrdersClosed(true); setRows([]); setTotal(0); setError('');
      } else setError(cause instanceof Error ? cause.message : 'دریافت فهرست انجام نشد.');
    });
    return () => { active = false; };
  }, [request, page, status, search, refresh]);

  async function selectOrder(id: string) {
    setBusy(true); setError(''); setSuccess('');
    try {
      const data = await request(`/api/admin/shop/orders/${id}`);
      setDetail(data.order as ShopOrderDetail); setReason(''); setTrackingCode('');
      setUploadFile(null); setUploadLine(1); setGeneratedArtwork(null); setConfirmOrderMatch(false); setConfirmLabPrint(false);
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
      setGeneratedArtwork(null); setReason(''); setTrackingCode(''); setSuccess('وضعیت سفارش ثبت شد.');
      setRefresh((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ثبت تغییر انجام نشد.'); }
    finally { setBusy(false); }
  }

  async function downloadPrintBrief() {
    if (!detail || busy || !printHandoffStatuses.has(detail.status)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/admin/shop/orders/${detail.id}/print`, {
        headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || 'دریافت اطلاعات چاپ انجام نشد.');
      }
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `halleus-order-${detail.display_number}-design-handoff.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSuccess('بستهٔ خصوصی طراحی دریافت شد؛ آن را برای ساخت اثر به دستیار بده و فایل نهایی را بعداً دستی ثبت کن.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'دریافت فایل انجام نشد.'); }
    finally { setBusy(false); }
  }


  async function generateOrderArtwork() {
    if (!detail || busy || !['payment_verified', 'preparing'].includes(detail.status) ||
        !['p01', 'p02'].includes(detail.items[uploadLine - 1]?.productId ?? '')) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/shop/orders/' + detail.id + '/print/artwork', {
        method: 'POST', cache: 'no-store',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: uploadLine }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || 'ساخت طرح سفارش انجام نشد.');
      }
      if (!response.headers.get('content-type')?.includes('image/jpeg')) {
        throw new Error('خروجی تصویری معتبر نیست.');
      }
      const blob = await response.blob();
      if (blob.size < 1024 || blob.size > 8 * 1024 * 1024) {
        throw new Error('حجم فایل تولیدشده با محدودیت آرشیو تطابق ندارد.');
      }
      setGeneratedArtwork({ line: uploadLine, blob, url: URL.createObjectURL(blob) });
      setUploadFile(null); setConfirmOrderMatch(false); setConfirmLabPrint(false);
      setSuccess('طرح همین سفارش تولید شد. تاریخ، نام، پیام و اندازه را قبل از ثبت نهایی بررسی کن.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ساخت طرح سفارش ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadFinalPrint() {
    const chosenArtwork = generatedArtwork?.line === uploadLine ? generatedArtwork.blob : uploadFile;
    if (!detail || busy || !['payment_verified', 'preparing'].includes(detail.status) ||
        !['p01', 'p02'].includes(detail.items[uploadLine - 1]?.productId ?? '') ||
        !chosenArtwork || !confirmOrderMatch || !confirmLabPrint) return;
    if (chosenArtwork.size > 8 * 1024 * 1024 || chosenArtwork.size < 1024 ||
        chosenArtwork.type !== 'image/jpeg') {
      setError('فایل باید JPG معتبر و کوچک‌تر از ۸ مگابایت باشد.'); return;
    }
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/admin/shop/orders/${detail.id}/print?line=${uploadLine}`, {
        method: 'POST', cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg',
          'X-Halleus-Artwork-Matches-Order': 'confirmed',
          'X-Halleus-Print-Lab-Approved': 'confirmed',
        },
        body: chosenArtwork,
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; error?: string; idempotent?: boolean } | null;
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || `فایل چاپ ثبت نشد (${response.status}).`);
      }
      setUploadFile(null); setGeneratedArtwork(null); setConfirmOrderMatch(false); setConfirmLabPrint(false);
      setSuccess(result.idempotent ? 'این فایل قبلاً ثبت شده بود و بدون تغییر تأیید شد.' : 'فایل نهایی این ردیف در آرشیو خصوصی ثبت شد.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ثبت فایل چاپ انجام نشد.'); }
    finally { setBusy(false); }
  }

  async function downloadSampleZip() {
    if (sampleBusy) return;
    setSampleBusy(true); setSampleError(''); setSampleFeedback('');
    try {
      const response = await fetch('/api/admin/shop/design-sample', {
        method: 'POST', cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendar: sampleCalendar, date: sampleDate.trim(), names: sampleNames.trim(), message: sampleMessage.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || `دریافت ZIP نمونه ممکن نشد (${response.status}).`);
      }
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url; link.download = 'halleus-p01-synthetic-design-data.zip';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSampleFeedback('ZIP اطلاعات نمونه دانلود شد؛ آن را برای طراحی دستی به دستیار بفرست. هیچ تصویری در پنل ساخته نشده است.');
    } catch (cause) { setSampleError(cause instanceof Error ? cause.message : 'دریافت نمونه انجام نشد.'); }
    finally { setSampleBusy(false); }
  }

  async function downloadSampleArtwork(mode: 'preview' | 'download') {
    if (sampleBusy) return;
    setSampleBusy(true); setSampleError(''); setSampleFeedback('');
    try {
      const response = await fetch('/api/admin/shop/design-sample/artwork', {
        method: 'POST', cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendar: sampleCalendar, date: sampleDate.trim(), names: sampleNames.trim(),
          message: sampleMessage.trim(), city: sampleCity.trim(), size: sampleSize,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || `ساخت نمونهٔ تصویری ممکن نشد (${response.status}).`);
      }
      if (!response.headers.get('content-type')?.includes('image/jpeg')) {
        throw new Error('پاسخ تصویر معتبر نبود.');
      }
      const image = await response.blob();
      if (mode === 'preview') {
        setSamplePreviewUrl(URL.createObjectURL(image));
        setSampleFeedback('پیش‌نمایش اختصاصی ساخته شد؛ هنوز تأیید چاپخانه ندارد.');
      } else {
        const url = URL.createObjectURL(image);
        const link = document.createElement('a');
        link.href = url;
        link.download = `halleus-p01-r9b-owner-sample-${sampleSize}.jpg`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSampleFeedback('فایل JPG چاپی نمونه دانلود شد؛ پیش از چاپ فیزیکی بررسی شود.');
      }
    } catch (cause) {
      setSampleError(cause instanceof Error ? cause.message : 'ساخت فایل تصویری انجام نشد.');
    } finally { setSampleBusy(false); }
  }

  async function copyManualStatusNotice() {
    if (!detail || busy) return;
    const message = buildShopManualCustomerNotice({
      orderNumber: detail.display_number, status: detail.status,
      carrier: detail.carrier, trackingCode: detail.tracking_code,
    });
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setSuccess('متن پیام کپی شد؛ ارسال نشده است. گیرنده و کانال مورد تأیید را خودت بررسی و پیام را دستی ارسال کن.');
    } catch {
      setError('کپی پیام ممکن نشد. ارسال خودکاری انجام نشده است.');
    }
  }

  function doSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPage(1); setSearch(searchDraft.trim());
  }

  return <div className={styles.workspace} dir="rtl">
    <header className={styles.pageIntro}>
      <div>
        <span className={styles.eyebrow}>HALLEUS / ORDERS</span>
        <h2>مدیریت سفارش‌ها</h2>
        <p>از بررسی واریز تا ساخت اثر اختصاصی و تحویل به شرکت حمل.</p>
      </div>
      <div className={styles.orderCount}><strong>{formatNumber(total)}</strong><span>سفارش در فیلتر فعلی</span></div>
    </header>
    {ordersClosed ? <p className={styles.printNote}>دریافت سفارش‌ها تا زمان بازشدن فروشگاه غیرفعال است؛ بخش نمونه‌سازی بالا مستقل و قابل استفاده است.</p> : null}
    {!ordersClosed && !detail ? <>
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
          <td className={styles.orderId}><bdi dir="ltr">{formatShopOrderNumber(row.display_number)}</bdi></td><td>{row.recipient_name}</td>
          <td>{formatNumber(row.total_toman)} تومان</td><td><span className={styles.statusPill} data-status={row.status}>{labels[row.status] ?? row.status}</span></td>
          <td>{new Date(row.created_at).toLocaleDateString('fa-IR')}</td>
          <td><button type="button" disabled={busy} onClick={() => void selectOrder(row.id)}>مشاهدهٔ سفارش ←</button></td>
        </tr>)}</tbody>
      </table>
      {!rows.length ? <p>سفارشی با این مشخصات پیدا نشد.</p> : null}
    </div>
    <div className={styles.pagination}>
      <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>صفحه قبل</button>
      <span>صفحه {formatNumber(page)} · {formatNumber(total)} سفارش</span>
      <button type="button" disabled={page * 25 >= total} onClick={() => setPage((value) => value + 1)}>صفحه بعد</button>
    </div>
    </> : null}
    {detail ? <section className={styles.detail}>
      <div className={styles.heading}>
        <div><span className={styles.eyebrow}>پروندهٔ سفارش</span><h3>سفارش <bdi dir="ltr">{formatShopOrderNumber(detail.display_number)}</bdi></h3>
          <span className={styles.statusPill} data-status={detail.status}>{labels[detail.status] ?? detail.status}</span>
        </div>
        <button type="button" onClick={() => setDetail(null)}>← بازگشت به سفارش‌ها</button>
      </div>
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
      {['payment_verified', 'preparing'].includes(detail.status) ? <section className={styles.production} aria-labelledby="shop-production-title">
        <div className={styles.productionHeader}>
          <span className={styles.eyebrow}>ساخت اثر / مرحلهٔ چاپ</span>
          <h4 id="shop-production-title">طرح «{productNames[detail.items[uploadLine - 1]?.productId ?? ''] ?? 'اثر'}» همین سفارش</h4>
          <p>همان مستر R9b با تاریخ، نام، پیام و اندازهٔ سفارش ساخته می‌شود. فایل ابتدا فقط برای بازبینی توست؛ بدون تأیید نهایی ذخیره نمی‌شود.</p>
        </div>
        <form className={styles.productionGrid} onSubmit={(event) => { event.preventDefault(); void uploadFinalPrint(); }}>
          <div className={styles.productionControls}>
            <label>ردیف سفارش
              <select value={uploadLine} disabled={busy} onChange={(event) => { setUploadLine(Number(event.target.value)); setGeneratedArtwork(null); setUploadFile(null); setConfirmOrderMatch(false); setConfirmLabPrint(false); }}>
                {detail.items.map((item, index) => <option key={item.key} value={index + 1}>{index + 1} · {productNames[item.productId] ?? item.productId} · {item.size}</option>)}
              </select>
            </label>
            <button className={styles.primaryAction} type="button" disabled={busy || !['p01', 'p02'].includes(detail.items[uploadLine - 1]?.productId ?? '')} onClick={() => void generateOrderArtwork()}>{busy ? 'در حال ساخت…' : 'ساخت طرح این سفارش'}</button>
            {generatedArtwork?.line === uploadLine ? <a className={styles.downloadAction} href={generatedArtwork.url} download={'halleus-order-' + detail.display_number + '-' + detail.items[uploadLine - 1]?.productId + '-line-' + uploadLine + '.jpg'}>دانلود JPG چاپی برای بررسی</a> : null}
            <details className={styles.alternativeUpload}>
              <summary>یا استفاده از فایل آمادهٔ دیگر</summary>
              <label>JPG جایگزین (حداکثر ۸ مگابایت)
                <input type="file" accept="image/jpeg,.jpg,.jpeg" disabled={busy} onChange={(event) => { setGeneratedArtwork(null); setUploadFile(event.currentTarget.files?.[0] ?? null); setConfirmOrderMatch(false); setConfirmLabPrint(false); }} />
              </label>
            </details>
            <label className={styles.confirm}><input type="checkbox" checked={confirmOrderMatch} onChange={(event) => setConfirmOrderMatch(event.target.checked)} /> تاریخ، نام، پیام و اندازه را با سفارش تطبیق داده‌ام.</label>
            <label className={styles.confirm}><input type="checkbox" checked={confirmLabPrint} onChange={(event) => setConfirmLabPrint(event.target.checked)} /> فایل را برای چاپ نهایی تأیید کرده‌ام.</label>
            <button className={styles.archiveAction} type="submit" disabled={busy || !(generatedArtwork?.line === uploadLine || uploadFile) || !confirmOrderMatch || !confirmLabPrint}>تأیید و ثبت در آرشیو خصوصی</button>
            <p className={styles.note}>همان JPG ساخته‌شده ذخیره می‌شود؛ نیازی به بارگذاری دوباره نیست. جایگزینی فایل ثبت‌شده بررسی جداگانه می‌خواهد.</p>
          </div>
          <div className={styles.productionPreview}>
            {generatedArtwork?.line === uploadLine ? <Image unoptimized src={generatedArtwork.url} width={360} height={540} alt="پیش‌نمایش اختصاصی فایل این سفارش" /> :
              <div className={styles.previewEmpty}><strong>پیش‌نمایش اثر</strong><span>برای نمایش اثر، «ساخت طرح این سفارش» را بزن.</span></div>}
          </div>
        </form>
        <details className={styles.secondaryTool}>
          <summary>اطلاعات نجومی و دستور طراحی (ZIP اختیاری)</summary>
          <button type="button" disabled={busy} onClick={() => void downloadPrintBrief()}>دریافت ZIP اطلاعات سفارش</button>
          <p>ابزار پشتیبان برای طراحی دستی است؛ فایل تصویر نیست.</p>
        </details>
      </section> : printHandoffStatuses.has(detail.status) ? <p className={styles.printNote}>این سفارش از مرحلهٔ طراحی عبور کرده؛ آماده‌سازی فایل چاپ دیگر فعال نیست.</p> : <p className={styles.printNote}>ساخت اثر اختصاصی بعد از تأیید دریافت وجه فعال می‌شود.</p>}
      {buildShopManualCustomerNotice({
        orderNumber: detail.display_number, status: detail.status,
        carrier: detail.carrier, trackingCode: detail.tracking_code,
      }) ? <div className={styles.printHandoff}>
        <button type="button" disabled={busy} onClick={() => void copyManualStatusNotice()}>کپی متن اطلاع‌رسانی وضعیت سفارش</button>
        <p>این فقط متن پیشنهادی است؛ پیامک یا اعلان خودکاری ارسال نمی‌شود. پیش از ارسال دستی، گیرنده و راه ارتباطی را تأیید کن.</p>
      </div> : null}
      <h4>سوابق سفارش</h4>
      <div className={styles.history}>{detail.events.map((event, index) => <p key={`${event.created_at}-${index}`}>{new Date(event.created_at).toLocaleString('fa-IR')} · {event.action} · {labels[event.after_status] ?? event.after_status}{event.reason ? ` · ${event.reason}` : ''}</p>)}</div>
      {actions[detail.status]?.length ? <div className={styles.actions}>
        <label>یادداشت تصمیم (اختیاری)<input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="توضیحات مربوط به این اقدام" /></label>
        {detail.status === 'preparing' ? <label>کد رهگیری مرسوله<input value={trackingCode} maxLength={100} onChange={(event) => setTrackingCode(event.target.value)} placeholder="کد پست یا تیپاکس" /></label> : null}
        <div>{actions[detail.status].map(({ action, label }) => <button key={action} type="button" disabled={busy} onClick={() => void runAction(action)}>{label}</button>)}</div>
        <small>تأیید پرداخت فقط پس از بررسی واقعی ورود وجه به حساب بانکی انجام شود.</small>
      </div> : null}
    </section> : null}
    <details className={styles.ownerTools}>
      <summary>ابزارهای مستقل نمونه‌سازی و بررسی کاتالوگ</summary>
      <div className={styles.ownerToolsBody}>
    <ShopCatalogReadiness />
    <section className={styles.sampleHandoff} aria-labelledby="shop-sample-heading">
      <h3 id="shop-sample-heading">نمونه‌سازی تابلوی ماه R9b</h3>
      <p>فقط برای مالک: در نمونهٔ R9b نام در سطر اول، تاریخ در سطر دوم و پیام اختیاری زیر آن نمایش داده می‌شود. روشنایی ماه همان نسخهٔ تأییدشده است؛ این نمونه به سفارش یا پرداخت متصل نیست و خودکار آرشیو نمی‌شود.</p>
      <form onSubmit={(event) => { event.preventDefault(); void downloadSampleArtwork('download'); }} className={styles.sampleForm}>
        <label>تقویم نمونه
          <select value={sampleCalendar} onChange={(event) => { setSampleCalendar(event.target.value as 'jalali' | 'gregorian'); setSampleDate(''); setSamplePreviewUrl(null); }}>
            <option value="jalali">شمسی</option><option value="gregorian">میلادی</option>
          </select>
        </label>
        <label>تاریخ نمونه
          <input required dir="ltr" maxLength={20} value={sampleDate} placeholder={sampleCalendar === 'jalali' ? '۱۴۰۳/۰۸/۱۵' : '2024-11-05'} onChange={(event) => { setSampleDate(event.target.value); setSamplePreviewUrl(null); }} />
        </label>
        <label>نام آزمایشی
          <input maxLength={60} value={sampleNames} onChange={(event) => { setSampleNames(event.target.value); setSamplePreviewUrl(null); }} />
        </label>
        <label>پیام آزمایشی (اختیاری)
          <input maxLength={60} value={sampleMessage} onChange={(event) => { setSampleMessage(event.target.value); setSamplePreviewUrl(null); }} />
        </label>
        <label>شهر روی تابلو (اختیاری)
          <input maxLength={100} value={sampleCity} onChange={(event) => { setSampleCity(event.target.value); setSamplePreviewUrl(null); }} />
        </label>
        <label>اندازهٔ چاپ
          <select value={sampleSize} onChange={(event) => { setSampleSize(event.target.value as '10x15' | '20x30' | '30x45'); setSamplePreviewUrl(null); }}>
            <option value="10x15">۱۰×۱۵ سانتی‌متر</option>
            <option value="20x30">۲۰×۳۰ سانتی‌متر</option>
            <option value="30x45">۳۰×۴۵ سانتی‌متر</option>
          </select>
        </label>
        <button type="button" disabled={sampleBusy} onClick={() => void downloadSampleArtwork('preview')}>نمایش پیش‌نمایش</button>
        <button type="submit" disabled={sampleBusy}>{sampleBusy ? 'در حال رندر…' : 'دانلود JPG چاپی'}</button>
        <button type="button" disabled={sampleBusy} onClick={() => void downloadSampleZip()}>دانلود ZIP اطلاعات (اختیاری)</button>
      </form>
      {samplePreviewUrl ? <div className={styles.samplePreview}>
        <Image unoptimized src={samplePreviewUrl} width={500} height={750} alt="پیش‌نمایش تابلوی شخصی‌سازی‌شدهٔ ماه" />
      </div> : null}
      {sampleError ? <p className={styles.error} role="alert">{sampleError}</p> : null}
      {sampleFeedback ? <p className={styles.success} role="status">{sampleFeedback}</p> : null}
    </section>
      </div>
    </details>
  </div>;
}
