'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { getShopProduct } from './product-detail-data';
import {
  blankShipping, clearCheckoutSession, englishDigits, normalizeMobileTail,
  readCheckoutSession, saveCheckoutSession, SHOP_SHIPPING_AND_PACKAGING, validateShipping,
  type ShippingForm, type ShopCarrier,
} from './shop-checkout-state';
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

function Summary({ items, next, carrier }: { items: ShopCartItem[]; next?: 'checkout'; carrier?: ShopCarrier }) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = shopCartSubtotal(items);
  const shipping = carrier ? SHOP_SHIPPING_AND_PACKAGING[carrier] : null;
  return (
    <aside className={styles.summary} aria-label="خلاصهٔ خرید">
      <h2>خلاصهٔ سفارش</h2>
      <div className={styles.summaryRow}><span>محصولات ({money(count)})</span><strong><bdi>{money(subtotal)}</bdi> تومان</strong></div>
      {carrier ? <div className={styles.summaryRow}><span>روش ارسال</span><strong>{carrier === 'post' ? 'پست' : 'تیپاکس · پس‌کرایه'}</strong></div> : null}
      <div className={styles.summaryRow}><span>هزینه ارسال و بسته‌بندی</span>{shipping === null ? <span className={styles.pending}>در مرحلهٔ بعد</span> : <strong><bdi>{money(shipping)}</bdi> تومان</strong>}</div>
      <div className={styles.summaryTotal}><span>{shipping === null ? 'جمع محصولات' : 'مبلغ قابل واریز'}</span><strong><bdi>{money(subtotal + (shipping ?? 0))}</bdi> تومان</strong></div>
      {carrier === 'tipax' ? <p className={styles.summaryHint}>هزینهٔ حمل تیپاکس هنگام تحویل بسته به‌صورت پس‌کرایه پرداخت می‌شود؛ مبلغ بالا شامل ۵۰ هزار تومان بسته‌بندی است.</p> : null}
      {next === 'checkout' ? <Link className={styles.primaryAction} href="/shop/checkout"><span>ادامه و ثبت نشانی</span><span aria-hidden="true">←</span></Link> : null}
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

export function ShopCheckoutScreen() {
  const router = useRouter();
  const { items, ready } = useShopCart();
  const [form, setForm] = useState<ShippingForm>(() => readCheckoutSession(readShopCart()) ?? blankShipping);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  function update<K extends keyof ShippingForm>(field: K, value: ShippingForm[K]) {
    setForm((old) => ({ ...old, [field]: value })); setError(''); setSubmitted(false); clearCheckoutSession();
  }
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateShipping(form);
    if (issue) { setError(issue); return; }
    setSubmitted(true);
  }
  function continueToPayment() {
    if (!saveCheckoutSession(form, items)) { setError('اطلاعات ارسال ذخیره نشد؛ یک‌بار دیگر تلاش کن.'); return; }
    router.push('/shop/payment');
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
                <label className={`${styles.shippingChoice} ${form.carrier === 'post' ? styles.shippingSelected : ''}`}><input type="radio" name="carrier" value="post" checked={form.carrier === 'post'} onChange={() => update('carrier', 'post')} /><span className={styles.shippingLogo}><Image src="/shop-shipping/post.png" alt="نشان شرکت ملی پست" width={50} height={50} /></span><span className={styles.carrierText}><strong>پست</strong><small>پست پیشتاز</small></span><em><bdi>{money(100_000)}</bdi> تومان</em></label>
                <label className={`${styles.shippingChoice} ${form.carrier === 'tipax' ? styles.shippingSelected : ''}`}><input type="radio" name="carrier" value="tipax" checked={form.carrier === 'tipax'} onChange={() => update('carrier', 'tipax')} /><span className={styles.shippingLogo}><Image src="/shop-shipping/tipax.png" alt="نشان تیپاکس" width={62} height={35} /></span><span className={styles.carrierText}><strong>تیپاکس</strong><small>پس کرایه</small></span><em><bdi>{money(50_000)}</bdi> تومان بسته‌بندی</em></label>
              </div>
            </section>
            {error ? <p role="alert" className={styles.error}>{error}</p> : null}
            {submitted ? (
              <section className={styles.reviewCard} aria-label="مرور اطلاعات ارسال">
                <div className={styles.sectionHeading}><h2>همه‌چیز درسته؟</h2><span>مرور سفارش</span></div>
                <p>{form.name} · <bdi dir="ltr">+98{form.mobile}</bdi></p>
                <p>{form.province}، {form.city}، {form.address} · کد پستی <bdi>{englishDigits(form.postalCode)}</bdi></p>
                <div className={styles.reviewPrice}><span>مبلغ قابل واریز با هزینه ارسال و بسته‌بندی</span><strong><bdi>{money(shopCartSubtotal(items) + SHOP_SHIPPING_AND_PACKAGING[form.carrier])}</bdi> تومان</strong></div>
                {form.carrier === 'tipax' ? <p>هزینهٔ حمل تیپاکس را هنگام تحویل بسته پرداخت می‌کنی.</p> : null}
                <button type="button" onClick={continueToPayment} className={styles.primaryAction}><span>تأیید و ادامه به پرداخت</span><span aria-hidden="true">←</span></button>
              </section>
            ) : <button type="submit" className={styles.primaryAction}><span>بررسی سفارش</span><span aria-hidden="true">←</span></button>}
          </form>
          <div className={styles.summaryColumn}><Summary items={items} carrier={form.carrier} /><Link className={styles.textLink} href="/shop/cart">→ بازگشت و ویرایش سبد</Link></div>
        </div>
      )}
    </PageShell>
  );
}

export function ShopPaymentScreen() {
  const { items, ready } = useShopCart();
  const [checkout] = useState<ShippingForm | null>(() => readCheckoutSession(readShopCart()));
  const [trackingNumber, setTrackingNumber] = useState('');
  const [transferTime, setTransferTime] = useState('');
  const [copyState, setCopyState] = useState<'card' | 'iban' | ''>('');
  const [error, setError] = useState('');
  async function copyNumber(value: string, key: 'card' | 'iban') {
    try { await navigator.clipboard.writeText(value); setCopyState(key); }
    catch { setCopyState(''); setError('کپی انجام نشد. شماره را انتخاب و کپی کن.'); }
  }
  function declareTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!englishDigits(trackingNumber).trim() && !transferTime) {
      setError('شمارهٔ پیگیری یا زمان تراکنش را وارد کن.');
      return;
    }
    setError('تا قطعی‌شدن سفارش، لطفاً مبلغی واریز نکن. اعلام واریز در حال حاضر دریافت نمی‌شود.');
  }
  return (
    <PageShell step={2} title="پرداخت و اعلام واریز">
      {!ready ? <p className={styles.loading}>در حال خواندن سبد…</p> : items.length === 0 ? <EmptyCart /> : !checkout ? (
        <div className={styles.empty}>
          <h2>اول اطلاعات ارسال رو کامل کن</h2>
          <p>برای اینکه مبلغ درست رو ببینی، باید روش ارسال و نشانی رو تأیید کنی.</p>
          <Link href="/shop/checkout" className={styles.primaryAction}><span>تکمیل اطلاعات ارسال</span><span aria-hidden="true">←</span></Link>
        </div>
      ) : (
        <div className={styles.twoColumns}>
          <div className={styles.checkoutForm}>
            <section className={styles.formCard}>
              <div className={styles.sectionHeading}><h2>۱. اطلاعات کارت‌به‌کارت</h2><span>بانک سامان</span></div>
              <div className={styles.bankPanel}>
                <span>به نام شهریار قربانی · بانک سامان</span>
                <span>شمارهٔ کارت</span>
                <div className={styles.bankNumber}><strong dir="ltr">6219 8614 9547 2721</strong><button type="button" onClick={() => copyNumber('6219861495472721', 'card')} aria-label="کپی شماره کارت">{copyState === 'card' ? 'کپی شد ✓' : 'کپی شماره کارت'}</button></div>
                <span>شمارهٔ شبا</span>
                <div className={styles.bankNumber}><strong dir="ltr">IR840560611828015359847901</strong><button type="button" onClick={() => copyNumber('IR840560611828015359847901', 'iban')} aria-label="کپی شماره شبا">{copyState === 'iban' ? 'کپی شد ✓' : 'کپی شماره شبا'}</button></div>
              </div>
              <p className={styles.paymentDue}>مبلغ سفارش با هزینه ارسال و بسته‌بندی: <strong><bdi>{money(shopCartSubtotal(items) + SHOP_SHIPPING_AND_PACKAGING[checkout.carrier])}</bdi> تومان</strong></p>
              {checkout.carrier === 'tipax' ? <p className={styles.fieldNote}>هزینهٔ حمل تیپاکس هنگام تحویل بسته، جداگانه و به‌صورت پس‌کرایه پرداخت می‌شود.</p> : null}
            </section>
            <form className={styles.formCard} onSubmit={declareTransfer}>
              <div className={styles.sectionHeading}><h2>۲. اعلام واریز</h2></div>
              <p className={styles.fieldNote}>حداقل یکی از دو مورد زیر رو وارد کن.</p>
              <label className={styles.field}>شمارهٔ پیگیری تراکنش<input inputMode="numeric" maxLength={50} value={trackingNumber} onChange={(event) => { setTrackingNumber(event.target.value); setError(''); }} placeholder="شمارهٔ پیگیری واریز" /></label>
              <div className={styles.orDivider}>یا</div>
              <label className={styles.field}>زمان تراکنش<input type="time" value={transferTime} onChange={(event) => { setTransferTime(event.target.value); setError(''); }} /></label>
              {error ? <p role="alert" className={styles.error}>{error}</p> : null}
              <button className={styles.primaryAction} type="submit"><span>اعلام واریز</span><span aria-hidden="true">←</span></button>
            </form>
          </div>
          <div className={styles.summaryColumn}><Summary items={items} carrier={checkout.carrier} /><Link className={styles.textLink} href="/shop/checkout">→ بازگشت به اطلاعات ارسال</Link></div>
        </div>
      )}
    </PageShell>
  );
}
