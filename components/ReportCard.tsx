"use client";

import { useState } from "react";
import { createShareText } from "@/lib/astrology/share-text";
import {
  formatZodiacLabel,
  formatZodiacSign,
  zodiacSignFromLongitude,
  normalizeLongitude,
} from "@/lib/astrology/zodiac-labels";
import type { AstrologyReport, RealEngineReportPlacement, ZodiacKey } from "@/types/astro";

type ReportCardProps = {
  report: AstrologyReport;
};

const PLANET_LABELS_FA: Record<string, string> = {
  sun: "Ø®ÙˆØ±Ø´ÛŒØ¯",
  moon: "Ù…Ø§Ù‡",
  mercury: "Ø¹Ø·Ø§Ø±Ø¯",
  venus: "Ø²Ù‡Ø±Ù‡",
  mars: "Ù…Ø±ÛŒØ®",
  jupiter: "Ù…Ø´ØªØ±ÛŒ",
  saturn: "Ø²Ø­Ù„",
  uranus: "Ø§ÙˆØ±Ø§Ù†ÙˆØ³",
  neptune: "Ù†Ù¾ØªÙˆÙ†",
  pluto: "Ù¾Ù„ÙˆØªÙˆ",
};

type SignKey = ZodiacKey;

type CoreCard = {
  id: string;
  title: string;
  eyebrow: string;
  value: string;
  description: string;
};

export function ReportCard({ report }: ReportCardProps) {
  const [copyMessage, setCopyMessage] = useState("");
  const realEngineAspects = report.realEngine?.aspects ?? [];
  const coreCards = buildCoreCards(report);
  const shownPlacements = report.realEngine?.placements.slice(0, 8) ?? [];
  const shownAspects = realEngineAspects.slice(0, 5);

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
    <article className="card report-card report-product-card">
      <header className="report-product-hero">
        <div className="report-product-hero-copy">
          <span className="badge report-product-badge">
            {report.realEngine
              ? "Ú¯Ø²Ø§Ø±Ø´ Ù…Ø­Ø§Ø³Ø¨Ù‡â€ŒØ´Ø¯Ù‡ Halleus"
              : "Ú¯Ø²Ø§Ø±Ø´ Ù†Ù…Ø§Ø¯ÛŒÙ† Halleus"}
          </span>

          <h2>
            {report.input.name
              ? `Ú¯Ø²Ø§Ø±Ø´ Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ ${report.input.name}`
              : "Ú¯Ø²Ø§Ø±Ø´ Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯"}
          </h2>

          <p>
            Ø§ÛŒÙ† ØµÙØ­Ù‡ Ø®ÙˆØ§Ù†Ø´ Ø°Ø®ÛŒØ±Ù‡â€ŒØ´Ø¯Ù‡ ØªÙˆØ³ØªØ› ØªØ±Ú©ÛŒØ¨ÛŒ Ø§Ø² Ø¬Ø§ÛŒÚ¯Ø§Ù‡â€ŒÙ‡Ø§ÛŒ Ø§ØµÙ„ÛŒØŒ Ø±ÙˆØ§Ø¨Ø· Ù…Ù‡Ù…
            Ø³ÛŒØ§Ø±Ù‡â€ŒÙ‡Ø§ Ùˆ Ù…ØªÙ† ÙØ§Ø±Ø³ÛŒ Ù†Ø±Ù… Ú©Ù‡ Ø¨Ø±Ø§ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù† Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ùˆ Ø§Ø´ØªØ±Ø§Ú©â€ŒÚ¯Ø°Ø§Ø±ÛŒ Ø¢Ù…Ø§Ø¯Ù‡ Ø´Ø¯Ù‡ Ø§Ø³Øª.
          </p>
        </div>

        <div className="report-product-meta-card">
          <span className="pill">{new Date(report.createdAt).toLocaleDateString("fa-IR")}</span>
          <div className="birth-details report-product-birth-details">
            <span>{report.input.birthDate}</span>
            <span>{report.input.birthTime}</span>
            <span>
              {report.input.birthCity}ØŒ {report.input.birthCountry}
            </span>
          </div>
        </div>
      </header>

      <section className="report-section report-core-section">
        <div className="report-section-heading">
          <span className="section-label">Ø³Ù‡ Ø³ØªÙˆÙ† Ø§ØµÙ„ÛŒ</span>
          <h3>Ø®ÙˆØ±Ø´ÛŒØ¯ØŒ Ù…Ø§Ù‡ Ùˆ Ø±Ø§ÛŒØ²ÛŒÙ†Ú¯</h3>
          <p>
            Ø§ÛŒÙ† Ø³Ù‡ Ú©Ø§Ø±ØªØŒ Ø®Ù„Ø§ØµÙ‡â€ŒØªØ±ÛŒÙ† ØªØµÙˆÛŒØ± Ø§Ø² Ù‡ÙˆÛŒØªØŒ Ù†ÛŒØ§Ø² Ø§Ø­Ø³Ø§Ø³ÛŒ Ùˆ Ø´ÛŒÙˆÙ‡ ÙˆØ±ÙˆØ¯ ØªÙˆ Ø¨Ù‡
            Ø¬Ù‡Ø§Ù† Ø±Ø§ Ù†Ø´Ø§Ù† Ù…ÛŒâ€ŒØ¯Ù‡Ù†Ø¯.
          </p>
        </div>

        <div className="report-core-grid">
          {coreCards.map((card) => (
            <article className="report-core-card" key={card.id}>
              <span>{card.eyebrow}</span>
              <strong>{card.value}</strong>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      {report.realEngine ? (
        <section className="report-section report-calculation-section">
          <div className="report-section-heading">
            <span className="section-label">Ø¬Ø²Ø¦ÛŒØ§Øª Ù…Ø­Ø§Ø³Ø¨Ù‡</span>
            <h3>Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ ÙˆØ§Ù‚Ø¹ÛŒâ€ŒØªØ± Ø°Ø®ÛŒØ±Ù‡â€ŒØ´Ø¯Ù‡</h3>
            <p>
              Ø§ÛŒÙ† Ø¨Ø®Ø´ Ø¨Ù‡â€ŒØ¬Ø§ÛŒ Ù†Ù…Ø§ÛŒØ´ Ø®Ø§Ù… Ùˆ Ø¢Ø²Ù…Ø§ÛŒØ´Ú¯Ø§Ù‡ÛŒØŒ ÙÙ‚Ø· Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù‚Ø§Ø¨Ù„ ÙÙ‡Ù… Ù…Ø­Ø§Ø³Ø¨Ù‡
              Ø±Ø§ Ù†Ú¯Ù‡ Ù…ÛŒâ€ŒØ¯Ø§Ø±Ø¯ ØªØ§ Ø¨Ø¯Ø§Ù†ÛŒ Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´ Ø¨Ø§ Ú†Ù‡ ÙˆØ±ÙˆØ¯ÛŒ Ùˆ Ú†Ù‡ Ø¬Ø§ÛŒÚ¯Ø§Ù‡â€ŒÙ‡Ø§ÛŒÛŒ Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯Ù‡ Ø§Ø³Øª.
            </p>
          </div>

          <div className="report-calculation-grid">
            <div className="mini-card">
              <strong>Ø´Ù‡Ø± Ù…Ø­Ø§Ø³Ø¨Ù‡</strong>
              <span>{report.realEngine.cityLabel}</span>
            </div>

            <div className="mini-card">
              <strong>Ø±Ø§ÛŒØ²ÛŒÙ†Ú¯ ØªÙ‚Ø±ÛŒØ¨ÛŒ</strong>
              <span>{formatDegree(report.realEngine.ascendantLongitude)}</span>
            </div>

            <div className="mini-card">
              <strong>Ø²Ù…Ø§Ù† ØªØ¨Ø¯ÛŒÙ„â€ŒØ´Ø¯Ù‡</strong>
              <span>{formatShortUtc(report.realEngine.utcIso)}</span>
            </div>
          </div>

          <details className="report-placement-details">
            <summary>Ù…Ø´Ø§Ù‡Ø¯Ù‡ Ø¬Ø§ÛŒÚ¯Ø§Ù‡â€ŒÙ‡Ø§ÛŒ Ø§ØµÙ„ÛŒ</summary>
            <div className="report-placement-grid">
              {shownPlacements.map((placement) => (
                <div className="mini-card" key={placement.id}>
                  <strong>{getPlanetLabel(placement.id, placement.label)}</strong>
                  <span>{formatPlacement(placement)}</span>
                </div>
              ))}
            </div>
          </details>
        </section>
      ) : null}

      {shownAspects.length > 0 ? (
        <section className="report-section report-aspect-section">
          <div className="report-section-heading">
            <span className="section-label">Ø±ÙˆØ§Ø¨Ø· Ø³ÛŒØ§Ø±Ù‡â€ŒÙ‡Ø§</span>
            <h3>Ø±ÙˆØ§Ø¨Ø· Ù…Ù‡Ù… Ø¨ÛŒÙ† Ø³ÛŒØ§Ø±Ù‡â€ŒÙ‡Ø§</h3>
            <p>
              aspectÙ‡Ø§ Ù†Ø´Ø§Ù† Ù…ÛŒâ€ŒØ¯Ù‡Ù†Ø¯ Ú©Ø¯Ø§Ù… Ø¨Ø®Ø´â€ŒÙ‡Ø§ÛŒ Ú†Ø§Ø±Øª Ø¨Ø§ Ù‡Ù… Ø¬Ø±ÛŒØ§Ù†ØŒ Ø­Ù…Ø§ÛŒØªØŒ ÙØ´Ø§Ø± ÛŒØ§
              Ú¯ÙØªâ€ŒÙˆÚ¯ÙˆÛŒ Ø¯Ø±ÙˆÙ†ÛŒ Ù…ÛŒâ€ŒØ³Ø§Ø²Ù†Ø¯.
            </p>
          </div>

          <div className="report-aspect-grid">
            {shownAspects.map((aspect) => (
              <article className="report-aspect-card" key={aspect.id}>
                <div>
                  <strong>
                    {aspect.firstPlanetLabel}{" "}
                    <span aria-hidden="true">{aspect.glyph}</span>{" "}
                    {aspect.secondPlanetLabel}
                  </strong>
                  <span>
                    {aspect.aspectLabel} Â· orb {formatDegree(aspect.orb)}
                  </span>
                </div>
                <p>{aspect.narrative}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="report-section report-summary report-product-summary">
        <div className="report-section-heading">
          <span className="section-label">Ø®ÙˆØ§Ù†Ø´ Ú©Ù„ÛŒ</span>
          <h3>ØªØµÙˆÛŒØ± Ú©Ù„ÛŒ Ú†Ø§Ø±Øª</h3>
        </div>
        <p>{report.summary}</p>
      </section>

      <section className="report-section">
        <div className="report-section-heading">
          <span className="section-label">Ù„Ø§ÛŒÙ‡â€ŒÙ‡Ø§ÛŒ ØªÙØ³ÛŒØ±</span>
          <h3>Ø¬Ø²Ø¦ÛŒØ§Øª Ø®ÙˆØ§Ù†Ø´ ÙØ§Ø±Ø³ÛŒ</h3>
        </div>

        <div className="report-list report-insight-list report-product-insight-list">
          {report.interpretations.map((item, index) => (
            <div className="mini-card report-insight" key={item}>
              <strong>{index + 1}</strong>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="actions report-product-actions">
        <button className="button secondary" onClick={handleCopyShareText}>
          Ú©Ù¾ÛŒ Ù…ØªÙ† Ø§Ø´ØªØ±Ø§Ú©â€ŒÚ¯Ø°Ø§Ø±ÛŒ
        </button>
      </div>

      {copyMessage ? <p className="success-message">{copyMessage}</p> : null}

      <div className="notice report-notice report-product-notice">
        <p>{report.safetyNote}</p>
      </div>
    </article>
  );
}

function buildCoreCards(report: AstrologyReport): CoreCard[] {
  const sun = findPlacement(report, "sun");
  const moon = findPlacement(report, "moon");
  const risingSign = report.realEngine
    ? signFromLongitude(report.realEngine.ascendantLongitude)
    : report.chart.risingSign.key;
  const risingDegree = report.realEngine
    ? normalizeLongitude(report.realEngine.ascendantLongitude) % 30
    : undefined;

  return [
    {
      id: "sun",
      title: "Ø®ÙˆØ±Ø´ÛŒØ¯",
      eyebrow: "Ù‡ÙˆÛŒØª Ùˆ Ù…Ø³ÛŒØ± Ø±Ø´Ø¯",
      value: sun ? formatPlacement(sun) : formatZodiacSign(report.chart.sunSign),
      description:
        "Ø®ÙˆØ±Ø´ÛŒØ¯ Ù†Ø´Ø§Ù† Ù…ÛŒâ€ŒØ¯Ù‡Ø¯ Ú©Ø¬Ø§ Ø­Ø³ Ø²Ù†Ø¯Ù‡ Ø¨ÙˆØ¯Ù†ØŒ Ø§Ø¹ØªÙ…Ø§Ø¯Ø¨Ù‡â€ŒÙ†ÙØ³ Ùˆ Ø¬Ù‡Øª Ø§ØµÙ„ÛŒ Ø²Ù†Ø¯Ú¯ÛŒ Ù¾Ø±Ø±Ù†Ú¯â€ŒØªØ± Ù…ÛŒâ€ŒØ´ÙˆØ¯.",
    },
    {
      id: "moon",
      title: "Ù…Ø§Ù‡",
      eyebrow: "Ù†ÛŒØ§Ø² Ø§Ø­Ø³Ø§Ø³ÛŒ",
      value: moon ? formatPlacement(moon) : formatZodiacSign(report.chart.moonSign),
      description:
        "Ù…Ø§Ù‡ Ø¯Ø±Ø¨Ø§Ø±Ù‡ Ø§Ù…Ù†ÛŒØª Ø¯Ø±ÙˆÙ†ÛŒØŒ ÙˆØ§Ú©Ù†Ø´â€ŒÙ‡Ø§ÛŒ Ø§Ø­Ø³Ø§Ø³ÛŒ Ùˆ Ú†ÛŒØ²ÛŒ Ø­Ø±Ù Ù…ÛŒâ€ŒØ²Ù†Ø¯ Ú©Ù‡ Ø¯Ù„ ØªÙˆ Ø¨Ø±Ø§ÛŒ Ø¢Ø±Ø§Ù… Ø´Ø¯Ù† Ù„Ø§Ø²Ù… Ø¯Ø§Ø±Ø¯.",
    },
    {
      id: "rising",
      title: "Ø±Ø§ÛŒØ²ÛŒÙ†Ú¯",
      eyebrow: "ÙˆØ±ÙˆØ¯ Ø¨Ù‡ Ø¬Ù‡Ø§Ù†",
      value:
        risingDegree === undefined
          ? formatZodiacLabel(risingSign)
          : `${formatZodiacLabel(risingSign)}ØŒ Ø¯Ø±Ø¬Ù‡ ${formatDegree(risingDegree)}`,
      description:
        "Ø±Ø§ÛŒØ²ÛŒÙ†Ú¯ Ø±Ù†Ú¯ Ø§ÙˆÙ„ÛŒÙ† Ø¨Ø±Ø®ÙˆØ±Ø¯ ØªÙˆ Ø¨Ø§ Ù…ÙˆÙ‚Ø¹ÛŒØªâ€ŒÙ‡Ø§ØŒ Ø¨Ø¯Ù†ØŒ ÙØ¶Ø§Ù‡Ø§ÛŒ ØªØ§Ø²Ù‡ Ùˆ ØªØµÙˆÛŒØ±ÛŒ Ø±Ø§ Ú©Ù‡ Ø§Ø² Ø®ÙˆØ¯Øª Ù†Ø´Ø§Ù† Ù…ÛŒâ€ŒØ¯Ù‡ÛŒ Ù…Ø´Ø®Øµ Ù…ÛŒâ€ŒÚ©Ù†Ø¯.",
    },
  ];
}

function findPlacement(report: AstrologyReport, id: string) {
  return report.realEngine?.placements.find((placement) => placement.id === id);
}

function getPlanetLabel(id: string, fallback: string) {
  return PLANET_LABELS_FA[id] ?? fallback;
}

function formatPlacement(placement: RealEngineReportPlacement) {
  return `${formatZodiacLabel(placement.signId)}ØŒ Ø¯Ø±Ø¬Ù‡ ${formatDegree(
    placement.degreeInSign,
  )}`;
}

function formatDegree(value: number) {
  return `${value.toFixed(2)}Â°`;
}

function formatShortUtc(utcIso: string) {
  if (!utcIso) {
    return "Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡";
  }

  return utcIso.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function signFromLongitude(longitude: number): SignKey {
  return zodiacSignFromLongitude(longitude);
}
