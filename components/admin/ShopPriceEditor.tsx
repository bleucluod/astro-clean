'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './shop-price-editor.module.css';

type PriceRow = {
  productId: 'p01' | 'p02';
  size: '10x15' | '20x30' | '30x45';
  label: string;
  basePriceToman: number;
  priceToman: number;
  overridePriceToman: number | null;
  expiresAt: string | null;
  revision: number;
};
const productNames: Record<PriceRow['productId'], string> = {
  p01: 'ماه آن روز',
  p02: 'آسمان تولد',
};
const format = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
const durations = [
  { value: 0, label: 'دائمی، تا زمان بازگردانی' },
  { value: 15, label: '۱۵ دقیقه (آزمایشی)' },
  { value: 30, label: '۳۰ دقیقه (آزمایشی)' },
  { value: 60, label: '۱ ساعت (آزمایشی)' },
  { value: 120, label: '۲ ساعت (آزمایشی)' },
  { value: 240, label: '۴ ساعت (آزمایشی)' },
];

function parseRows(payload: unknown): PriceRow[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
    || (payload as Record<string, unknown>).ok !== true
    || !Array.isArray((payload as Record<string, unknown>).rows)) {
    throw new Error('پاسخ مدیریت قیمت معتبر نیست.');
  }
  const rows = (payload as { rows: PriceRow[] }).rows;
  if (rows.length !== 6 || rows.some(row =>
    !['p01', 'p02'].includes(row.productId)
    || !['10x15', '20x30', '30x45'].includes(row.size)
    || !Number.isInteger(row.priceToman) || row.priceToman < 1000
    || !Number.isInteger(row.basePriceToman) || row.basePriceToman < 1000
    || !Number.isInteger(row.revision) || row.revision < 0)) {
    throw new Error('اطلاعات قیمت فروشگاه ناقص است.');
  }
  return rows;
}

export function ShopPriceEditor({ accessToken }: { accessToken: string }) {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editKey, setEditKey] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRows = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/admin/shop/prices', {
      headers: { Authorization: 'Bearer ' + accessToken },
      cache: 'no-store', signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data && typeof data === 'object'
      && typeof (data as { error?: unknown }).error === 'string'
      ? (data as { error: string }).error : 'دریافت قیمت‌ها انجام نشد.');
    return parseRows(data);
  }, [accessToken]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchRows()); setError(''); }
    catch (cause) { setRows([]); setError(cause instanceof Error ? cause.message : 'دریافت قیمت‌ها انجام نشد.'); }
    finally { setLoading(false); }
  }, [fetchRows]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    fetchRows(controller.signal).then(next => {
      if (alive) { setRows(next); setError(''); setLoading(false); }
    }).catch(() => {
      if (alive) { setRows([]); setError('دریافت قیمت‌ها انجام نشد. دکمهٔ تازه‌سازی را بزن.'); setLoading(false); }
    });
    return () => { alive = false; controller.abort(); };
  }, [fetchRows]);

  function edit(row: PriceRow) {
    setEditKey(row.productId + ':' + row.size);
    setDraftPrice(String(row.priceToman));
    setMinutes(row.expiresAt ? 60 : 0);
    setError(''); setSuccess('');
  }

  async function apply(row: PriceRow, action: 'set' | 'reset') {
    if (busy) return;
    const price = Number(draftPrice);
    if (action === 'set' && (!/^\d{4,8}$/.test(draftPrice)
      || !Number.isSafeInteger(price) || price < 1000 || price > 10_000_000)) {
      setError('قیمت باید بین ۱٬۰۰۰ تا ۱۰٬۰۰۰٬۰۰۰ تومان باشد.');
      return;
    }
    const sentence = action === 'reset'
      ? 'قیمت این اندازه به مقدار اصلی برگردد؟'
      : `قیمت «${productNames[row.productId]}» اندازهٔ ${row.label} به ${format(price)} تومان ${minutes === 0 ? 'به‌صورت دائمی' : 'با انقضای خودکار'} تغییر کند؟ این قیمت برای همهٔ خریداران فعال می‌شود.`;
    if (!window.confirm(sentence)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/shop/prices', {
        method: 'PATCH', cache: 'no-store',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: row.productId, size: row.size, expectedRevision: row.revision,
          action, ...(action === 'set' ? { priceToman: price, expiresInMinutes: minutes } : {}),
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data && typeof data === 'object'
        && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error : 'ذخیرهٔ قیمت انجام نشد.');
      setRows(parseRows(data));
      setEditKey('');
      setSuccess(action === 'set'
        ? 'قیمت جدید ذخیره شد؛ سفارش‌های قبلی تغییری نکردند.'
        : 'قیمت اصلی بازگردانده شد.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'عملیات انجام نشد.');
      try { setRows(await fetchRows()); } catch { setRows([]); }
    } finally { setBusy(false); }
  }

  const groups: PriceRow['productId'][] = ['p01', 'p02'];
  return <section className={styles.root} aria-labelledby="shop-price-admin-heading">
    <header className={styles.header}>
      <div>
        <h3 id="shop-price-admin-heading">مدیریت قیمت محصولات</h3>
        <p>قیمت هر اندازه را بدون تغییر کد یا انتشار مجدد تنظیم کن. قیمت آزمایشی سر ساعت تعیین‌شده خودکار منقضی می‌شود.</p>
      </div>
      <button type="button" disabled={busy || loading} onClick={() => void refresh()}>تازه‌سازی</button>
    </header>
    <p className={styles.notice}>این تغییر بلافاصله برای همهٔ مشتری‌ها اعمال می‌شود؛ مبلغ سفارش‌های ثبت‌شده ثابت می‌ماند. هزینهٔ ارسال و بسته‌بندی جداگانه به مبلغ اضافه می‌شود.</p>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {success ? <p className={styles.success} role="status">{success}</p> : null}
    {loading ? <p>در حال دریافت قیمت‌های فعلی…</p> : null}
    {groups.map(id => <section className={styles.group} key={id} aria-label={productNames[id]}>
      <h4>{productNames[id]}</h4>
      {rows.filter(row => row.productId === id).map(row => {
        const key = row.productId + ':' + row.size;
        const open = editKey === key;
        return <div className={styles.line} key={key}>
          <div className={styles.rowHeading}>
            <strong>{row.label} سانتی‌متر</strong>
            <span>قیمت فعلی: <bdi>{format(row.priceToman)}</bdi> تومان</span>
            {row.overridePriceToman === null
              ? <small>قیمت اصلی</small>
              : <small>قیمت اصلی {format(row.basePriceToman)} تومان
                {row.expiresAt ? ` · انقضا: ${new Date(row.expiresAt).toLocaleString('fa-IR')}` : ' · بدون انقضا'}
              </small>}
          </div>
          {open ? <div className={styles.editor}>
            <label>قیمت جدید (تومان)
              <input type="number" dir="ltr" inputMode="numeric" min={1000} max={10000000} step={1000}
                value={draftPrice} disabled={busy} onChange={event => setDraftPrice(event.target.value)} />
            </label>
            <label>مدت اعتبار
              <select value={minutes} disabled={busy} onChange={event => setMinutes(Number(event.target.value))}>
                {durations.map(duration => <option value={duration.value} key={duration.value}>{duration.label}</option>)}
              </select>
            </label>
            <p>پیش‌نمایش: {Number.isFinite(Number(draftPrice)) ? format(Number(draftPrice)) : '—'} تومان
              {' '}+ بسته‌بندی/ارسال (تیپاکس ۵۰ هزار، پست ۱۰۰ هزار تومان)</p>
            <div className={styles.actions}>
              <button disabled={busy} type="button" onClick={() => void apply(row, 'set')}>ذخیرهٔ قیمت</button>
              <button disabled={busy} type="button" onClick={() => { setEditKey(''); setError(''); }}>انصراف</button>
              {row.revision > 0 ? <button disabled={busy} type="button"
                onClick={() => void apply(row, 'reset')}>بازگردانی قیمت اصلی</button> : null}
            </div>
          </div> : <button type="button" disabled={busy || loading || rows.length !== 6}
            onClick={() => edit(row)}>ویرایش قیمت</button>}
        </div>;
      })}
    </section>)}
  </section>;
}
