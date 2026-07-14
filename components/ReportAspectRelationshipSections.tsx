"use client";

import {
  buildAspectBehavioralInterpretation,
  getBehavioralChartRulerId,
  isBehavioralAspectInput,
} from "@/lib/astrology/report-behavioral-interpretation";
import { getReportBehavioralAudienceMode } from "@/lib/astrology/report-behavioral-context";
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
  conjunction: "هم‌نشینی ۰ درجه",
  sextile: "زاویه‌ی ۶۰ درجه",
  square: "زاویه‌ی ۹۰ درجه",
  trine: "زاویه‌ی ۱۲۰ درجه",
  opposition: "روبه‌رویی ۱۸۰ درجه",
};

export function ReportAspectRelationshipSections({
  report,
}: ReportAspectRelationshipSectionsProps) {
  const snapshot = report.realEngine;
  const aspects = snapshot?.aspects ?? [];
  const storedHighlights = snapshot?.aspectHighlights ?? [];
  const shownAspects = (
    storedHighlights.length > 0 ? storedHighlights : aspects.slice(0, 5)
  ).slice(0, 5);
  const shownAspectIds = new Set(shownAspects.map((aspect) => aspect.id));
  const hiddenAspectCount = aspects.filter(
    (aspect) => !shownAspectIds.has(aspect.id),
  ).length;

  if (!snapshot || shownAspects.length === 0) {
    return null;
  }

  const placementById = new Map(
    snapshot.placements.map((placement) => [placement.id, placement]),
  );
  const risingSignId =
    snapshot.angles?.asc?.signId ?? report.chart.risingSign.key;
  const chartRulerId = getBehavioralChartRulerId(risingSignId);
  const activeHouseNumbers = (snapshot.houses ?? [])
    .filter((house) => house.planetIds.length > 0)
    .map((house) => house.number);
  const retrogradePlanetIds =
    snapshot.retrogrades?.status === "calculated"
      ? snapshot.retrogrades.planetIds
      : [];
  const audienceMode = getReportBehavioralAudienceMode(report);

  return (
    <section
      className="report-section report-aspect-relationship-sections"
      data-report-aspect-relationship-sections="true"
      data-halleus-behavioral-aspect-core="v0.1.315"
    >
      <div className="report-section-heading">
        <span className="report-eyebrow">رابطه سیاره‌ها</span>
        <h3>رابطه‌های مهم</h3>
        <p data-report-narrative-quality-pass="aspect-bridge">اینجا فقط سه تا پنج رابطه‌ی روایی اولویت‌دار باز شده‌اند؛ فهرست کامل در جزئیات محاسبه می‌ماند.</p>
      </div>

      <div className="report-grid report-placement-section-grid">
        {shownAspects.map((aspect, index) => {
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
              <span className="report-eyebrow">
                رابطه {formatPersianNumber(index + 1)}
              </span>
              <h4>{buildAspectHeading(aspect)}</h4>
              <p>
                {interpretation?.plainMeaning ??
                  "این رابطه باید در کنار جایگاه واقعی هر دو سیاره خوانده شود."}
              </p>
              <ul className="report-detail-list">
                <li>
                  <strong>در عمل:</strong>{" "}
                  {interpretation?.dailyLifeExample ?? aspect.narrative}
                </li>
                <li>
                  <strong>وقتی خوب کار می‌کند:</strong>{" "}
                  {interpretation?.healthyExpression ?? aspect.meaning}
                </li>
                <li>
                  <strong>جایی که گیر می‌کند:</strong>{" "}
                  {interpretation?.possibleFriction ?? aspect.narrative}
                </li>
                <li>
                  <strong>این هفته امتحان کن:</strong>{" "}
                  {interpretation?.smallExperiment ??
                    "یک نمونه واقعی از این رابطه را ثبت و پیش از واکنش مکث کن."}
                </li>
              </ul>
              <details>
                <summary>اورب و میزان اعتماد این خوانش</summary>
                <p>
                  {interpretation?.confidenceNote ?? formatOrbLabel(aspect)}
                </p>
              </details>
            </article>
          );
        })}
      </div>

      {hiddenAspectCount > 0 ? (
        <p className="report-muted">
          {formatPersianNumber(hiddenAspectCount)} رابطه‌ی دیگر در جدول فنی کامل پایین صفحه در دسترس است.
        </p>
      ) : null}
    </section>
  );
}

function buildAspectHeading(aspect: RealEngineReportAspect) {
  return `${aspect.firstPlanetLabel} در ${ASPECT_TITLE_BY_KIND[aspect.aspectId]} با ${aspect.secondPlanetLabel}`;
}

function formatOrbLabel(aspect: RealEngineReportAspect) {
  return `حدود ${formatPersianNumber(aspect.orb)} درجه؛ این عدد نزدیکی تماس را نشان می‌دهد، نه تمام معنای آن را.`;
}

function formatPersianNumber(value: number) {
  return PERSIAN_NUMBER_FORMATTER.format(value);
}
