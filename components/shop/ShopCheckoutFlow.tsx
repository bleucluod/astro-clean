'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { getShopProduct } from './product-detail-data';
import {
  getShopSize, readShopCart, shopCartSubtotal, writeShopCart, SHOP_CART_CHANGED_EVENT,
  type ShopCartItem,
} from './shop-cart';
import styles from './shop-checkout.module.css';

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

function PageShell({ step, title, subtitle, children }: { step: number; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className={styles.shopFlow} dir="rtl" data-shop-page={steps[step].label}>
      <div className={styles.container}>
        <header className={styles.flowHeader}>
          <Link className={styles.back} href={step === 0 ? '/shop' : steps[step - 1].href} aria-label="بازگشت به مرحلهٔ قبل">→</Link>
          <span className={styles.headerTitle}>فروشگاه هالیوس</span>
          <span className={styles.headerStep}>مرحلهٔ <bdi>{money(step + 1)}</bdi> از ۳</span>
        </header>
        <nav className={styles.steps} aria-label="مراحل خرید">
          {steps.map((item, index) => (
            <div key={item.href} className={`${styles.step} ${index === step ? styles.activeStep : ''} ${index < step ? styles.pastStep : ''}`} aria-current={index === step ? 'step' : undefined}>
              <span className={styles.stepNumber}>{index < step ? '✓' : money(index + 1)}</span><span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className={styles.titleBlock}><span className={styles.eyebrow}>HALLEUS / STUDIO</span><h1>{title}</h1><p>{subtitle}</p></div>
        {children}
        <p className={styles.deliveryPromise}>تحویل به پست یا تیپاکس تا ۷۲ ساعت کاری پس از تأیید پرداخت؛ همراه با کد رهگیری.</p>
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

function CartLine({ item, onQuantity, onRemove }: { item: ShopCartItem; onQuantity: (quantity: number) => void; onRemove: () => void }) {
  const product = getShopProduct(item.productId);
  const size = getShopSize(item.size);
  return (
    <article className={styles.itemCard}>
      <div className={styles.itemTop}>
        <Link className={styles.itemImage} href={`/shop/${item.productId}`} aria-label={`مشاهدهٔ ${product.title}`}>
          <Image src={product.gallery[0].src} alt={product.gallery[0].alt} fill sizes="(max-width: 640px) 108px, 142px" />
        </Link>
        <div className={styles.itemInfo}>
          <h2>{product.title}</h2>
          <p>{size.label} سانتی‌متر · چاپ مات روی شاسی</p>
          <strong><bdi>{money(size.price)}</bdi> تومان</strong>
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
        <Link href={`/shop/${item.productId}?edit=${encodeURIComponent(item.key)}#personalize`}>ویرایش مشخصات</Link>
        <button type="button" className={styles.remove} onClick={onRemove}>حذف</button>
      </div>
      {item.quantity > 1 ? <p className={styles.lineTotal}>جمع این اثر: <bdi>{money(size.price * item.quantity)}</bdi> تومان</p> : null}
    </article>
  );
}

function Summary({ items, next }: { items: ShopCartItem[]; next?: 'checkout' }) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <aside className={styles.summary} aria-label="خلاصهٔ خرید">
      <h2>خلاصهٔ سفارش</h2>
      <div className={styles.summaryRow}><span>محصولات ({money(count)})</span><strong><bdi>{money(shopCartSubtotal(items))}</bdi> تومان</strong></div>
      <div className={styles.summaryRow}><span>هزینهٔ ارسال</span><span className={styles.pending}>هنوز مشخص نشده</span></div>
      <div className={styles.summaryTotal}><span>مبلغ نهایی</span><strong>در انتظار محاسبهٔ ارسال</strong></div>
      <p className={styles.summaryHint}>مبلغ نهایی فقط پس از مشخص‌شدن هزینهٔ ارسال نمایش داده می‌شود. هیچ پرداختی در این پیش‌نمایش انجام نمی‌شود.</p>
      {next === 'checkout' ? <Link className={styles.primaryAction} href="/shop/checkout"><span>ادامه و ثبت نشانی</span><span aria-hidden="true">←</span></Link> : null}
      <span className={styles.reassurance}>بدون نیاز به ساخت حساب کاربری</span>
    </aside>
  );
}

export function ShopCartScreen() {
  const { items, ready, save } = useShopCart();
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
            {items.map((item) => <CartLine key={item.key} item={item} onQuantity={(quantity) => change(items.map((line) => line.key === item.key ? { ...line, quantity } : line))} onRemove={() => change(items.filter((line) => line.key !== item.key))} />)}
            {error ? <p role="alert" className={styles.error}>{error}</p> : null}
            <Link className={styles.textLink} href="/shop">+ افزودن اثر دیگری به سبد</Link>
          </section>
          <Summary items={items} next="checkout" />
        </div>
      )}
    </PageShell>
  );
}

type ShippingForm = { name: string; mobile: string; province: string; city: string; postalCode: string; address: string; note: string; carrier: 'post' | 'tipax' };
const blankShipping: ShippingForm = { name: '', mobile: '', province: '', city: '', postalCode: '', address: '', note: '', carrier: 'post' };
const englishDigits = (value: string) => value.replace(/[۰-۹٠-٩]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(digit) % 10));

export function ShopCheckoutScreen() {
  const { items, ready } = useShopCart();
  const [form, setForm] = useState<ShippingForm>(blankShipping);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  function update<K extends keyof ShippingForm>(field: K, value: ShippingForm[K]) { setForm((old) => ({ ...old, [field]: value })); setError(''); setSubmitted(false); }
  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^09\d{9}$/.test(englishDigits(form.mobile))) { setError('شمارهٔ موبایل باید ۱۱ رقم و با ۰۹ شروع شود.'); return; }
    if (!/^\d{10}$/.test(englishDigits(form.postalCode))) { setError('کد پستی باید دقیقاً ۱۰ رقم باشد.'); return; }
    if (!form.name.trim() || !form.province || !form.city.trim() || form.address.trim().length < 10) { setError('لطفاً نام گیرنده و نشانی کامل را وارد کن.'); return; }
    setSubmitted(true);
  }
  return (
    <PageShell step={1} title="آدرسِ رسیدن به تو" subtitle="اطلاعات گیرنده و روش ارسال رو همین‌جا، یک‌جا وارد کن.">
      {!ready ? <p className={styles.loading}>در حال خواندن سبد…</p> : items.length === 0 ? <EmptyCart /> : (
        <div className={styles.twoColumns}>
          <form id="shipping-form" className={styles.checkoutForm} onSubmit={preview}>
            <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>۱. مشخصات گیرنده</h2><span>بدون ثبت‌نام</span></div>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>نام و نام خانوادگی گیرنده<input autoComplete="name" required maxLength={100} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="نام گیرنده" /></label>
                <label className={styles.field}>شمارهٔ موبایل<input autoComplete="tel" inputMode="tel" dir="ltr" required maxLength={13} value={form.mobile} onChange={(event) => update('mobile', event.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" /></label>
              </div>
              <p className={styles.fieldNote}>پیگیری سفارش و کد رهگیری به این شماره اطلاع داده می‌شود.</p>
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
                <label className={`${styles.shippingChoice} ${form.carrier === 'post' ? styles.shippingSelected : ''}`}><input type="radio" name="carrier" checked={form.carrier === 'post'} onChange={() => update('carrier', 'post')} /><span><strong>پست</strong><small>تحویل با کد رهگیری</small></span><em>نرخ در انتظار تعیین</em></label>
                <label className={`${styles.shippingChoice} ${form.carrier === 'tipax' ? styles.shippingSelected : ''}`}><input type="radio" name="carrier" checked={form.carrier === 'tipax'} onChange={() => update('carrier', 'tipax')} /><span><strong>تیپاکس</strong><small>بسته به پوشش مقصد</small></span><em>نرخ در انتظار تعیین</em></label>
              </div>
              <p className={styles.fieldNote}>ارسال به شرکت حمل تا ۷۲ ساعت کاری پس از تأیید واریز؛ زمان رسیدن بسته به شهر مقصد بستگی دارد.</p>
            </section>
            {error ? <p role="alert" className={styles.error}>{error}</p> : null}
            {submitted ? <p className={styles.previewNotice} role="status">اطلاعات فرم از نظر ظاهری کامل است؛ اما ثبت سفارش و دریافت نشانی هنوز فعال نیست. اطلاعات واردشده به سرور ارسال یا در سبد ذخیره نشده‌اند.</p> : null}
            <button type="submit" className={styles.primaryAction}><span>بررسی اطلاعات و هزینهٔ ارسال</span><span aria-hidden="true">←</span></button>
            <p className={styles.lockNote}>تا زمانی که نرخ ارسال و ثبت سفارش سمت سرور آماده نباشند، ورود به پرداخت واقعی ممکن نیست.</p>
          </form>
          <div className={styles.summaryColumn}><Summary items={items} /><Link className={styles.textLink} href="/shop/cart">→ بازگشت و ویرایش سبد</Link><Link className={styles.subtlePreview} href="/shop/payment">دیدن پیش‌نمایش صفحهٔ پرداخت</Link></div>
        </div>
      )}
    </PageShell>
  );
}

export function ShopPaymentScreen() {
  const { items, ready } = useShopCart();
  return (
    <PageShell step={2} title="پرداخت و اعلام واریز" subtitle="پس از ثبت سفارش، مبلغ قطعی و اطلاعات واریز در این بخش نمایش داده می‌شود.">
      {!ready ? <p className={styles.loading}>در حال خواندن سبد…</p> : items.length === 0 ? <EmptyCart /> : (
        <div className={styles.twoColumns}>
          <div className={styles.checkoutForm}>
            <div className={styles.previewNotice}><strong>پیش‌نمایش صفحهٔ پرداخت</strong><p>هنوز هیچ سفارشی ثبت نشده و هیچ مبلغی برای پرداخت درخواست نمی‌شود.</p></div>
            <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>۱. اطلاعات کارت‌به‌کارت</h2><span>پس از ثبت سفارش</span></div>
              <div className={styles.bankPanel}>
                <span>شمارهٔ کارت مقصد</span><strong dir="ltr">•••• •••• •••• ••••</strong>
                <span>نام صاحب کارت و مبلغ قابل پرداخت پس از تعیین هزینهٔ ارسال نمایش داده می‌شوند.</span>
              </div>
              <p className={styles.fieldNote}>مبلغ را فقط پس از دریافت خلاصهٔ سفارش قطعی و مشخصات معتبر واریز کن.</p>
            </section>
            <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>۲. اعلام واریز</h2></div>
              <label className={styles.field}>شمارهٔ پیگیری تراکنش<input disabled placeholder="شمارهٔ پیگیری واریز" /></label>
              <label className={styles.field}>تصویر رسید <small>(اختیاری)</small><input disabled type="file" accept="image/png,image/jpeg,image/webp,application/pdf" /></label>
              <button className={styles.primaryAction} type="button" disabled><span>اعلام واریز</span><span aria-hidden="true">←</span></button>
              <p className={styles.lockNote}>اعلام واریز به‌معنای تأیید پرداخت نیست. پس از فعال‌شدن سامانه، سفارش برای بررسی مدیر در وضعیت «در انتظار بررسی واریز» قرار می‌گیرد.</p>
            </section>
          </div>
          <div className={styles.summaryColumn}><Summary items={items} /><Link className={styles.textLink} href="/shop/checkout">→ بازگشت به اطلاعات ارسال</Link></div>
        </div>
      )}
    </PageShell>
  );
}
