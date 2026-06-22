"use client";

import { useState } from "react";
import { createShareText } from "@/lib/astrology/share-text";
import type { AstrologyReport } from "@/types/astro";

type ReportCardProps = {
  report: AstrologyReport;
};

export function ReportCard({ report }: ReportCardProps) {
  const [copyMessage, setCopyMessage] = useState("");

  async function handleCopyShareText() {
    const shareText = createShareText(report);

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyMessage("متن اشتراک‌گذاری کپی شد.");
    } catch {
      setCopyMessage("کپی خودکار ممکن نشد. متن را دستی کپی کن.");
    }
  }

  return (
    <article className="card report-card">
      <div className="report-header">
        <div>
          <span className="badge">گزارش نمادین</span>
          <h2>
            {report.input.name
              ? `گزارش ${report.input.name}`
              : "گزارش چارت تولد"}
          </h2>
        </div>

        <span className="pill">
          {new Date(report.createdAt).toLocaleDateString("fa-IR")}
        </span>
      </div>

      <div className="grid grid-3">
        <div className="mini-card">
          <strong>خورشید</strong>
          <span>{report.chart.sunSign.faName}</span>
        </div>

        <div className="mini-card">
          <strong>ماه</strong>
          <span>{report.chart.moonSign.faName}</span>
        </div>

        <div className="mini-card">
          <strong>رایزینگ</strong>
          <span>{report.chart.risingSign.faName}</span>
        </div>
      </div>

      <p>{report.summary}</p>

      <div className="report-list">
        {report.interpretations.map((item) => (
          <p key={item}>• {item}</p>
        ))}
      </div>

      <div className="actions">
        <button className="button secondary" onClick={handleCopyShareText}>
          کپی متن اشتراک‌گذاری
        </button>
      </div>

      {copyMessage ? <p className="success-message">{copyMessage}</p> : null}

      <p className="notice">{report.safetyNote}</p>
    </article>
  );
}
