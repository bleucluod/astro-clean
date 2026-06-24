"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { loadFavoriteReportIds } from "@/lib/storage/favorite-reports-storage";
import {
  loadReportNote,
  saveReportNote,
} from "@/lib/storage/report-notes-storage";
import { loadReports } from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";

type ReportDetailProps = {
  reportId: string;
};

function notifyLocalDataChanged() {
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

export function ReportDetail({ reportId }: ReportDetailProps) {
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [note, setNote] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function loadReport() {
      const savedReports = loadReports();
      const selectedReport =
        savedReports.find((item) => item.id === reportId) ?? null;

      setReport(selectedReport);
      setNote(loadReportNote(reportId));
      setIsFavorite(loadFavoriteReportIds().includes(reportId));
      setIsReady(true);
    }

    const timer = window.setTimeout(loadReport, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [reportId]);

  function handleSaveNote() {
    saveReportNote(reportId, note);
    notifyLocalDataChanged();
    setMessage(note.trim() ? "یادداشت ذخیره شد." : "یادداشت پاک شد.");
  }

  function handleExportReport() {
    if (!report) {
      return;
    }

    downloadJsonFile(`astro-clean-report-${report.id.slice(0, 8)}.json`, {
      app: "astro-clean",
      type: "single-report",
      version: 1,
      exportedAt: new Date().toISOString(),
      report,
      note,
      isFavorite,
    });

    setMessage("خروجی JSON گزارش ساخته شد.");
  }

  if (!isReady) {
    return (
      <section className="grid">
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
          description="این گزارش ممکن است پاک شده باشد، یا در مرورگر دیگری ساخته شده باشد. چون MVP فعلاً backend ندارد، گزارش‌ها فقط در همین مرورگر ذخیره می‌شوند."
          actionHref="/reports"
          actionLabel="بازگشت به گزارش‌ها"
        />
      </section>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Report Detail</span>

        <h1>جزئیات گزارش ذخیره‌شده</h1>

        <p>
          این صفحه گزارش را از localStorage همین مرورگر می‌خواند. در نسخه‌های
          بعدی، اگر backend و حساب کاربری اضافه شود، این نوع صفحه می‌تواند به
          لینک دائمی و قابل اشتراک تبدیل شود.
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
          این یادداشت فقط در مرورگر همین دستگاه ذخیره می‌شود و فعلاً به هیچ
          سروری ارسال نمی‌شود.
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
        <span className="badge">Single Export</span>

        <h2>خروجی تکی این گزارش</h2>

        <p>
          می‌توانی فقط همین گزارش را به همراه یادداشت و وضعیت علاقه‌مندی به صورت
          JSON خروجی بگیری. این قابلیت برای backup، پشتیبانی و نسخه‌های بعدی
          public profile مفید است.
        </p>

        <div className="actions">
          <button className="button" type="button" onClick={handleExportReport}>
            گرفتن خروجی JSON این گزارش
          </button>
        </div>
      </section>
    </section>
  );
}