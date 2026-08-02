"use client";

import { useMemo, useState } from "react";
import { PersonalTransitReportSection } from "@/components/PersonalTransitReportSection";
import { ReportBirthChartWheel } from "@/components/ReportBirthChartWheel";
import { ReportV3Experience } from "@/components/ReportV3Experience";
import {
  buildLiveReportReadingContract,
  type ReportReadingNavigationId,
} from "@/lib/report-output/live-report-reading-contract";
import type { PersonalTransitReportDataBridge } from "@/src/lib/report-output/personal-transit-report-data-bridge";
import type { AstrologyReport } from "@/types/astro";
import { ReportReadingNavigation } from "@/components/report/ReportReadingNavigation";
import { ReportTechnicalAppendix } from "@/components/report/ReportTechnicalAppendix";

type ReaderMode = "natal" | "transit";

type ReportWithTransit = AstrologyReport & {
  engineData?: {
    personalTransitReportData?: PersonalTransitReportDataBridge | null;
  } | null;
};

export function ReportProductReader({ report }: { report: AstrologyReport }) {
  const contract = useMemo(
    () => buildLiveReportReadingContract(report),
    [report],
  );
  const transitData = useMemo(
    () => (report as ReportWithTransit).engineData?.personalTransitReportData ?? null,
    [report],
  );
  const [mode, setMode] = useState<ReaderMode>("natal");
  const [activeSection, setActiveSection] =
    useState<ReportReadingNavigationId>("overview");

  function navigateTo(sectionId: ReportReadingNavigationId) {
    setMode("natal");
    setActiveSection(sectionId);
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <section
      className="report-product-reader"
      data-report-product-reader="birth-report-overhaul"
    >
      <div className="report-product-mode-switch" role="tablist" aria-label="نوع خوانش گزارش">
        <button
          aria-selected={mode === "natal"}
          className={mode === "natal" ? "active" : ""}
          onClick={() => setMode("natal")}
          role="tab"
          type="button"
        >
          گزارش تولد
          <small>{contract.readingTime.natalMinutes.toLocaleString("fa-IR")} دقیقه</small>
        </button>
        <button
          aria-selected={mode === "transit"}
          className={mode === "transit" ? "active" : ""}
          disabled={!transitData}
          onClick={() => setMode("transit")}
          role="tab"
          type="button"
        >
          آسمان ثبت‌شده هنگام ساخت
          <small>
            {transitData
              ? `${contract.readingTime.transitMinutes.toLocaleString("fa-IR")} دقیقه`
              : "داده‌ای ذخیره نشده"}
          </small>
        </button>
      </div>

      {mode === "natal" ? (
        <div className="report-product-reader-layout">
          <ReportReadingNavigation
            activeSection={activeSection}
            contract={contract}
            onNavigate={navigateTo}
          />
          <div className="report-product-reading-column">
            <ReportV3Experience report={report} readingContract={contract} />

            <section className="report-product-chart-details" id="chart-details">
              <div className="report-product-section-heading">
                <span className="section-label">جزئیات چارت</span>
                <h2>چرخ چارت و داده‌های فنی</h2>
                <p>
                  مسیر اصلی خواندن اینجا تمام می‌شود. ادامهٔ این بخش برای زمانی است که بخواهی شواهد و روش محاسبه را دقیق‌تر ببینی.
                </p>
              </div>
              <div className="report-product-wheel-shell">
                <ReportBirthChartWheel report={report} />
              </div>
              <ReportTechnicalAppendix contract={contract} report={report} />
            </section>
          </div>
        </div>
      ) : (
        <section
          className="report-product-transit-view"
          data-report-reader-mode="stored-transit"
        >
          <div className="report-product-transit-heading">
            <span className="section-label">بخش جدا از گزارش تولد</span>
            <h1>آسمان ثبت‌شده هنگام ساخت گزارش</h1>
            <p>
              این داده با بازکردن دوبارهٔ گزارش تازه نمی‌شود و نباید با «امروز» اشتباه گرفته شود.
            </p>
          </div>
          {transitData ? (
            <PersonalTransitReportSection data={transitData} />
          ) : (
            <div className="report-product-empty-technical" role="note">
              برای این نسخه از گزارش، دادهٔ ترنزیت ذخیره نشده است. گزارش تولد بدون آن کامل و قابل خواندن می‌ماند.
            </div>
          )}
        </section>
      )}
    </section>
  );
}
