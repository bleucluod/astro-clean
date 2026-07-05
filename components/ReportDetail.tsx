"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { getReportRepository } from "@/lib/storage/report-repository";
import { getAccountReportRecord } from "@/lib/storage/account-report-read-client";
import type { AstrologyReport } from "@/types/astro";

import { ReportV3Experience } from "@/components/ReportV3Experience";

type ReportDetailProps = {
  reportId: string;
  reportSource?: ReportDetailSource;
};

type ReportDetailSource = "local" | "beta-db" | "account";

type BetaDatabaseReadResponse = {
  ok?: boolean;
  error?: string;
  reportRecord?: {
    report?: AstrologyReport;
    note?: string | null;
    favorite?: boolean | null;
  };
};

type ReportReadingStats = {
  displayName: string;
  aspectCount: number;
  houseCount: number;
  placementCount: number;
  hasRealEngine: boolean;
};

const reportRepository = getReportRepository();
const isBetaDatabaseSaveUiEnabled =
  process.env.NEXT_PUBLIC_HALLEUS_ENABLE_BETA_DB_SAVE_UI === "true";

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("halleus-data-changed"));
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

function buildReportReadingStats(report: AstrologyReport): ReportReadingStats {
  const displayName = report.input.name?.trim() || "این گزارش";
  const realEngine = report.realEngine;

  return {
    displayName,
    aspectCount: realEngine?.aspects?.length ?? 0,
    houseCount: realEngine?.houses?.length ?? 0,
    placementCount: realEngine?.placements?.length ?? 0,
    hasRealEngine: Boolean(realEngine),
  };
}

function sanitizeReportVisibleCopy(report: AstrologyReport): AstrologyReport {
  return sanitizeVisibleReportValue(report) as AstrologyReport;
}

function sanitizeVisibleReportValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeVisibleReportText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeVisibleReportValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeVisibleReportValue(item),
      ]),
    );
  }

  return value;
}

function sanitizeVisibleReportText(value: string): string {
  return value
    .replace(/Mean North Node/g, "دست شمالی ماه با مدل میانگین")
    .replace(/Mean South Node/g, "دست جنوبی ماه با مدل میانگین")
    .replace(/Mean Lunar Node/g, "دست‌های ماه با مدل میانگین")
    .replace(/Mean Node/g, "دست‌های ماه با مدل میانگین")
    .replace(/True\/Osculating Node/g, "مدل نوسانی/واقعی دست‌های ماه")
    .replace(/Osculating Node/g, "مدل نوسانی دست‌های ماه")
    .replace(/True Node/g, "مدل واقعی دست‌های ماه")
    .replace(/Black Moon Lilith/g, "لیلیت")
    .replace(/Lilith/g, "لیلیت")
    .replace(/Whole Sign/g, "روش نشانه کامل")
    .replace(/snapshot/g, "داده ذخیره‌شده")
    .replace(/real engine/g, "چارت واقعی محاسبه‌شده")
    .replace(/Retrograde/g, "حرکت برگشتی")
    .replace(/retrograde/g, "حرکت برگشتی")
    .replace(/motion/g, "وضعیت حرکت")
    .replace(/aspect/g, "رابطه سیاره‌ای")
    .replace(/read-only/g, "فقط خواندنی")
    .replace(/noindex/g, "خارج از ایندکس")
    .replace(/indexable/g, "قابل ایندکس")
    .replace(/claim/g, "ادعا")
    .replace(/timezone/g, "منطقه زمانی")
    .replace(/فرمول دست‌های ماه با مدل میانگین/g, "مدل میانگین")
    .replace(/مخالفت دقیق با دست شمالی ماه با مدل میانگین/g, "مقابل دقیق دست شمالی ماه");
}

export function ReportDetail({ reportId, reportSource = "local" }: ReportDetailProps) {
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [note, setNote] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadReport() {
      if (reportSource === "account") {
        const result = await getAccountReportRecord(reportId);

        if (!isActive) {
          return;
        }

        if (result.status !== "account-read-ready" || !result.reportRecord?.report) {
          setReport(null);
          setNote("");
          setMessage(result.message);
          setIsReady(true);
          return;
        }

        setReport(sanitizeReportVisibleCopy(result.reportRecord.report));
        setNote(result.reportRecord.note ?? "");
        setMessage(`نسخه اکانتی گزارش باز شد: ${reportId}`);
        setIsReady(true);
        return;
      }

      if (reportSource === "beta-db") {
        if (!isBetaDatabaseSaveUiEnabled) {
          throw new Error("خواندن نسخه آزمایشی سرور غیرفعال است.");
        }

        const response = await fetch(
          `/api/reports/beta?reportId=${encodeURIComponent(reportId)}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | BetaDatabaseReadResponse
          | null;

        if (!response.ok || !payload?.ok || !payload.reportRecord?.report) {
          throw new Error(payload?.error ?? "گزارش آزمایشی سرور پیدا نشد.");
        }

        if (!isActive) {
          return;
        }

        setReport(sanitizeReportVisibleCopy(payload.reportRecord.report));
        setNote(payload.reportRecord.note ?? "");
        setMessage(`گزارش آزمایشی سرور باز شد: ${reportId}`);
        setIsReady(true);
        return;
      }

      const selectedRecord = await reportRepository.getReport(reportId);

      if (!isActive) {
        return;
      }

      setReport(selectedRecord?.report ? sanitizeReportVisibleCopy(selectedRecord.report) : null);
      setNote(selectedRecord?.note ?? "");
      setIsReady(true);
    }

    const timer = window.setTimeout(() => {
      void loadReport();
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [reportId, reportSource]);

  async function handleSaveNote() {
    if (reportSource === "account") {
      setMessage("یادداشت نسخه اکانتی فعلاً فقط خواندنی است؛ ویرایش یادداشت اکانتی در batch بعدی اضافه می‌شود.");
      return;
    }

    const updatedRecord = await reportRepository.setNote(reportId, note);

    if (updatedRecord) {
      setNote(updatedRecord.note ?? "");
    }

    notifyLocalDataChanged();
    setMessage(note.trim() ? "یادداشت ذخیره شد." : "یادداشت پاک شد.");
  }

  if (!isReady) {
    return (
      <section className="grid">
        <div className="card">
          <span className="badge">در حال آماده‌سازی</span>

          <h1>گزارش تو در حال باز شدن است</h1>

          <p>
            هالیوس نسخه ذخیره‌شده گزارش را آماده می‌کند تا بتوانی دوباره آن
            را بخوانی، یادداشت اضافه کنی و مسیر بعدی را انتخاب کنی.
          </p>
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="grid">
        <EmptyState
          badge="گزارش پیدا نشد"
          title="این گزارش پیدا نشد"
          description={message || "این گزارش ممکن است پاک شده باشد، در حساب فعلی نباشد، یا روی مرورگر/دستگاه دیگری ساخته شده باشد."}
          actionHref="/reports"
          actionLabel="بازگشت به گزارش‌ها"
        />
      </section>
    );
  }

  const isAccountReportSource = reportSource === "account";

  return (
    <section className="grid">
      <ReportCard report={report} />

      {isAccountReportSource ? (
        <section className="card">
          <span className="badge">گزارش حساب</span>
          <h2>نسخه ذخیره‌شده در حساب</h2>
          <p>
            این گزارش از فضای ذخیره‌سازی حساب خوانده شده و برای خواندن شخصی، خارج از ایندکس نگه داشته می‌شود. ویرایش یادداشت حساب در این نسخه فقط خواندنی است و گزارش‌های محلی حذف یا جابه‌جا نمی‌شوند.
          </p>
        </section>
      ) : null}

      <ReportProductFocusPanel report={report} reportSource={reportSource} />

      <div className="report-final-reading-anchor" id="final-reading">
        <ReportV3Experience report={report} />
      </div>

      <section className="card report-bottom-summary-panel" id="personal-note">
        <div className="report-section-heading">
          <span className="badge">یادداشت شخصی</span>
          <h2>یک برداشت را برای بعد نگه دار</h2>
          <p>
            بعد از خواندن روایت اصلی، لازم نیست همه چیز را نگه داری. فقط یک جمله، سؤال یا تمرین کوچک را ذخیره کن.
          </p>
        </div>

        <div className="report-calculation-grid report-bottom-summary-grid">
          <article className="mini-card report-note-card report-note-card-mini">
            <span className="section-label">یادداشت قابل برگشت</span>
            <h3>برداشت امروز</h3>

            <label className="field">
              <span>متن یادداشت</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="مثلاً: این هفته فقط به نیاز ماه خودم توجه کنم..."
                rows={3}
                disabled={isAccountReportSource}
              />
            </label>

            <div className="actions">
              <button
                className="button"
                type="button"
                onClick={handleSaveNote}
                disabled={isAccountReportSource}
              >
                {isAccountReportSource ? "یادداشت حساب فعلاً فقط خواندنی است" : "ذخیره یادداشت"}
              </button>

              <button
                className="button secondary"
                type="button"
                onClick={() => setNote("")}
                disabled={isAccountReportSource}
              >
                پاک کردن
              </button>
            </div>

            {message ? <p className="success-message">{message}</p> : null}
          </article>

          <article className="mini-card">
            <span className="section-label">ادامه مسیر</span>
            <h3>بعد از این گزارش</h3>
            <p>اگر خواستی مقایسه کنی، یک گزارش تازه بساز؛ اگر فقط می‌خواهی برگردی، از صفحه گزارش‌ها ادامه بده.</p>
            <div className="actions">
              <a className="button" href="/chart">ساخت گزارش تازه</a>
              <a className="button secondary" href="/reports">بازگشت به گزارش‌ها</a>
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}

function ReportProductFocusPanel({
  report,
  reportSource,
}: {
  report: AstrologyReport;
  reportSource: ReportDetailSource;
}) {
  const stats = buildReportReadingStats(report);
  const sourceLabel = reportSource === "account"
    ? "نسخه ذخیره‌شده در حساب"
    : reportSource === "beta-db"
      ? "نسخه آزمایشی سرور"
      : "نسخه ذخیره‌شده روی همین مرورگر";
  const calculationLabel = stats.hasRealEngine
    ? `${stats.placementCount.toLocaleString("fa-IR")} جایگاه، ${stats.houseCount.toLocaleString("fa-IR")} خانه و ${stats.aspectCount.toLocaleString("fa-IR")} رابطه سیاره‌ای`
    : "خوانش محدود و محتاط";

  return (
    <section className="card report-reading-guide" id="reading-guide" aria-labelledby="report-reading-guide-title">
      <div className="report-section-heading">
        <span className="badge">راهنمای کوتاه</span>
        <h2 id="report-reading-guide-title">گزارش {stats.displayName} را از روایت اصلی بخوان</h2>
        <p>
          اول کارت چارت را فقط برای جهت‌گیری ببین؛ بعد وارد متن اصلی شو.
          جزئیات فنی در پنل بسته مانده‌اند تا صفحه شلوغ نشود.
        </p>
      </div>

      <div className="report-calculation-grid">
        <article className="mini-card">
          <span className="section-label">۱</span>
          <h3>سه ستون اصلی</h3>
          <p>خورشید، ماه و رایزینگ را مثل قاب اولیه بخوان؛ نه مثل سه برچسب جدا.</p>
        </article>

        <article className="mini-card">
          <span className="section-label">۲</span>
          <h3>روایت اصلی</h3>
          <p>در متن بلند فقط بخش‌هایی را نگه دار که به تجربه روزمره، رابطه یا تصمیم‌های تو نزدیک‌اند.</p>
        </article>

        <article className="mini-card">
          <span className="section-label">۳</span>
          <h3>پشتوانه</h3>
          <p>{sourceLabel}؛ {calculationLabel}. این داده‌ها برای شفافیت‌اند، نه برای سنگین کردن خواندن.</p>
        </article>
      </div>

      <div className="actions mt-4">
        <a className="button" href="#final-reading">رفتن به روایت اصلی</a>
        <a className="button secondary" href="#personal-note">یادداشت آخر</a>
      </div>
    </section>
  );
}
