"use client";

import {
  buildAspectBehavioralInterpretation,
  getBehavioralChartRulerId,
  isBehavioralAspectInput,
} from "@/lib/astrology/report-behavioral-interpretation";
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
  const storedHighlights = report.realEngine?.aspectHighlights ?? [];
  const shownAspects = (
    storedHighlights.length > 0 ? storedHighlights : aspects.slice(0, 6)
  ).slice(0, 8);
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

  return (
    <section
      className="report-section report-aspect-relationship-sections"
      data-report-aspect-relationship-sections="true"
      data-halleus-behavioral-aspect-core="v0.1.315"
    >
      <div className="report-section-heading">
        <span className="report-eyebrow">رابطه سیاره‌ها</span>
        <h3>ارتباط سیاره‌ها به زبان ساده</h3>
        <p>
          بعد از جایگاه‌های تکی، این بخش نشان می‌دهد همان نیروها در زندگی واقعی
          چگونه با هم همکاری یا اصطکاک پیدا می‌کنند. نوع زاویه فقط شکل رابطه را
          توضیح می‌دهد؛ معنای اصلی از خود سیاره‌ها، نشان‌ها و خانه‌هایشان می‌آید.
        </p>
        <p
          className="report-muted-note"
          data-report-narrative-quality-pass="aspect-bridge"
        >
          اورب وزن و نزدیکی تماس را نشان می‌دهد، اما جای رفتار انسانی را نمی‌گیرد.
          هر کارت یک نمونه روزمره، توان، گیر و آزمایش کوچک دارد.
        </p>
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
              })
            : null;
          const heading = buildAspectHeading(aspect);

          return (
            <article
              className="report-card report-aspect-relationship-card"
              key={aspect.id}
            >
              <span className="report-eyebrow">
                رابطه {formatPersianNumber(index + 1)}
              </span>
              <h4>{heading}</h4>
              <p>
                {interpretation?.plainMeaning ??
                  "این رابطه باید در کنار جایگاه واقعی هر دو سیاره خوانده شود."}
              </p>
              <ul className="report-detail-list">
                <li>
                  <strong>خلاصه ساده:</strong>{" "}
                  {interpretation?.focus ?? aspect.meaning}
                </li>
                <li>
                  <strong>نمونه روزمره:</strong>{" "}
                  {interpretation?.dailyLifeExample ?? aspect.narrative}
                </li>
                <li>
                  <strong>سمت کمک‌کننده:</strong>{" "}
                  {interpretation?.healthyExpression ?? aspect.meaning}
                </li>
                <li>
                  <strong>سمت رشدی:</strong>{" "}
                  {interpretation?.possibleFriction ?? aspect.narrative}
                </li>
                <li>
                  <strong>آزمایش کوچک:</strong>{" "}
                  {interpretation?.smallExperiment ??
                    "یک نمونه واقعی از این رابطه را ثبت و پیش از واکنش مکث کن."}
                </li>
                <li>
                  <strong>اورب و اعتماد خوانش:</strong>{" "}
                  {interpretation?.confidenceNote ?? formatOrbLabel(aspect)}
                </li>
              </ul>
            </article>
          );
        })}
      </div>

      {hiddenAspectCount > 0 ? (
        <p className="report-muted">
          {formatPersianNumber(hiddenAspectCount)} رابطه‌ی دیگر هم محاسبه شده و
          در جدول فنی کامل پایین صفحه دیده می‌شود؛ اینجا فقط رابطه‌های روایی
          اولویت‌دار باز شده‌اند.
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
