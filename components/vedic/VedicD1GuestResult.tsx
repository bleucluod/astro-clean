"use client";

import Link from "next/link";
import { useState } from "react";
import { VEDIC_D1_PREMIUM_CHAPTERS } from "@/lib/vedic/vedic-d1-reading-contract";
import { VedicD1NorthChart } from "./VedicD1NorthChart";
import { useVedicD1GuestSession, type VedicD1LocalPreview } from "./VedicD1GuestSession";
import chartStyles from "@/app/chart/chart-shell.module.css";
import styles from "./vedic-d1-guest.module.css";

/** A separate report surface; only the certified free API response can populate it. */
export function VedicD1GuestResult() {
  const { result, setResult } = useVedicD1GuestSession();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // Full text is an explicit, development-only inspection, never part of the free request.
  async function openLocalPreview() {
    if (process.env.NODE_ENV !== "development" || result?.kind !== "timed" || previewLoading) return;
    const target = result;
    const { calendar, birthDate, birthTime, cityId, occurrence, name } = target.draft;
    setPreviewLoading(true);
    setPreviewError(false);
    try {
      const response = await fetch("/api/vedic/d1/local-preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        cache: "no-store", credentials: "same-origin",
        body: JSON.stringify({ calendar, birthDate, birthTime, cityId,
          ...(occurrence ? { occurrence } : {}), displayName: name.trim() }),
      });
      const payload: unknown = await response.json();
      const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      const value = data.manuscript as Record<string, unknown> | null;
      if (!response.ok || data.ok !== true || !value ||
          typeof value.writerRulesVersion !== "string" ||
          !Array.isArray(value.chapters) || value.chapters.length !== VEDIC_D1_PREMIUM_CHAPTERS.length ||
          !value.chapters.every((item, index) => item && typeof item === "object" &&
            item.id === VEDIC_D1_PREMIUM_CHAPTERS[index].id &&
            item.title === VEDIC_D1_PREMIUM_CHAPTERS[index].title &&
            Array.isArray(item.paragraphsFa) && item.paragraphsFa.length >= 4 &&
            item.paragraphsFa.every((line: unknown) => typeof line === "string"))) {
        throw new Error("VEDIC_D1_LOCAL_PREVIEW_INVALID");
      }
      const localPreview = value as VedicD1LocalPreview;
      setResult(current => current === target ? { ...target, localPreview } : current);
    } catch {
      setPreviewError(true);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <main className={chartStyles.page + " " + styles.vedicPage} dir="rtl">
      <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
        <Link href="/chart/vedic">چارت تولد ودیک</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">گزارش رایگان</span>
      </nav>
      <header className={chartStyles.hero + " " + styles.vedicHero + " " + styles.resultHero}>
        <div className={chartStyles.heroCopy}>
          <span className={chartStyles.heroKicker}>راشی D1 · گزارش رایگان</span>
          <h1 className={chartStyles.heroTitle}>گزارش چارت تولد ودیک</h1>
          <p className={chartStyles.heroLead}>نمودار شمال هند، جایگاه سیاره‌ها و خوانش کوتاه فارسیِ چارت محاسبه‌شده.</p>
        </div>
      </header>
      {result?.kind === "timed" ? (
        <section className={styles.freeResult + " " + styles.reportResult} aria-label="نتیجهٔ رایگان چارت ودیک">
          <div className={styles.reportWelcome}>
            <span className={styles.reportKicker}>گزارش شخصی تو</span>
            <h2 className={styles.resultGreeting}>{result.name}، این نقشهٔ آسمان توست</h2>
            <p className={styles.freeReading}>{result.reading.shortReading.textFa}</p>
          </div>
          <VedicD1NorthChart view={result.reading.view} />
          <section className={styles.chapterPreviewList} aria-label="پیش‌نمایش چهار فصل">
            <h2>گزارش کامل چارت تو</h2>
            {result.reading.premiumPreview === null && <p role="status">پیش‌نمایش فعلاً در دسترس نیست؛ اطلاعات چارت رایگان در بالا قابل مشاهده است.</p>}
            {VEDIC_D1_PREMIUM_CHAPTERS.map((chapter, i) => (
              <article key={chapter.id} className={styles.lockedChapter}>
                <h3>فصل {(i+1).toLocaleString("fa-IR")} — {chapter.title}</h3>
                {result.reading.premiumPreview?.[i]?.excerptFa && (
                  <p className={styles.chapterExcerpt}>{result.reading.premiumPreview[i].excerptFa}</p>
                )}
                <div className={styles.chapterLock} aria-hidden="true">
                  <div className={styles.lockLines}><span /><span /><span /><span /></div>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="10" width="14" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    <path d="M12 14v3" />
                  </svg>
                </div>
                <p className={styles.lockCaption}>ادامهٔ فصل در گزارش کامل</p>
              </article>
            ))}
            <p className={styles.lockCaption}>خرید گزارش کامل هنوز فعال نیست.</p>
          </section>
          {process.env.NODE_ENV === "development" && (
            <section className={styles.localPreview} aria-label="بازبینی محلی گزارش کامل">
              <h2>بازبینی توسعه</h2>
              {result.localPreview ? (
                <>
                  <button type="button" className={styles.resultBackLink}
                    onClick={() => setResult(current => current?.kind === "timed" ? { ...current, localPreview: null } : current)}>
                    بستن گزارش کامل
                  </button>
                  {result.localPreview.chapters.map((chapter,i) => (
                    <article key={chapter.id} className={styles.previewChapter}>
                      <h3>فصل {(i+1).toLocaleString("fa-IR")} — {chapter.title}</h3>
                      {chapter.paragraphsFa.map((paragraph,j) => <p key={j}>{paragraph}</p>)}
                    </article>
                  ))}
                </>
              ) : (
                <button type="button" className={styles.resultBackLink} onClick={openLocalPreview} disabled={previewLoading}>
                  {previewLoading ? "در حال دریافت..." : "نمایش چهار فصل کامل (فقط توسعه)"}
                </button>
              )}
              {previewError && <p role="status">دریافت گزارش کامل ممکن نشد؛ چارت رایگان همچنان معتبر است.</p>}
            </section>
          )}
          <div className={styles.reportFooter}>
            <p className={styles.resultPrivacy}>{process.env.NODE_ENV === "development" && result.localPreview ? "متن کامل صرفاً برای بازبینی محلی دریافت شده است؛ خرید یا ذخیرهٔ خصوصی هنوز فعال نیست." : "این نتیجه شامل چارت و پیش‌نمایش رایگان فصل‌هاست."}</p>
            <Link className={styles.resultBackLink} href="/chart/vedic">ویرایش اطلاعات تولد</Link>
          </div>
        </section>
      ) : result?.kind === "untimed" ? (
        <section className={styles.emptyResult} aria-label="نتیجهٔ ساعت نامشخص">
          <h2>{result.name}، ساعت تولدت مشخص نیست</h2>
          <p>بدون ساعت تولد، لاگنا و خانه‌های چارت D1 قابل تعیین نیستند.
            به همین دلیل چارت دوازده‌خانه و فصل‌های شخصی را با ساعت فرضی نمی‌سازیم.</p>
          <Link className={styles.resultBackLink} href="/chart/vedic">ثبت ساعت تولد</Link>
        </section>
      ) : (
        <section className={styles.emptyResult} role="status">
          <h2>گزارشی برای نمایش پیدا نشد</h2>
          <p>این نسخهٔ آزمایشی گزارش را ذخیره نمی‌کند. اگر آدرس را مستقیم باز کرده‌ای یا صفحه را Refresh کرده‌ای، دوباره اطلاعات تولد را در فرم وارد و چارت را محاسبه کن.</p>
          <Link className={styles.resultBackLink} href="/chart/vedic">بازگشت به فرم ودیک</Link>
        </section>
      )}
      <p className={styles.afterword}>گزارش مهمان فعلاً فقط در حافظهٔ همین صفحهٔ مرورگر نگه داشته می‌شود و لینک عمومی یا ذخیرهٔ دائمی ندارد.</p>
    </main>
  );
}
