'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { getShopProduct } from './product-detail-data';
import { liveShopPrice, useShopLivePrices } from './use-shop-live-prices';
import type { ShopPriceMap } from '@/lib/shop/shop-price-store';
import { getShopProductUrl } from '@/lib/shop/shop-product-url';
import { fetchShopQuote } from './shop-quote-client';
import type { ShopQuote } from '@/lib/shop/shop-quote';
import {
  cancelShopOrder, clearLegacyShopOrderIntent, createShopOrderRequest, fetchShopOrder, readShopOrderReceipt,
  submitShopTransfer, fetchShopOrderWithMobile, startShopBitPayPayment,
  type ShopOrderReceipt,
} from './shop-order-client';
import type { ShopOrderPublicState } from '@/lib/shop/shop-order-store';
import { formatShopOrderNumber } from '@/lib/shop/shop-order-number';
import {
  blankShipping, clearCheckoutSession, englishDigits, normalizeMobileTail,
  SHOP_SHIPPING_AND_PACKAGING, validateShipping,
  type ShippingForm, type ShopCarrier,
} from './shop-checkout-state';
import {
  getShopSize, readShopCart, writeShopCart, SHOP_CART_CHANGED_EVENT,
  type ShopCartItem,
} from './shop-cart';
import styles from './shop-checkout.module.css';

const customerStatus: Record<ShopOrderPublicState['status'], string> = {
  awaiting_transfer: 'در انتظار واریز', transfer_declared: 'در انتظار بررسی واریز',
  payment_verified: 'پرداخت تأیید شد', payment_rejected: 'نیاز به بررسی مجدد پرداخت',
  preparing: 'در حال آماده‌سازی', shipped: 'تحویل شرکت حمل شد', delivered: 'تحویل داده شد',
  cancel_requested: 'درخواست لغو در حال بررسی', canceled: 'لغوشده',
};

const steps = [
  { href: '/shop/cart', label: 'سبد خرید' },
  { href: '/shop/checkout', label: 'اطلاعات ارسال' },
  { href: '/shop/payment', label: 'پرداخت' },
] as const;

const provinces = [
  'آذربایجان شرقی', 'آذربایجان غربی', 'اردبیل', 'اصفهان', 'البرز', 'ایلام', 'بوشهر',
  'تهران', 'چهارمحال و بختیاری', 'خراسان جنوبی', 'خراسان رضوی', 'خراسان شمالی',
  'خوزستان', 'زنجان', 'سمنان', 'سیستان و بلوچستان', 'فارس', 'قزوین', 'قم', 'کردستان',
  'کرمان', 'کرمانشاه', 'کهگیلویه و بویراحمد', 'گلستان', 'گیلان', 'لرستان', 'مازندران',
  'مرکزی', 'هرمزگان', 'همدان', 'یزد',
];

function money(amount: number) { return new Intl.NumberFormat('fa-IR').format(amount); }

function useShopCart() {
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => { setItems(readShopCart()); setReady(true); };
    sync();
    window.addEventListener(SHOP_CART_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SHOP_CART_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return { items, ready, save: (next: ShopCartItem[]) => writeShopCart(next) };
}

function PageShell({ step, title, subtitle, children }: { step: number; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className={styles.shopFlow} dir="rtl" data-shop-page={steps[step].label}>
      <div className={styles.container}>
        <nav className={styles.steps} aria-label="مراحل خرید">
          {steps.map((item, index) => {
            const className = `${styles.step} ${index === step ? styles.activeStep : ''} ${index < step ? styles.pastStep : ''}`;
            const content = <><span className={styles.stepNumber}>{index < step ? '✓' : money(index + 1)}</span><span>{item.label}</span></>;
            return index < step
              ? <Link key={item.href} className={`${className} ${styles.stepLink}`} href={item.href} aria-label={`بازگشت به ${item.label}`}>{content}</Link>
              : <span key={item.href} className={className} aria-current={index === step ? 'step' : undefined}>{content}</span>;
          })}
        </nav>
        <div className={styles.titleBlock}><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
        {children}
        <p className={styles.deliveryPromise}>تحویل به پست یا تیپاکس نهایتا تا ۳ روز کاری پس از تأیید پرداخت؛ همراه با کد رهگیری.</p>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className={styles.empty}>
      <span className={styles.emptySymbol} aria-hidden="true">✦</span>
      <h2>سبدت هنوز خالیه</h2>
      <p>یک لحظه از آسمان رو انتخاب کن؛ از همون‌جا می‌تونی تابلو رو شخصی‌سازی و به سبد اضافه کنی.</p>
      <Link className={styles.primaryAction} href="/shop"><span>دیدن آثار فروشگاه</span><span aria-hidden="true">←</span></Link>
    </div>
  );
}

function CartLine({ item, prices, onQuantity, onRemove }: { item: ShopCartItem; prices: ShopPriceMap | null; onQuantity: (quantity: number) => void; onRemove: () => void }) {
  const product = getShopProduct(item.productId);
  const size = getShopSize(item.size);
  const unitPrice = liveShopPrice(prices, item.productId, item.size);
  return (
    <article className={styles.itemCard}>
      <div className={styles.itemTop}>
        <Link className={styles.itemImage} href={getShopProductUrl(item.productId)} aria-label={`مشاهدهٔ ${product.title}`}>
          <Image src={product.gallery[0].src} alt={product.gallery[0].alt} fill sizes="(max-width: 640px) 108px, 142px" />
        </Link>
        <div className={styles.itemInfo}>
          <h2>{product.title}</h2>
          <p>{size.label} سانتی‌متر · چاپ مات روی شاسی</p>
          <strong>{unitPrice === null ? 'در حال دریافت قیمت…' : <><bdi>{money(unitPrice)}</bdi> تومان</>}</strong>
        </div>
      </div>
      <div className={styles.itemDetails}>
        {item.details.date ? <span>تاریخ: <bdi>{item.details.date}</bdi> ({item.details.calendar === 'jalali' ? 'شمسی' : 'میلادی'})</span> : null}
        {item.details.time ? <span>ساعت: <bdi>{item.details.time}</bdi></span> : null}
        {item.details.city ? <span>شهر: {item.details.city}</span> : null}
        {item.details.names ? <span>نام: {item.details.names}</span> : null}
        {item.details.message ? <span>پیام: {item.details.message}</span> : null}
      </div>
      <div className={styles.itemActions}>
        <div className={styles.quantity} aria-label={`تعداد ${product.title}`}>
          <button type="button" onClick={() => onQuantity(item.quantity - 1)} disabled={item.quantity <= 1} aria-label="کاهش تعداد">−</button>
          <output aria-live="polite">{money(item.quantity)}</output>
          <button type="button" onClick={() => onQuantity(item.quantity + 1)} disabled={item.quantity >= 10} aria-label="افزایش تعداد">+</button>
        </div>
        <Link href={`${getShopProductUrl(item.productId)}?edit=${encodeURIComponent(item.key)}#personalize`}>ویرایش مشخصات</Link>
        <button type="button" className={styles.remove} onClick={onRemove}>حذف</button>
      </div>
      {item.quantity > 1 && unitPrice !== null ? <p className={styles.lineTotal}>جمع این اثر: <bdi>{money(unitPrice * item.quantity)}</bdi> تومان</p> : null}
    </article>
  );
}

function Summary({ items, prices, next, carrier, quote }: { items: ShopCartItem[]; prices: ShopPriceMap | null; next?: 'checkout'; carrier?: ShopCarrier; quote?: ShopQuote | null }) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = quote?.subtotal ?? (prices === null ? null
    : items.reduce((sum, item) => sum + (liveShopPrice(prices, item.productId, item.size) ?? 0) * item.quantity, 0));
  const shipping = quote?.shippingAndPackaging ?? (carrier ? SHOP_SHIPPING_AND_PACKAGING[carrier] : null);
  return (
    <aside className={styles.summary} aria-label="خلاصهٔ خرید">
      <h2>خلاصهٔ سفارش</h2>
      <div className={styles.summaryRow}><span>محصولات ({money(count)})</span><strong>{subtotal === null ? 'در حال دریافت…' : <><bdi>{money(subtotal)}</bdi> تومان</>}</strong></div>
      {carrier ? <div className={styles.summaryRow}><span>روش ارسال</span><strong>{carrier === 'post' ? 'پست' : 'تیپاکس · پس‌کرایه'}</strong></div> : null}
      <div className={styles.summaryRow}><span>هزینه ارسال و بسته‌بندی</span>{shipping === null ? <span className={styles.pending}>در مرحلهٔ بعد</span> : <strong><bdi>{money(shipping)}</bdi> تومان</strong>}</div>
      <div className={styles.summaryTotal}><span>{shipping === null ? 'جمع محصولات' : 'مبلغ قابل واریز'}</span><strong>{subtotal === null ? 'در حال دریافت…' : <><bdi>{money(subtotal + (shipping ?? 0))}</bdi> تومان</>}</strong></div>
      {carrier === 'tipax' ? <p className={styles.summaryHint}>هزینهٔ حمل تیپاکس هنگام تحویل بسته به‌صورت پس‌کرایه پرداخت می‌شود؛ مبلغ بالا شامل ۵۰ هزار تومان بسته‌بندی است.</p> : null}
      {next === 'checkout' && prices !== null ? <Link className={styles.primaryAction} href="/shop/checkout"><span>ادامه و ثبت نشانی</span><span aria-hidden="true">←</span></Link> : null}
    </aside>
  );
}

export function ShopCartScreen() {
  const { items, ready, save } = useShopCart();
  const livePrices = useShopLivePrices();
  const [error, setError] = useState('');
  function change(itemsNext: ShopCartItem[]) {
    if (!save(itemsNext)) setError('ذخیرهٔ سبد در این مرورگر ممکن نشد. فضای ذخیره‌سازی را بررسی کن.');
    else setError('');
  }
  return (
    <PageShell step={0} title="سبد خرید تو" subtitle="این‌ها لحظه‌هایی هستن که برای موندن انتخاب کردی.">
      {!ready ? <p className={styles.loading}>در حال خواندن سبد…</p> : items.length === 0 ? <EmptyCart /> : (
        <div className={styles.twoColumns}>
          <section className={styles.cartList} aria-label="آثار انتخاب‌شده">
            <div className={styles.sectionHeading}><h2>آثار انتخاب‌شده</h2><span>{money(items.length)} مدل</span></div>
            {items.map((item) => <CartLine key={item.key} item={item} prices={livePrices.prices} onQuantity={(quantity) => change(items.map((line) => line.key === item.key ? { ...line, quantity } : line))} onRemove={() => change(items.filter((line) => line.key !== item.key))} />)}
            {error ? <p role="alert" className={styles.error}>{error}</p> : null}
            <Link className={styles.textLink} href="/shop">+ افزودن اثر دیگری به سبد</Link>
          </section>
          <Summary items={items} prices={livePrices.prices} next="checkout" />
        </div>
      )}
    </PageShell>
  );
}

export function ShopCheckoutScreen() {
  const router = useRouter();
  const livePrices = useShopLivePrices();
  const { items, ready } = useShopCart();
  const [form, setForm] = useState<ShippingForm>(blankShipping);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [quote, setQuote] = useState<ShopQuote | null>(null);
  const [quotedCart, setQuotedCart] = useState('');
  const [pendingCart, setPendingCart] = useState('');
  const [checkingQuote, setCheckingQuote] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const quoteRequest = useRef(0);
  const cartKey = JSON.stringify(items);
  const activeQuote = quotedCart === cartKey ? quote : null;
  const activeChecking = checkingQuote && pendingCart === cartKey;
  useEffect(() => { clearCheckoutSession(); clearLegacyShopOrderIntent(); }, []);
  useEffect(() => { quoteRequest.current += 1; }, [items]);
  function update<K extends keyof ShippingForm>(field: K, value: ShippingForm[K]) {
    quoteRequest.current += 1;
    setForm((old) => ({ ...old, [field]: value })); setError(''); setSubmitted(false);
    setQuote(null); setQuotedCart(''); setCheckingQuote(false);
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!livePrices.prices) { setError('دریافت قیمت زنده ممکن نیست؛ دوباره تلاش کن.'); return; }
    const issue = validateShipping(form);
    if (issue) { setError(issue); return; }
    const requestId = ++quoteRequest.current;
    setCheckingQuote(true);
    setPendingCart(cartKey);
    setError('');
    setQuote(null);
    setSubmitted(false);
    try {
      const verified = await fetchShopQuote(items, form.carrier);
      if (requestId !== quoteRequest.current) return;
      setQuote(verified);
      setQuotedCart(cartKey);
      setSubmitted(true);
    } catch (error) {
      if (requestId !== quoteRequest.current) return;
      setError(error instanceof Error ? error.message : 'محاسبهٔ مبلغ انجام نشد. دوباره تلاش کن.');
    } finally {
      if (requestId === quoteRequest.current) setCheckingQuote(false);
    }
  }
  async function continueToPayment() {
    if (!activeQuote || activeQuote.carrier !== form.carrier || creatingOrder) return;
    if (validateShipping(form)) { setError('اطلاعات تحویل را دوباره بررسی کن.'); return; }
    setCreatingOrder(true);
    setError('');
    try {
      await createShopOrderRequest(items, form, activeQuote.total);
      router.push('/shop/payment');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت سفارش انجام نشد. دوباره تلاش کن.');
      setCreatingOrder(false);
    }
  }
  return (
    <PageShell step={1} title="آدرسِ رسیدن به تو">
      {!ready ? <p className={styles.loading}>در حال خواندن سبد…</p> : items.length === 0 ? <EmptyCart /> : (
        <div className={styles.twoColumns}>
          <form id="shipping-form" className={styles.checkoutForm} onSubmit={review}>
            <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>۱. مشخصات گیرنده</h2></div>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>نام و نام خانوادگی گیرنده<input autoComplete="name" required maxLength={100} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="نام گیرنده" /></label>
                <label className={styles.field}>شمارهٔ موبایل<span className={styles.phoneControl} dir="ltr"><span className={styles.phonePrefix}>+98</span><input autoComplete="tel-national" inputMode="numeric" dir="ltr" required maxLength={10} value={form.mobile} onChange={(event) => update('mobile', normalizeMobileTail(event.target.value))} placeholder="۹۱۲۳۴۵۶۷۸۹" aria-label="شماره موبایل پس از کد +۹۸" /></span></label>
              </div>
              <p className={styles.fieldNote}>این شماره برای هماهنگی تحویل سفارشت ثبت می‌شود.</p>
            </section>
            <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>۲. نشانی تحویل</h2></div>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>استان<select required value={form.province} onChange={(event) => update('province', event.target.value)}><option value="">انتخاب استان</option>{provinces.map((province) => <option key={province} value={province}>{province}</option>)}</select></label>
                <label className={styles.field}>شهر<input autoComplete="address-level2" required maxLength={70} value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="نام شهر" /></label>
              </div>
              <label className={styles.field}>نشانی کامل<textarea autoComplete="street-address" rows={3} required minLength={10} maxLength={400} value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="محله، خیابان، کوچه، پلاک، واحد…" /></label>
              <label className={styles.field}>کد پستی ۱۰ رقمی<input autoComplete="postal-code" inputMode="numeric" dir="ltr" required maxLength={10} value={form.postalCode} onChange={(event) => update('postalCode', event.target.value)} placeholder="کد پستی" /></label>
              <label className={styles.field}>توضیحات تحویل <small>(اختیاری)</small><input maxLength={200} value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="مثلاً زنگ واحد یا زمان مناسب تحویل" /></label>
            </section>
            <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>۳. روش ارسال</h2></div>
              <div className={styles.shippingChoices}>
                <label className={`${styles.shippingChoice} ${form.carrier === 'post' ? styles.shippingSelected : ''}`}><input type="radio" name="carrier" value="post" checked={form.carrier === 'post'} onChange={() => update('carrier', 'post')} /><span className={styles.shippingLogo}><Image src="/shop-shipping/post.png" alt="نشان شرکت ملی پست" width={50} height={50} /></span><span className={styles.carrierText}><strong>پست</strong><small>پست پیشتاز</small></span><em><bdi>{money(100_000)}</bdi> تومان</em></label>
                <label className={`${styles.shippingChoice} ${form.carrier === 'tipax' ? styles.shippingSelected : ''}`}><input type="radio" name="carrier" value="tipax" checked={form.carrier === 'tipax'} onChange={() => update('carrier', 'tipax')} /><span className={styles.shippingLogo}><Image src="/shop-shipping/tipax.png" alt="نشان تیپاکس" width={62} height={35} /></span><span className={styles.carrierText}><strong>تیپاکس</strong><small>پس کرایه</small></span><em><bdi>{money(50_000)}</bdi> تومان بسته‌بندی</em></label>
              </div>
            </section>
            {error ? <p role="alert" className={styles.error}>{error}</p> : null}
            {submitted && activeQuote ? (
              <section className={styles.reviewCard} aria-label="مرور اطلاعات ارسال">
                <div className={styles.sectionHeading}><h2>همه‌چیز درسته؟</h2><span>مرور سفارش</span></div>
                <p>{form.name} · <bdi dir="ltr">+98{form.mobile}</bdi></p>
                <p>{form.province}، {form.city}، {form.address} · کد پستی <bdi>{englishDigits(form.postalCode)}</bdi></p>
                <div className={styles.reviewPrice}><span>مبلغ قابل واریز با هزینه ارسال و بسته‌بندی</span><strong><bdi>{money(activeQuote.total)}</bdi> تومان</strong></div>
                {form.carrier === 'tipax' ? <p>هزینهٔ حمل تیپاکس را هنگام تحویل بسته پرداخت می‌کنی.</p> : null}
                <button type="button" onClick={() => void continueToPayment()} disabled={creatingOrder} className={styles.primaryAction}><span>{creatingOrder ? 'در حال ثبت سفارش…' : 'تأیید و ادامه به پرداخت'}</span><span aria-hidden="true">←</span></button>
              </section>
            ) : <button type="submit" disabled={activeChecking} className={styles.primaryAction}><span>{activeChecking ? 'در حال بررسی…' : 'بررسی سفارش'}</span><span aria-hidden="true">←</span></button>}
          </form>
          <div className={styles.summaryColumn}><Summary items={items} prices={livePrices.prices} carrier={form.carrier} quote={activeQuote} /><Link className={styles.textLink} href="/shop/cart">→ بازگشت و ویرایش سبد</Link></div>
        </div>
      )}
    </PageShell>
  );
}

export function ShopPaymentScreen({ onlineEnabled = false }: { onlineEnabled?: boolean }) {
  const { save } = useShopCart();
  const [receipt, setReceipt] = useState<ShopOrderReceipt | null>(null);
  const [order, setOrder] = useState<ShopOrderPublicState | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [retry, setRetry] = useState(0);
  const [returnedPending, setReturnedPending] = useState(false);
  useEffect(() => {
    setReturnedPending(new URLSearchParams(window.location.search).get('bitpay') === 'pending');
    clearCheckoutSession();
    clearLegacyShopOrderIntent();
    const saved = readShopOrderReceipt();
    let active = true;
    if (!saved) {
      void Promise.resolve().then(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
    fetchShopOrder(saved).then((result) => {
      if (!active) return;
      setReceipt(saved); setOrder(result); setRequestError(''); setLoading(false);
      if (['payment_verified', 'preparing', 'shipped', 'delivered'].includes(result.status)) {
        writeShopCart([]); clearCheckoutSession();
      }
    }).catch((cause: unknown) => {
      if (!active) return;
      setRequestError(cause instanceof Error ? cause.message : 'سفارش دریافت نشد.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [retry]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [transferTime, setTransferTime] = useState('');
  const [copyState, setCopyState] = useState<'card' | 'iban' | ''>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [onlineStarting, setOnlineStarting] = useState(false);
  const [onlineError, setOnlineError] = useState('');
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false);
  async function goToBitPay() {
    if (!onlineEnabled || !receipt || !order || onlineStarting
        || !['awaiting_transfer', 'payment_rejected'].includes(order.status)) return;
    setOnlineStarting(true); setOnlineError('');
    try {
      const redirect = await startShopBitPayPayment(receipt);
      window.location.assign(redirect);
    } catch (cause) {
      setOnlineError(cause instanceof Error ? cause.message : 'امکان اتصال به درگاه نیست. وضعیت سفارش را بررسی کن.');
      setOnlineStarting(false);
    }
  }
  async function copyNumber(value: string, key: 'card' | 'iban') {
    try { await navigator.clipboard.writeText(value); setCopyState(key); }
    catch { setCopyState(''); setError('کپی انجام نشد. شماره را انتخاب و کپی کن.'); }
  }
  async function declareTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receipt || !order || submitting) return;
    if (!englishDigits(trackingNumber).trim() && !transferTime) {
      setError('شمارهٔ پیگیری یا زمان تراکنش را وارد کن.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      await submitShopTransfer(receipt, englishDigits(trackingNumber).trim(), transferTime);
      setOrder({ ...order, status: 'transfer_declared' });
      save([]); clearCheckoutSession();
      try { setOrder(await fetchShopOrder(receipt)); }
      catch { /* The server accepted the transfer; keep the locally confirmed state. */ }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'اعلام واریز انجام نشد. دوباره تلاش کن.');
    } finally { setSubmitting(false); }
  }
  return (
    <PageShell step={2} title="پرداخت و اعلام واریز">
      {loading ? <p className={styles.loading}>در حال دریافت سفارش…</p> : requestError ? (
        <div className={styles.empty}><h2>سفارش دریافت نشد</h2><p role="alert">{requestError}</p><button className={styles.primaryAction} type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>تلاش دوباره</button></div>
      ) : !receipt || !order ? (
        <div className={styles.empty}>
          <h2>اول سفارش رو ثبت کن</h2>
          <p>پس از تأیید نشانی، شمارهٔ سفارش و مبلغ نهایی ثبت می‌شود.</p>
          <Link href="/shop/checkout" className={styles.primaryAction}><span>تکمیل اطلاعات ارسال</span><span aria-hidden="true">←</span></Link>
        </div>
      ) : (
        <div className={styles.twoColumns}>
          <div className={styles.checkoutForm}>
            {order.status === 'awaiting_transfer' || order.status === 'payment_rejected' ? <>
            {onlineEnabled ? <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>پرداخت آنلاین</h2></div>
              <p className={styles.fieldNote}>پرداخت پس از تأیید مستقیم درگاه به همین سفارش متصل می‌شود.</p>
              {returnedPending || order.onlinePaymentPending ? <p className={styles.fieldNote} role="status">نتیجهٔ پرداخت قبلی هنوز قطعی نیست. اگر به درگاه رفتی، پیش از واریز دوباره وضعیت سفارش را بررسی کن.</p> : null}
              {onlineError ? <p role="alert" className={styles.error}>{onlineError}</p> : null}
              <button type="button" className={styles.primaryAction} disabled={onlineStarting}
                onClick={() => void goToBitPay()}><span>{onlineStarting ? 'در حال اتصال…' : order.onlinePaymentPending ? 'ادامهٔ پرداخت قبلی' : 'پرداخت آنلاین'}</span><span aria-hidden="true">←</span></button>
            </section> : null}
            {!order.onlinePaymentPending ? <>
            <button type="button" className={styles.paymentMethodToggle}
              aria-expanded={manualPaymentOpen} aria-controls="shop-manual-payment-details"
              onClick={() => setManualPaymentOpen((open) => !open)}>
              <span>پرداخت از طریق کارت‌به‌کارت</span>
              <span aria-hidden="true">{manualPaymentOpen ? '−' : '+'}</span>
            </button>
            <div id="shop-manual-payment-details" className={styles.manualPaymentDetails} hidden={!manualPaymentOpen}>
            <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>۱. اطلاعات کارت‌به‌کارت</h2><span>بانک سامان</span></div>
              <div className={styles.bankPanel}>
                <span>به نام شهریار قربانی · بانک سامان</span>
                <span>شمارهٔ کارت</span>
                <div className={styles.bankNumber}><strong dir="ltr">6219 8614 9547 2721</strong><button type="button" onClick={() => copyNumber('6219861495472721', 'card')} aria-label="کپی شماره کارت">{copyState === 'card' ? 'کپی شد ✓' : 'کپی شماره کارت'}</button></div>
                <span>شمارهٔ شبا</span>
                <div className={styles.bankNumber}><strong dir="ltr">IR840560611828015359847901</strong><button type="button" onClick={() => copyNumber('IR840560611828015359847901', 'iban')} aria-label="کپی شماره شبا">{copyState === 'iban' ? 'کپی شد ✓' : 'کپی شماره شبا'}</button></div>
              </div>
              <p className={styles.paymentDue}>مبلغ سفارش با هزینه ارسال و بسته‌بندی: <strong><bdi>{money(order.totalToman)}</bdi> تومان</strong></p>
              {order.carrier === 'tipax' ? <p className={styles.fieldNote}>هزینهٔ حمل تیپاکس هنگام تحویل بسته، جداگانه و به‌صورت پس کرایه پرداخت می‌شود.</p> : null}
            </section>
            <form className={styles.formCard} onSubmit={declareTransfer}>
              <div className={styles.sectionHeading}><h2>۲. اعلام واریز</h2></div>
              <p className={styles.fieldNote}>حداقل یکی از دو مورد زیر رو وارد کن.</p>
              <label className={styles.field}>شمارهٔ پیگیری تراکنش<input inputMode="numeric" maxLength={50} value={trackingNumber} onChange={(event) => { setTrackingNumber(event.target.value); setError(''); }} placeholder="شمارهٔ پیگیری واریز" /></label>
              <div className={styles.orDivider}>یا</div>
              <label className={styles.field}>زمان تراکنش<input type="time" value={transferTime} onChange={(event) => { setTransferTime(event.target.value); setError(''); }} /></label>
              {error ? <p role="alert" className={styles.error}>{error}</p> : null}
              <button className={styles.primaryAction} type="submit" disabled={submitting}><span>{submitting ? 'در حال ثبت…' : 'اعلام واریز'}</span><span aria-hidden="true">←</span></button>
            </form>
            </div>
            </> : <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>پرداخت در حال بررسی است</h2></div>
              <p className={styles.fieldNote}>برای جلوگیری از دریافت دوبارهٔ وجه، تا مشخص‌شدن نتیجهٔ پرداخت آنلاین، کارت‌به‌کارت و لغو فوری این سفارش موقتاً غیرفعال است.</p>
            </section>}
            </> : <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>وضعیت سفارش</h2><span>شمارهٔ {formatShopOrderNumber(order.orderNumber)}</span></div>
              <p>{order.status === 'transfer_declared' ? 'اعلام واریزت ثبت شد و منتظر بررسی پرداخت است.' : order.status === 'payment_verified' || order.status === 'preparing' ? 'پرداخت تأیید شده و سفارشت در حال آماده‌سازی است.' : order.status === 'shipped' ? 'سفارشت تحویل شرکت حمل شده است.' : order.status === 'delivered' ? 'سفارشت تحویل داده شده است.' : order.status === 'cancel_requested' ? 'درخواست لغو ثبت شده و در حال بررسی است.' : 'این سفارش لغو شده است.'}</p>
              {order.trackingCode ? <p>کد رهگیری ارسال: <bdi>{order.trackingCode}</bdi></p> : null}
            </section>}
          </div>
          <aside className={styles.summaryColumn}>
            <section className={styles.summary}>
              <h2>سفارش شمارهٔ <bdi>{formatShopOrderNumber(order.orderNumber)}</bdi></h2>
              <div className={styles.summaryRow}><span>تعداد محصولات</span><strong>{money(order.itemCount)}</strong></div>
              <div className={styles.summaryRow}><span>روش ارسال</span><strong>{order.carrier === 'post' ? 'پست پیشتاز' : 'تیپاکس'}</strong></div>
              <div className={styles.summaryTotal}>
                <span>{['payment_verified', 'preparing', 'shipped', 'delivered'].includes(order.status)
                  ? 'مبلغ پرداخت‌شده'
                  : ['awaiting_transfer', 'payment_rejected'].includes(order.status)
                    ? 'مبلغ قابل واریز' : 'مبلغ سفارش'}</span>
                <strong><bdi>{money(order.totalToman)}</bdi> تومان</strong>
              </div>
              <p className={styles.fieldNote}>برای پیگیری، همین شمارهٔ سفارش و موبایلی که ثبت کردی کافیه.</p>
            </section>
          </aside>
        </div>
      )}
    </PageShell>
  );
}

export function ShopOrderTrackScreen() {
  const [number, setNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [privateReceipt, setPrivateReceipt] = useState<ShopOrderReceipt | null>(null);
  const [hasPrivateAccess, setHasPrivateAccess] = useState(false);
  const [order, setOrder] = useState<ShopOrderPublicState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const saved = readShopOrderReceipt();
    if (saved) void Promise.resolve().then(() => {
      setPrivateReceipt(saved); setNumber(saved.orderNumber);
    });
  }, []);
  const normalizedNumber = englishDigits(number).trim().replace(/^#/, '');
  const canUsePrivateReceipt = Boolean(privateReceipt && privateReceipt.orderNumber === normalizedNumber);
  async function loadOrder(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setOrder(null);
    try {
      const saved = privateReceipt?.orderNumber === normalizedNumber ? privateReceipt : null;
      const result = saved
        ? await fetchShopOrder(saved)
        : await fetchShopOrderWithMobile(normalizedNumber, mobile);
      setHasPrivateAccess(Boolean(saved));
      setOrder(result);
    } catch (cause) {
      setHasPrivateAccess(false);
      setError(cause instanceof Error ? cause.message : 'سفارش پیدا نشد.');
    } finally { setBusy(false); }
  }
  async function requestCancel() {
    const saved = privateReceipt?.orderNumber === normalizedNumber ? privateReceipt : null;
    if (!order || !saved || busy || !window.confirm('برای لغو این سفارش مطمئنی؟')) return;
    setBusy(true); setError('');
    try {
      await cancelShopOrder(saved);
      setOrder(await fetchShopOrder(saved));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'درخواست لغو انجام نشد.');
    } finally { setBusy(false); }
  }
  return (
    <PageShell step={2} title="پیگیری سفارش" subtitle="بدون کد طولانی؛ با شمارهٔ سفارش و در صورت نیاز موبایل ثبت‌شده.">
      <div className={styles.trackLayout}>
        <form className={styles.formCard} onSubmit={(event) => void loadOrder(event)}>
          <div className={styles.sectionHeading}><h2>سفارشت کجاست؟</h2></div>
          <label className={styles.field}>شمارهٔ سفارش
            <input required inputMode="numeric" autoComplete="off" value={number}
              onChange={(event) => setNumber(englishDigits(event.target.value).replace(/[^\d#]/g, ''))}
              placeholder="مثلاً ۱۲۰۶" />
          </label>
          {!canUsePrivateReceipt ? <label className={styles.field}>موبایل ثبت‌شده هنگام خرید
            <input required inputMode="tel" autoComplete="tel" dir="ltr" value={mobile}
              onChange={(event) => setMobile(event.target.value)} placeholder="۰۹۱۲۱۲۳۴۵۶۷" />
            <small>برای حفظ حریم خصوصی، پیگیری از دستگاه جدید به موبایل ثبت‌شده نیاز داره.</small>
          </label> : <p className={styles.fieldNote}>سفارشت در همین مرورگر شناخته شده؛ نیازی به ورود کد نیست.</p>}
          <button type="submit" className={styles.primaryAction} disabled={busy}>
            <span>{busy ? 'در حال بررسی…' : 'مشاهدهٔ وضعیت سفارش'}</span><span aria-hidden="true">←</span>
          </button>
        </form>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        {order ? <section className={styles.formCard} aria-live="polite">
          <div className={styles.sectionHeading}><h2>سفارش <bdi dir="ltr">{formatShopOrderNumber(order.orderNumber)}</bdi></h2><span>{customerStatus[order.status]}</span></div>
          <p>تعداد محصولات: {money(order.itemCount)}</p>
          <p>مبلغ سفارش: <bdi>{money(order.totalToman)}</bdi> تومان</p>
          <p>روش ارسال: {order.carrier === 'post' ? 'پست پیشتاز' : 'تیپاکس'}</p>
          {order.trackingCode ? <p>کد رهگیری بسته: <bdi dir="ltr">{order.trackingCode}</bdi></p> : null}
          <div className={styles.trackHistory}>
            <h3>روند سفارش</h3>
            {order.events.map((event, index) => <p key={event.at + '-' + index}><span>{customerStatus[event.status as ShopOrderPublicState['status']] ?? 'به‌روزرسانی سفارش'}</span><time dateTime={event.at}>{new Date(event.at).toLocaleDateString('fa-IR')}</time></p>)}
          </div>
          {(order.status === 'awaiting_transfer' || order.status === 'payment_rejected') && hasPrivateAccess ? <Link className={styles.textLink} href="/shop/payment">بازگشت به پرداخت</Link> : null}
          {hasPrivateAccess && ['awaiting_transfer', 'payment_rejected', 'transfer_declared'].includes(order.status) ?
            <button type="button" className={styles.secondaryAction} disabled={busy} onClick={() => void requestCancel()}>{order.status === 'transfer_declared' ? 'درخواست لغو سفارش' : 'لغو سفارش'}</button> : null}
          {!hasPrivateAccess ? <p className={styles.fieldNote}>این مشاهده فقط‌خواندنی است. برای تغییر یا لغو سفارش با پشتیبانی تماس بگیر.</p> : null}
        </section> : null}
      </div>
    </PageShell>
  );
}
