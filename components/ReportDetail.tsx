"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { createReportText } from "@/lib/astrology/share-text";
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
    setMessage(note.trim() ? "ÛŒØ§Ø¯Ø¯Ø§Ø´Øª Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯." : "ÛŒØ§Ø¯Ø¯Ø§Ø´Øª Ù¾Ø§Ú© Ø´Ø¯.");
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

    setMessage("Ø®Ø±ÙˆØ¬ÛŒ JSON Ú¯Ø²Ø§Ø±Ø´ Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯.");
  }

  function handleExportTextReport() {
    if (!report) {
      return;
    }

    downloadTextFile(
      `astro-clean-report-${report.id.slice(0, 8)}.txt`,
      createReportText(report, note),
    );

    setMessage("Ø®Ø±ÙˆØ¬ÛŒ TXT Ú¯Ø²Ø§Ø±Ø´ Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯.");
  }

  if (!isReady) {
    return (
      <section className="grid">
        <div className="card">
          <span className="badge">Ø¯Ø± Ø­Ø§Ù„ Ø®ÙˆØ§Ù†Ø¯Ù†</span>
          <h1>Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ú¯Ø²Ø§Ø±Ø´</h1>
          <p>Ú¯Ø²Ø§Ø±Ø´ Ø°Ø®ÛŒØ±Ù‡â€ŒØ´Ø¯Ù‡ Ø§Ø² Ù…Ø±ÙˆØ±Ú¯Ø± Ø®ÙˆØ§Ù†Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.</p>
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="grid">
        <EmptyState
          badge="Ú¯Ø²Ø§Ø±Ø´ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯"
          title="Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯"
          description="Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´ Ù…Ù…Ú©Ù† Ø§Ø³Øª Ù¾Ø§Ú© Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ØŒ ÛŒØ§ Ø¯Ø± Ù…Ø±ÙˆØ±Ú¯Ø± Ø¯ÛŒÚ¯Ø±ÛŒ Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯. Ú†ÙˆÙ†MVP ÙØ¹Ù„Ø§Ù‹ backend Ù†Ø¯Ø§Ø±Ø¯ØŒ Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§ ÙÙ‚Ø· Ø¯Ø± Ù‡Ù…ÛŒÙ† Ù…Ø±ÙˆØ±Ú¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯."
          actionHref="/reports"
          actionLabel="Ø¨Ø§Ø²Ú¯Ø´Øª Ø¨Ù‡ Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§"
        />
      </section>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Report Detail</span>

        <h1>Ø¬Ø²Ø¦ÛŒØ§Øª Ú¯Ø²Ø§Ø±Ø´ Ø°Ø®ÛŒØ±Ù‡â€ŒØ´Ø¯Ù‡</h1>

        <p>
          Ø§ÛŒÙ† ØµÙØ­Ù‡ Ú¯Ø²Ø§Ø±Ø´ Ø±Ø§ Ø§Ø² localStorage Ù‡Ù…ÛŒÙ† Ù…Ø±ÙˆØ±Ú¯Ø± Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ø¯. Ø¯Ø± Ù†Ø³Ø®Ù‡â€ŒÙ‡Ø§ÛŒ
          Ø¨Ø¹Ø¯ÛŒØŒ Ø§Ú¯Ø± backend Ùˆ Ø­Ø³Ø§Ø¨ Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø§Ø¶Ø§ÙÙ‡ Ø´ÙˆØ¯ØŒ Ø§ÛŒÙ† Ù†ÙˆØ¹ ØµÙØ­Ù‡ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¨Ù‡
          Ù„ÛŒÙ†Ú© Ø¯Ø§Ø¦Ù…ÛŒ Ùˆ Ù‚Ø§Ø¨Ù„ Ø§Ø´ØªØ±Ø§Ú© ØªØ¨Ø¯ÛŒÙ„ Ø´ÙˆØ¯.
        </p>

        <div className="actions">
          <Link className="button secondary" href="/reports">
            Ø¨Ø§Ø²Ú¯Ø´Øª Ø¨Ù‡ Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§
          </Link>

          <Link className="button secondary" href="/dashboard">
            Ø±ÙØªÙ† Ø¨Ù‡ Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯
          </Link>

          <Link className="button" href="/chart">
            Ø³Ø§Ø®Øª Ú¯Ø²Ø§Ø±Ø´ Ø¬Ø¯ÛŒØ¯
          </Link>
        </div>
      </div>

      <ReportCard report={report} />

      <section className="card report-note-card">
        <span className="badge">ÛŒØ§Ø¯Ø¯Ø§Ø´Øª Ø´Ø®ØµÛŒ</span>

        <h2>ÛŒØ§Ø¯Ø¯Ø§Ø´Øª Ù…Ù† Ø¯Ø±Ø¨Ø§Ø±Ù‡ Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´</h2>

        <p>
          Ø§ÛŒÙ† ÛŒØ§Ø¯Ø¯Ø§Ø´Øª ÙÙ‚Ø· Ø¯Ø± Ù…Ø±ÙˆØ±Ú¯Ø± Ù‡Ù…ÛŒÙ† Ø¯Ø³ØªÚ¯Ø§Ù‡ Ø°Ø®ÛŒØ±Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ùˆ ÙØ¹Ù„Ø§Ù‹ Ø¨Ù‡ Ù‡ÛŒÚ†
          Ø³Ø±ÙˆØ±ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.
        </p>

        <label className="field">
          <span>ÛŒØ§Ø¯Ø¯Ø§Ø´Øª</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ù…Ø«Ù„Ø§Ù‹: Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´ Ø±Ø§ Ø¨Ø¹Ø¯ Ø§Ø² ÛŒÚ© ØªØµÙ…ÛŒÙ… Ù…Ù‡Ù… Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¨Ø®ÙˆØ§Ù†Ù…..."
            rows={6}
          />
        </label>

        <div className="actions">
          <button className="button" type="button" onClick={handleSaveNote}>
            Ø°Ø®ÛŒØ±Ù‡ ÛŒØ§Ø¯Ø¯Ø§Ø´Øª
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={() => setNote("")}
          >
            Ø®Ø§Ù„ÛŒ Ú©Ø±Ø¯Ù† Ù…ØªÙ†
          </button>
        </div>

        {message ? <p className="success-message">{message}</p> : null}
      </section>

      <section className="card">
        <span className="badge">Single Export</span>

        <h2>Ø®Ø±ÙˆØ¬ÛŒ ØªÚ©ÛŒ Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´</h2>

        <p>
          Ù…ÛŒâ€ŒØªÙˆØ§Ù†ÛŒ ÙÙ‚Ø· Ù‡Ù…ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´ Ø±Ø§ Ø¨Ù‡ Ù‡Ù…Ø±Ø§Ù‡ ÛŒØ§Ø¯Ø¯Ø§Ø´Øª Ùˆ ÙˆØ¶Ø¹ÛŒØª Ø¹Ù„Ø§Ù‚Ù‡â€ŒÙ…Ù†Ø¯ÛŒ Ø¨Ù‡ ØµÙˆØ±Øª
          JSON Ø®Ø±ÙˆØ¬ÛŒ Ø¨Ú¯ÛŒØ±ÛŒ. Ø®Ø±ÙˆØ¬ÛŒ Ù…ØªÙ†ÛŒ Ù‡Ù… Ø¨Ø±Ø§ÛŒ Ú©Ù¾ÛŒØŒ Ø¢Ø±Ø´ÛŒÙˆ ÛŒØ§ Ø§Ø´ØªØ±Ø§Ú© Ø³Ø§Ø¯Ù‡â€ŒØªØ±
          Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯Ù‡ Ø§Ø³Øª.
        </p>

        <div className="actions">
          <button className="button" type="button" onClick={handleExportReport}>
            Ú¯Ø±ÙØªÙ† Ø®Ø±ÙˆØ¬ÛŒ JSON Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={handleExportTextReport}
          >
            Ú¯Ø±ÙØªÙ† Ø®Ø±ÙˆØ¬ÛŒ TXT Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´
          </button>
        </div>
      </section>
    </section>
  );
}
