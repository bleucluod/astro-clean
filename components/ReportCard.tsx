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
  category?: string;
  tone?: string;
  sourceRule?: string;
};

function getInsightCategoryLabel(category?: string) {
  const labels: Record<string, string> = {
    identity: "\u0647\u0648\u06CC\u062A",
    emotion: "\u0627\u062D\u0633\u0627\u0633",
    "social-mask": "\u0637\u0627\u0644\u0639",
    balance: "\u062A\u0639\u0627\u062F\u0644",
    growth: "\u0631\u0634\u062F",
  };

  return category ? labels[category] ?? category : "";
}

function getInsightToneLabel(tone?: string) {
  const labels: Record<string, string> = {
    reflective: "\u062A\u0623\u0645\u0644\u06CC",
    supportive: "\u062D\u0645\u0627\u06CC\u062A\u06CC",
    cautionary: "\u0627\u062D\u062A\u06CC\u0627\u0637\u06CC",
  };

  return tone ? labels[tone] ?? tone : "";
}

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
      category: insight.category,
      tone: insight.tone,
      sourceRule: insight.source.rule,
    }));
  }

  return report.interpretations.map((item) => {
    const insight = parseInterpretation(item);

    return {
      id: item,
      title: insight.title,
      body: insight.body,
      badge: "legacy",
      category: "legacy",
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
              <div className="insight-card-badges">
                <span className="badge">{insight.badge}</span>
                {insight.category ? (
                  <span className="pill">
                    {getInsightCategoryLabel(insight.category)}
                  </span>
                ) : null}
                {insight.tone ? (
                  <span className="pill">{getInsightToneLabel(insight.tone)}</span>
                ) : null}
              </div>

              {insight.title ? <strong>{insight.title}</strong> : null}
            </div>

            <p>{insight.body}</p>

            {insight.sourceRule ? (
              <small className="insight-source">
                \u0642\u0627\u0639\u062F\u0647: {insight.sourceRule}
              </small>
            ) : null}
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
