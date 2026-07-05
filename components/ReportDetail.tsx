"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { getReportRepository } from "@/lib/storage/report-repository";
import { getAccountReportRecord } from "@/lib/storage/account-report-read-client";
import type { AstrologyReport } from "@/types/astro";

import { ReportV3Experience } from "@/components/ReportV3Experience";
import { ChartReportBridgePanel } from "./ChartReportBridgePanel";

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

const REPORT_READING_STEPS = [
  {
    label: "۱",
    title: "اول نقشه را ببین",
    description:
      "کارت بالای صفحه، سه ستون اصلی، چرخ چارت و پشتوانه محاسبه را خلاصه می‌کند؛ قبل از متن بلند، این بخش را مثل نقشه راه بخوان.",
  },
  {
    label: "۲",
    title: "بعد وارد خوانش کامل شو",
    description:
      "از تصویر کلی، خورشید/ماه/طالع، خانه‌ها و جنبه‌ها عبور کن؛ لازم نیست همه چیز را در یک نشست تمام کنی.",
  },
  {
    label: "۳",
    title: "در پایان یک برداشت نگه دار",
    description:
      "بعد از خواندن، فقط یک جمله یا سؤال شخصی را در یادداشت ذخیره کن تا گزارش از متن بلند به یک نقطه قابل برگشت تبدیل شود.",
  },
] as const;

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

        setReport(result.reportRecord.report);
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

        setReport(payload.reportRecord.report);
        setNote(payload.reportRecord.note ?? "");
        setMessage(`گزارش آزمایشی سرور باز شد: ${reportId}`);
        setIsReady(true);
        return;
      }

      const selectedRecord = await reportRepository.getReport(reportId);

      if (!isActive) {
        return;
      }

      setReport(selectedRecord?.report ?? null);
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
          <span className="badge">Account report</span>
          <h2>نسخه ذخیره‌شده در حساب</h2>
          <p>
            این گزارش از account storage خوانده شده و private/noindex است. ویرایش یادداشت اکانتی در این نسخه read-only مانده و migration یا حذف local reports انجام نمی‌شود.
          </p>
        </section>
      ) : null}

      <ReportReadingGuide report={report} />

      <div className="report-final-reading-anchor" id="final-reading">
        <ReportV3Experience report={report} />
      </div>

      <section className="card report-bottom-summary-panel" id="personal-note">
        <div className="report-section-heading">
          <span className="badge">پشتوانه گزارش</span>
          <h2>خلاصه محاسبه و یادداشت</h2>
          <p>
            سه کارت کوتاه برای مرور سریع: جایگاه‌های برجسته، جنبه‌های برجسته و
            یک یادداشت کوچک که کنار همین گزارش در پنل می‌ماند.
          </p>
        </div>

        <div className="report-calculation-grid report-bottom-summary-grid">
          <ChartReportBridgePanel report={report} />

          <article className="mini-card report-note-card report-note-card-mini">
            <span className="section-label">یادداشت</span>
            <h3>یادداشت کوتاه</h3>
            <p>یک برداشت کوتاه کنار همین گزارش نگه دار.</p>

            <label className="field">
              <span>متن یادداشت</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="مثلاً: آخر هفته دوباره بخوانم..."
                rows={2}
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
                {isAccountReportSource ? "یادداشت اکانتی read-only است" : "ذخیره در پنل"}
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
        </div>
      </section>

      <ReportNextStepPanel />
    </section>
  );
}

function ReportReadingGuide({ report }: { report: AstrologyReport }) {
  const stats = buildReportReadingStats(report);
  const aspectLabel = stats.aspectCount > 0
    ? `${stats.aspectCount.toLocaleString("fa-IR")} جنبه محاسبه‌شده`
    : "جنبه‌های اصلی در صورت وجود نمایش داده می‌شوند";
  const houseLabel = stats.houseCount > 0
    ? `${stats.houseCount.toLocaleString("fa-IR")} خانه Whole Sign`
    : "خانه‌ها وابسته به دقت ساعت و مکان تولد هستند";
  const placementLabel = stats.placementCount > 0
    ? `${stats.placementCount.toLocaleString("fa-IR")} جایگاه سیاره‌ای/نقطه‌ای`
    : "جایگاه‌ها در گزارش کامل توضیح داده می‌شوند";

  return (
    <section className="card report-reading-guide" id="reading-guide" aria-labelledby="report-reading-guide-title">
      <div className="report-section-heading">
        <span className="badge">راهنمای خواندن</span>
        <h2 id="report-reading-guide-title">مسیر پیشنهادی خواندن گزارش</h2>
        <p>
          گزارش {stats.displayName} بلند و لایه‌لایه است. لازم نیست آن را مثل
          یک مقاله خطی بخوانی؛ اول نقشه را ببین، بعد وارد خوانش کامل شو و در
          پایان فقط یک برداشت شخصی را نگه دار.
        </p>
      </div>

      <div className="report-calculation-grid">
        {REPORT_READING_STEPS.map((step) => (
          <article className="mini-card" key={step.label}>
            <span className="section-label">قدم {step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>

      <div className="report-calculation-grid mt-4">
        <article className="mini-card">
          <span className="section-label">پشتوانه خوانش</span>
          <h3>{stats.hasRealEngine ? "چارت محاسبه‌شده" : "پیش‌نمایش محدود"}</h3>
          <p>{placementLabel}</p>
        </article>

        <article className="mini-card">
          <span className="section-label">خانه‌ها</span>
          <h3>میدان‌های زندگی</h3>
          <p>{houseLabel}</p>
        </article>

        <article className="mini-card">
          <span className="section-label">جنبه‌ها</span>
          <h3>گفت‌وگوی درونی چارت</h3>
          <p>{aspectLabel}</p>
        </article>
      </div>

      <div className="actions mt-4">
        <a className="button" href="#final-reading">
          شروع خواندن گزارش کامل
        </a>

        <a className="button secondary" href="#personal-note">
          رفتن به یادداشت
        </a>
      </div>
    </section>
  );
}

function ReportNextStepPanel() {
  return (
    <section className="card report-next-step-panel" aria-labelledby="report-next-step-title">
      <div className="report-section-heading">
        <span className="badge">بعد از خواندن</span>
        <h2 id="report-next-step-title">با گزارش چطور ادامه بدهی؟</h2>
        <p>
          اگر گزارش سنگین بود، یک بار دیگر فقط راهنمای خواندن و یادداشتت را
          مرور کن. هالیوس فعلاً رایگان و noindex است؛ هدف این نسخه، بهتر کردن
          تجربه خواندن گزارش و تست محصول است، نه فروش یا ایندکس عمومی.
        </p>
      </div>

      <div className="actions">
        <a className="button" href="/chart">
          ساخت گزارش تازه
        </a>

        <a className="button secondary" href="/reports">
          بازگشت به گزارش‌ها
        </a>
      </div>
    </section>
  );
}
