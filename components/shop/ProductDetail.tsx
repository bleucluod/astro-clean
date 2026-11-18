'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { siteConfig } from '@/lib/config/seo';
import { buildShopProductStructuredData } from './product-schema';
import { getShopProductUrl } from '@/lib/shop/shop-product-url';
import { getRelatedProducts, getShopProduct, SHOP_SIZES, type ShopProduct, type ShopProductId, type ShopCopySection } from './product-detail-data';
import { NemadManBahmanArtwork } from './NemadManBahmanArtwork';
import { NemadFullWidthIntro } from './NemadFullWidthIntro';
import type { NemadMonthSlug } from '@/lib/shop/nemad-man-months';
import { NemadPreviewWatermark } from './NemadPreviewWatermark';
import { validateBahmanPreview, type BahmanPreview } from '@/lib/shop/nemad-man-bahman-preview';
import { addShopCartItem, readShopCart, type ShopPersonalization } from './shop-cart';
import { validateShopMoment } from '@/lib/shop/shop-personalization';
import { filterHalleusCities, getHalleusCityDisplayName } from '@/lib/locations/cities';
import styles from './product-detail.module.css';
import { useShopGallerySwipe } from './use-shop-gallery-swipe';
import { useShopLivePrices, liveShopPrice } from './use-shop-live-prices';

export type NemadProductPage = {
  slug: NemadMonthSlug;
  months: { slug: NemadMonthSlug; title: string }[];
  product: ShopProduct;
  initial: BahmanPreview;
};

const emptyDetails: ShopPersonalization = { calendar: 'jalali', date: '', time: '', city: '', cityId: '', names: '', message: '' };

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fa-IR').format(amount);
}

function ApprovedProductCopy({ sections }: { sections: ShopCopySection[] }) {
  return (
    <section className={styles.editorialSection} aria-label="روایت و جزئیات اثر">
      <div className={styles.editorialBody}>
        {sections.map((section) => (
          <div key={section.title} className={styles.editorialSubsection}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.subheading ? (
              <div className={styles.editorialSubsectionInner}>
                <h3>{section.subheading.title}</h3>
                {section.subheading.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            ) : null}
            {section.subheadings?.map((subheading) => (
              <div key={subheading.title} className={styles.editorialSubsectionInner}>
                <h3>{subheading.title}</h3>
                {subheading.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function plainProductCopy(text: string) {
  // Sales prose does not send readers to another product mid-paragraph.
  // Navigation, breadcrumbs and related product cards remain unchanged.
  return text.replace(/<a href="\/shop\/(?:moon-phase-print|birth-sky-map|milky-way-print)">([^<]+)<\/a>/g, "$1");
}

const sizeScenes = [
  'روی میز، کنار یک ماگ',
  'روی دیوار، بالای میز کار',
  'روی دیوار، بالای مبل',
];

function SizeIllustration({ id, title }: { id: ShopProductId; title: string }) {
  return (
    <div className={styles.sizeIllustration} aria-label={`مقایسهٔ اندازه‌های تابلوی ${title} در فضای واقعی`} tabIndex={0}>
      {SHOP_SIZES.map((size, i) => (
        <figure className={styles.sizeScene} key={size.dimension}>
          <div className={styles.sizeScenePhoto}>
            <Image
              src={`/shop-preview/size-guide-${id}.webp`}
              alt={`تابلوی ${title} در اندازهٔ ${size.label} سانتی‌متر؛ ${sizeScenes[i]}`}
              fill
              sizes="(max-width: 760px) 78vw, (max-width: 1023px) 28vw, 370px"
              style={{ objectPosition: `${i * 50}% center` }}
            />
          </div>
          <figcaption><strong dir="ltr">{size.label}</strong><span>{sizeScenes[i]}</span></figcaption>
        </figure>
      ))}
    </div>
  );
}

export function ProductDetail({ id, nemad }: { id: ShopProductId; nemad?: NemadProductPage }) {
  const router = useRouter();
  const product = nemad?.product ?? getShopProduct(id);
  const related = getRelatedProducts(id);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isZoomOpen, setZoomOpen] = useState(false);
  const [isSizeZoomOpen, setSizeZoomOpen] = useState(false);
  const [form, setForm] = useState<ShopPersonalization>(emptyDetails);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [nemadPreview, setNemadPreview] = useState<BahmanPreview | null>(nemad?.initial ?? null);
  const [nemadNeedsDetails, setNemadNeedsDetails] = useState(false);
  const [nemadTheme, setNemadTheme] = useState<'dark' | 'light'>('dark');
  const [isFooterVisible, setFooterVisible] = useState(false);
  const [isFormVisible, setFormVisible] = useState(false);
  const zoomDialog = useRef<HTMLDialogElement>(null);
  const sizeZoomDialog = useRef<HTMLDialogElement>(null);
  const livePrices = useShopLivePrices();
  const hasBahmanPricing = nemad?.slug === 'bahman';
  const price = liveShopPrice(livePrices.prices, hasBahmanPricing ? 'nm' : id, SHOP_SIZES[sizeIndex].dimension);
  const artwork = nemadPreview ?? nemad?.initial;
  const gallerySwipe = useShopGallerySwipe((step) => {
    selectGalleryPhoto((photoIndex + step + product.gallery.length) % product.gallery.length);
  });
  const citySuggestions = useMemo(() =>
    (id === 'p02' || (nemad && nemadNeedsDetails)) && !form.cityId && form.city.trim().length >= 2
      ? filterHalleusCities(form.city).slice(0, 8) : [],
  [id, nemad, nemadNeedsDetails, form.city, form.cityId]);
  const formCopy = nemad || id === 'nm' ? {
    title: 'نام چه کسی را کنار ستاره‌ها بنویسیم؟',
    intro: 'یک نام و یک تاریخ؛ دو جزئیات کوچک برای نشانی که مخصوص اوست.',
    date: 'تاریخ تولد شمسی',
    names: 'نام روی تابلو',
    details: '',
  } : {
    p01: {
      title: 'کدام روز را به ماه می‌سپاری؟',
      intro: 'بعضی لحظه‌ها می‌گذرند، اما دلمان می‌خواهد نورشان جایی بماند.',
      date: 'تاریخ آن لحظه',
      names: 'نامی برای ماندن',
      details: 'حرف دیگری هم برای این خاطره داری؟',
    },
    p02: {
      title: 'آسمان کدام لحظه را نگه داریم؟',
      intro: 'تاریخ، ساعت و شهر تولدت را بگو تا آسمان همان لحظه را پیدا کنیم.',
      date: 'تاریخ تولد',
      names: 'نامی کنار ستاره‌ها',
      details: 'پیامی هم کنار این آسمان می‌گذاری؟',
    },
    p03: {
      title: 'این شب، یادگار کدام قصه است؟',
      intro: 'یک نام، یک تاریخ یا چند کلمه؛ همین‌ها این شب را به قصهٔ شما نزدیک‌تر می‌کنند.',
      date: 'تاریخ خاطره (اختیاری)',
      names: 'نام‌های این قصه',
      details: 'حرف دیگری هم برای این قصه داری؟',
    },
  }[id];
  const hideMobileBar = isFooterVisible || isFormVisible;
  const structuredData = !nemad && livePrices.prices
    ? buildShopProductStructuredData(product, siteConfig.url, id === 'p01', livePrices.prices) : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const key = new URLSearchParams(window.location.search).get('edit');
      if (nemad) {
        if (nemad.slug !== 'bahman' || !key) return;
        const saved = readShopCart().find(entry => entry.key === key && entry.productId === 'nm'
          && entry.details.nemadMonth === 'bahman');
        if (!saved) return;
        const index = SHOP_SIZES.findIndex(size => size.dimension === saved.size);
        if (index >= 0) setSizeIndex(index);
        setForm(saved.details);
        setEditingKey(saved.key);
        setNemadTheme(saved.details.nemadTheme === 'light' ? 'light' : 'dark');
        setPhotoIndex(saved.details.nemadTheme === 'light' ? 1 : 0);
        return;
      }
      if (!key) return;
      const item = readShopCart().find((entry) => entry.key === key && entry.productId === id);
      if (!item) return;
      const index = SHOP_SIZES.findIndex((size) => size.dimension === item.size);
      if (index >= 0) setSizeIndex(index);
      setForm(item.details);
      setEditingKey(item.key);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, nemad]);

  useEffect(() => {
    const dialog = zoomDialog.current;
    if (!dialog) return;
    if (isZoomOpen && !dialog.open) dialog.showModal();
    if (!isZoomOpen && dialog.open) dialog.close();
  }, [isZoomOpen]);

  useEffect(() => {
    const dialog = sizeZoomDialog.current;
    if (!dialog) return;
    if (isSizeZoomOpen && !dialog.open) dialog.showModal();
    if (!isSizeZoomOpen && dialog.open) dialog.close();
  }, [isSizeZoomOpen]);

  useEffect(() => {
    const footer = document.querySelector('footer.site-footer');
    if (!footer || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: '0px 0px 90px 0px' },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const formElement = document.getElementById('personalize');
    if (!formElement || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting));
    observer.observe(formElement);
    return () => observer.disconnect();
  }, []);

  function updateForm(field: keyof ShopPersonalization, value: string) {
    setForm((previous) => field === 'city'
      ? { ...previous, city: value, cityId: '' }
      : { ...previous, [field]: value });
    setFormError('');
  }

  function selectBirthCity(cityId: string, cityLabel: string) {
    setForm((previous) => ({ ...previous, city: cityLabel, cityId }));
    setFormError('');
  }

  function updateJalaliPart(index: 0 | 1 | 2, value: string) {
    const parts = form.date.split('/');
    const next = [parts[0] || '', parts[1] || '', parts[2] || ''];
    next[index] = value.replace(/[^0-9۰-۹٠-٩]/g, '').slice(0, index === 0 ? 4 : 2);
    updateForm('date', next.some(Boolean) ? next.join('/') : '');
  }

  function confirmDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nemad) {
      const result = validateBahmanPreview(form.names, form.date,
        { time: form.time, cityId: form.cityId });
      if (!result.ok) {
        setNemadNeedsDetails(result.reason === 'needs-birth-details');
        setFormError(result.message);
        return;
      }
      setNemadPreview(result.value);
      setPhotoIndex(nemadTheme === 'light' ? 1 : 0);
      setNemadNeedsDetails(false);
      setFormError('');
      return;
    }
    if (price === null) {
      setFormError('قیمت فروشگاه قابل بررسی نیست؛ دوباره تلاش کن.');
      return;
    }
    if (id !== 'p01') {
      setFormError('این اثر هنوز برای سفارش فعال نشده است.');
      return;
    }
    const validated = validateShopMoment(id, form);
    if (!validated.ok) {
      setFormError(validated.message);
      return;
    }
    if (!addShopCartItem(id, SHOP_SIZES[sizeIndex].dimension, { ...form }, editingKey ?? undefined)) {
      setFormError('افزودن به سبد ممکن نشد؛ فضای ذخیرهٔ مرورگر یا تعداد آثار را بررسی کن.');
      return;
    }
    router.push('/shop/cart');
  }

  function selectGalleryPhoto(index: number) {
    setPhotoIndex(index);
    if (nemad && index < 2) setNemadTheme(index === 0 ? 'dark' : 'light');
  }

  function addNemadToCart() {
    if (!nemad || nemad.slug !== 'bahman') return;
    if (price === null) { setFormError('قیمت فروشگاه در دسترس نیست؛ دوباره تلاش کن.'); return; }
    const result = validateBahmanPreview(form.names, form.date, { time: form.time, cityId: form.cityId });
    if (!result.ok) {
      setNemadNeedsDetails(result.reason === 'needs-birth-details');
      setFormError(result.message);
      return;
    }
    const selectedMonth = Number(result.value.date.split('/')[1]);
    if (selectedMonth !== 11) {
      setFormError('برای سفارش نماد بهمن، تاریخ تولد باید در ماه بهمن باشد.');
      return;
    }
    setNemadPreview(result.value);
    setNemadNeedsDetails(false);
    setFormError('');
    if (!addShopCartItem('nm', SHOP_SIZES[sizeIndex].dimension, {
      ...form, calendar: 'jalali', message: '', nemadMonth: 'bahman', nemadTheme,
    }, editingKey ?? undefined)) {
      setFormError('افزودن به سبد خرید انجام نشد؛ اطلاعات یا فضای مرورگر را بررسی کن.');
      return;
    }
    router.push('/shop/cart');
  }

  return (
    <div className={styles.page} data-shop-page="product" dir="rtl">
      {structuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /> : null}
      <div className={styles.content}>
        <section className={styles.productHero} aria-label={product.title}>
          <div className={styles.gallery}>
            <nav className={styles.breadcrumbs} aria-label="مسیر صفحه">
              <Link href="/">هالیوس</Link><span aria-hidden="true">/</span>
              <Link href="/shop">فروشگاه</Link><span aria-hidden="true">/</span>
              <span aria-current="page">{product.title}</span>
            </nav>
            <button className={`${styles.mainPhotoButton} ${id === 'p01' ? styles.p01MainPhoto : ''} ${nemad ? styles.nemadMainPhoto : ''}`} type="button"
              {...gallerySwipe.touchHandlers} style={{ touchAction: 'pan-y pinch-zoom' }}
              onClick={(event) => { if (event.detail === 0 || gallerySwipe.canOpenZoom()) setZoomOpen(true); }}
              aria-label={`بزرگ‌نمایی ${product.gallery[photoIndex].label}`}>
              {nemad && artwork && photoIndex < 2 ? (
                <span className={styles.nemadArtwork}>
                  <NemadPreviewWatermark><NemadManBahmanArtwork name={artwork.name} date={artwork.gregorianDate}
                    sign={artwork.sign} theme={nemadTheme} /></NemadPreviewWatermark>
                </span>
              ) : (
                <Image
                  key={product.gallery[photoIndex].src}
                  src={product.gallery[photoIndex].src}
                  alt={product.gallery[photoIndex].alt}
                  fill
                  priority={photoIndex === 0}
                  sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 660px"
                  className={id === 'p01' ? styles.portraitPhoto : photoIndex === 0 ? styles.primaryPhoto : styles.portraitPhoto}
                />
              )}
              <span className={styles.zoomHint} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 5 5M10.5 8v5M8 10.5h5" />
                </svg>
              </span>
            </button>
            <div className={`${styles.thumbnails} ${id === 'p01' ? styles.p01Thumbnails : ''} ${nemad ? styles.nemadThumbnails : ''}`} aria-label={nemad ? 'انتخاب مدل تابلو' : 'تصاویر محصول'}>
              {product.gallery.map((photo, index) => (
                <button
                  type="button"
                  key={photo.src}
                  className={`${styles.thumbnail} ${photoIndex === index ? styles.thumbnailActive : ''}`}
                  onClick={() => selectGalleryPhoto(index)}
                  aria-label={`نمایش تصویر ${index + 1}: ${photo.label}`}
                  aria-pressed={photoIndex === index}
                >
                  {nemad && index < 2 ? <span className={`${styles.nemadThemeSwatch} ${index === 0 ? '' : styles.nemadLightSwatch}`}>
                    {index === 0 ? 'مینیمال تیره' : 'مینیمال روشن'}
                  </span> : <Image src={photo.src} alt={nemad ? photo.alt : ''} fill sizes="(max-width: 760px) 82px, 156px" />}
                </button>
              ))}
            </div>
            {!nemad && id === 'p01' ? <p className={styles.galleryPosition} aria-live="polite">تصویر {formatPrice(photoIndex + 1)} از {formatPrice(product.gallery.length)} · {product.gallery[photoIndex].label}</p> : null}
            {!nemad && product.galleryNote ? <p className={styles.galleryCaption}>{product.galleryNote}</p> : null}
          </div>

          <div className={styles.productInfo}>
            <div className={styles.productHeading}>
              <h1 className={product.seoHeading ? styles.seoProductHeading : undefined}>{product.seoHeading ?? product.title}</h1>
              <p className={styles.tagline}>{product.tagline}</p>
            </div>
            <div className={styles.purchasePanel}>
              {!nemad ? <p className={styles.introduction}>{product.introduction}</p> : null}
              <fieldset className={styles.sizes}>
                <legend>اندازهٔ تابلو <small>(سانتی‌متر)</small></legend>
                <div className={styles.sizeGrid}>
                  {SHOP_SIZES.map((size, i) => (
                    <button
                      key={size.dimension}
                      type="button"
                      className={`${styles.sizeChoice} ${sizeIndex === i ? styles.sizeSelected : ''}`}
                      aria-pressed={sizeIndex === i}
                      onClick={() => setSizeIndex(i)}
                    >
                      <span dir="ltr">{size.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              {(!nemad || hasBahmanPricing) ? <div className={styles.priceBlock}>
                <p className={styles.priceLabel}>قیمت</p>
                <p className={styles.price} aria-live="polite"><bdi>{price === null ? (livePrices.error ? 'قیمت در دسترس نیست' : 'در حال دریافت…') : formatPrice(price)}</bdi><span>تومان</span></p>
              </div> : null}
              <a className={styles.sizeGuideLink} href="#size-guide">مقایسهٔ اندازه‌ها روی دیوار <span aria-hidden="true">↓</span></a>
              <form id="personalize" onSubmit={confirmDetails} className={styles.personalizeForm} aria-label={`شخصی‌سازی ${product.title}`}>
                <div className={styles.formIntro}>
                  <span className={styles.formKicker}>شخصی‌سازی اثر</span>
                  <h2 className={styles.formTitle}>{formCopy.title}</h2>
                  <p className={styles.formPoem}>{formCopy.intro}</p>
                </div>
                {!nemad ? <div className={styles.calendarChooser}>
                  <span className={styles.calendarLabel}>تقویم</span>
                  <div className={styles.calendarSwitch} role="group" aria-label="نوع تقویم">
                    {([['jalali', 'شمسی'], ['gregorian', 'میلادی']] as const).map(([calendar, label]) => (
                      <button
                        key={calendar}
                        type="button"
                        className={`${styles.calendarOption} ${form.calendar === calendar ? styles.calendarActive : ''}`}
                        aria-pressed={form.calendar === calendar}
                        onClick={() => { if (form.calendar !== calendar) { setForm((previous) => ({ ...previous, calendar, date: '' })); setFormError(''); } }}
                      >{label}</button>
                    ))}
                  </div>
                </div> : null}
                <div className={styles.formField}>
                  <label htmlFor={form.calendar === 'jalali' ? 'jalali-year' : 'product-date'}>{formCopy.date}</label>
                  {form.calendar === 'jalali' ? (
                    <div className={styles.jalaliDateParts} role="group" aria-label="تاریخ شمسی: سال، ماه و روز">
                      {([
                        { label: 'سال', placeholder: '۱۴۰۳', id: 'jalali-year', length: 4 },
                        { label: 'ماه', placeholder: '۰۶', id: 'jalali-month', length: 2 },
                        { label: 'روز', placeholder: '۱۲', id: 'jalali-day', length: 2 },
                      ] as const).map(({ label, placeholder, id: inputId, length }, index) => (
                        <div className={styles.jalaliDatePart} key={inputId}>
                          <label htmlFor={inputId}>{label}</label>
                          <input id={inputId} type="text" inputMode="numeric" autoComplete="off" dir="ltr" required={Boolean(nemad) || id !== 'p03'} maxLength={length} placeholder={placeholder} value={form.date.split('/')[index] || ''} onChange={(event) => updateJalaliPart(index as 0 | 1 | 2, event.target.value)} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.dateInputShell}>
                      <input id="product-date" dir="ltr" required={Boolean(nemad) || id !== 'p03'} value={form.date} type="date" onChange={(event) => updateForm('date', event.target.value)} />
                    </div>
                  )}
                </div>
                {id === 'p01' ? (
                  <p className={styles.formHint}>برای محاسبهٔ فاز ماه، ساعت ۱۲ ظهر به وقت تهران در تاریخ انتخابی مبناست؛ نیازی به واردکردن ساعت یا شهر نیست.</p>
                ) : null}
                {(id === 'p02' || (nemad && nemadNeedsDetails)) ? (
                  <>
                    <div className={styles.dateFields}>
                      <div className={styles.formField}><label htmlFor="product-time">ساعت دقیق تولد</label><input id="product-time" type="time" dir="ltr" required value={form.time} onChange={(event) => updateForm('time', event.target.value)} /></div>
                      <div className={styles.formField}>
                        <label htmlFor="product-city">شهر تولد</label>
                        <input id="product-city" type="text" required maxLength={100} autoComplete="off"
                          placeholder="نام شهر را بنویس و انتخاب کن" value={form.city}
                          onChange={(event) => updateForm('city', event.target.value)}
                          aria-describedby="shop-city-hint" />
                        {citySuggestions.length ? (
                          <ul className={styles.citySuggestions} aria-label="شهرهای پیشنهادی">
                            {citySuggestions.map((city) => (
                              <li key={city.id}>
                                <button type="button" onClick={() => selectBirthCity(city.id, getHalleusCityDisplayName(city))}>
                                  <span>{getHalleusCityDisplayName(city)}</span>
                                  <small>{city.countryFaName}</small>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <small id="shop-city-hint">{nemad ? 'در تاریخ‌های مرزی، شهر به تعیین دقیق نشان کمک می‌کند.' : 'برای نقشهٔ واقعی آسمان، شهر را حتماً از فهرست انتخاب کن.'}</small>
                      </div>
                    </div>
                    <p className={styles.formHint}>{nemad
                      ? 'برای روزهای نزدیک مرز دو برج، ساعت و شهر تولد هم لازم می‌شوند.'
                      : 'برای نقشهٔ ستاره‌ها، تاریخ، ساعت و شهر دقیق تولد اهمیت دارند.'}</p>
                  </>
                ) : null}
                <div className={styles.formField}>
                  <label htmlFor="product-names">{formCopy.names} {nemad ? null : <small>(اختیاری)</small>}</label>
                  <input id="product-names" type="text" required={Boolean(nemad)}
                    maxLength={nemad ? 28 : 60}
                    placeholder={nemad ? 'نام شما' : id === 'p03' ? 'مثلاً هاله و آراد' : 'نامی که دوست داری روی تابلو باشد…'} value={form.names} onChange={(event) => updateForm('names', event.target.value)} />
                </div>
                {!nemad ? <details className={styles.optionalFields}>
                  <summary>{formCopy.details} <span aria-hidden="true">+</span></summary>
                  <div className={styles.optionalFieldsInner}>
                    <div className={styles.formField}>
                      <label htmlFor="product-message">پیام کوتاه (اختیاری)</label>
                      <textarea id="product-message" maxLength={60} rows={2} placeholder="چند کلمه که فقط برای شما معنا دارد…" value={form.message} onChange={(event) => updateForm('message', event.target.value)} />
                      <small>حداکثر ۶۰ نویسه</small>
                    </div>
                  </div>
                </details> : null}
                {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
                <button className={styles.confirmAction} type="submit" disabled={!nemad && id !== 'p01'}>
                  <span className={styles.confirmLabel}>{nemad ? 'ساخت پیش‌نمایش شخصی' :
                    id !== 'p01' ? 'به‌زودی قابل سفارش' : editingKey ? 'ذخیرهٔ تغییرات در سبد خرید' : 'افزودن به سبد خرید'}</span>
                  <span className={styles.confirmArrow} aria-hidden="true"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></svg></span>
                </button>
                {hasBahmanPricing ? <button className={styles.confirmAction} type="button" onClick={addNemadToCart} disabled={price === null}>
                  <span className={styles.confirmLabel}>{editingKey ? 'ذخیرهٔ تغییرات در سبد خرید' : 'افزودن نماد من به سبد خرید'}</span>
                </button> : null}
              </form>
              {(id === 'p01' || hasBahmanPricing) ? <Link className={styles.cartLink} href="/shop/cart">مشاهدهٔ سبد خرید <span aria-hidden="true">←</span></Link> : null}
              {!nemad ? <div className={styles.specification}>
                <span>{product.highlight}</span>
                <span>سپردن سفارش به پست یا تیپاکس تا ۷۲ ساعت کاری پس از تأیید پرداخت، همراه با کد رهگیری</span>
              </div> : null}
            </div>
          </div>
        </section>

        {nemad ? <NemadFullWidthIntro introduction={product.introduction} /> : null}

        {product.personalizationExamples?.length ? (
          <section className={styles.personalizationExamples} aria-labelledby="p01-personalization-examples-heading">
            <div className={styles.personalizationExampleHeading}>
              <span className={styles.sectionKicker}>چند نمونه از یک تاریخ</span>
              <h2 id="p01-personalization-examples-heading">«ماه آن روز» چطور شخصی می‌شه؟</h2>
              <p>تاریخ رو انتخاب می‌کنی و هالیوس فاز ماه همون روز رو به تصویر می‌کشه. بعد می‌تونی نام، پیام کوتاه، هر دو یا هیچ‌کدوم رو اضافه کنی. این چهار نمونه تاریخ یکسانی دارن تا تفاوت فقط در نوشته‌ها دیده بشه؛ نام بالای تاریخ قرار می‌گیره و پیام زیرش.</p>
            </div>
            <div className={styles.personalizationExampleGrid}>
              {product.personalizationExamples.map((example) => (
                <div key={example.src} className={styles.personalizationExampleCard}>
                  <div className={styles.personalizationExampleImage}>
                    <Image src={example.src} alt={example.alt} fill sizes="(max-width: 760px) 42vw, 220px" />
                  </div>
                  <h3>{example.title}</h3>
                  <p>{example.description}</p>
                </div>
              ))}
            </div>
            <p className={styles.personalizationExampleFoot}>می‌تونی تاریخ رو شمسی یا میلادی وارد کنی؛ فاز ماه از همون تاریخ انتخابی تو ساخته می‌شه و برای هر روز می‌تونه شکل متفاوتی داشته باشه.</p>
          </section>
        ) : null}

        <section className={styles.storySection} aria-labelledby="story-heading">
          <div className={styles.storyImage}>
            {nemad && artwork ? (
              <div className={styles.nemadArtwork}><NemadPreviewWatermark><NemadManBahmanArtwork
                name={artwork.name} date={artwork.gregorianDate} sign={artwork.sign} theme={nemadTheme} /></NemadPreviewWatermark></div>
            ) : <Image src={product.gallery[1].src} alt={product.gallery[1].alt} width={563} height={908} sizes="(max-width: 760px) calc(100vw - 32px), 440px" />}
          </div>
          <div className={styles.storyCopy}>
            <span className={styles.sectionKicker}>داستان این اثر</span>
            <h2 id="story-heading">{product.storyTitle}</h2>
            {product.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>

        {product.preCraftSections?.length ? <ApprovedProductCopy sections={product.preCraftSections} /> : null}

        <section className={styles.craftSection} aria-labelledby="craft-heading">
          <div className={styles.craftCopy}>
            <span className={styles.sectionKicker}>جزئیات و کیفیت</span>
            <h2 id="craft-heading">{product.qualityTitle}</h2>
            {product.quality.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <div className={styles.craftLabels}><span>سطح مات</span><span>چاپ روی شاسی</span><span>سه اندازه</span></div>
          </div>
          <div className={styles.craftImage}>
            {nemad && artwork ? (
              <div className={styles.nemadArtwork}><NemadPreviewWatermark><NemadManBahmanArtwork
                name={artwork.name} date={artwork.gregorianDate} sign={artwork.sign} theme={nemadTheme} /></NemadPreviewWatermark></div>
            ) : <Image src={product.gallery[3].src} alt={product.gallery[3].alt} width={563} height={908} sizes="(max-width: 760px) calc(100vw - 32px), 440px" />}
          </div>
        </section>

        <section id="size-guide" className={styles.dimensionsSection} aria-labelledby="dimensions-heading">
          <div className={styles.centerIntro}>
            <span className={styles.sectionKicker}>راهنمای انتخاب اندازه</span>
            <h2 id="dimensions-heading">کدام اندازه برای فضای تو مناسب‌تر است؟</h2>
            <p>هر سه اندازه، نسبت تصویر یکسانی دارند؛ تفاوت در جایی است که می‌خواهی تابلو دیده شود.</p>
          </div>
          <div className={styles.sizeGuideFrame}>
            {nemad ? <div className={styles.nemadSizeGrid}>
              {SHOP_SIZES.map(size => <div key={size.dimension} className={styles.nemadSizeCard}>
                <strong>{size.label}</strong><span>سانتی‌متر</span>
              </div>)}
            </div> : <SizeIllustration id={id} title={product.title} />}
            {!nemad ? <button type="button" className={styles.sizeZoomButton} onClick={() => setSizeZoomOpen(true)} aria-label="بزرگ‌نمایی مقایسهٔ اندازه‌ها">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5M10.5 8v5M8 10.5h5" /></svg>
              <span>بزرگ‌نمایی</span>
            </button> : null}
          </div>
          <p className={styles.sizeNote}>{nemad
            ? 'از اندازهٔ کوچک کنار کتاب‌ها تا تابلویی بزرگ‌تر برای دیوار؛ هر سه اندازه نسبت یکسانی دارند.'
            : 'سه تصویر برای تصور جای هر اندازه در خانه‌اند؛ برای مقایسه، ماگ و وسایل معمولی کنار تابلو قرار گرفته‌اند. ابعاد دقیق زیر هر تصویر نوشته شده است. در موبایل، تصویرها را به طرفین ورق بزن.'}</p>
        </section>

        <section className={styles.dispatchStrip} aria-label={nemad ? 'ویژگی‌های تابلو' : 'چاپ و ارسال'}>
          <div><strong>سه اندازهٔ انتخابی</strong><span>۱۰×۱۵، ۲۰×۳۰، ۳۰×۴۵ سانتی‌متر</span></div>
          <div><strong>چاپ مات روی شاسی</strong><span>{nemad ? 'طراحی مینیمال بدون قاب' : 'آماده برای نصب و هدیه‌دادن'}</span></div>
          {!nemad ? <div><strong>ارسال با پست یا تیپاکس</strong><span>تحویل به شرکت حمل‌ونقل تا ۷۲ ساعت کاری پس از تأیید پرداخت، همراه با کد رهگیری. زمان رسیدن بسته به مقصد بستگی دارد.</span></div> : null}
        </section>

        {!nemad && product.postCraftSections?.length ? <ApprovedProductCopy sections={product.postCraftSections} /> : null}

        <section className={styles.faqSection} aria-labelledby="faq-heading">
          <span className={styles.sectionKicker}>برای انتخاب مطمئن‌تر</span>
          <h2 id="faq-heading">{product.faqHeading ?? `پرسش‌های متداول دربارهٔ ${product.title}`}</h2>
          <div className={styles.faqList}>
            {product.faq.map(({ question, answer }) => (
              <details key={question} className={styles.faqItem}>
                <summary>{question}<span className={styles.faqPlus} aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        {nemad && product.postCraftSections?.length ? <ApprovedProductCopy sections={product.postCraftSections} /> : null}

        {id !== 'p01' && !nemad ? <section className={styles.editorialSection} aria-labelledby="editorial-heading">
          <span className={styles.sectionKicker}>بیشتر دربارهٔ این اثر</span>
          <h2 id="editorial-heading">{product.editorialTitle}</h2>
          {product.editorialIntro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <div className={styles.editorialBody}>
              {product.editorial.map((section) => (
                <div key={section.title} className={styles.editorialSubsection}>
                  <h3>{section.title}</h3>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{plainProductCopy(paragraph)}</p>)}
                </div>
              ))}
          </div>
        </section> : null}

        {product.closingCopy ? (
          <section className={styles.p01Closing} aria-labelledby="p01-closing-heading">
            <h2 id="p01-closing-heading">{product.closingCopy.title}</h2>
            <p>{product.closingCopy.text}</p>
            <a href="#personalize">{product.closingCopy.button}</a>
          </section>
        ) : null}

        {nemad ? <section className={styles.relatedSection} aria-labelledby="related-heading">
          <div className={styles.relatedHeading}><span className={styles.sectionKicker}>مجموعهٔ نماد من</span>
            <h2 id="related-heading">نماد ماه‌های دیگر</h2></div>
          <nav className={styles.nemadMonthLinks} aria-label="نماد ماه‌های تولد">
            {nemad.months.map((item) => <Link key={item.slug}
              href={`/shop/${item.slug}-sign`}
              aria-current={item.slug === nemad.slug ? 'page' : undefined}>{item.title}</Link>)}
          </nav>
        </section> : id !== 'p01' ? <section className={styles.relatedSection} aria-labelledby="related-heading">
          <div className={styles.relatedHeading}><span className={styles.sectionKicker}>از همین مجموعه</span><h2 id="related-heading">شاید این آثار را هم دوست داشته باشی</h2></div>
          <div className={styles.relatedGrid}>
            {related.map((item) => (
              <Link key={item.id} href={getShopProductUrl(item.id)} className={styles.relatedCard}>
                <span className={styles.relatedImage}><Image src={item.gallery[0].src} alt={item.gallery[0].alt} fill sizes="(max-width: 760px) calc(100vw - 32px), 584px" /></span>
                <span className={styles.relatedTitle}>{item.title}<span aria-hidden="true">←</span></span>
                <span className={styles.relatedDescription}>{item.tagline}</span>
                <span className={styles.relatedPrice}>{liveShopPrice(livePrices.prices, item.id, '10x15') === null
                  ? 'در حال دریافت قیمت' : `از ${formatPrice(liveShopPrice(livePrices.prices, item.id, '10x15') ?? 0)} تومان`}</span>
              </Link>
            ))}
          </div>
        </section> : null}
      </div>

      {(!nemad || hasBahmanPricing) ? <div className={`${styles.mobilePurchaseBar} ${hideMobileBar ? styles.mobilePurchaseBarHidden : ''}`} inert={hideMobileBar} aria-hidden={hideMobileBar}>
        <div><small>قیمت</small><strong><bdi>{price === null ? (livePrices.error ? 'قیمت در دسترس نیست' : 'در حال دریافت…') : formatPrice(price)}</bdi> <span>تومان</span></strong></div>
        {(id === 'p01' || hasBahmanPricing) ? <a href="#personalize"><span>{editingKey ? 'ویرایش انتخاب‌ها' : 'انتخاب و افزودن به سبد'}</span></a> : <span>به‌زودی</span>}
      </div> : null}

      <dialog ref={zoomDialog} onClose={() => setZoomOpen(false)} className={styles.zoomDialog} aria-label={`تصاویر ${product.title}`}>
        <div className={styles.zoomInner}>
          <button type="button" className={styles.dialogClose} onClick={() => setZoomOpen(false)} aria-label="بستن بزرگ‌نمایی">×</button>
          <div className={`${styles.zoomPhoto} ${nemad ? styles.nemadZoomPhoto : ''}`}
              {...gallerySwipe.touchHandlers} style={{ touchAction: 'pan-y pinch-zoom' }}>
              {nemad && artwork && photoIndex < 2 ? <div className={styles.nemadArtwork}>
                <NemadPreviewWatermark><NemadManBahmanArtwork name={artwork.name} date={artwork.gregorianDate}
                  sign={artwork.sign} theme={nemadTheme}/></NemadPreviewWatermark>
              </div> : <Image src={product.gallery[photoIndex].src} alt={product.gallery[photoIndex].alt} fill sizes="95vw" />}
            </div>
          <div className={styles.zoomActions}>
            <button type="button" onClick={() => selectGalleryPhoto((photoIndex + product.gallery.length - 1) % product.gallery.length)}>تصویر قبل</button>
            <span>{formatPrice(photoIndex + 1)} از {formatPrice(product.gallery.length)}</span>
            <button type="button" onClick={() => selectGalleryPhoto((photoIndex + 1) % product.gallery.length)}>تصویر بعد</button>
          </div>
        </div>
      </dialog>

      <dialog ref={sizeZoomDialog} onClose={() => setSizeZoomOpen(false)} className={styles.zoomDialog} aria-label={`بزرگ‌نمایی مقایسهٔ اندازه‌های ${product.title}`}>
        <div className={styles.zoomInner}>
          <button type="button" className={styles.dialogClose} onClick={() => setSizeZoomOpen(false)} aria-label="بستن مقایسهٔ اندازه‌ها">×</button>
          <h2 className={styles.sizeZoomTitle}>سه اندازه، سه جای واقعی در خانه</h2>
          <div className={styles.sizeZoomContent}>{nemad
              ? <div className={styles.nemadSizeGrid}>{SHOP_SIZES.map(size =>
                <div key={size.dimension} className={styles.nemadSizeCard}><strong>{size.label}</strong><span>سانتی‌متر</span></div>)}</div>
              : <SizeIllustration id={id} title={product.title} />}</div>
          <p className={styles.sizeZoomNote}>این‌ها عکس‌های نمایشی برای تصور اندازه‌ها هستند، نه اندازه‌گیری دقیق روی صفحه‌نمایش.</p>
        </div>
      </dialog>

    </div>
  );
}
