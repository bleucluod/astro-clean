"use client";

import { useState } from "react";
import { createShareText } from "@/lib/astrology/share-text";
import {
  formatZodiacLabel,
  formatZodiacSign,
  normalizeLongitude,
  zodiacSignFromLongitude,
} from "@/lib/astrology/zodiac-labels";
import type { AstrologyReport, RealEngineReportPlacement } from "@/types/astro";

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
      setCopyMessage("متن اشتراک‌گذاری کپی شد.");
    } catch {
      setCopyMessage("کپی خودکار ممکن نشد. متن را دستی کپی کن.");
    }
  }

  return (
    <article className="card report-card report-product-card">
      <header className="report-product-hero">
        <div className="report-product-hero-copy">
          <span className="badge report-product-badge">
            {report.realEngine
              ? "گزارش محاسبه‌شده Halleus"
              : "گزارش نمادین Halleus"}
          </span>

          <h2>
            {report.input.name
              ? `گزارش چارت تولد ${report.input.name}`
              : "گزارش چارت تولد"}
          </h2>

          <p>
            این صفحه خوانش ذخیره‌شده توست؛ ترکیبی از جایگاه‌های اصلی، روابط مهم
            سیاره‌ها و متن فارسی نرم که برای خواندن دوباره و اشتراک‌گذاری آماده شده است.
          </p>
        </div>

        <div className="report-product-meta-card">
          <span className="pill">{new Date(report.createdAt).toLocaleDateString("fa-IR")}</span>
          <div className="birth-details report-product-birth-details">
            <span>{report.input.birthDate}</span>
            <span>{report.input.birthTime}</span>
            <span>
              {report.input.birthCity}، {report.input.birthCountry}
            </span>
          </div>
        </div>
      </header>

      <section className="report-section report-core-section">
        <div className="report-section-heading">
          <span className="section-label">سه ستون اصلی</span>
          <h3>خورشید، ماه و رایزینگ</h3>
          <p>
            این سه کارت، خلاصه‌ترین تصویر از هویت، نیاز احساسی و شیوه ورود تو به
            جهان را نشان می‌دهند.
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
            <span className="section-label">جزئیات محاسبه</span>
            <h3>داده‌های واقعی‌تر ذخیره‌شده</h3>
            <p>
              این بخش به‌جای نمایش خام و آزمایشگاهی، فقط اطلاعات قابل فهم محاسبه
              را نگه می‌دارد تا بدانی این گزارش با چه ورودی و چه جایگاه‌هایی ساخته شده است.
            </p>
          </div>

          <div className="report-calculation-grid">
            <div className="mini-card">
              <strong>شهر محاسبه</strong>
              <span>{report.realEngine.cityLabel}</span>
            </div>

            <div className="mini-card">
              <strong>رایزینگ تقریبی</strong>
              <span>{formatRisingFromLongitude(report.realEngine.ascendantLongitude)}</span>
            </div>

            <div className="mini-card">
              <strong>زمان تبدیل‌شده</strong>
              <span>{formatShortUtc(report.realEngine.utcIso)}</span>
            </div>
          </div>

          <details className="report-placement-details">
            <summary>مشاهده جایگاه‌های اصلی</summary>
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
            <span className="section-label">روابط سیاره‌ها</span>
            <h3>روابط مهم بین سیاره‌ها</h3>
            <p>
              aspectها نشان می‌دهند کدام بخش‌های چارت با هم جریان، حمایت، فشار یا
              گفت‌وگوی درونی می‌سازند.
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
                    {aspect.aspectLabel} · orb {formatDegree(aspect.orb)}
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
          <span className="section-label">خوانش کلی</span>
          <h3>تصویر کلی چارت</h3>
        </div>
        <p>{report.summary}</p>
      </section>

      <section className="report-section">
        <div className="report-section-heading">
          <span className="section-label">لایه‌های تفسیر</span>
          <h3>جزئیات خوانش فارسی</h3>
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
          کپی متن اشتراک‌گذاری
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
    ? zodiacSignFromLongitude(report.realEngine.ascendantLongitude)
    : report.chart.risingSign.key;
  const risingDegree = report.realEngine
    ? normalizeLongitude(report.realEngine.ascendantLongitude) % 30
    : undefined;

  return [
    {
      id: "sun",
      title: "خورشید",
      eyebrow: "هویت و مسیر رشد",
      value: sun ? formatPlacement(sun) : formatZodiacSign(report.chart.sunSign),
      description:
        "خورشید نشان می‌دهد کجا حس زنده بودن، اعتمادبه‌نفس و جهت اصلی زندگی پررنگ‌تر می‌شود.",
    },
    {
      id: "moon",
      title: "ماه",
      eyebrow: "نیاز احساسی",
      value: moon ? formatPlacement(moon) : formatZodiacSign(report.chart.moonSign),
      description:
        "ماه درباره امنیت درونی، واکنش‌های احساسی و چیزی حرف می‌زند که دل تو برای آرام شدن لازم دارد.",
    },
    {
      id: "rising",
      title: "رایزینگ",
      eyebrow: "ورود به جهان",
      value:
        risingDegree === undefined
          ? formatZodiacLabel(risingSign)
          : `${formatZodiacLabel(risingSign)}، درجه ${formatDegree(risingDegree)}`,
      description:
        "رایزینگ رنگ اولین برخورد تو با موقعیت‌ها، بدن، فضاهای تازه و تصویری را که از خودت نشان می‌دهی مشخص می‌کند.",
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
  return `${formatZodiacLabel(placement.signId)}، درجه ${formatDegree(
    placement.degreeInSign,
  )}`;
}

function formatRisingFromLongitude(longitude: number) {
  const signId = zodiacSignFromLongitude(longitude);

  return formatPlacement({
    id: "rising",
    label: "rising",
    longitude,
    signId,
    degreeInSign: normalizeLongitude(longitude) % 30,
    method: "computed",
  });
}

function formatDegree(value: number) {
  return `${value.toFixed(2)}°`;
}

function formatShortUtc(utcIso: string) {
  if (!utcIso) {
    return "ثبت نشده";
  }

  return utcIso.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}
