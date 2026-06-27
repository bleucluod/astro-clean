"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { createShareText } from "@/lib/astrology/share-text";
import { getReportRepository } from "@/lib/storage/report-repository";
import type { AstrologyReport } from "@/types/astro";

import { ReportV2Sections } from "@/components/ReportV2Sections";
import { ReportV3Experience } from "@/components/ReportV3Experience";
import { ChartEngineReportBadge } from "@/components/ChartEngineReportBadge";
import { ChartReportBridgePanel } from "./ChartReportBridgePanel";
type ReportDetailProps = {
  reportId: string;
};

const reportRepository = getReportRepository();

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("halleus-data-changed"));
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

function downloadJsonFile(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function downloadTextFile(fileName: string, data: string) {
  const blob = new Blob([data], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function ReportDetail({ reportId }: ReportDetailProps) {
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [note, setNote] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadReport() {
      const selectedRecord = await reportRepository.getReport(reportId);

      if (!isActive) {
        return;
      }

      setReport(selectedRecord?.report ?? null);
      setNote(selectedRecord?.note ?? "");
      setIsFavorite(selectedRecord?.favorite ?? false);
      setIsReady(true);
    }

    const timer = window.setTimeout(() => {
      void loadReport();
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [reportId]);

  async function handleSaveNote() {
    const updatedRecord = await reportRepository.setNote(reportId, note);

    if (updatedRecord) {
      setNote(updatedRecord.note ?? "");
    }

    notifyLocalDataChanged();
    setMessage(note.trim() ? "یادداشت ذخیره شد." : "یادداشت پاک شد.");
  }

  function handleExportReport() {
    if (!report) {
      return;
    }

    downloadJsonFile(`halleus-report-${report.id.slice(0, 8)}.json`, {
      app: "halleus",
      type: "single-report",
      version: 2,
      exportedAt: new Date().toISOString(),
      report,
      note,
      isFavorite,
    });

    setMessage("فایل پشتیبان گزارش ساخته شد.");
  }

  function handleExportTextReport() {
    if (!report) {
      return;
    }

    const textLines = [createShareText(report)];

    if (note.trim()) {
      textLines.push("", "یادداشت:", note.trim());
    }

    downloadTextFile(
      `halleus-report-${report.id.slice(0, 8)}.txt`,
      textLines.join("\n"),
    );

    setMessage("خروجی متنی ساخته شد.");
  }

  if (!isReady) {
    return (
      <section className="grid">
        
      <ChartEngineReportBadge report={report} />

      <ChartReportBridgePanel report={report} />
      <ReportV3Experience report={report} />
      <ReportV2Sections report={report} />
<div className="card">
          <span className="badge">در حال خواندن</span>
          <h1>در حال بارگذاری گزارش</h1>
          <p>گزارش ذخیره‌شده از مرورگر خوانده می‌شود.</p>
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
      <div className="card">
        <span className="badge">گزارش ذخیره‌شده</span>

        <h1>جزئیات گزارش تو</h1>

        <p>
          این صفحه نسخه ذخیره‌شده گزارش تو را نشان می‌دهد؛ جایی برای خواندن
          دوباره، یادداشت‌برداری و ادامه دادن مسیر گزارش کامل‌تر.
        </p>

        <div className="actions">
          <Link className="button secondary" href="/reports">
            بازگشت به گزارش‌ها
          </Link>

          <Link className="button secondary" href="/dashboard">
            رفتن به داشبورد
          </Link>

          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>
        </div>
      </div>

      <ReportCard report={report} />

      <section className="card report-note-card">
        <span className="badge">یادداشت شخصی</span>

        <h2>یادداشت من درباره این گزارش</h2>

        <p>
          این یادداشت برای مرور شخصی تو کنار همین گزارش نگه داشته می‌شود.
        </p>

        <label className="field">
          <span>یادداشت</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="مثلاً: این گزارش را بعد از یک تصمیم مهم دوباره بخوانم..."
            rows={6}
          />
        </label>

        <div className="actions">
          <button className="button" type="button" onClick={handleSaveNote}>
            ذخیره یادداشت
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={() => setNote("")}
          >
            خالی کردن متن
          </button>
        </div>

        {message ? <p className="success-message">{message}</p> : null}
      </section>

      <section className="card">
        <span className="badge">خروجی و پشتیبان</span>

        <h2>خروجی تکی این گزارش</h2>

        <p>
          می‌توانی فقط همین گزارش را همراه یادداشت و وضعیت علاقه‌مندی به صورت
          فایل پشتیبان بگیری. این قابلیت برای نگهداری نسخه شخصی، پشتیبانی یا
          انتقال گزارش در نسخه‌های بعدی مفید است.
        </p>

        <div className="actions">
          <button className="button" type="button" onClick={handleExportReport}>
            گرفتن فایل پشتیبان این گزارش
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={handleExportTextReport}
          >
            گرفتن خروجی متنی
          </button>
        </div>
      </section>
    </section>
  );
}