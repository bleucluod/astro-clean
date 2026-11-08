'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { filterHalleusCities, findHalleusCityById, getHalleusCityDisplayName } from '@/lib/locations/cities';
import { safeShopArtworkText } from '@/lib/shop/shop-artwork-text';
import { validateShopMoment } from '@/lib/shop/shop-personalization';
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
  const operation = useRef(0);
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
      const [starModule, constellationModule, artModule] = await Promise.all([
        import('@/lib/shop/shop-sky-atlas'),
        import('@/lib/shop/shop-constellation-lines'),
        import('@/lib/shop/shop-birth-sky-artwork'),
      ]);
      if (version !== operation.current) return;
      const reference = {
        referenceUtc: validated.referenceUtc,
        latitude: city.latitude,
        longitude: city.longitude,
      };
      const stars = starModule.calculateShopStarAtlas(reference);
      const figures = constellationModule.calculateShopConstellationLines(reference);
      const svg = artModule.renderShopBirthSkyArtwork(stars, figures, {
        names, message,
        date: values.date,
        time: values.time,
        city: getHalleusCityDisplayName(city),
      });
      if (version === operation.current) setArtwork(svg);
    } catch (failure) {
      if (version === operation.current) {
        setArtwork(null);
        setError(failure instanceof Error ? failure.message : 'محاسبهٔ این آسمان انجام نشد.');
      }
    } finally {
      if (version === operation.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void generate(initial, true);
    return () => { operation.current += 1; };
  }, [generate]);

  function change<K extends keyof Personalization>(field: K, value: Personalization[K]) {
    operation.current += 1;
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
    const svgUrl = URL.createObjectURL(new Blob([artwork], { type: 'image/svg+xml;charset=utf-8' }));
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
        <section className={styles.artPanel} aria-label="تصویر محاسبه‌شدهٔ آسمان تولد">
          <div className={styles.artwork}>
            {artwork ? <div className={styles.svgArtwork} role="img"
              aria-label="طرح واقعی نقشهٔ ستاره‌های آسمان تولد"
              dangerouslySetInnerHTML={{ __html: artwork }} /> :
              <div className={styles.emptyArtwork} role="status">
                <span className={styles.emptySymbol} aria-hidden="true">✧</span>
                <strong>{busy ? 'در حال محاسبهٔ ستاره‌ها…' : 'آسمان انتخابی‌ات اینجا شکل می‌گیرد'}</strong>
                <p>این بخش از داده‌های نجومی واقعی ساخته می‌شود، نه از تصویر آماده.</p>
              </div>}
          </div>
          {artwork ? <div className={styles.imageActions}>
            <span>خروجی محاسبه‌شده، بدون موکاپ و قاب</span>
            <button type="button" disabled={downloadBusy} onClick={() => void downloadPng()}>
              {downloadBusy ? 'در حال آماده‌سازی PNG…' : 'دریافت تصویر واقعی (PNG)'}
            </button>
          </div> : null}
        </section>

        <section className={styles.details} aria-labelledby="birth-sky-title">
          <span className={styles.eyebrow}>HALLEUS / CELESTIAL ART / P02</span>
          <h1 id="birth-sky-title">آسمان تولد</h1>
          <p className={styles.tagline}>هر آدمی، یک آسمانِ شروع دارد.</p>
          <p className={styles.intro}>تاریخ، ساعت و شهر تولد رو انتخاب کن تا هالیوس ستاره‌هایی رو که در اون لحظه بالای افق بودن، به یک اثر شخصی تبدیل کنه.</p>
          <p className={styles.subnote}>این خودِ طرح محاسبه‌شدهٔ محصوله؛ نه عکس تبلیغاتی، نه تصویر ساختگی و نه موکاپ.</p>

          <form className={styles.form} onSubmit={submit} aria-label="شخصی‌سازی آسمان تولد">
            <h2>آسمانت رو بساز</h2>
            <div className={styles.dateRow}>
              <label>تقویم
                <select disabled={busy} value={input.calendar}
                  onChange={(event) => {
                    operation.current += 1;
                    setInput((previous) => ({
                      ...previous, calendar: event.target.value as Personalization['calendar'], date: '',
                    }));
                    setArtwork(null); setError(''); setBusy(false);
                  }}>
                  <option value="jalali">شمسی</option><option value="gregorian">میلادی</option>
                </select>
              </label>
              <label>تاریخ تولد
                <input required disabled={busy} dir="ltr" maxLength={20}
                  value={input.date} placeholder={input.calendar === 'jalali' ? '۱۴۰۳/۰۸/۱۵' : '2024-11-05'}
                  onChange={(event) => change('date', event.target.value)} />
              </label>
            </div>
            <div className={styles.dateRow}>
              <label>ساعت دقیق تولد
                <input type="time" required dir="ltr" disabled={busy} value={input.time}
                  onChange={(event) => change('time', event.target.value)} />
              </label>
              <div className={styles.cityField}>
                <label htmlFor="p02-birth-city">شهر تولد</label>
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
              {busy ? 'در حال ساخت آسمان…' : 'ساخت تصویر آسمان من'}
            </button>
          </form>
          <div className={styles.availability}>
            <strong>این اثر فعلاً برای تماشای طرح واقعی باز است.</strong>
            <p>امکان خرید، پرداخت و سفارش آسمان تولد هنوز فعال نشده. بعد از تأیید نهایی طرح و نمونهٔ چاپی، فروشش باز می‌شه.</p>
          </div>
        </section>
      </div>
      <section className={styles.information} aria-label="دربارهٔ نقشهٔ آسمان تولد">
        <h2>این ستاره‌ها از کجا میان؟</h2>
        <p>هالیوس از کاتالوگ واقعی ستاره‌ها، زمان محلی تولد و مختصات شهر انتخابی استفاده می‌کنه و جای ستاره‌های بالای افق رو محاسبه می‌کنه. این تصویر عکس تاریخی گرفته‌شده با دوربین نیست و برای هر تاریخ، ساعت و شهر می‌تونه متفاوت باشه.</p>
        <p>خروجی صفحه فقط برای بررسی طراحی و انتخاب جزئیاته؛ فایل نهایی چاپ، قیمت سه اندازه و چهار عکس حرفه‌ای بعد از تأیید همین اثر نهایی می‌شن.</p>
      </section>
    </div>
  </main>;
}
