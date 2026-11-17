'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { filterHalleusCities, findHalleusCityById, getHalleusCityDisplayName } from '@/lib/locations/cities';
import { NEMAD_SIGNS, validateBahmanPreview, type BahmanPreview } from '@/lib/shop/nemad-man-bahman-preview';
import { normalizePersianDigits } from '@/lib/date/jalali';
import { NemadManBahmanArtwork, type NemadPosterTheme } from './NemadManBahmanArtwork';
import {
  downloadNemadPosterPng, renderNemadPosterPngBlob, getNemadPosterPixelSize, NEMAD_POSTER_SIZES,
  type NemadPosterSize,
} from '@/lib/shop/nemad-man-preview-export';
import { packageNemadPosterPngs } from '@/lib/shop/nemad-man-preview-zip';
import styles from './nemad-man-bahman-preview.module.css';

function referenceExample(): BahmanPreview {
  const value = validateBahmanPreview('آراد', '۱۳۷۵/۱۱/۲۵');
  if (!value.ok) throw new Error('Approved reference date was not recognized.');
  return value.value;
}
const example = referenceExample();
const sizeOptions: NemadPosterSize[] = ['10x15', '20x30', '30x45'];

const monthSlugs = [
  'farvardin', 'ordibehesht', 'khordad', 'tir', 'mordad', 'shahrivar',
  'mehr', 'aban', 'azar', 'dey', 'bahman', 'esfand',
] as const;
type BatchArtwork = { key: string; preview: BahmanPreview; theme: NemadPosterTheme };

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
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchError, setBatchError] = useState('');
  const [batchDone, setBatchDone] = useState(false);
  const [batchArtwork, setBatchArtwork] = useState<BatchArtwork | null>(null);
  const batchBusyRef = useRef(false);
  const batchBoardRef = useRef<HTMLDivElement>(null);
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

  function waitForBatchSvg(key: string, expectedSign: string): Promise<SVGSVGElement> {
    return new Promise((resolve, reject) => {
      const deadline = performance.now() + 20000;
      const inspect = () => {
        const holder = batchBoardRef.current;
        const svg = holder?.querySelector('svg');
        if (holder?.dataset.renderKey === key && svg &&
            svg.querySelector('title')?.textContent?.includes(expectedSign)) {
          resolve(svg);
          return;
        }
        if (performance.now() > deadline) {
          reject(new Error('رندر تابلوی ' + expectedSign + ' آماده نشد.'));
          return;
        }
        window.requestAnimationFrame(inspect);
      };
      window.requestAnimationFrame(inspect);
    });
  }

  async function downloadAll24() {
    if (batchBusyRef.current || exporting) return;
    batchBusyRef.current = true;
    setBatchBusy(true);
    setBatchError('');
    setBatchDone(false);
    setBatchProgress(0);
    try {
      // Keep the name, Jalali year and day fixed; only the month changes.
      const base = validateBahmanPreview(name, date, { time: birthTime, cityId });
      if (!base.ok) throw new Error(base.message);
      const [year, , dayText] = base.value.date.split('/');
      const day = Number(normalizePersianDigits(dayText));
      if (!year || !Number.isInteger(day) || day < 1 || day > 28) {
        throw new Error('برای ساخت ۱۲ ماه با یک روز ثابت، روز تولد را بین ۱ تا ۲۸ انتخاب کن.');
      }
      // Prevalidate all 12 samples so no PNG gets the wrong month/sign label.
      const samples = NEMAD_SIGNS.map((sign, index) => {
        const sampleDate = year + '/' + String(index + 1).padStart(2, '0') +
          '/' + String(day).padStart(2, '0');
        const result = validateBahmanPreview(base.value.name, sampleDate,
          { time: birthTime, cityId });
        if (!result.ok || result.value.sign.id !== sign.id) {
          throw new Error('برجِ روز ' + day + ' در بعضی ماه‌ها قطعی نیست؛ روز ۱۵ یا ۲۵ را امتحان کن.');
        }
        return result.value;
      });

      const entries: { name: string; png: Blob }[] = [];
      const size: NemadPosterSize = '10x15'; // Review ZIP, independent of individual print setting.
      const expected = getNemadPosterPixelSize(size);
      for (let index = 0; index < samples.length; index++) {
        for (const theme of ['dark', 'light'] as const) {
          const key = String(index) + '-' + theme;
          setBatchArtwork({ key, preview: samples[index], theme });
          const svg = await waitForBatchSvg(key, samples[index].sign.en);
          const png = await renderNemadPosterPngBlob(svg, size);
          const header = new DataView(await png.slice(0, 24).arrayBuffer());
          if (header.byteLength < 24 || header.getUint32(16) !== expected.width ||
              header.getUint32(20) !== expected.height) {
            throw new Error('ابعاد خروجی PNG برای ' + monthSlugs[index] + ' درست نیست.');
          }
          entries.push({
            name: String(index + 1).padStart(2, '0') + '-' + monthSlugs[index] +
              '-sign-' + theme + '.png',
            png,
          });
          setBatchProgress(entries.length);
        }
      }
      const zip = await packageNemadPosterPngs(entries);
      const url = URL.createObjectURL(zip);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'halleus-24-month-signs-10x15.zip';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setBatchDone(true);
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (failure) {
      setBatchError(failure instanceof Error ? failure.message : 'ساخت مجموعهٔ ۲۴ طرح انجام نشد.');
    } finally {
      setBatchArtwork(null);
      setBatchBusy(false);
      batchBusyRef.current = false;
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
              <select id="nemad-output-size" value={printSize} disabled={exporting || batchBusy}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setPrintSize(event.target.value as NemadPosterSize)}>
                {sizeOptions.map((size) => <option key={size} value={size}>{NEMAD_POSTER_SIZES[size].label}</option>)}
              </select>
            </label>
            <button className={styles.exportButton} type="button" disabled={exporting || batchBusy} onClick={() => { void downloadPoster(); }}>
              {exporting ? 'در حال آماده‌سازی PNG...' :
                `دریافت PNG با فونت اصلی · ${outputPixels.width.toLocaleString('fa-IR')} × ${outputPixels.height.toLocaleString('fa-IR')}`}
            </button>
            {exportError ? <p className={styles.error} role="alert">{exportError}</p> : null}
            <button className={styles.batchExportButton} type="button"
              disabled={exporting || batchBusy} onClick={() => { void downloadAll24(); }}>
              {batchBusy ? `در حال ساخت مجموعه · ${batchProgress} از ۲۴` :
                'دریافت همهٔ ۲۴ طرح در یک ZIP (۱۰×۱۵)'}
            </button>
            <p className={styles.batchNote}>نام، سال و روزِ واردشده ثابت می‌مانند؛ فقط ماه عوض می‌شود.
              هر ماه یک طرح مشکی و یک طرح روشن دارد.</p>
            {batchError ? <p className={styles.error} role="alert">{batchError}</p> : null}
            {batchDone ? <p className={styles.batchSuccess} role="status">۲۴ فایل PNG آماده و در یک ZIP دانلود شدند.</p> : null}
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
      {batchArtwork ? <div aria-hidden="true" className={styles.batchOffscreen}
        ref={batchBoardRef} data-render-key={batchArtwork.key}>
        <NemadManBahmanArtwork name={batchArtwork.preview.name}
          date={batchArtwork.preview.gregorianDate} sign={batchArtwork.preview.sign}
          theme={batchArtwork.theme}/>
      </div> : null}
    </main>
  );
}
