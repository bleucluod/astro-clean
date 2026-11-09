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

  return <main className={styles.page} dir="rtl" data-shop-page="p02-live-product">
    <div className={styles.wrap}>
      <nav className={styles.crumb} aria-label="مسیر صفحه">
        <Link href="/shop">فروشگاه هالیوس</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">آسمان تولد</span>
      </nav>

      <div className={styles.hero}>
        <section className={styles.artPanel} aria-label="گالری و پیش‌نمایش آسمان تولد">
          <div className={styles.gallery}>
            <button type="button" className={styles.galleryMain} onClick={() => setZoomOpen(true)}
              aria-label={`بزرگ‌نمایی تصویر ${photoIndex + 1}: ${BIRTH_SKY_GALLERY[photoIndex].label}`}>
              <Image key={BIRTH_SKY_GALLERY[photoIndex].src} src={BIRTH_SKY_GALLERY[photoIndex].src}
                alt={BIRTH_SKY_GALLERY[photoIndex].alt} fill priority={photoIndex === 0}
                sizes="(max-width: 760px) calc(100vw - 30px), (max-width: 980px) 580px, 650px" />
              <span className={styles.galleryZoomHint} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 5 5M10.5 8v5M8 10.5h5" />
                </svg>
              </span>
            </button>
            <div className={styles.galleryThumbs} aria-label="تصاویر محصول">
              {BIRTH_SKY_GALLERY.map((photo, index) => <button type="button" key={photo.src}
                className={`${styles.galleryThumb} ${photoIndex === index ? styles.galleryThumbActive : ''}`}
                onClick={() => setPhotoIndex(index)} aria-pressed={photoIndex === index}
                aria-label={`نمایش تصویر ${index + 1}: ${photo.label}`}>
                <Image src={photo.src} alt="" fill sizes="(max-width: 760px) 76px, 112px" />
              </button>)}
            </div>
            <p className={styles.galleryPosition} aria-live="polite">تصویر {new Intl.NumberFormat('fa-IR').format(photoIndex + 1)} از {new Intl.NumberFormat('fa-IR').format(BIRTH_SKY_GALLERY.length)} · {BIRTH_SKY_GALLERY[photoIndex].label}</p>
            <p className={styles.galleryCaption}>شش نمای واقعی از شاسی‌های ۱۰×۱۵، ۲۰×۳۰ و ۳۰×۴۵ سانتی‌متری، در فضای خانه؛ هر آسمان با نام و لحظهٔ خودش.</p>
          </div>
          <section className={styles.livePreview} id="p02-live-preview" aria-labelledby="p02-live-preview-title">
            <h2 id="p02-live-preview-title">آسمانِ مخصوص تو</h2>
            <p>با انتخاب تاریخ، ساعت و شهر، نقشهٔ ستاره‌های آن لحظه همین‌جا شکل می‌گیرد.</p>
            <div className={styles.artwork}>
              {artwork ? <div className={styles.svgArtwork} role="img"
                aria-label="طرح محاسبه‌شدهٔ نقشهٔ ستاره‌های آسمان تولد"
                dangerouslySetInnerHTML={{ __html: artwork }} /> :
                <div className={styles.emptyArtwork} role="status">
                  <span className={styles.emptySymbol} aria-hidden="true">✧</span>
                  <strong>{busy ? 'در حال محاسبهٔ ستاره‌ها…' : 'آسمان انتخابی‌ات اینجا شکل می‌گیرد'}</strong>
                  <p>نقشه با تاریخ، ساعت و شهر انتخابی تو ساخته می‌شود.</p>
                </div>}
            </div>
            {artwork ? <div className={styles.imageActions}>
              <span>طرح شخصی تو، پیش از انتخاب شاسی</span>
              <button type="button" disabled={downloadBusy} onClick={() => void downloadPng()}>
                {downloadBusy ? 'در حال آماده‌سازی PNG…' : 'دریافت تصویر (PNG)'}
              </button>
            </div> : null}
          </section>
        </section>

        <section className={styles.details} aria-labelledby="birth-sky-title">
          <span className={styles.eyebrow}>HALLEUS / CELESTIAL ART / P02</span>
          <h1 id="birth-sky-title">{BIRTH_SKY_HERO.h1}</h1>
          <p className={styles.tagline}>{BIRTH_SKY_HERO.tagline}</p>
          {BIRTH_SKY_HERO.intro.map((paragraph, i) => <p key={i} className={styles.intro}>{paragraph.replaceAll('**', '')}</p>)}
          

          <form id="p02-personalize" className={styles.form} onSubmit={submit} aria-label="شخصی‌سازی آسمان تولد">
            <h2>آسمانِ آن لحظه را بساز</h2>
            <div className={styles.dateRow}>
              <label>تقویم
                <select disabled={busy} value={input.calendar}
                  onChange={(event) => {
                    operation.current += 1;
                    setInput((previous) => ({
                      ...previous, calendar: event.target.value as Personalization['calendar'], date: '',
                    }));
                    skyOnlyArtwork.current = null;
                    setArtwork(null); setError(''); setBusy(false);
                  }}>
                  <option value="jalali">شمسی</option><option value="gregorian">میلادی</option>
                </select>
              </label>
              <label>تاریخ آن لحظه
                <input required disabled={busy} dir="ltr" maxLength={20}
                  value={input.date} placeholder={input.calendar === 'jalali' ? '۱۴۰۳/۰۸/۱۵' : '2024-11-05'}
                  onChange={(event) => change('date', event.target.value)} />
              </label>
            </div>
            <div className={styles.dateRow}>
              <label>ساعت دقیق آن لحظه
                <input type="time" required dir="ltr" disabled={busy} value={input.time}
                  onChange={(event) => change('time', event.target.value)} />
              </label>
              <div className={styles.cityField}>
                <label htmlFor="p02-birth-city">شهر آن لحظه</label>
                <input id="p02-birth-city" required maxLength={100} autoComplete="off" disabled={busy}
                  placeholder="نام شهر را بنویس" value={input.city}
                  onChange={(event) => change('city', event.target.value)} />
                {citySuggestions.length ? <ul className={styles.cityOptions} aria-label="انتخاب شهر تولد">
                  {citySuggestions.map((city) => <li key={city.id}>
                    <button type="button" onClick={() => pickCity(city.id)}>
                      {getHalleusCityDisplayName(city)}
                    </button>
                  </li>)}
                </ul> : null}
              </div>
            </div>
            <label>نام روی تابلو (اختیاری)
              <input maxLength={60} disabled={busy} value={input.names}
                placeholder="نامی که این آسمان متعلق به اوست"
                onChange={(event) => change('names', event.target.value)} />
            </label>
            <label>پیام کوتاه (اختیاری)
              <input maxLength={60} disabled={busy} value={input.message}
                placeholder="چند کلمه برای این لحظه"
                onChange={(event) => change('message', event.target.value)} />
            </label>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <button className={styles.primaryAction} type="submit" disabled={busy || !input.cityId}>
              {busy ? 'در حال ساخت آسمان…' : BIRTH_SKY_HERO.button}
            </button>
          </form>
          <div className={styles.availability}>
            <strong>این اثر فعلاً برای تماشای طرح واقعی باز است.</strong>
            <p>امکان خرید، پرداخت و سفارش آسمان تولد هنوز فعال نشده. بعد از تأیید نهایی طرح و نمونهٔ چاپی، فروشش باز می‌شه.</p>
          </div>
        </section>
      </div>
      <BirthSkyEditorial />
      <dialog ref={zoomDialog} className={styles.galleryDialog} aria-label="بزرگ‌نمایی تصاویر آسمان تولد"
        onClose={() => setZoomOpen(false)}>
        <div className={styles.galleryDialogInner}>
          <button type="button" className={styles.dialogClose} onClick={() => setZoomOpen(false)} aria-label="بستن">×</button>
          <div className={styles.dialogImage}><Image src={BIRTH_SKY_GALLERY[photoIndex].src}
            alt={BIRTH_SKY_GALLERY[photoIndex].alt} fill sizes="95vw" /></div>
          <div className={styles.dialogActions}>
            <button type="button" onClick={() => setPhotoIndex((photoIndex - 1 + BIRTH_SKY_GALLERY.length) % BIRTH_SKY_GALLERY.length)}>تصویر قبل</button>
            <span>{photoIndex + 1} از {BIRTH_SKY_GALLERY.length}</span>
            <button type="button" onClick={() => setPhotoIndex((photoIndex + 1) % BIRTH_SKY_GALLERY.length)}>تصویر بعد</button>
          </div>
        </div>
      </dialog>
    </div>
  </main>;
}
