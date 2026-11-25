"use client";

import { useEffect, useState } from "react";
import { VedicD1FullReport } from "./VedicD1FullReport";
import { VedicD1PurchaseOffer } from "./VedicD1PurchaseOffer";
import { VEDIC_D1_PREMIUM_CHAPTERS } from "@/lib/vedic/vedic-d1-reading-contract";
import { VedicD1NorthChart } from "./VedicD1NorthChart";
import { useVedicD1GuestSession, type VedicD1LocalPreview } from "./VedicD1GuestSession";
import reportStyles from "@/components/report/human-first-report.module.css";
import styles from "./vedic-d1-guest.module.css";

/** A separate report surface; only the certified free API response can populate it. */
export function VedicD1GuestResult({ onEdit, storageEnabled, checkoutEnabled }: { onEdit: () => void; storageEnabled: boolean; checkoutEnabled: boolean }) {
  const { result, setResult } = useVedicD1GuestSession();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const fullPreview = process.env.NODE_ENV === "development" && result?.kind === "timed"
    ? result.localPreview ?? null : null;
  const isFullPreview = fullPreview !== null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [isFullPreview]);

  function goToPurchase() {
    const title = document.getElementById("vedic-purchase-title");
    title?.focus({ preventScroll: true });
    title?.scrollIntoView({ block: "center", behavior: "auto" });
  }

  function closeLocalPreview() {
    setResult(current => current?.kind === "timed" ? { ...current, localPreview: null } : current);
  }

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
    <section className="report-detail-reader-page report-product-page" data-report-source="vedic-guest" dir="rtl">
      <div className={reportStyles.reader + " " + styles.vedicReader}>
        <div aria-hidden="true" className={reportStyles.ambientLogo} data-report-ambient-logo="parallax" />
        {result?.kind === "timed" ? (
          <>
            <header className={reportStyles.adaptiveHero}>
              <p className={reportStyles.eyebrow}>{fullPreview ? "راشی D1 · گزارش کامل" : "راشی D1 · گزارش رایگان"}</p>
              <h1>چارت تولد ودیک {result.name}</h1>
              <p>{fullPreview ? "خوانش چهار فصل چارت تولدت" : result.reading.shortReading.textFa}</p>
              {fullPreview && (
                <div className={styles.fullPreviewTools}>
                  <small>نسخهٔ بازبینی محلی — خرید فعال نیست.</small>
                  <button type="button" className={styles.resultBackLink} onClick={closeLocalPreview}>بازگشت به گزارش رایگان</button>
                </div>
              )}
            </header>
            <section className={reportStyles.chartDetails} aria-label="نقشهٔ تولد">
              <VedicD1NorthChart view={result.reading.view} />
            </section>
          {fullPreview ? (
            <VedicD1FullReport manuscript={fullPreview} />
          ) : (
          <>
          <section className={reportStyles.adaptiveSection + " " + styles.chapterPreviewList} aria-label="پیش‌نمایش چهار فصل">
            <h2>گزارش کامل چارت تو</h2>
            {result.reading.premiumPreview === null && <p role="status">پیش‌نمایش فعلاً در دسترس نیست؛ اطلاعات چارت رایگان در بالا قابل مشاهده است.</p>}
            {VEDIC_D1_PREMIUM_CHAPTERS.map((chapter, i) => (
              <article key={chapter.id} className={styles.lockedChapter}>
                <h3>فصل {(i+1).toLocaleString("fa-IR")} — {chapter.title}</h3>
                {result.reading.premiumPreview?.[i]?.excerptFa && (
                  <div className={reportStyles.chapterParagraphs}><p className={styles.chapterExcerpt}>{result.reading.premiumPreview[i].excerptFa}</p></div>
                )}
                <div className={styles.chapterLock} aria-hidden="true">
                  <div className={styles.lockLines}><span /><span /><span /><span /></div>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="10" width="14" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    <path d="M12 14v3" />
                  </svg>
                </div>
                <button type="button" className={styles.lockAction} onClick={goToPurchase}>ادامهٔ فصل در گزارش کامل</button>
              </article>
            ))}
          </section>
          <VedicD1PurchaseOffer name={result.name} savedReportId={result.savedReportId} storageEnabled={storageEnabled} checkoutEnabled={checkoutEnabled} birth={{calendar:result.draft.calendar,
            birthDate:result.draft.birthDate,birthTime:result.draft.birthTime,cityId:result.draft.cityId,
            ...(result.draft.occurrence ? {occurrence:result.draft.occurrence} : {})}} />
          {process.env.NODE_ENV === "development" && (
            <section className={styles.localPreview} aria-label="بازبینی محلی گزارش کامل">
              <h2>بازبینی توسعه</h2>
              <button type="button" className={styles.resultBackLink} onClick={openLocalPreview} disabled={previewLoading}>
                {previewLoading ? "در حال دریافت..." : "نمایش چهار فصل کامل (فقط توسعه)"}
              </button>
              {previewError && <p role="status">دریافت گزارش کامل ممکن نشد؛ چارت رایگان همچنان معتبر است.</p>}
            </section>
          )}
          </>
          )}
          <div className={styles.reportFooter}>
            <p className={styles.resultPrivacy}>{fullPreview ? "متن کامل صرفاً برای بازبینی محلی دریافت شده است؛ خرید یا ذخیرهٔ خصوصی هنوز فعال نیست." : "این نتیجه شامل چارت و پیش‌نمایش رایگان فصل‌هاست."}</p>
            <button type="button" className={styles.resultBackLink} onClick={onEdit}>ویرایش اطلاعات تولد</button>
          </div>
          </>
        ) : result?.kind === "untimed" ? (
        <section className={styles.emptyResult} aria-label="نتیجهٔ ساعت نامشخص">
          <h2>{result.name}، ساعت تولدت مشخص نیست</h2>
          <p>بدون ساعت تولد، لاگنا و خانه‌های چارت D1 قابل تعیین نیستند.
            به همین دلیل چارت دوازده‌خانه و فصل‌های شخصی را با ساعت فرضی نمی‌سازیم.</p>
          <button type="button" className={styles.resultBackLink} onClick={onEdit}>ثبت ساعت تولد</button>
        </section>
      ) : (
        <section className={styles.emptyResult} role="status">
          <h2>گزارشی برای نمایش پیدا نشد</h2>
          <p>اگر صفحه را دوباره باز کرده‌ای، گزارش‌های ذخیره‌شده را از بخش گزارش‌های من پیدا کن یا چارت تازه بساز.</p>
          <button type="button" className={styles.resultBackLink} onClick={onEdit}>بازگشت به فرم ودیک</button>
        </section>
      )}
      {storageEnabled&&result?.kind==="timed"&&<p className={styles.afterword}>این گزارش خصوصی است و از <a href="/reports">گزارش‌های من</a> قابل دسترسی است.</p>}
      </div>
    </section>
  );
}
