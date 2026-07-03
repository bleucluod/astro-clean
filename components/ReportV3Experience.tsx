"use client";

import { useMemo } from "react";
import { enhanceReportOutputV3 } from "@/lib/report-output/report-v3";

type ReportV3ExperienceProps = {
  report: unknown;
};

function createReadingParagraphs(body: string) {
  return body
    .replace(/\s+(پرسش تأملی:)/gu, "\n\n$1")
    .replace(/\s+(برای خواندن ادامه گزارش،)/gu, "\n\n$1")
    .replace(/\s+(این بخش را آرام‌تر بخوان؛)/gu, "\n\n$1")
    .replace(/\s+(اگر این فصل طولانی‌تر است،)/gu, "\n\n$1")
    .replace(/\s+(عطارد و مریخ را کنار هم بخوان:)/gu, "\n\n$1")
    .replace(/\s+(جمع‌بندی نهایی هالیوس این است:)/gu, "\n\n$1")
    .split(/\n{2,}/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ReportV3Experience({ report }: ReportV3ExperienceProps) {
  const enhancedReport = useMemo(() => {
    if (!report || typeof report !== "object") {
      return null;
    }

    return enhanceReportOutputV3(report as Record<string, unknown>);
  }, [report]);

  if (!enhancedReport) {
    return null;
  }

  return (
    <section className="card report-final-reading-card">
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
          <span className="badge">خوانش نهایی گزارش</span>

          <span
            className="form-hint"
            style={{
              marginInlineStart: "auto",
              whiteSpace: "nowrap",
            }}
          >
            حدود {enhancedReport.reportV3Summary.readingMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
          </span>
        </div>

        <h2>{enhancedReport.reportV3Summary.title}</h2>

        <p>{enhancedReport.reportV3Summary.subtitle}</p>
      </div>

      <div
        className="report-reading-section-list"
        style={{
          display: "grid",
          gap: "1.25rem",
          marginTop: "1.5rem",
        }}
      >
        {enhancedReport.reportV3Sections.map((section) => (
          <article
            className="mini-card report-reading-section-card"
            key={section.id}
            style={{
              display: "grid",
              gap: "0.8rem",
            }}
          >
            <h3>{section.title}</h3>

            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                maxWidth: "none",
              }}
            >
              {createReadingParagraphs(section.body).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="form-hint">{enhancedReport.reportV3Disclaimer}</p>
    </section>
  );
}
