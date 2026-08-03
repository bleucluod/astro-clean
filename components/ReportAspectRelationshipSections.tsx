"use client";

import {
  buildAspectBehavioralInterpretation,
  getBehavioralChartRulerId,
  isBehavioralAspectInput,
} from "@/lib/astrology/report-behavioral-interpretation";
import { getReportBehavioralAudienceMode } from "@/lib/astrology/report-behavioral-context";
import { selectPrimaryNarrativeAspects } from "@/lib/report-output/live-report-reading-contract";
import { humanizeVisibleText } from "@/lib/report-output/human-first-report-reading";
import type {
  AstrologyReport,
  RealEngineReportAspect,
  RealEngineReportAspectKind,
} from "@/types/astro";

type ReportAspectRelationshipSectionsProps = {
  report: AstrologyReport;
};

const PERSIAN_NUMBER_FORMATTER = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

const ASPECT_TITLE_BY_KIND: Record<RealEngineReportAspectKind, string> = {
  conjunction: "هم‌نشینی",
  sextile: "تسدیس",
  square: "مربع",
  trine: "تثلیث",
  opposition: "مقابله",
};

export function ReportAspectRelationshipSections({
  report,
}: ReportAspectRelationshipSectionsProps) {
  const chartData = report.realEngine;
  const aspects = chartData?.aspects ?? [];
  const storedHighlights = chartData?.aspectHighlights ?? [];
  const shownAspects = selectPrimaryNarrativeAspects(aspects, storedHighlights);

  if (!chartData || shownAspects.length === 0) {
    return null;
  }

  const placementById = new Map(
    chartData.placements.map((placement) => [placement.id, placement]),
  );
  const risingSignId =
    chartData.angles?.asc?.signId ?? report.chart.risingSign.key;
  const chartRulerId = getBehavioralChartRulerId(risingSignId);
  const activeHouseNumbers = (chartData.houses ?? [])
    .filter((house) => house.planetIds.length > 0)
    .map((house) => house.number);
  const retrogradePlanetIds =
    chartData.retrogrades?.status === "calculated"
      ? chartData.retrogrades.planetIds
      : [];
  const audienceMode = getReportBehavioralAudienceMode(report);

  return (
    <section
      className="report-section report-aspect-relationship-sections"
      data-report-aspect-relationship-sections="human-first"
      aria-label="پیوندهای مهم میان بخش‌های مختلف این چارت"
    >
      <div className="report-section-heading">
        <span className="report-eyebrow">پیوندهای پررنگ</span>
        <h3>وقتی دو بخش مهم تو هم‌زمان فعال می‌شوند</h3>
        <p>
          اول تجربهٔ انسانی این پیوند را بخوان. نام جنبه، درجه و اورب فقط در بخش بازشوندهٔ همان روایت آمده‌اند.
        </p>
      </div>

      <div className="report-grid report-placement-section-grid">
        {shownAspects.map((aspect) => {
          const firstPlacement = placementById.get(aspect.firstPlanetId);
          const secondPlacement = placementById.get(aspect.secondPlanetId);
          const interpretation = isBehavioralAspectInput(
            aspect.firstPlanetId,
            aspect.secondPlanetId,
            aspect.aspectId,
          )
            ? buildAspectBehavioralInterpretation({
                firstPlanetId: aspect.firstPlanetId,
                secondPlanetId: aspect.secondPlanetId,
                firstSignId: firstPlacement?.signId,
                secondSignId: secondPlacement?.signId,
                firstHouseNumber: firstPlacement?.house,
                secondHouseNumber: secondPlacement?.house,
                aspectId: aspect.aspectId,
                orb: aspect.orb,
                chartRulerId,
                activeHouseNumbers,
                retrogradePlanetIds,
                audienceMode,
              })
            : null;

          return (
            <article
              className="report-card report-aspect-relationship-card"
              key={aspect.id}
            >
              <span className="report-eyebrow">یک چرخه که می‌شود زودتر دید</span>
              <h4>{buildHumanAspectHeading(aspect)}</h4>
              <p>
                {humanizeVisibleText(interpretation?.plainMeaning ??
                  "این دو نیاز در یک موقعیت هم‌زمان فعال می‌شوند؛ جدا نام‌بردن از هر کدام کمک می‌کند واکنش روشن‌تری داشته باشی.")}
              </p>
              <ul className="report-detail-list">
                <li>
                  <strong>در زندگی تو</strong>{" "}
                  {humanizeVisibleText(interpretation?.dailyLifeExample ?? aspect.narrative)}
                </li>
                <li>
                  <strong>وقتی خوب پیش می‌رود</strong>{" "}
                  {humanizeVisibleText(interpretation?.healthyExpression ?? aspect.meaning)}
                </li>
                <li>
                  <strong>وقتی گیر می‌کند</strong>{" "}
                  {humanizeVisibleText(interpretation?.possibleFriction ?? aspect.narrative)}
                </li>
                <li>
                  <strong>یک راه کوچک برای برگشتن</strong>{" "}
                  {humanizeVisibleText(interpretation?.smallExperiment ??
                    "شروع این چرخه را ثبت کن و پیش از واکنش، نیاز اصلی را در یک جملهٔ کوتاه نام ببر.")}
                </li>
              </ul>
              <details>
                <summary>از کجای چارت می‌آید؟</summary>
                <p>{formatAstrologyEvidence(aspect)}</p>
                {interpretation?.confidenceNote ? (
                  <p>{humanizeVisibleText(interpretation.confidenceNote)}</p>
                ) : null}
              </details>
            </article>
          );
        })}
      </div>

      <p className="report-muted">
        فهرست کامل جنبه‌ها و همهٔ اورب‌ها در تب «جزئیات نجومی» در دسترس است.
      </p>
    </section>
  );
}

function buildHumanAspectHeading(aspect: RealEngineReportAspect) {
  const ids = new Set([aspect.firstPlanetId, aspect.secondPlanetId]);

  if (ids.has("moon") && ids.has("saturn")) {
    return "وقتی نیاز به امنیت با ترس از آسیب‌پذیری برخورد می‌کند";
  }
  if (ids.has("moon") && ids.has("mercury")) {
    return "وقتی فکر آمادهٔ حرف‌زدن است اما احساس هنوز زمان می‌خواهد";
  }
  if (ids.has("venus") && ids.has("mars")) {
    return "وقتی شیوه نزدیک‌شدن و سرعت خواستن یکسان نیست";
  }
  if (ids.has("sun") && ids.has("saturn")) {
    return "وقتی نیاز به دیده‌شدن با احتیاط و مسئولیت روبه‌رو می‌شود";
  }
  if (ids.has("mercury") && ids.has("saturn")) {
    return "وقتی گفتن حرف مهم با ترس از اشتباه یا قضاوت همراه می‌شود";
  }
  if (ids.has("moon") && ids.has("venus")) {
    return "وقتی آرام‌شدن و دریافت محبت از دو مسیر متفاوت می‌آیند";
  }
  if (aspect.aspectId === "trine" || aspect.aspectId === "sextile") {
    return "وقتی دو توانایی طبیعی می‌توانند به کمک هم بیایند";
  }
  if (aspect.aspectId === "square" || aspect.aspectId === "opposition") {
    return "وقتی دو نیاز مهم هم‌زمان فعال می‌شوند و پاسخ یکسانی نمی‌خواهند";
  }
  return "وقتی دو بخش مهم شخصیت در یک موقعیت به هم می‌رسند";
}

function formatAstrologyEvidence(aspect: RealEngineReportAspect) {
  return `${aspect.firstPlanetLabel} در ${ASPECT_TITLE_BY_KIND[aspect.aspectId]} با ${aspect.secondPlanetLabel}؛ زاویهٔ واقعی ${formatPersianNumber(aspect.separation)} درجه و اورب ${formatPersianNumber(aspect.orb)} درجه.`;
}

function formatPersianNumber(value: number) {
  return PERSIAN_NUMBER_FORMATTER.format(value);
}
