"use client";

import { useMemo } from "react";
import {
  buildLiveReportReadingContract,
  LIVE_REPORT_READING_CONTRACT_VERSION,
} from "@/lib/report-output/live-report-reading-contract";
import { enhanceReportOutputV3 } from "@/lib/report-output/report-v3";
import type { AstrologyReport } from "@/types/astro";

type ReportV3ExperienceProps = {
  report: AstrologyReport;
};

export function ReportV3Experience({ report }: ReportV3ExperienceProps) {
  const enhancedReport = useMemo(
    () => enhanceReportOutputV3(report as unknown as Record<string, unknown>),
    [report],
  );
  const readingContract = useMemo(
    () => buildLiveReportReadingContract(report),
    [report],
  );

  return (
    <section
      className="report-final-reading-card"
      data-live-report-reading-contract={LIVE_REPORT_READING_CONTRACT_VERSION}
    >
      <div className="report-section-heading">
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.85rem",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
          }}
        >
          <span className="badge">خلاصه</span>
          <span className="form-hint" style={{ whiteSpace: "nowrap" }}>
            حدود {readingContract.readingMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
          </span>
        </div>
        <h2>تصویر کلی این چارت</h2>
        <p>{readingContract.guide}</p>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
        {readingContract.summarySentences.map((sentence) => (
          <p key={sentence}>{sentence}</p>
        ))}
      </div>

      {readingContract.reflectionQuestions.length > 0 ? (
        <div className="mini-card" style={{ marginTop: "1.25rem" }}>
          <strong>دو پرسش برای مکث</strong>
          <ul className="report-compact-list">
            {readingContract.reflectionQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {readingContract.themeChapters.length > 0 ? (
        <section
          data-report-theme-chapters="seven-topic-chapters"
          style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}
        >
          <div className="report-section-heading">
            <span className="section-label">فصل‌های موضوعی</span>
            <h3>هفت مسیر برای خواندن این چارت</h3>
            <p>لازم نیست همه فصل‌ها را یک‌باره بخوانی؛ از موضوعی شروع کن که به تجربه این روزهایت نزدیک‌تر است.</p>
          </div>
          <div className="report-reading-section-list">
            {readingContract.themeChapters.map((chapter) => (
              <article
                className="mini-card report-reading-section-card"
                key={chapter.id}
              >
                <h4>{chapter.title}</h4>
                {chapter.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {chapter.reflection ? (
                  <p className="form-hint">برای مکث: {chapter.reflection}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p className="form-hint" style={{ marginTop: "1.25rem" }}>
        {enhancedReport.reportV3Disclaimer}
      </p>
    </section>
  );
}
