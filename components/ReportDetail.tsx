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
        <div className="card">
          <span className="badge">در حال آماده‌سازی</span>

          <h1>گزارش تو در حال باز شدن است</h1>

          <p>
            Halleus نسخه ذخیره‌شده گزارش را آماده می‌کند تا بتوانی دوباره آن
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
      <div className="card">
        <span className="badge">گزارش آماده‌ی مرور</span>

        <h1>گزارش چارت تولد تو آماده است</h1>

        <p>
          اینجا صفحه‌ی مرور گزارش توست؛ می‌توانی برداشت‌های اصلی را بخوانی،
          یادداشت شخصی اضافه کنی، نسخه پشتیبان بگیری و اگر خواستی برای گزارش
          کامل‌تر اقدام کنی.
        </p>

        <div className="actions">
          <Link className="button" href="#report-reading">
            خواندن گزارش
          </Link>

          <Link className="button secondary" href="#personal-note">
            نوشتن یادداشت
          </Link>

          <Link className="button secondary" href="/reports">
            همه گزارش‌ها
          </Link>
        </div>
      </div>

      <div id="report-reading">
        <ReportCard report={report} />
      </div>

      <ChartEngineReportBadge report={report} />

      <ChartReportBridgePanel report={report} />

      <ReportV3Experience report={report} />

      <ReportV2Sections report={report} />

      <section className="card">
        <span className="badge">قدم بعدی</span>

        <h2>از این گزارش چه استفاده‌ای می‌کنی؟</h2>

        <p>
          اگر این گزارش برایت معنی‌دار بود، می‌توانی آن را ذخیره کنی، بعداً
          دوباره بخوانی، یا برای دریافت خوانش کامل‌تر و انسانی‌تر سفارش بدهی.
        </p>

        <div className="actions">
          <Link className="button" href="/order">
            سفارش گزارش کامل‌تر
          </Link>

          <Link className="button secondary" href="/pricing">
            دیدن پلن‌ها
          </Link>

          <Link className="button secondary" href="/chart">
            ساخت گزارش جدید
          </Link>
        </div>
      </section>

      <section className="card report-note-card" id="personal-note">
        <span className="badge">یادداشت شخصی</span>

        <h2>برداشت خودت را کنار گزارش نگه دار</h2>

        <p>
          این یادداشت فقط برای مرور شخصی تو کنار همین گزارش نگه داشته می‌شود؛
          مثل جایی برای ثبت حس، سوال یا نکته‌ای که بعداً می‌خواهی به آن برگردی.
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
        <span className="badge">نگهداری گزارش</span>

        <h2>یک نسخه برای خودت داشته باش</h2>

        <p>
          می‌توانی همین گزارش را همراه یادداشت و وضعیت علاقه‌مندی به صورت فایل
          پشتیبان نگه داری، یا یک نسخه متنی ساده برای مرور و اشتراک شخصی بگیری.
        </p>

        <div className="actions">
          <button className="button" type="button" onClick={handleExportReport}>
            گرفتن فایل پشتیبان
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={handleExportTextReport}
          >
            گرفتن نسخه متنی
          </button>
        </div>
      </section>
    </section>
  );
}
