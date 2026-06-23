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

const ui = {
  reportBadge: "\u06AF\u0632\u0627\u0631\u0634 \u0646\u0645\u0627\u062F\u06CC\u0646",
  reportPrefix: "\u06AF\u0632\u0627\u0631\u0634 ",
  defaultReportTitle: "\u06AF\u0632\u0627\u0631\u0634 \u0686\u0627\u0631\u062A \u062A\u0648\u0644\u062F",
  sun: "\u062E\u0648\u0631\u0634\u06CC\u062F",
  moon: "\u0645\u0627\u0647",
  rising: "\u0631\u0627\u06CC\u0632\u06CC\u0646\u06AF",
  copyShareText: "\u06A9\u067E\u06CC \u0645\u062A\u0646 \u0627\u0634\u062A\u0631\u0627\u06A9\u200C\u06AF\u0630\u0627\u0631\u06CC",
  copiedMessage:
    "\u0645\u062A\u0646 \u0627\u0634\u062A\u0631\u0627\u06A9\u200C\u06AF\u0630\u0627\u0631\u06CC \u06A9\u067E\u06CC \u0634\u062F.",
  copyFailedMessage:
    "\u06A9\u067E\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0645\u0645\u06A9\u0646 \u0646\u0634\u062F. \u0645\u062A\u0646 \u0631\u0627 \u062F\u0633\u062A\u06CC \u06A9\u067E\u06CC \u06A9\u0646.",
  engineOverviewTitle:
    "\u0646\u0645\u0627\u06CC \u06A9\u0644\u06CC \u0645\u0648\u062A\u0648\u0631 \u062A\u062D\u0644\u06CC\u0644",
  insightCount:
    "\u062A\u0639\u062F\u0627\u062F \u0628\u0631\u062F\u0627\u0634\u062A\u200C\u0647\u0627",
  generatedAt: "\u062A\u0627\u0631\u06CC\u062E \u062A\u0648\u0644\u06CC\u062F",
  dominantElement:
    "\u0639\u0646\u0635\u0631 \u063A\u0627\u0644\u0628",
  dominantModality:
    "\u06A9\u06CC\u0641\u06CC\u062A \u063A\u0627\u0644\u0628",
  rule: "\u0642\u0627\u0639\u062F\u0647",
  unknown: "\u0646\u0627\u0645\u0634\u062E\u0635",
};

const elementLabels: Record<string, string> = {
  fire: "\u0622\u062A\u0634",
  earth: "\u062E\u0627\u06A9",
  air: "\u0647\u0648\u0627",
  water: "\u0622\u0628",
};

const modalityLabels: Record<string, string> = {
  cardinal: "\u0622\u063A\u0627\u0632\u06AF\u0631",
  fixed: "\u062B\u0627\u0628\u062A",
  mutable: "\u0645\u0646\u0639\u0637\u0641",
};

const categoryLabels: Record<string, string> = {
  identity: "\u0647\u0648\u06CC\u062A",
  emotion: "\u0627\u062D\u0633\u0627\u0633",
  "social-mask": "\u0637\u0627\u0644\u0639",
  balance: "\u062A\u0639\u0627\u062F\u0644",
  growth: "\u0631\u0634\u062F",
  legacy: "legacy",
};

const toneLabels: Record<string, string> = {
  reflective: "\u062A\u0623\u0645\u0644\u06CC",
  supportive: "\u062D\u0645\u0627\u06CC\u062A\u06CC",
  cautionary: "\u0627\u062D\u062A\u06CC\u0627\u0637\u06CC",
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

function formatEngineDate(value?: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("fa-IR");
}

function getEngineElementLabel(element?: string | null) {
  return element ? elementLabels[element] ?? element : ui.unknown;
}

function getEngineModalityLabel(modality?: string | null) {
  return modality ? modalityLabels[modality] ?? modality : ui.unknown;
}

function getInsightCategoryLabel(category?: string) {
  return category ? categoryLabels[category] ?? category : "";
}

function getInsightToneLabel(tone?: string) {
  return tone ? toneLabels[tone] ?? tone : "";
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
      setCopyMessage(ui.copiedMessage);
    } catch {
      setCopyMessage(ui.copyFailedMessage);
    }
  }

  return (
    <article className="card report-card">
      <div className="report-header">
        <div>
          <span className="badge">{ui.reportBadge}</span>
          <h2>
            {report.input.name
              ? ui.reportPrefix + report.input.name
              : ui.defaultReportTitle}
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
          {report.input.birthCity}? {report.input.birthCountry}
        </span>
      </div>

      <div className="grid grid-3">
        <div className="mini-card">
          <strong>{ui.sun}</strong>
          <span>{report.chart.sunSign.faName}</span>
        </div>

        <div className="mini-card">
          <strong>{ui.moon}</strong>
          <span>{report.chart.moonSign.faName}</span>
        </div>

        <div className="mini-card">
          <strong>{ui.rising}</strong>
          <span>{report.chart.risingSign.faName}</span>
        </div>
      </div>

      <p>{report.summary}</p>

      {report.engineResult ? (
        <div className="engine-overview">
          <div>
            <span className="badge">{report.engineResult.version}</span>
            <strong>{ui.engineOverviewTitle}</strong>
          </div>

          <div className="engine-overview-grid">
            <span>
              {ui.insightCount}: {report.engineResult.insights.length}
            </span>
            <span>
              {ui.generatedAt}: {formatEngineDate(report.engineResult.generatedAt)}
            </span>
          </div>

          {report.engineResult.profile ? (
            <div className="engine-profile-grid">
              <span>
                {ui.dominantElement}:{" "}
                {getEngineElementLabel(report.engineResult.profile.dominantElement)}
              </span>
              <span>
                {ui.dominantModality}:{" "}
                {getEngineModalityLabel(
                  report.engineResult.profile.dominantModality,
                )}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

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
                {ui.rule}: {insight.sourceRule}
              </small>
            ) : null}
          </article>
        ))}
      </div>

      <div className="actions">
        <button className="button secondary" onClick={handleCopyShareText}>
          {ui.copyShareText}
        </button>
      </div>

      {copyMessage ? <p className="success-message">{copyMessage}</p> : null}

      <p className="notice">{report.safetyNote}</p>
    </article>
  );
}
