'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { filterHalleusCities, findHalleusCityById, getHalleusCityDisplayName } from '@/lib/locations/cities';
import { safeShopArtworkText } from '@/lib/shop/shop-artwork-text';
import { validateShopMoment } from '@/lib/shop/shop-personalization';
import { BIRTH_SKY_HERO } from './birth-sky-content';
import { BIRTH_SKY_GALLERY } from './birth-sky-gallery';
import { BirthSkyEditorial } from './BirthSkyEditorial';
import { NemadManEditorial } from './NemadManEditorial';
import { NemadManBahmanArtwork } from './NemadManBahmanArtwork';
import { NemadPreviewWatermark } from './NemadPreviewWatermark';
import { validateBahmanPreview, type BahmanPreview } from '@/lib/shop/nemad-man-bahman-preview';
import type { NemadProductPage } from './ProductDetail';
import { SHOP_P02_SIZES, SHOP_SIZES } from './product-detail-data';
import { useShopLivePrices, liveShopPrice } from './use-shop-live-prices';
import { addShopCartItem, readShopCart } from './shop-cart';
import { useShopGallerySwipe } from './use-shop-gallery-swipe';

const PREVIEW_SIZE = { width: 720, height: 1080 } as const;
const formatPrice = (n: number) => new Intl.NumberFormat('fa-IR').format(n);
import pdStyles from './product-detail.module.css';
import styles from './birth-sky-live-product.module.css';

type Personalization = {
  calendar: 'jalali' | 'gregorian';
  date: string;
  time: string;
  city: string;
  cityId: string;
  names: string;
  message: string;
};

// A real computed reference, never a stock/AI-created gallery photograph.
const initial: Personalization = {
  calendar: 'jalali',
  date: '۱۴۰۳/۰۸/۱۵',
  time: '21:00',
  city: 'تهران',
  cityId: 'iran-229',
  names: '',
  message: '',
};


/** P02 page preview: 720x1080 raster, with watermark burned into the pixels.
 * The actual R9 SVG is never inserted into the page or exposed by a download action. */
async function makeWatermarkedPreview(svg: string, fontFamily: string): Promise<string> {
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('ساخت پیش‌نمایش انجام نشد.');
  parsed.querySelectorAll('text').forEach((item) => item.remove());
  const bare = new XMLSerializer().serializeToString(parsed.documentElement);
  const url = URL.createObjectURL(new Blob([bare], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const picture = new window.Image();
    await new Promise<void>((resolve, reject) => {
      picture.onload = () => resolve();
      picture.onerror = () => reject(new Error('ساخت تصویر آسمان انجام نشد.'));
      picture.src = url;
    });
    const canvas = window.document.createElement('canvas');
    canvas.width = PREVIEW_SIZE.width;
    canvas.height = PREVIEW_SIZE.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('پیش‌نمایش در این مرورگر ساخته نشد.');
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    const { paintShopBirthSkyR9Text } = await import('@/lib/shop/shop-birth-sky-r9');
    context.save();
    context.scale(PREVIEW_SIZE.width / 3000, PREVIEW_SIZE.height / 4500);
    try {
      await paintShopBirthSkyR9Text(context, svg, fontFamily);
    } finally {
      context.restore();
    }
    await window.document.fonts.load('500 31px ' + fontFamily);
    context.save();
    context.direction = 'rtl';
    context.font = '500 31px ' + fontFamily;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(1, 11, 22, 0.78)';
    context.shadowBlur = 8;
    context.fillStyle = 'rgba(231, 242, 252, 0.42)';
    context.fillText('پیش‌نمایش هالیوس', canvas.width / 2, canvas.height / 2);
    context.restore();
    return canvas.toDataURL('image/webp', 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BirthSkyLiveProduct({ purchaseEnabled, nemad }: {
  purchaseEnabled: boolean; nemad?: NemadProductPage;
}) {
  const router = useRouter();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [input, setInput] = useState<Personalization>(() => nemad ? {
    ...initial, calendar: 'jalali', date: nemad.initial.date, time: '', city: '',
    cityId: '', names: '', message: '',
  } : initial);
  const [nemadPreview, setNemadPreview] = useState<BahmanPreview | null>(null);
  const [nemadNeedsDetails, setNemadNeedsDetails] = useState(false);
  const [nemadTheme, setNemadTheme] = useState<'dark' | 'light'>('dark');
  const [artwork, setArtwork] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(1);
  const [sizeIndex, setSizeIndex] = useState(nemad ? 1 : 2);
  const sizes = nemad ? SHOP_SIZES : SHOP_P02_SIZES;
  const gallery = nemad ? nemad.product.gallery.slice(2) : BIRTH_SKY_GALLERY;
  const livePrices = useShopLivePrices();
  const selectedPrice = liveShopPrice(livePrices.prices, nemad ? 'nm' : 'p02', sizes[sizeIndex].dimension);
  // The real payment/quote price remains server-authoritative. A missing local DB
  // must not leave the Nemad product page stuck on an endless loading label.
  const previewBasePrice = nemad && process.env.NODE_ENV !== 'production' && selectedPrice === null
    ? sizes[sizeIndex].price : null;
  const visiblePrice = selectedPrice ?? previewBasePrice;
  const localCartReview = Boolean(nemad && process.env.NODE_ENV !== 'production');
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomDialog = useRef<HTMLDialogElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const operation = useRef(0);
  const citySuggestions = useMemo(() => (
    (nemad && !nemadNeedsDetails) || input.cityId || input.city.trim().length < 2
      ? [] : filterHalleusCities(input.city).slice(0, 8)
  ), [input.city, input.cityId, nemad, nemadNeedsDetails]);

  const generate = useCallback(async (values: Personalization) => {
    const version = ++operation.current;
    setBusy(true);
    setArtwork(null);
    setPhotoIndex((previous) => previous === 0 ? 1 : previous);
    setError('');
    if (nemad) {
      const checked = validateBahmanPreview(values.names, values.date,
        { time: values.time, cityId: values.cityId });
      if (version !== operation.current) return;
      if (!checked.ok) {
        setNemadPreview(null);
        setNemadNeedsDetails(checked.reason === 'needs-birth-details');
        setError(checked.message);
        setBusy(false);
        return;
      }
      if (Number(checked.value.date.split('/')[1]) !== 11) {
        setNemadPreview(null);
        setNemadNeedsDetails(false);
        setError('برای سفارش نماد بهمن، تاریخ تولد باید در ماه بهمن باشد.');
        setBusy(false);
        return;
      }
      setNemadPreview(checked.value);
      setNemadNeedsDetails(false);
      setPhotoIndex(0);
      setBusy(false);
      window.requestAnimationFrame(() => {
        galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    const city = findHalleusCityById(values.cityId);
    const validated = validateShopMoment('p02', values);
    if (!city || !validated.ok || !validated.referenceUtc) {
      setBusy(false);
      setError(!validated.ok ? validated.message : 'شهر تولد را از فهرست انتخاب کن.');
      return;
    }
    try {
      const names = safeShopArtworkText(values.names, 'نام');
      const message = safeShopArtworkText(values.message, 'پیام');
      const [starModule, constellationModule, namedModule, artModule] = await Promise.all([
        import('@/lib/shop/shop-sky-atlas'),
        import('@/lib/shop/shop-constellation-lines'),
        import('@/lib/shop/shop-sky-stars'),
        import('@/lib/shop/shop-birth-sky-r9'),
      ]);
      if (version !== operation.current) return;
      const reference = {
        referenceUtc: validated.referenceUtc,
        latitude: city.latitude,
        longitude: city.longitude,
      };
      const stars = starModule.calculateShopStarAtlas(reference);
      const figures = constellationModule.calculateShopConstellationLines(reference);
      const named = namedModule.calculateShopBrightStarProof(reference);
      const svg = artModule.renderShopBirthSkyR9(stars, figures, named, {
        names, message,
        date: values.date,
        time: values.time,
        city: getHalleusCityDisplayName(city),
      }, { numerals: values.calendar === 'jalali' ? 'fa' : 'en' });
      const fontRoot = window.document.querySelector('[data-shop-page="p02-live-product"]');
      const fontFamily = fontRoot
        ? getComputedStyle(fontRoot).getPropertyValue('--font-p02-estedad').trim()
        : '';
      if (!fontFamily) throw new Error('فونت پیش‌نمایش هنوز آماده نیست.');
      const preview = await makeWatermarkedPreview(svg, fontFamily);
      if (version === operation.current) {
        setArtwork(preview);
        setPhotoIndex(0);
        window.requestAnimationFrame(() => {
          galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } catch (failure) {
      if (version === operation.current) {
        setArtwork(null);
        setError(failure instanceof Error ? failure.message : 'محاسبهٔ این آسمان انجام نشد.');
      }
    } finally {
      if (version === operation.current) setBusy(false);
    }
  }, [nemad]);

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('edit');
    if (!purchaseEnabled || !key) return;
    const item = readShopCart().find((entry) => entry.key === key && entry.productId === (nemad ? 'nm' : 'p02'));
    if (!item || (nemad && item.details.nemadMonth !== 'bahman')) return;
    const index = sizes.findIndex((size) => size.dimension === item.size);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setInput(item.details);
      setEditingKey(item.key);
      if (index >= 0) {
        setSizeIndex(index);
        if (!nemad) setPhotoIndex([5, 3, 1][index]);
      }
      if (nemad) {
        setNemadTheme(item.details.nemadTheme === 'light' ? 'light' : 'dark');
        const checked = validateBahmanPreview(item.details.names, item.details.date,
          { time: item.details.time, cityId: item.details.cityId });
        if (checked.ok) { setNemadPreview(checked.value); setPhotoIndex(0); }
      }
    });
    return () => { cancelled = true; };
  }, [purchaseEnabled, nemad, sizes]);

  useEffect(() => {
    const dialog = zoomDialog.current;
    if (!dialog) return;
    if (zoomOpen && !dialog.open) dialog.showModal();
    if (!zoomOpen && dialog.open) dialog.close();
  }, [zoomOpen]);

  function change<K extends keyof Personalization>(field: K, value: Personalization[K]) {
    operation.current += 1;
    setArtwork(null);
    setNemadPreview(null);
    if (nemad && (field === 'date' || field === 'names')) setNemadNeedsDetails(false);
    setPhotoIndex((previous) => previous === 0 ? 1 : previous);
    setBusy(false);
    setError('');
    setInput((previous) => field === 'city'
      ? { ...previous, city: String(value), cityId: '' }
      : { ...previous, [field]: value });
  }

  function pickCity(cityId: string) {
    const city = findHalleusCityById(cityId);
    if (!city) return;
    operation.current += 1;
    setPhotoIndex((previous) => previous === 0 ? 1 : previous);
    setInput((previous) => ({
      ...previous, cityId: city.id, city: getHalleusCityDisplayName(city),
    }));
    setArtwork(null);
    setNemadPreview(null);
    setBusy(false);
    setError('');
  }

  function updateJalaliPart(index: 0 | 1 | 2, value: string) {
    const parts = input.date.split('/');
    const next = [parts[0] || '', parts[1] || '', parts[2] || ''];
    next[index] = value.replace(/[^0-9۰-۹٠-٩]/g, '').slice(0, index === 0 ? 4 : 2);
    change('date', next.join('/'));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    void generate(input);
  }

  function addToCart() {
    if (!purchaseEnabled || !(nemad ? nemadPreview : artwork) || busy) return;
    if (selectedPrice === null && !localCartReview) {
      setError('قیمت قطعی قابل دریافت نیست؛ برای ثبت سفارش بعداً دوباره تلاش کن.');
      return;
    }
    if (nemad) {
      const checked = validateBahmanPreview(input.names, input.date,
        { time: input.time, cityId: input.cityId });
      if (!checked.ok || Number(checked.value.date.split('/')[1]) !== 11) {
        setError(!checked.ok ? checked.message : 'تاریخ تولد باید در ماه بهمن باشد.');
        return;
      }
      if (!addShopCartItem('nm', sizes[sizeIndex].dimension, {
        ...input, calendar: 'jalali', message: '', nemadMonth: 'bahman', nemadTheme,
      }, editingKey ?? undefined)) {
        setError('افزودن به سبد ممکن نشد؛ اطلاعات سفارش و فضای مرورگر را بررسی کن.');
        return;
      }
      router.push('/shop/cart');
      return;
    }
    const validated = validateShopMoment('p02', input);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    try {
      const details = {
        ...input,
        names: safeShopArtworkText(input.names, 'نام'),
        message: safeShopArtworkText(input.message, 'پیام'),
      };
      if (!addShopCartItem('p02', SHOP_P02_SIZES[sizeIndex].dimension, details, editingKey ?? undefined)) {
        setError('افزودن به سبد انجام نشد؛ فضای ذخیرهٔ مرورگر یا تعداد آثار را بررسی کن.');
        return;
      }
      router.push('/shop/cart');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'ذخیرهٔ مشخصات تابلو انجام نشد.');
    }
  }

  const galleryCount = gallery.length + 1;
  const currentPhoto = gallery[Math.max(0, photoIndex - 1)];
  const hasPreview = nemad ? Boolean(nemadPreview) : Boolean(artwork);
  const showingPreview = photoIndex === 0 && hasPreview;
  const displayLabel = showingPreview ? 'پیش‌نمایش تابلوی من' : currentPhoto.label;
  const displayAlt = showingPreview ? (nemad ? 'طرح شخصی نماد من با فونت مصوب' :
    'پیش‌نمایش واترمارک‌دار تابلوی شخصی‌سازی‌شده') : currentPhoto.alt;
  const gallerySwipe = useShopGallerySwipe(changePhoto);

  function changePhoto(step: number) {
    const first = hasPreview ? 0 : 1;
    const count = galleryCount - first;
    setPhotoIndex((index) => first + ((index - first + step + count) % count));
  }


  return <main className={[pdStyles.page, styles.page].join(' ')} dir="rtl"
    data-shop-page={nemad ? 'nm-live-product' : 'p02-live-product'}>
    <div className={pdStyles.content}>
      <section className={pdStyles.productHero} aria-label={nemad ? nemad.product.title : 'تابلو آسمان تولد'}>
        <div ref={galleryRef} className={pdStyles.gallery} style={{ scrollMarginTop: 88 }}>
          <nav className={pdStyles.breadcrumbs} aria-label="مسیر صفحه">
            <Link href="/">هالیوس</Link><span aria-hidden="true">/</span>
            <Link href="/shop">فروشگاه</Link><span aria-hidden="true">/</span>
            <span aria-current="page">{nemad ? nemad.product.title : 'آسمان تولد'}</span>
          </nav>
          <button type="button" className={[pdStyles.mainPhotoButton, pdStyles.p01MainPhoto].join(' ')}
            {...gallerySwipe.touchHandlers} style={{ touchAction: 'pan-y pinch-zoom' }}
            onClick={(event) => { if (event.detail === 0 || gallerySwipe.canOpenZoom()) setZoomOpen(true); }}
            aria-label={'بزرگ‌نمایی ' + displayLabel}>
            {showingPreview && nemad && nemadPreview
              ? <span className={pdStyles.nemadArtwork}><NemadPreviewWatermark><NemadManBahmanArtwork
                  name={nemadPreview.name} date={nemadPreview.gregorianDate}
                  sign={nemadPreview.sign} theme={nemadTheme} /></NemadPreviewWatermark></span>
              : showingPreview && artwork
              ? <Image unoptimized src={artwork} alt={displayAlt} fill
                  sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 660px"
                  className={pdStyles.portraitPhoto} />
              : <Image key={currentPhoto.src} src={currentPhoto.src} alt={currentPhoto.alt} fill
                  priority={photoIndex === 1}
                  sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 660px"
                  className={pdStyles.portraitPhoto} />}
            <span className={pdStyles.zoomHint} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5M10.5 8v5M8 10.5h5" />
              </svg>
            </span>
          </button>
          <div className={[pdStyles.thumbnails, pdStyles.p01Thumbnails].join(' ')} aria-label="تصاویر محصول و پیش‌نمایش">
            <button type="button" disabled={!hasPreview}
              className={[pdStyles.thumbnail, styles.previewThumb, showingPreview ? pdStyles.thumbnailActive : ''].filter(Boolean).join(' ')}
              onClick={() => setPhotoIndex(0)} aria-pressed={showingPreview}
              aria-label={hasPreview ? 'نمایش پیش‌نمایش تابلوی من' : 'پس از شخصی‌سازی، پیش‌نمایش تابلوی من اینجا ظاهر می‌شود'}>
              {nemad && nemadPreview
                ? <span className={pdStyles.nemadArtwork}><NemadPreviewWatermark><NemadManBahmanArtwork
                    name={nemadPreview.name} date={nemadPreview.gregorianDate}
                    sign={nemadPreview.sign} theme={nemadTheme} /></NemadPreviewWatermark></span>
                : artwork ? <Image unoptimized src={artwork} alt="" fill sizes="88px" />
                : <span className={styles.previewThumbEmpty}>پیش‌نمایش تابلوی من</span>}
            </button>
            {gallery.map((photo, index) => <button type="button" key={photo.src}
              className={[pdStyles.thumbnail, photoIndex === index + 1 ? pdStyles.thumbnailActive : ''].filter(Boolean).join(' ')}
              onClick={() => setPhotoIndex(index + 1)} aria-pressed={photoIndex === index + 1}
              aria-label={'نمایش تصویر ' + (index + 2) + ': ' + photo.label}>
              <Image src={photo.src} alt={nemad ? photo.alt : ''} fill sizes="(max-width: 760px) 68px, 88px" />
            </button>)}
          </div>
          {!nemad ? <>
            <p className={pdStyles.galleryPosition} aria-live="polite">
              تصویر {formatPrice(photoIndex + 1)} از {formatPrice(galleryCount)} · {displayLabel}
            </p>
            {showingPreview ? <p className={styles.previewCaption}>چیدمان ستاره‌ها و صورت‌های فلکی بر اساس تاریخ، ساعت و شهر انتخابی تو ساخته شده و مبنای طراحی تابلوی نهایی خواهد بود. این تصویر، پیش‌نمایش کم‌رزولوشن و واترمارک‌دار است.</p> : null}
            <p className={pdStyles.galleryCaption}>شش موکاپ تأییدشده از شاسی‌های بدون قاب در سه اندازهٔ ۱۰×۱۵، ۲۰×۳۰ و ۳۰×۴۵ سانتی‌متر.</p>
          </> : null}
        </div>

        <div className={pdStyles.productInfo}>
          <div className={pdStyles.productHeading}>
            <h1 className={pdStyles.seoProductHeading}>{nemad?.product.seoHeading ?? BIRTH_SKY_HERO.h1}</h1>
            <p className={pdStyles.tagline}>{nemad?.product.tagline ?? BIRTH_SKY_HERO.tagline}</p>
          </div>
          <div className={pdStyles.purchasePanel}>
            <p className={pdStyles.introduction}>{nemad?.product.introduction ?? BIRTH_SKY_HERO.intro[1].replaceAll('**', '')}</p>
            <div className={pdStyles.priceBlock} aria-live="polite">
              <span className={pdStyles.priceLabel}>{previewBasePrice !== null ? 'قیمت پایهٔ این اندازه' : 'قیمت این اندازه'}</span>
              <p className={pdStyles.price}><bdi>{visiblePrice === null ? (livePrices.error ? 'قیمت در دسترس نیست' : 'در حال دریافت…') : formatPrice(visiblePrice)}</bdi><span>تومان</span></p>
            </div>
            {previewBasePrice !== null ? <p className={styles.priceStatus} role="status">
              {livePrices.error
                ? 'قیمت پایه نمایش داده شده است؛ اتصال قیمت زنده در دسترس نیست. ثبت نهایی سفارش تا تأیید قیمت سرور امکان‌پذیر نیست.'
                : 'قیمت پایه تا دریافت قیمت زنده نمایش داده می‌شود؛ قیمت قطعی پیش از ثبت سفارش از سرور تأیید خواهد شد.'}
            </p> : null}
            <fieldset className={pdStyles.sizes}>
              <legend>اندازهٔ تابلو <small>(سانتی‌متر)</small></legend>
              <div className={pdStyles.sizeGrid}>
                {sizes.map((size, i) => <button type="button" key={size.dimension}
                  className={[pdStyles.sizeChoice, sizeIndex === i ? pdStyles.sizeSelected : ''].filter(Boolean).join(' ')}
                  aria-pressed={sizeIndex === i}
                  onClick={() => { setSizeIndex(i); if (!nemad) setPhotoIndex([5, 3, 1][i]); }}>
                  <span dir="ltr">{size.label}</span>
                </button>)}
              </div>
            </fieldset>
            <a className={pdStyles.sizeGuideLink} href={nemad ? '#nm-size-guide' : '#p02-size-guide'}>مقایسهٔ اندازه‌ها در فضای خانه <span aria-hidden="true">↓</span></a>

            <form id="personalize" className={pdStyles.personalizeForm} onSubmit={submit}
              aria-label={nemad ? 'شخصی‌سازی نماد من' : 'شخصی‌سازی آسمان تولد'}>
              <div className={pdStyles.formIntro}>
                <span className={pdStyles.formKicker}>شخصی‌سازی اثر</span>
                <h2 className={pdStyles.formTitle}>{nemad ? 'نماد چه کسی را بسازیم؟' : 'آسمان کدام لحظه را نگه داریم؟'}</h2>
                <p className={pdStyles.formPoem}>{nemad
                  ? 'نام و تاریخ تولد را وارد کن تا طرح شخصی با رندرر مصوب نماد من ساخته شود.'
                  : 'تاریخ، ساعت و شهر را انتخاب کن تا هالیوس آسمان همان لحظه را برای تو به تصویر بکشد.'}</p>
              </div>
              {nemad ? <div className={pdStyles.calendarChooser}>
                <span className={pdStyles.calendarLabel}>مدل تابلو</span>
                <div className={pdStyles.calendarSwitch} role="group" aria-label="رنگ نماد من">
                  {([['dark', 'مینیمال تیره'], ['light', 'مینیمال روشن']] as const).map(([theme, label]) =>
                    <button key={theme} type="button" disabled={busy}
                      className={[pdStyles.calendarOption, nemadTheme === theme ? pdStyles.calendarActive : ''].filter(Boolean).join(' ')}
                      aria-pressed={nemadTheme === theme} onClick={() => setNemadTheme(theme)}>{label}</button>)}
                </div>
              </div> : <div className={pdStyles.calendarChooser}>
                <span className={pdStyles.calendarLabel}>تقویم</span>
                <div className={pdStyles.calendarSwitch} role="group" aria-label="نوع تقویم">
                  {([['jalali', 'شمسی'], ['gregorian', 'میلادی']] as const).map(([calendar, label]) =>
                    <button key={calendar} type="button"
                      className={[pdStyles.calendarOption, input.calendar === calendar ? pdStyles.calendarActive : ''].filter(Boolean).join(' ')}
                      aria-pressed={input.calendar === calendar} disabled={busy}
                      onClick={() => {
                        if (input.calendar !== calendar) {
                          operation.current += 1;
                          setArtwork(null); setPhotoIndex((previous) => previous === 0 ? 1 : previous);
                          setBusy(false); setError('');
                          setInput((previous) => ({ ...previous, calendar, date: '' }));
                        }
                      }}>{label}</button>)}
                </div>
              </div>}
              <div className={pdStyles.formField}>
                <label htmlFor={input.calendar === 'jalali' ? 'p02-jalali-year' : 'p02-gregorian-date'}>{nemad ? 'تاریخ تولد شمسی' : 'تاریخ آن لحظه'}</label>
                {input.calendar === 'jalali'
                  ? <div className={pdStyles.jalaliDateParts} role="group" aria-label="تاریخ شمسی: سال، ماه و روز">
                    {([
                      { label: 'سال', placeholder: '۱۴۰۳', id: 'p02-jalali-year', length: 4 },
                      { label: 'ماه', placeholder: '۰۸', id: 'p02-jalali-month', length: 2 },
                      { label: 'روز', placeholder: '۱۵', id: 'p02-jalali-day', length: 2 },
                    ] as const).map(({ label, placeholder, id, length }, index) =>
                      <div className={pdStyles.jalaliDatePart} key={id}>
                        <label htmlFor={id}>{label}</label>
                        <input id={id} type="text" inputMode="numeric" dir="ltr" required
                          maxLength={length} placeholder={placeholder} disabled={busy}
                          value={input.date.split('/')[index] || ''}
                          onChange={(event) => updateJalaliPart(index as 0 | 1 | 2, event.target.value)} />
                      </div>)}
                  </div>
                  : <div className={pdStyles.dateInputShell}>
                    <input id="p02-gregorian-date" type="date" required dir="ltr"
                      disabled={busy} value={input.date}
                      onChange={(event) => change('date', event.target.value)} />
                  </div>}
              </div>
              {(!nemad || nemadNeedsDetails) ? <div className={pdStyles.dateFields}>
                <div className={pdStyles.formField}>
                  <label htmlFor="p02-time">{nemad ? 'ساعت تولد (برای تعیین دقیق برج)' : 'ساعت دقیق آن لحظه'}</label>
                  <input id="p02-time" type="time" dir="ltr" required disabled={busy}
                    value={input.time} onChange={(event) => change('time', event.target.value)} />
                </div>
                <div className={pdStyles.formField}>
                  <label htmlFor="p02-birth-city">{nemad ? 'شهر تولد (برای تعیین دقیق برج)' : 'شهر آن لحظه'}</label>
                  <input id="p02-birth-city" required maxLength={100} autoComplete="off" disabled={busy}
                    placeholder="نام شهر را بنویس و انتخاب کن" value={input.city}
                    onChange={(event) => change('city', event.target.value)} />
                  {citySuggestions.length ? <ul className={pdStyles.citySuggestions} aria-label="شهرهای پیشنهادی">
                    {citySuggestions.map((city) => <li key={city.id}>
                      <button type="button" onClick={() => pickCity(city.id)}>
                        {getHalleusCityDisplayName(city)}
                      </button>
                    </li>)}
                  </ul> : null}
                </div>
              </div> : null}
              <div className={pdStyles.formField}>
                <label htmlFor="p02-names">نام روی تابلو {nemad ? null : <small>(اختیاری)</small>}</label>
                <input id="p02-names" maxLength={nemad ? 28 : 60} required={Boolean(nemad)} disabled={busy} value={input.names}
                  placeholder={nemad ? 'نام شما' : 'نامی که این آسمان متعلق به اوست'}
                  onChange={(event) => change('names', event.target.value)} />
              </div>
              {!nemad ? <details className={pdStyles.optionalFields}>
                <summary>پیامی هم کنار این آسمان می‌گذاری؟ <span aria-hidden="true">+</span></summary>
                <div className={pdStyles.optionalFieldsInner}>
                  <div className={pdStyles.formField}>
                    <label htmlFor="p02-message">پیام کوتاه <small>(اختیاری)</small></label>
                    <textarea id="p02-message" maxLength={60} rows={2} disabled={busy}
                      placeholder="چند کلمه برای این لحظه" value={input.message}
                      onChange={(event) => change('message', event.target.value)} />
                  </div>
                </div>
              </details> : null}
              {error ? <p className={pdStyles.formError} role="alert">{error}</p> : null}
              <button className={pdStyles.confirmAction} type="submit" disabled={busy || ((!nemad || nemadNeedsDetails) && !input.cityId)}>
                <span className={pdStyles.confirmLabel}>{busy ? (nemad ? 'در حال ساخت پیش‌نمایش…' : 'در حال ساخت آسمان…') :
                  nemad ? 'ساخت پیش‌نمایش نماد من' : BIRTH_SKY_HERO.button}</span>
                <span className={pdStyles.confirmArrow} aria-hidden="true">←</span>
              </button>

              {purchaseEnabled ? <>
                <button type="button" className={styles.orderAction}
                  disabled={!hasPreview || busy || (selectedPrice === null && !localCartReview)} onClick={addToCart}>
                  {editingKey ? 'ثبت تغییرات تابلو در سبد' : 'افزودن تابلو به سبد خرید'}
                </button>
                <p className={styles.previewAvailability}>
                  {hasPreview && localCartReview && selectedPrice === null
                    ? 'می‌توانی انتخابت را در سبد محلی ببینی؛ ادامه تا ثبت سفارش و پرداخت فقط پس از دریافت قیمت قطعی از سرور فعال می‌شود.'
                    : hasPreview ? 'طرح شخصی‌ات آماده است. اندازه را انتخاب کن و تابلو را به سبد خرید اضافه کن؛ پرداخت در مرحلهٔ بعد با کارت‌به‌کارت و تأیید دستی انجام می‌شود.'
                    : 'برای سفارش، ابتدا با دکمهٔ بالا پیش‌نمایش تابلویت را بساز.'}
                </p>
              </> : <p className={styles.previewAvailability}>پیش‌نمایش فعال است؛ ثبت سفارش این محصول تا زمان تأیید انتشار فروش بسته می‌ماند.</p>}
            </form>
            <div className={pdStyles.specification}>
              <span>{nemad ? 'محاسبهٔ نشان خورشیدی بر اساس تاریخ تولد' : 'محاسبهٔ ستاره‌ها براساس تاریخ، ساعت و شهر'}</span>
              <span>چاپ مات روی شاسی بدون قاب در سه اندازه</span>
            </div>
          </div>
        </div>
      </section>

      <section className={pdStyles.dimensionsSection} id={nemad ? 'nm-size-guide' : 'p02-size-guide'} aria-labelledby="p02-size-heading">
        <div className={pdStyles.centerIntro}>
          <span className={pdStyles.sectionKicker}>راهنمای انتخاب اندازه</span>
          <h2 id="p02-size-heading">کدام اندازه برای فضای تو مناسب‌تر است؟</h2>
          <p>{nemad ? 'سه اندازهٔ چاپ انتخاب می‌کنی؛ تصویرهای زیر نمونهٔ چیدمان‌اند و مقیاس دقیق اندازه‌ها در آن‌ها تضمین نمی‌شود.' : 'شاسی‌های ۱۰×۱۵، ۲۰×۳۰ و ۳۰×۴۵ سانتی‌متری را در محیط واقعی ببین.'}</p>
        </div>
        <div className={pdStyles.sizeIllustration}>
          {(nemad ? [
            { src: gallery[0].src, alt: gallery[0].alt, size: '۱۰ × ۱۵', label: 'نمونهٔ چیدمان · دیوار' },
            { src: gallery[1].src, alt: gallery[1].alt, size: '۲۰ × ۳۰', label: 'نمونهٔ چیدمان · بسته‌بندی هدیه' },
            { src: gallery[3].src, alt: gallery[3].alt, size: '۳۰ × ۴۵', label: 'نمونهٔ چیدمان · روشن ۳۰×۴۵' },
          ] : [
            { src: BIRTH_SKY_GALLERY[4].src, alt: BIRTH_SKY_GALLERY[4].alt, size: '۱۰ × ۱۵', label: 'میز و شلف' },
            { src: BIRTH_SKY_GALLERY[2].src, alt: BIRTH_SKY_GALLERY[2].alt, size: '۲۰ × ۳۰', label: 'دیوار اتاق' },
            { src: BIRTH_SKY_GALLERY[0].src, alt: BIRTH_SKY_GALLERY[0].alt, size: '۳۰ × ۴۵', label: 'دیوار اصلی' },
          ]).map((item) => <figure key={item.size} className={pdStyles.sizeScene}>
            <div className={pdStyles.sizeScenePhoto}>
              <Image src={item.src} alt={item.alt} fill sizes="(max-width: 760px) 78vw, 370px"
                className={styles.sizePhoto} />
            </div>
            <figcaption><strong>{item.size}</strong><span>{item.label}</span></figcaption>
          </figure>)}
        </div>
      </section>

      {nemad ? <NemadManEditorial product={nemad.product} /> : <BirthSkyEditorial />}

      <dialog ref={zoomDialog} onClose={() => setZoomOpen(false)}
        className={pdStyles.zoomDialog} aria-label={nemad ? 'بزرگ‌نمایی تصاویر نماد من' : 'بزرگ‌نمایی تصاویر آسمان تولد'}>
        <div className={pdStyles.zoomInner}>
          <button type="button" className={pdStyles.dialogClose} onClick={() => setZoomOpen(false)} aria-label="بستن">×</button>
          <div className={pdStyles.zoomPhoto} {...gallerySwipe.touchHandlers} style={{ touchAction: 'pan-y pinch-zoom' }}>
            {showingPreview && nemad && nemadPreview
              ? <span className={pdStyles.nemadArtwork}><NemadPreviewWatermark><NemadManBahmanArtwork
                  name={nemadPreview.name} date={nemadPreview.gregorianDate}
                  sign={nemadPreview.sign} theme={nemadTheme} /></NemadPreviewWatermark></span>
              : showingPreview && artwork
                ? <Image unoptimized src={artwork} alt={displayAlt} fill sizes="95vw" />
                : <Image src={currentPhoto.src} alt={currentPhoto.alt} fill sizes="95vw" />}
          </div>
          <div className={pdStyles.zoomActions}>
            <button type="button" onClick={() => changePhoto(-1)}>تصویر قبل</button>
            <span>{formatPrice(photoIndex + 1)} از {formatPrice(galleryCount)}</span>
            <button type="button" onClick={() => changePhoto(1)}>تصویر بعد</button>
          </div>
        </div>
      </dialog>
    </div>
  </main>;
}
