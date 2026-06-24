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
      setCopyMessage("Ù…ØªÙ† Ø§Ø´ØªØ±Ø§Ú©â€ŒÚ¯Ø°Ø§Ø±ÛŒ Ú©Ù¾ÛŒ Ø´Ø¯.");
    } catch {
      setCopyMessage("Ú©Ù¾ÛŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ù…Ù…Ú©Ù† Ù†Ø´Ø¯. Ù…ØªÙ† Ø±Ø§ Ø¯Ø³ØªÛŒ Ú©Ù¾ÛŒ Ú©Ù†.");
    }
  }

  return (
    <article className="card report-card">
      <div className="report-header">
        <div>
          <span className="badge">Ú¯Ø²Ø§Ø±Ø´ Ù†Ù…Ø§Ø¯ÛŒÙ†</span>
          <h2>
            {report.input.name
              ? `Ú¯Ø²Ø§Ø±Ø´ ${report.input.name}`
              : "Ú¯Ø²Ø§Ø±Ø´ Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯"}
          </h2>
        </div>

        <span className="pill">
          {new Date(report.createdAt).toLocaleDateString("fa-IR")}
        </span>
      </div>

      <div className="birth-details">
        <span>{report.input.birthDate}</span>
        <span>{report.input.birthTime}</span>
        <span>
          {report.input.birthCity}ØŒ {report.input.birthCountry}
        </span>
      </div>

      <div className="grid grid-3">
        <div className="mini-card">
          <strong>Ø®ÙˆØ±Ø´ÛŒØ¯</strong>
          <span>{report.chart.sunSign.faName}</span>
        </div>

        <div className="mini-card">
          <strong>Ù…Ø§Ù‡</strong>
          <span>{report.chart.moonSign.faName}</span>
        </div>

        <div className="mini-card">
          <strong>Ø±Ø§ÛŒØ²ÛŒÙ†Ú¯</strong>
          <span>{report.chart.risingSign.faName}</span>
        </div>
      </div>

      <section className="report-section">
        <span className="badge">Ø®Ù„Ø§ØµÙ‡</span>
        <p>{report.summary}</p>
      </section>

      <section className="report-section">
        <span className="badge">Ø¨Ø±Ø¯Ø§Ø´Øªâ€ŒÙ‡Ø§ÛŒ Ù†Ù…Ø§Ø¯ÛŒÙ†</span>

        <div className="report-list">
          {report.interpretations.map((item, index) => (
            <div className="mini-card report-insight" key={item}>
              <strong>{index + 1}</strong>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="actions">
        <button className="button secondary" onClick={handleCopyShareText}>
          Ú©Ù¾ÛŒ Ù…ØªÙ† Ø§Ø´ØªØ±Ø§Ú©â€ŒÚ¯Ø°Ø§Ø±ÛŒ
        </button>
      </div>

      {copyMessage ? <p className="success-message">{copyMessage}</p> : null}

      <div className="notice report-notice">
        <strong>ÛŒØ§Ø¯Ø¢ÙˆØ±ÛŒ Ù†Ù…Ø§Ø¯ÛŒÙ†</strong>
        <p>{report.safetyNote}</p>
      </div>
    </article>
  );
}
