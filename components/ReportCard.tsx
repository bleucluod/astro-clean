"use client";

import { useState } from "react";
import { createShareText } from "@/lib/astrology/share-text";
import type { AstrologyReport } from "@/types/astro";

type ReportCardProps = {
  report: AstrologyReport;
};

type RenderableInsight = {
  id: string;
  title: string;
  body: string;
  badge: string;
};

function parseInterpretation(item: string) {
  const separatorIndex = item.indexOf(": ");

  if (separatorIndex === -1) {
    return {
      title: "",
      body: item,
    };
  }

  return {
    title: item.slice(0, separatorIndex),
    body: item.slice(separatorIndex + 2),
  };
}

function getRenderableInsights(report: AstrologyReport): RenderableInsight[] {
  if (report.engineResult?.insights?.length) {
    return report.engineResult.insights.map((insight) => ({
      id: insight.id,
      title: insight.title,
      body: insight.summary,
      badge: report.engineResult?.version ?? "engine-v0",
    }));
  }

  return report.interpretations.map((item) => {
    const insight = parseInterpretation(item);

    return {
      id: item,
      title: insight.title,
      body: insight.body,
      badge: "legacy",
    };
  });
}

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

      <div className="birth-details">
        <span>{report.input.birthDate}</span>
        <span>{report.input.birthTime}</span>
        <span>
          {report.input.birthCity}، {report.input.birthCountry}
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

      <div className="report-list insight-list">
        {getRenderableInsights(report).map((insight) => (
          <article className="mini-card insight-card" key={insight.id}>
            <div className="insight-card-header">
              <span className="badge">{insight.badge}</span>
              {insight.title ? <strong>{insight.title}</strong> : null}
            </div>

            <p>{insight.body}</p>
          </article>
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
