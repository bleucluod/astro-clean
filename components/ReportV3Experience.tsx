"use client";

import { useMemo, useState } from "react";
import { createReportV3PlainText } from "@/lib/report-output/report-v3-export";
import { enhanceReportOutputV3 } from "@/lib/report-output/report-v3";

type ReportV3ExperienceProps = {
  report: unknown;
};

function createDownloadFileName() {
  const datePart = new Date().toISOString().slice(0, 10);

  return `halleus-report-v3-${datePart}.txt`;
}

export function ReportV3Experience({ report }: ReportV3ExperienceProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const enhancedReport = useMemo(() => {
    if (!report || typeof report !== "object") {
      return null;
    }

    return enhanceReportOutputV3(report as Record<string, unknown>);
  }, [report]);

  if (!enhancedReport) {
    return null;
  }

  const plainText = createReportV3PlainText(enhancedReport);
  const visibleSections = activeSectionId
    ? enhancedReport.reportV3Sections.filter((section) => section.id === activeSectionId)
    : enhancedReport.reportV3Sections;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function downloadText() {
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = createDownloadFileName();
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card">
      <span className="badge">خوانش نهایی گزارش</span>

      <h2>{enhancedReport.reportV3Summary.title}</h2>

      <p>{enhancedReport.reportV3Summary.subtitle}</p>

      <div className="actions">
        <button className="button" onClick={downloadText} type="button">
          دانلود متن گزارش
        </button>

        <button className="button secondary" onClick={copyText} type="button">
          کپی متن گزارش
        </button>
      </div>

      {copyState === "copied" ? (
        <p className="form-hint">متن گزارش کپی شد.</p>
      ) : null}

      {copyState === "failed" ? (
        <p className="form-hint">
          کپی مستقیم ممکن نشد. از دانلود متن گزارش استفاده کن.
        </p>
      ) : null}

      <div className="tag-list">
        <span>
          حدود {enhancedReport.reportV3Summary.readingMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
        </span>
      </div>

      <div className="report-preview-list">
        <div className="report-preview-row">
          <span>بخش‌های خوانش</span>
          <small>
            برای خواندن آرام‌تر می‌توانی یک بخش را بخوانی یا دوباره باز کنی.
          </small>
        </div>

        <div className="actions">
          <button
            className="button secondary"
            onClick={() => setActiveSectionId(null)}
            type="button"
          >
            نمایش همه
          </button>

          {enhancedReport.reportV3Sections.map((section) => (
            <button
              className="button secondary"
              key={section.id}
              onClick={() => setActiveSectionId(section.id)}
              type="button"
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>

      <div className="home-step-list">
        {visibleSections.map((section, index) => (
          <div key={section.id}>
            <strong>
              {(index + 1).toLocaleString("fa-IR")}. {section.title}
            </strong>
            <span>{section.body}</span>
          </div>
        ))}
      </div>

      <p className="form-hint">{enhancedReport.reportV3Disclaimer}</p>
    </section>
  );
}
