'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { filterHalleusCities, findHalleusCityById, getHalleusCityDisplayName } from '@/lib/locations/cities';
import { safeShopArtworkText } from '@/lib/shop/shop-artwork-text';
import { validateShopMoment } from '@/lib/shop/shop-personalization';
import { BIRTH_SKY_HERO } from './birth-sky-content';
import { BIRTH_SKY_GALLERY } from './birth-sky-gallery';
import { BirthSkyEditorial } from './BirthSkyEditorial';
import { SHOP_SIZES } from './product-detail-data';
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

export function BirthSkyLiveProduct() {
  const [input, setInput] = useState<Personalization>(initial);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(2);
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomDialog = useRef<HTMLDialogElement>(null);
  const operation = useRef(0);
  const skyOnlyArtwork = useRef<string | null>(null);
  const citySuggestions = useMemo(() => (
    input.cityId || input.city.trim().length < 2
      ? [] : filterHalleusCities(input.city).slice(0, 8)
  ), [input.city, input.cityId]);

  const generate = useCallback(async (values: Personalization, first = false) => {
    const version = ++operation.current;
    if (!first) {
      setBusy(true);
      setError('');
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
      if (version === operation.current) {
        // One computed SVG is the single source for the page and PNG output.
        skyOnlyArtwork.current = svg;
        setArtwork(svg);
      }
    } catch (failure) {
      if (version === operation.current) {
        skyOnlyArtwork.current = null;
        setArtwork(null);
        setError(failure instanceof Error ? failure.message : 'محاسبهٔ این آسمان انجام نشد.');
      }
    } finally {
      if (version === operation.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    // Defer the initial calculation outside the synchronous effect phase.
    // An unmounted or Strict Mode replayed effect must not launch stale work.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void generate(initial, true);
    });
    return () => {
      cancelled = true;
      operation.current += 1;
    };
  }, [generate]);

  useEffect(() => {
    const dialog = zoomDialog.current;
    if (!dialog) return;
    if (zoomOpen && !dialog.open) dialog.showModal();
    if (!zoomOpen && dialog.open) dialog.close();
  }, [zoomOpen]);

  function change<K extends keyof Personalization>(field: K, value: Personalization[K]) {
    operation.current += 1;
    skyOnlyArtwork.current = null;
    setArtwork(null);
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
    skyOnlyArtwork.current = null;
    setInput((previous) => ({
      ...previous, cityId: city.id, city: getHalleusCityDisplayName(city),
    }));
    setArtwork(null);
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

  async function downloadPng() {
    if (!artwork || downloadBusy) return;
    setDownloadBusy(true);
    setError('');
    const fullScene = skyOnlyArtwork.current;
    if (!fullScene) {
      setError('نقشه هنوز برای خروجی آماده نیست.');
      setDownloadBusy(false);
      return;
    }
    // Canvas cannot reliably resolve the external Next localFont when an SVG
    // is loaded as an Image. Rasterize identical geometry without its text;
    // paint the exact SVG text nodes with loaded Estedad on the same canvas.
    const printDom = new DOMParser().parseFromString(fullScene, 'image/svg+xml');
    if (printDom.querySelector('parsererror')) {
      setError('خواندن تصویر آسمان برای PNG انجام نشد.');
      setDownloadBusy(false);
      return;
    }
    printDom.querySelectorAll('text').forEach((element) => element.remove());
    const bareSky = new XMLSerializer().serializeToString(printDom.documentElement);
    const svgUrl = URL.createObjectURL(new Blob([bareSky], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new window.Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('تبدیل تصویر آسمان انجام نشد.'));
        image.src = svgUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 1500;
      canvas.height = 2250;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('امکان ذخیرهٔ تصویر در این مرورگر وجود ندارد.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const fontRoot = document.querySelector('[data-shop-page="p02-live-product"]');
      const family = fontRoot
        ? getComputedStyle(fontRoot).getPropertyValue('--font-p02-estedad').trim()
        : '';
      if (!family) throw new Error('فونت اختصاصی اثر هنوز آماده نیست.');
      const city = findHalleusCityById(input.cityId);
      if (!city) throw new Error('شهر انتخابی معتبر نیست.');
      const artModule = await import('@/lib/shop/shop-birth-sky-r9');
      context.save();
      context.scale(0.5, 0.5);
      try {
        await artModule.paintShopBirthSkyR9Text(context, fullScene, family);
      } finally {
        context.restore();
      }
      const png = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('فایل PNG ساخته نشد.')), 'image/png');
      });
      const pngUrl = URL.createObjectURL(png);
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = 'halleus-birth-sky-real-map.png';
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1500);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'دانلود تصویر انجام نشد.');
    } finally {
      URL.revokeObjectURL(svgUrl);
      setDownloadBusy(false);
    }
  }

  return <main className={[pdStyles.page, styles.page].join(' ')} dir="rtl" data-shop-page="p02-live-product">
    <div className={pdStyles.content}>
      <section className={pdStyles.productHero} aria-label="تابلو آسمان تولد">
        <div className={pdStyles.gallery}>
          <nav className={pdStyles.breadcrumbs} aria-label="مسیر صفحه">
            <Link href="/">هالیوس</Link><span aria-hidden="true">/</span>
            <Link href="/shop">فروشگاه</Link><span aria-hidden="true">/</span>
            <span aria-current="page">آسمان تولد</span>
          </nav>
          <button type="button" className={[pdStyles.mainPhotoButton, pdStyles.p01MainPhoto].join(' ')}
            onClick={() => setZoomOpen(true)}
            aria-label={'بزرگ‌نمایی '+BIRTH_SKY_GALLERY[photoIndex].label}>
            <Image key={BIRTH_SKY_GALLERY[photoIndex].src}
              src={BIRTH_SKY_GALLERY[photoIndex].src}
              alt={BIRTH_SKY_GALLERY[photoIndex].alt} fill priority={photoIndex === 0}
              sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 660px"
              className={pdStyles.portraitPhoto} />
            <span className={pdStyles.zoomHint} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5M10.5 8v5M8 10.5h5" />
              </svg>
            </span>
          </button>
          <div className={[pdStyles.thumbnails, pdStyles.p01Thumbnails].join(' ')} aria-label="تصاویر محصول">
            {BIRTH_SKY_GALLERY.map((photo, index) => <button type="button" key={photo.src}
              className={[pdStyles.thumbnail, photoIndex === index ? pdStyles.thumbnailActive : ''].filter(Boolean).join(' ')}
              onClick={() => setPhotoIndex(index)} aria-pressed={photoIndex === index}
              aria-label={'نمایش تصویر '+(index + 1)+': '+photo.label}>
              <Image src={photo.src} alt="" fill sizes="(max-width: 760px) 68px, 88px" />
            </button>)}
          </div>
          <p className={pdStyles.galleryPosition} aria-live="polite">
            تصویر {new Intl.NumberFormat('fa-IR').format(photoIndex + 1)} از {new Intl.NumberFormat('fa-IR').format(BIRTH_SKY_GALLERY.length)} · {BIRTH_SKY_GALLERY[photoIndex].label}
          </p>
          <p className={pdStyles.galleryCaption}>شش موکاپ تأییدشده از شاسی‌های بدون قاب در سه اندازهٔ ۱۰×۱۵، ۲۰×۳۰ و ۳۰×۴۵ سانتی‌متر.</p>
        </div>

        <div className={pdStyles.productInfo}>
          <div className={pdStyles.productHeading}>
            <h1 className={pdStyles.seoProductHeading}>{BIRTH_SKY_HERO.h1}</h1>
            <p className={pdStyles.tagline}>{BIRTH_SKY_HERO.tagline}</p>
          </div>
          <div className={pdStyles.purchasePanel}>
            <p className={pdStyles.introduction}>{BIRTH_SKY_HERO.intro[1].replaceAll('**', '')}</p>
            <fieldset className={pdStyles.sizes}>
              <legend>اندازهٔ تابلو <small>(سانتی‌متر)</small></legend>
              <div className={pdStyles.sizeGrid}>
                {SHOP_SIZES.map((size, i) => <button type="button" key={size.dimension}
                  className={[pdStyles.sizeChoice, sizeIndex === i ? pdStyles.sizeSelected : ''].filter(Boolean).join(' ')}
                  aria-pressed={sizeIndex === i}
                  onClick={() => { setSizeIndex(i); setPhotoIndex([4, 2, 0][i]); }}>
                  <span dir="ltr">{size.label}</span>
                </button>)}
              </div>
            </fieldset>
            <a className={pdStyles.sizeGuideLink} href="#p02-size-guide">مقایسهٔ اندازه‌ها در فضای خانه <span aria-hidden="true">↓</span></a>

            <form id="p02-personalize" className={pdStyles.personalizeForm} onSubmit={submit}
              aria-label="شخصی‌سازی آسمان تولد">
              <div className={pdStyles.formIntro}>
                <span className={pdStyles.formKicker}>شخصی‌سازی اثر</span>
                <h2 className={pdStyles.formTitle}>آسمان کدام لحظه را نگه داریم؟</h2>
                <p className={pdStyles.formPoem}>تاریخ، ساعت و شهر را انتخاب کن تا هالیوس آسمان همان لحظه را برای تو به تصویر بکشد.</p>
              </div>
              <div className={pdStyles.calendarChooser}>
                <span className={pdStyles.calendarLabel}>تقویم</span>
                <div className={pdStyles.calendarSwitch} role="group" aria-label="نوع تقویم">
                  {([['jalali', 'شمسی'], ['gregorian', 'میلادی']] as const).map(([calendar, label]) =>
                    <button key={calendar} type="button"
                      className={[pdStyles.calendarOption, input.calendar === calendar ? pdStyles.calendarActive : ''].filter(Boolean).join(' ')}
                      aria-pressed={input.calendar === calendar} disabled={busy}
                      onClick={() => {
                        if (input.calendar !== calendar) {
                          operation.current += 1;
                          skyOnlyArtwork.current = null;
                          setArtwork(null); setBusy(false); setError('');
                          setInput((previous) => ({ ...previous, calendar, date: '' }));
                        }
                      }}>{label}</button>)}
                </div>
              </div>
              <div className={pdStyles.formField}>
                <label htmlFor={input.calendar === 'jalali' ? 'p02-jalali-year' : 'p02-gregorian-date'}>تاریخ آن لحظه</label>
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
              <div className={pdStyles.dateFields}>
                <div className={pdStyles.formField}>
                  <label htmlFor="p02-time">ساعت دقیق آن لحظه</label>
                  <input id="p02-time" type="time" dir="ltr" required disabled={busy}
                    value={input.time} onChange={(event) => change('time', event.target.value)} />
                </div>
                <div className={pdStyles.formField}>
                  <label htmlFor="p02-birth-city">شهر آن لحظه</label>
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
              </div>
              <div className={pdStyles.formField}>
                <label htmlFor="p02-names">نام روی تابلو <small>(اختیاری)</small></label>
                <input id="p02-names" maxLength={60} disabled={busy} value={input.names}
                  placeholder="نامی که این آسمان متعلق به اوست"
                  onChange={(event) => change('names', event.target.value)} />
              </div>
              <details className={pdStyles.optionalFields}>
                <summary>پیامی هم کنار این آسمان می‌گذاری؟ <span aria-hidden="true">+</span></summary>
                <div className={pdStyles.optionalFieldsInner}>
                  <div className={pdStyles.formField}>
                    <label htmlFor="p02-message">پیام کوتاه <small>(اختیاری)</small></label>
                    <textarea id="p02-message" maxLength={60} rows={2} disabled={busy}
                      placeholder="چند کلمه برای این لحظه" value={input.message}
                      onChange={(event) => change('message', event.target.value)} />
                  </div>
                </div>
              </details>
              {error ? <p className={pdStyles.formError} role="alert">{error}</p> : null}
              <button className={pdStyles.confirmAction} type="submit" disabled={busy || !input.cityId}>
                <span className={pdStyles.confirmLabel}>{busy ? 'در حال ساخت آسمان…' : BIRTH_SKY_HERO.button}</span>
                <span className={pdStyles.confirmArrow} aria-hidden="true">←</span>
              </button>
              <a className={styles.previewJump} href="#p02-live-preview">دیدن نقشهٔ محاسبه‌شدهٔ آسمان من <span aria-hidden="true">↓</span></a>
              <p className={styles.previewAvailability}>پیش‌نمایش شخصی‌سازی فعال است؛ امکان ثبت سفارش و پرداخت این محصول هنوز فعال نشده است.</p>
            </form>
            <div className={pdStyles.specification}>
              <span>محاسبهٔ ستاره‌ها براساس تاریخ، ساعت و شهر</span>
              <span>چاپ مات روی شاسی بدون قاب در سه اندازه</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.p02PreviewSection} id="p02-live-preview" aria-labelledby="p02-live-preview-heading">
        <div className={styles.p02PreviewCopy}>
          <span className={pdStyles.sectionKicker}>نمای زندهٔ اثر</span>
          <h2 id="p02-live-preview-heading">آسمانِ مخصوص تو</h2>
          <p>این نقشه از تاریخ، ساعت و شهر انتخابی‌ات محاسبه می‌شود. وقتی اطلاعات را تغییر می‌دهی و «ساخت آسمان» را می‌زنی، ستاره‌ها نیز جای تازه‌ای پیدا می‌کنند.</p>
          {artwork ? <div className={styles.imageActions}>
            <button type="button" disabled={downloadBusy} onClick={() => void downloadPng()}>
              {downloadBusy ? 'در حال آماده‌سازی PNG…' : 'دریافت تصویر شخصی من (PNG)'}
            </button>
          </div> : null}
        </div>
        <div className={styles.p02PreviewArtwork}>
          <div className={styles.artwork}>
            {artwork ? <div className={styles.svgArtwork} role="img"
              aria-label="نقشهٔ محاسبه‌شدهٔ ستاره‌های همان لحظه"
              dangerouslySetInnerHTML={{ __html: artwork }} />
              : <div className={styles.emptyArtwork} role="status">
                <span className={styles.emptySymbol} aria-hidden="true">✧</span>
                <strong>{busy ? 'در حال محاسبهٔ ستاره‌ها…' : 'آسمان انتخابی‌ات اینجا شکل می‌گیرد'}</strong>
              </div>}
          </div>
        </div>
      </section>

      <section className={pdStyles.dimensionsSection} id="p02-size-guide" aria-labelledby="p02-size-heading">
        <div className={pdStyles.centerIntro}>
          <span className={pdStyles.sectionKicker}>راهنمای انتخاب اندازه</span>
          <h2 id="p02-size-heading">کدام اندازه برای فضای تو مناسب‌تر است؟</h2>
          <p>شاسی‌های ۱۰×۱۵، ۲۰×۳۰ و ۳۰×۴۵ سانتی‌متری را در محیط واقعی ببین.</p>
        </div>
        <div className={pdStyles.sizeIllustration}>
          {[
            { src: BIRTH_SKY_GALLERY[4].src, alt: BIRTH_SKY_GALLERY[4].alt, size: '۱۰ × ۱۵', label: 'میز و شلف' },
            { src: BIRTH_SKY_GALLERY[2].src, alt: BIRTH_SKY_GALLERY[2].alt, size: '۲۰ × ۳۰', label: 'دیوار اتاق' },
            { src: BIRTH_SKY_GALLERY[0].src, alt: BIRTH_SKY_GALLERY[0].alt, size: '۳۰ × ۴۵', label: 'دیوار اصلی' },
          ].map((item) => <figure key={item.size} className={pdStyles.sizeScene}>
            <div className={pdStyles.sizeScenePhoto}>
              <Image src={item.src} alt={item.alt} fill sizes="(max-width: 760px) 78vw, 370px"
                className={styles.sizePhoto} />
            </div>
            <figcaption><strong>{item.size}</strong><span>{item.label}</span></figcaption>
          </figure>)}
        </div>
      </section>

      <BirthSkyEditorial />

      <dialog ref={zoomDialog} onClose={() => setZoomOpen(false)}
        className={pdStyles.zoomDialog} aria-label="بزرگ‌نمایی تصاویر آسمان تولد">
        <div className={pdStyles.zoomInner}>
          <button type="button" className={pdStyles.dialogClose} onClick={() => setZoomOpen(false)} aria-label="بستن">×</button>
          <div className={pdStyles.zoomPhoto}>
            <Image src={BIRTH_SKY_GALLERY[photoIndex].src}
              alt={BIRTH_SKY_GALLERY[photoIndex].alt} fill sizes="95vw" />
          </div>
          <div className={pdStyles.zoomActions}>
            <button type="button" onClick={() => setPhotoIndex((photoIndex + BIRTH_SKY_GALLERY.length - 1) % BIRTH_SKY_GALLERY.length)}>تصویر قبل</button>
            <span>{new Intl.NumberFormat('fa-IR').format(photoIndex + 1)} از {new Intl.NumberFormat('fa-IR').format(BIRTH_SKY_GALLERY.length)}</span>
            <button type="button" onClick={() => setPhotoIndex((photoIndex + 1) % BIRTH_SKY_GALLERY.length)}>تصویر بعد</button>
          </div>
        </div>
      </dialog>
    </div>
  </main>;
}
