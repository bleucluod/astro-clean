'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { filterHalleusCities, findHalleusCityById, getHalleusCityDisplayName } from '@/lib/locations/cities';
import { validateBahmanPreview, type BahmanPreview } from '@/lib/shop/nemad-man-bahman-preview';
import { NemadManBahmanArtwork, type NemadPosterTheme } from './NemadManBahmanArtwork';
import {
  downloadNemadPosterPng, getNemadPosterPixelSize, NEMAD_POSTER_SIZES,
  type NemadPosterSize,
} from '@/lib/shop/nemad-man-preview-export';
import styles from './nemad-man-bahman-preview.module.css';

function referenceExample(): BahmanPreview {
  const value = validateBahmanPreview('آراد', '۱۳۷۵/۱۱/۲۵');
  if (!value.ok) throw new Error('Approved reference date was not recognized.');
  return value.value;
}
const example = referenceExample();
const sizeOptions: NemadPosterSize[] = ['10x15', '20x30', '30x45'];

type NemadBatchInitial = {
  initialPreview?: BahmanPreview;
  initialPrintSize?: NemadPosterSize;
  initialTheme?: NemadPosterTheme;
};

export function NemadManBahmanPreview({
  initialPreview, initialPrintSize = '20x30', initialTheme = 'light',
}: NemadBatchInitial = {}) {
  const [name, setName] = useState(initialPreview?.name ?? 'آراد');
  const [date, setDate] = useState(initialPreview?.date ?? '۱۳۷۵/۱۱/۲۵');
  const [preview, setPreview] = useState<BahmanPreview>(initialPreview ?? example);
  const [birthTime, setBirthTime] = useState('');
  const [cityName, setCityName] = useState('');
  const [cityId, setCityId] = useState('');
  const [needsDetails, setNeedsDetails] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [printSize, setPrintSize] = useState<NemadPosterSize>(initialPrintSize);
  const [posterTheme, setPosterTheme] = useState<NemadPosterTheme>(initialTheme);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const boardRef = useRef<HTMLDivElement>(null);
  const matchedCity = findHalleusCityById(cityId);
  const outputPixels = getNemadPosterPixelSize(printSize);
  const cities = useMemo(() => !cityId && cityName.trim().length > 1
    ? filterHalleusCities(cityName).slice(0, 7) : [], [cityName, cityId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const outcome = validateBahmanPreview(name, date, { time: birthTime, cityId });
    if (!outcome.ok) {
      setNeedsDetails(outcome.reason === 'needs-birth-details');
      setError(outcome.message);
      return;
    }
    setPreview(outcome.value);
    setNeedsDetails(false);
    setError('');
  }

  async function downloadPoster() {
    const svg = boardRef.current?.querySelector('svg');
    if (!svg) {
      setExportError('تابلو برای خروجی گرفتن آماده نیست.');
      return;
    }
    setExportError('');
    setExporting(true);
    try {
      await downloadNemadPosterPng(svg,
        'halleus-nemad-' + preview.sign.id + '-' + posterTheme + '-' + printSize + '.png', printSize);
    } catch (failure) {
      setExportError(failure instanceof Error ? failure.message : 'گرفتن خروجی PNG ناموفق بود.');
    } finally {
      setExporting(false);
    }
  }

  const changedSign = preview.sign.id !== 'aquarius';

  return (
    <main className={styles.page} dir="rtl" data-shop-page="bahman-dev-preview"
      data-preview-hydrated={hydrated ? 'true' : 'false'}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.kicker}>نماد من · پیش‌نمایش طراحی مینیمال</span>
          <h1>یک نشان از آسمان، برای خودت</h1>
          <p>از آکواریوس شروع کرده‌ایم؛ نام و تاریخ تولد را وارد کن تا نشان خورشیدی با محاسبهٔ واقعی تعیین شود.</p>
        </header>
        <div className={styles.layout}>
          <section className={styles.previewPanel} aria-label="پیش‌نمایش شخصی‌سازی‌شده">
            <div className={styles.themeSwitch} role="group" aria-label="مدل تابلو">
              <button type="button" aria-pressed={posterTheme === 'light'}
                className={posterTheme === 'light' ? styles.themeActive : styles.themeOption}
                onClick={() => { setPosterTheme('light'); setExportError(''); }}>مینیمال روشن</button>
              <button type="button" aria-pressed={posterTheme === 'dark'}
                className={posterTheme === 'dark' ? styles.themeActive : styles.themeOption}
                onClick={() => { setPosterTheme('dark'); setExportError(''); }}>مینیمال مشکی</button>
            </div>
            <div className={posterTheme === 'light' ? `${styles.board} ${styles.lightBoard}` : styles.board} ref={boardRef}>
              <NemadManBahmanArtwork name={preview.name} date={preview.gregorianDate} sign={preview.sign} theme={posterTheme}/>
            </div>
            <label className={styles.exportSize} htmlFor="nemad-output-size">
              اندازهٔ خروجی (۳۰۰ پیکسل در اینچ)
              <select id="nemad-output-size" value={printSize} disabled={exporting}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setPrintSize(event.target.value as NemadPosterSize)}>
                {sizeOptions.map((size) => <option key={size} value={size}>{NEMAD_POSTER_SIZES[size].label}</option>)}
              </select>
            </label>
            <button className={styles.exportButton} type="button" disabled={exporting} onClick={() => { void downloadPoster(); }}>
              {exporting ? 'در حال آماده‌سازی PNG...' :
                `دریافت PNG با فونت اصلی · ${outputPixels.width.toLocaleString('fa-IR')} × ${outputPixels.height.toLocaleString('fa-IR')}`}
            </button>
            {exportError ? <p className={styles.error} role="alert">{exportError}</p> : null}
            {needsDetails ? <p className={styles.pendingNote}>این تصویر هنوز نمونهٔ قبلی است؛ با تکمیل ساعت و شهر تولد، نشان صحیح به‌جای آن نمایش داده می‌شود.</p> : null}
            <p className={styles.note}>ستاره‌ها و خطوط صورت فلکی از دادهٔ نجومی J2000 گرفته شده‌اند؛ این طرح، نقشهٔ آسمان لحظهٔ تولد نیست. تصویر روی شاسی بدون قاب چاپ می‌شود.</p>
          </section>
          <section className={styles.editor} aria-label="شخصی‌سازی تابلو">
            <div className={styles.editorIntro}>
              <span className={styles.editorKicker}>طرح اول · مینیمال ستاره‌ای</span>
              <h2>برای چه کسی بسازیم؟</h2>
              <p>اسم و تاریخ تولدش رو بنویس؛ برج خورشیدی و طرح مناسب خودش نمایش داده می‌شه.</p>
            </div>
            <form className={styles.form} onSubmit={submit} noValidate>
              <label htmlFor="nemad-name">نام روی تابلو</label>
              <input id="nemad-name" name="name" maxLength={40} value={name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)} autoComplete="off" placeholder="مثلاً آراد"/>
              <label htmlFor="nemad-date">تاریخ تولد شمسی</label>
              <input id="nemad-date" name="date" value={date} inputMode="numeric" dir="ltr"
                onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)} autoComplete="off" placeholder="۱۳۷۵/۱۱/۲۵"/>
              <small>شکل تاریخ: سال / ماه / روز. نیازی نیست خودت برج میلادی را انتخاب کنی.</small>
              {needsDetails ? <div className={styles.boundaryFields}>
                <strong>برای تاریخ مرزی، ساعت و شهر تولد هم لازمه</strong>
                <label htmlFor="nemad-time">ساعت تولد</label>
                <input id="nemad-time" name="time" value={birthTime} onChange={(event: ChangeEvent<HTMLInputElement>) => setBirthTime(event.target.value)}
                  dir="ltr" inputMode="text" placeholder="14:30" autoComplete="off"/>
                <label htmlFor="nemad-city">شهر تولد</label>
                <input id="nemad-city" name="birthCity" value={cityName} onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setCityName(event.target.value); setCityId('');
                }} autoComplete="off" placeholder="مثلاً تهران" aria-autocomplete="list"/>
                {cities.length ? <div className={styles.cityOptions} role="listbox" aria-label="شهرهای پیشنهادی">
                  {cities.map((city) => <button key={city.id} type="button" role="option" aria-selected={false}
                    onClick={() => {setCityName(getHalleusCityDisplayName(city)); setCityId(city.id);}}>
                    {getHalleusCityDisplayName(city)}
                  </button>)}
                </div> : null}
                {matchedCity ? <small>شهر انتخاب‌شده: {getHalleusCityDisplayName(matchedCity)}</small> : null}
              </div> : null}
              {error ? <p className={styles.error} role="alert">{error}</p> : null}
              <button className={styles.submit} type="submit">ساخت پیش‌نمایش</button>
            </form>
            {!needsDetails && !error ? <div className={changedSign ? styles.signChanged : styles.signInfo} role="status" aria-live="polite">
              <strong>{changedSign ? `برج این تاریخ ${preview.sign.displayFa} (${preview.sign.en}) است` : 'نشان این تاریخ: آکواریوس (Aquarius)'}</strong>
              <p>{changedSign
                ? 'این تاریخ در برج دلو نیست؛ بدون نیاز به تأیید، طرح برج درست را نمایش دادیم. طراحی اختصاصی سایر برج‌ها در ادامه کامل می‌شود.'
                : 'صورت فلکی آکواریوس با الگوی معتبر ستاره‌های واقعی نمایش داده شده است.'}</p>
            </div> : null}
            <div className={styles.info}>
              <strong>نسخهٔ آزمایشی، فقط برای بررسی طرح</strong>
              <p>هنوز سفارش، پرداخت و ذخیرهٔ اطلاعات فعال نیستند. فایل PNG برای بررسی و چاپ آزمایشی است، نه فایل نهایی تأییدشدهٔ چاپ.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
