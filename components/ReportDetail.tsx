"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { getReportRepository } from "@/lib/storage/report-repository";
import type { AstrologyReport } from "@/types/astro";

import { ReportV3Experience } from "@/components/ReportV3Experience";
import { ChartReportBridgePanel } from "./ChartReportBridgePanel";

type ReportDetailProps = {
  reportId: string;
  reportSource?: ReportDetailSource;
};

type ReportDetailSource = "local" | "beta-db";

type BetaDatabaseReadResponse = {
  ok?: boolean;
  error?: string;
  reportRecord?: {
    report?: AstrologyReport;
    note?: string | null;
    favorite?: boolean | null;
  };
};

const reportRepository = getReportRepository();
const isBetaDatabaseSaveUiEnabled =
  process.env.NEXT_PUBLIC_HALLEUS_ENABLE_BETA_DB_SAVE_UI === "true";

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("halleus-data-changed"));
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}


export function ReportDetail({ reportId, reportSource = "local" }: ReportDetailProps) {
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [note, setNote] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadReport() {
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
          description="این گزارش ممکن است پاک شده باشد یا روی مرورگر/دستگاه دیگری ساخته شده باشد."
          actionHref="/reports"
          actionLabel="بازگشت به گزارش‌ها"
        />
      </section>
    );
  }

  return (
    <section className="grid">
      <ReportCard report={report} />

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
              />
            </label>

            <div className="actions">
              <button className="button" type="button" onClick={handleSaveNote}>
                ذخیره در پنل
              </button>

              <button
                className="button secondary"
                type="button"
                onClick={() => setNote("")}
              >
                پاک کردن
              </button>
            </div>

            {message ? <p className="success-message">{message}</p> : null}
          </article>
        </div>
      </section>
    </section>
  );
}
