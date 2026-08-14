"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportProductReader } from "@/components/report/ReportProductReader";
import { getReportRepository } from "@/lib/storage/report-repository";
import {
  deleteAccountReport,
  getAccountReportRecord,
  getPublicReportRecord,
  mutateAccountReport,
} from "@/lib/storage/account-report-read-client";
import type { AstrologyReport } from "@/types/astro";
import type { ReportVisibility } from "@/types/storage";
import {
  createPrivacySafeReportText,
} from "@/lib/storage/report-journey-client";
import {
  sanitizeVisibleReportText,
  sanitizeVisibleReportValue,
} from "@/lib/report-output/visible-report-language";

type ReportDetailSource = "local" | "beta-db" | "account" | "public";

type ReportDetailProps = {
  reportId: string;
  reportSource?: ReportDetailSource;
  initialReport?: AstrologyReport | null;
  initialMessage?: string;
};

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

function getReportTitle(report: AstrologyReport) {
  return report.input.name?.trim()
    ? `گزارش چارت تولد ${report.input.name.trim()}`
    : "گزارش چارت تولد";
}

function getSourceBadge(reportSource: ReportDetailSource) {
  if (reportSource === "account") return "ذخیره‌شده در حساب";
  if (reportSource === "public") return "لینک مستقیم";
  if (reportSource === "beta-db") return "گزارش ذخیره‌شده";
  return "روی همین دستگاه";
}

function getAccessDescription(reportSource: ReportDetailSource) {
  if (reportSource === "public") {
    return "این نسخه از مسیر خواندن مستقیم باز شده است. یادداشت شخصی، شناسه مالک و جزئیات تولدِ حذف‌شده در این نما نمایش داده نمی‌شوند.";
  }

  if (reportSource === "account") {
    return "این گزارش از حساب فعلی خوانده شده است. مدیریت عنوان، پیوند امن و حذف از همین بخش انجام می‌شود.";
  }

  if (reportSource === "beta-db") {
    return "این گزارش از فضای ذخیره‌سازی هالیوس خوانده شده است.";
  }

  return "این گزارش روی همین دستگاه ذخیره شده است و یادداشت شخصی فقط در همین مرورگر نگه‌داری می‌شود.";
}

export function ReportDetail({
  reportId,
  reportSource = "local",
  initialReport = null,
  initialMessage = "",
}: ReportDetailProps) {
  const [report, setReport] = useState<AstrologyReport | null>(() =>
    initialReport ? sanitizeVisibleReportValue(initialReport) : null,
  );
  const [note, setNote] = useState("");
  const [isReady, setIsReady] = useState(() => Boolean(initialReport));
  const [message, setMessage] = useState(initialMessage);
  const [accountVisibility, setAccountVisibility] =
    useState<ReportVisibility>("private");
  const [favorite, setFavorite] = useState(false);
  const [storedAccessTier, setStoredAccessTier] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadReport() {
      if (reportSource === "public" && initialReport) {
        setReport(sanitizeVisibleReportValue(initialReport));
        setNote("");
        setMessage(initialMessage);
        setIsReady(true);
        return;
      }

      if (reportSource === "public") {
        const result = await getPublicReportRecord(reportId);
        if (!isActive) return;

        if (result.status === "account-read-ready" && result.reportRecord?.report) {
          setReport(sanitizeVisibleReportValue(result.reportRecord.report));
          setStoredAccessTier(result.reportRecord.publication?.accessTier ?? null);
          setNote("");
          setMessage("");
        } else {
          setReport(null);
          setNote("");
          setMessage(result.message);
        }
        setIsReady(true);
        return;
      }

      if (reportSource === "account") {
        const result = await getAccountReportRecord(reportId);
        if (!isActive) return;

        if (result.status !== "account-read-ready" || !result.reportRecord?.report) {
          setReport(null);
          setNote("");
          setMessage(result.message);
          setIsReady(true);
          return;
        }

        setReport(sanitizeVisibleReportValue(result.reportRecord.report));
        setStoredAccessTier(result.reportRecord.publication?.accessTier ?? null);
        setNote(result.reportRecord.note ?? "");
        setFavorite(Boolean(result.reportRecord.favorite));
        setAccountVisibility(result.reportRecord.visibility);
        setMessage("");
        setIsReady(true);
        return;
      }

      if (reportSource === "beta-db") {
        if (!isBetaDatabaseSaveUiEnabled) {
          setReport(null);
          setMessage("این گزارش اکنون در دسترس نیست.");
          setIsReady(true);
          return;
        }

        try {
          const response = await fetch(
            `/api/reports/beta?reportId=${encodeURIComponent(reportId)}`,
          );
          const payload = (await response.json().catch(() => null)) as
            | BetaDatabaseReadResponse
            | null;

          if (!response.ok || !payload?.ok || !payload.reportRecord?.report) {
            throw new Error(payload?.error ?? "گزارش پیدا نشد.");
          }

          if (!isActive) return;
          setReport(sanitizeVisibleReportValue(payload.reportRecord.report));
          setNote(payload.reportRecord.note ?? "");
          setMessage("");
        } catch (error) {
          if (!isActive) return;
          setReport(null);
          setMessage(error instanceof Error ? error.message : "گزارش پیدا نشد.");
        }
        setIsReady(true);
        return;
      }

      const selectedRecord = await reportRepository.getReport(reportId);
      if (!isActive) return;

      setReport(
        selectedRecord?.report
          ? sanitizeVisibleReportValue(selectedRecord.report)
          : null,
      );
      setNote(selectedRecord?.note ?? "");
      setFavorite(Boolean(selectedRecord?.favorite));
      setMessage(
        selectedRecord?.report ? "" : "گزارش روی این دستگاه پیدا نشد.",
      );
      setIsReady(true);
    }

    void loadReport();

    return () => {
      isActive = false;
    };
  }, [initialMessage, initialReport, reportId, reportSource]);

  async function handleToggleFavorite() {
    const nextFavorite = !favorite;

    if (reportSource === "local") {
      const updated = await reportRepository.setFavorite(reportId, nextFavorite);
      setFavorite(Boolean(updated?.favorite));
      notifyLocalDataChanged();
    } else if (reportSource === "account") {
      await mutateAccountReport({
        reportId,
        action: "favorite",
        favorite: nextFavorite,
      });
      setFavorite(nextFavorite);
    } else {
      setMessage("علاقه‌مندی این گزارش در این نما فقط خواندنی است.");
      return;
    }

    setMessage(
      nextFavorite
        ? "گزارش به علاقه‌مندی‌ها اضافه شد."
        : "گزارش از علاقه‌مندی‌ها حذف شد.",
    );
  }

  async function handleCopySafeSummary() {
    if (!report) return;
    await navigator.clipboard?.writeText(createPrivacySafeReportText(report));
    setMessage("خلاصه امن بدون اطلاعات تولد کپی شد.");
  }

  async function handleSaveNote() {
    if (reportSource === "local") {
      const updatedRecord = await reportRepository.setNote(reportId, note);
      if (updatedRecord) {
        setNote(updatedRecord.note ?? "");
      }
      notifyLocalDataChanged();
    } else if (reportSource === "account") {
      await mutateAccountReport({
        reportId,
        action: "note",
        note,
      });
    } else {
      setMessage("یادداشت این گزارش در این نما فقط خواندنی است.");
      return;
    }

    setMessage(note.trim() ? "یادداشت ذخیره شد." : "یادداشت پاک شد.");
  }

  async function handleAccountAction(
    action: "title" | "enable_sharing" | "revoke_sharing" | "delete",
  ) {
    if (!report || reportSource !== "account") return;

    try {
      if (action === "title") {
        const title = window.prompt("عنوان تازهٔ گزارش:", getReportTitle(report));
        if (title === null) return;
        await mutateAccountReport({ reportId, action, title });
        setMessage("عنوان گزارش به‌روزرسانی شد.");
        return;
      }

      if (action === "delete") {
        if (!window.confirm("این گزارش حذف شود؟ پیوند اشتراک آن نیز فوراً از کار می‌افتد.")) return;
        await deleteAccountReport(reportId);
        window.location.assign("/reports");
        return;
      }

      const result = await mutateAccountReport({ reportId, action });
      if (result.sharePath) {
        const url = new URL(result.sharePath, window.location.origin).toString();
        await navigator.clipboard?.writeText(url);
        setAccountVisibility("shared_by_link");
        setMessage("پیوند امن ساخته و کپی شد.");
      } else {
        setAccountVisibility("unpublished");
        setMessage("اشتراک‌گذاری گزارش لغو شد.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "مدیریت گزارش انجام نشد.");
    }
  }

  if (!isReady) {
    return (
      <section
        className="grid report-detail-reader-page"
      >
        <div className="report-detail-skeleton-card" aria-hidden="true" />
        <div className="report-detail-skeleton-grid" aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section
        className="grid report-detail-reader-page"
      >
        <EmptyState
          badge="گزارش پیدا نشد"
          title="این گزارش پیدا نشد"
          description={sanitizeVisibleReportText(
            message ||
              "این گزارش ممکن است پاک شده باشد، در حساب فعلی نباشد، یا روی مرورگر/دستگاه دیگری ساخته شده باشد.",
          )}
          actionHref="/reports"
          actionLabel="بازگشت به گزارش‌ها"
        />
      </section>
    );
  }

  const isReadOnlyNote =
    reportSource === "public" || reportSource === "beta-db";

  return (
    <section
      className="report-detail-reader-page report-product-page"
      data-report-source={reportSource}
    >
      <ReportProductReader report={report} storedAccessTier={storedAccessTier} />

      <details className="report-product-reader-tools">
        <summary>ذخیره و مدیریت گزارش</summary>
        <div className="report-product-reader-tools-body">
          <div className="report-product-reader-tools-heading">
            <span className="pill">{getSourceBadge(reportSource)}</span>
            <p>{getAccessDescription(reportSource)}</p>
          </div>
          <div className="actions">
            {reportSource === "local" || reportSource === "account" ? (
              <button className="button secondary" type="button" onClick={() => void handleToggleFavorite()}>
                {favorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              </button>
            ) : null}
            <button className="button secondary" type="button" onClick={() => void handleCopySafeSummary()}>
              کپی خلاصهٔ قابل‌اشتراک
            </button>
            <button className="button secondary" type="button" onClick={() => window.print()}>
              چاپ گزارش
            </button>
            {reportSource === "public" ? (
              <button className="button secondary" type="button" onClick={() => {
                void navigator.clipboard?.writeText(window.location.href);
                setMessage("لینک گزارش کپی شد.");
              }}>
                کپی لینک
              </button>
            ) : null}
          </div>

          {reportSource !== "public" ? (
            <details className="report-product-inline-tool">
              <summary>یادداشت شخصی</summary>
              <label className="field">
                <span>چیزی که می‌خواهی به خاطر بسپاری</span>
                <textarea
                  disabled={isReadOnlyNote}
                  onChange={(event: { target: { value: string } }) => setNote(event.target.value)}
                  placeholder="مثلاً: این هفته بیشتر به نیاز خودم توجه کنم..."
                  rows={4}
                  value={note}
                />
              </label>
              <div className="actions">
                <button className="button" disabled={isReadOnlyNote} onClick={() => void handleSaveNote()} type="button">
                  ذخیره یادداشت
                </button>
                <button className="button secondary" onClick={() => setNote("")} type="button">پاک کردن</button>
              </div>
            </details>
          ) : null}

          {reportSource === "account" ? (
            <details className="report-product-inline-tool">
              <summary>تنظیمات حساب و اشتراک</summary>
              <div className="actions">
                <button className="button secondary" onClick={() => void handleAccountAction("title")} type="button">ویرایش عنوان</button>
                {accountVisibility === "shared_by_link" ? (
                  <button className="button secondary" onClick={() => void handleAccountAction("revoke_sharing")} type="button">لغو پیوند امن</button>
                ) : (
                  <button className="button secondary" onClick={() => void handleAccountAction("enable_sharing")} type="button">ساخت پیوند امن</button>
                )}
                <button className="button secondary" onClick={() => void handleAccountAction("delete")} type="button">حذف گزارش</button>
              </div>
            </details>
          ) : null}
        </div>
      </details>

      {message ? (
        <p className="report-product-status" role="status">
          {sanitizeVisibleReportText(message)}
        </p>
      ) : null}

      <section className="report-product-endpoint report-product-relationship-cta">
        <div>
          <span className="section-label">گام بعدی</span>
          <h2>رابطه‌تان را از زاویهٔ دو چارت ببینید</h2>
          <p>ببینید کجا راحت‌تر به هم نزدیک می‌شوید، کجا ممکن است حرف هم را اشتباه بفهمید و چه چیزی به امنیت و رشد رابطه کمک می‌کند.</p>
        </div>
        <div className="actions">
          <Link className="button" href="/compare">شروع تحلیل رابطه</Link>
          <Link className="button secondary report-detail-bottom-back" href="/reports">کتابخانه گزارش‌ها</Link>
        </div>
      </section>
    </section>
  );
}
