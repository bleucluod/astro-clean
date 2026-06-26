"use client";

import { useState } from "react";
import { createShareText } from "@/lib/astrology/share-text";
import type { AstrologyReport } from "@/types/astro";

type ReportCardProps = {
  report: AstrologyReport;
};

const PLANET_LABELS_FA: Record<string, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
};

const SIGN_LABELS_FA: Record<string, string> = {
  aries: "حمل",
  taurus: "ثور",
  gemini: "جوزا",
  cancer: "سرطان",
  leo: "اسد",
  virgo: "سنبله",
  libra: "میزان",
  scorpio: "عقرب",
  sagittarius: "قوس",
  capricorn: "جدی",
  aquarius: "دلو",
  pisces: "حوت",
};

export function ReportCard({ report }: ReportCardProps) {
  const [copyMessage, setCopyMessage] = useState("");
  const realEngineAspects = report.realEngine?.aspects ?? [];

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
          <span className="badge">
            {report.realEngine ? "گزارش نمادین + real engine" : "گزارش نمادین"}
          </span>
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

      {report.realEngine ? (
        <section className="report-section">
          <span className="badge">real engine snapshot</span>
          <h3>داده واقعی‌تر ذخیره‌شده</h3>
          <p>{report.realEngine.note}</p>

          <div className="grid grid-3">
            <div className="mini-card">
              <strong>شهر engine</strong>
              <span>{report.realEngine.cityLabel}</span>
            </div>

            <div className="mini-card">
              <strong>ASC approx</strong>
              <span>{formatDegree(report.realEngine.ascendantLongitude)}</span>
            </div>

            <div className="mini-card">
              <strong>UTC</strong>
              <span>{report.realEngine.utcIso}</span>
            </div>
          </div>

          <div className="grid">
            {report.realEngine.placements.slice(0, 6).map((placement) => (
              <div className="mini-card" key={placement.id}>
                <strong>{PLANET_LABELS_FA[placement.id] ?? placement.label}</strong>
                <span>
                  {SIGN_LABELS_FA[placement.signId] ?? placement.signId} —{" "}
                  {formatDegree(placement.degreeInSign)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {realEngineAspects.length > 0 ? (
        <section className="report-section">
          <span className="badge">روابط سیاره‌ها</span>
          <h3>روابط مهم بین سیاره‌ها</h3>
          <p>
            این بخش نشان می‌دهد کدام سیاره‌ها در چارت با هم حمایت، فشار یا
            گفت‌وگوی درونی می‌سازند.
          </p>

          <div className="grid">
            {realEngineAspects.slice(0, 5).map((aspect) => (
              <div className="mini-card report-insight" key={aspect.id}>
                <strong>
                  {aspect.firstPlanetLabel}{" "}
                  <span aria-hidden="true">{aspect.glyph}</span>{" "}
                  {aspect.secondPlanetLabel}
                </strong>
                <span>
                  {aspect.aspectLabel} — orb {formatDegree(aspect.orb)}
                </span>
                <p>{aspect.narrative}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="report-section report-summary">
        <p>{report.summary}</p>
      </section>

      <div className="report-list report-insight-list">
        {report.interpretations.map((item, index) => (
          <div className="mini-card report-insight" key={item}>
            <strong>{index + 1}</strong>
            <p>{item}</p>
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="button secondary" onClick={handleCopyShareText}>
          کپی متن اشتراک‌گذاری
        </button>
      </div>

      {copyMessage ? <p className="success-message">{copyMessage}</p> : null}

      <div className="notice report-notice">
        <p>{report.safetyNote}</p>
      </div>
    </article>
  );
}

function formatDegree(value: number) {
  return `${value.toFixed(2)}°`;
}
