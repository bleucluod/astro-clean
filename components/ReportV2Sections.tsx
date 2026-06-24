"use client";

import { useMemo, useState } from "react";
import { createReportV2PlainText } from "@/lib/report-output/report-v2-export";
import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";
import {
  getReportV2Metrics,
  getReportV2SectionSummary,
} from "@/lib/report-output/report-v2-metrics";
import type { ReportOutputSection } from "@/types/report-output";

type ReportWithSections = {
  outputVersion?: string;
  interpretationSections?: ReportOutputSection[];
  outputQuality?: {
    score?: number;
    warnings?: string[];
  };
};

type ReportV2SectionsProps = {
  report: unknown;
};

function getSectionIntro(kind: string) {
  switch (kind) {
    case "overview":
      return "شروع گزارش";
    case "identity":
      return "خودشناسی";
    case "emotional-pattern":
      return "احساسات";
    case "relationships":
      return "رابطه";
    case "career":
      return "کار و رشد";
    case "growth":
      return "رشد";
    case "reflection-prompts":
      return "پرسش";
    case "disclaimer":
      return "ایمنی";
    default:
      return "بخش";
  }
}

function createDownloadFileName() {
  const datePart = new Date().toISOString().slice(0, 10);

  return `halleus-report-v2-${datePart}.txt`;
}

export function ReportV2Sections({ report }: ReportV2SectionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const enhancedReport = useMemo(() => {
    if (!report || typeof report !== "object") {
      return null;
    }

    return enhanceReportOutputV2(report as Record<string, unknown>);
  }, [report]);

  const metrics = useMemo(() => getReportV2Metrics(enhancedReport), [enhancedReport]);
  const sectionSummary = useMemo(
    () => getReportV2SectionSummary(enhancedReport),
    [enhancedReport],
  );

  if (!enhancedReport) {
    return null;
  }

  const sectionedReport = enhancedReport as ReportWithSections;
  const sections = sectionedReport.interpretationSections ?? [];

  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  const plainText = createReportV2PlainText(enhancedReport);
  const visibleSections = activeSectionId
    ? sections.filter((section) => section.id === activeSectionId)
    : sections;

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
      <span className="badge">Report Output V2</span>

      <h2>گزارش بخش‌بندی‌شده</h2>

      <p>
        این نسخه خروجی را به بخش‌های روشن تقسیم می‌کند تا گزارش قابل خواندن‌تر،
        قابل exportتر و آماده اتصال به موتور واقعی چارت باشد.
      </p>

      <div className="actions">
        <button className="button" onClick={downloadText} type="button">
          دانلود TXT نسخه V2
        </button>

        <button className="button secondary" onClick={copyText} type="button">
          کپی متن V2
        </button>
      </div>

      {copyState === "copied" ? (
        <p className="form-hint">متن نسخه V2 کپی شد.</p>
      ) : null}

      {copyState === "failed" ? (
        <p className="form-hint">
          کپی مستقیم ممکن نشد. از دانلود TXT استفاده کن.
        </p>
      ) : null}

      <div className="tag-list">
        <span>Version: {sectionedReport.outputVersion ?? "v2-sectioned-preview"}</span>
        <span>Quality score: {metrics.qualityScore ?? "preview"}</span>
        <span>Sections: {metrics.sectionCount.toLocaleString("fa-IR")}</span>
        <span>Words: {metrics.wordCount.toLocaleString("fa-IR")}</span>
        <span>Reading: {metrics.readingMinutes.toLocaleString("fa-IR")} دقیقه</span>
      </div>

      <div className="report-preview-list">
        <div className="report-preview-row">
          <span>فهرست بخش‌ها</span>
          <small>
            برای تمرکز روی یک بخش، همان بخش را انتخاب کن؛ برای برگشت، نمایش همه
            را بزن.
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

          {sectionSummary.map((section) => (
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

      {sectionedReport.outputQuality?.warnings &&
      sectionedReport.outputQuality.warnings.length > 0 ? (
        <div className="report-preview-list">
          {sectionedReport.outputQuality.warnings.map((warning) => (
            <div className="report-preview-row" key={warning}>
              <span>یادداشت کیفیت</span>
              <small>{warning}</small>
            </div>
          ))}
        </div>
      ) : null}

      <div className="home-step-list">
        {visibleSections.map((section, index) => (
          <div key={section.id}>
            <strong>
              {(index + 1).toLocaleString("fa-IR")}. {section.title}
            </strong>
            <span>
              {getSectionIntro(section.kind)} · {section.body}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
