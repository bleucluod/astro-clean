"use client";

import type {
  PersonalTransitReportDataBridge,
  PersonalTransitReportDataBridgeSelectedAspectSummary,
} from "@/src/lib/report-output/personal-transit-report-data-bridge";
import {
  buildPersonalTransitBehavioralInterpretation,
  selectPersonalTransitHighlights,
} from "@/src/lib/report-output/personal-transit-relevance";

const BODY_LABELS_FA: Record<string, string> = {
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

const ASPECT_LABELS_FA: Record<string, string> = {
  conjunction: "هم‌نشینی",
  opposition: "مقابله",
  trine: "مثلث",
  square: "مربع",
  sextile: "تسدیس",
};

const ASPECT_ANGLE_LABELS_FA: Record<string, string> = {
  conjunction: "زاویه‌ی ۰ درجه",
  opposition: "زاویه‌ی ۱۸۰ درجه",
  trine: "زاویه‌ی ۱۲۰ درجه",
  square: "زاویه‌ی ۹۰ درجه",
  sextile: "زاویه‌ی ۶۰ درجه",
};

const PERSONAL_TRANSIT_VISIBLE_SECTION_VERSION =
  "v0.1.255-personal-transit-visible-report-section" as const;

const PERSONAL_TRANSIT_COMPARISON_DEPTH_VERSION =
  "v0.1.261-personal-transit-comparison-depth" as const;

const PERSONAL_TRANSIT_FINAL_QA_VERSION =
  "v0.1.288-report-special-points-transit-final-qa" as const;

export function PersonalTransitReportSection({
  data,
}: {
  data?: PersonalTransitReportDataBridge | null;
}) {
  if (!data) {
    return null;
  }

  const audienceMode = data.audienceMode ?? "adult";
  const topAspects = getVisibleTransitAspects(data, audienceMode);
  const hasAspects = topAspects.length > 0;
  const groupedAspects = groupVisibleTransitAspects(topAspects);
  const isMissingResidence = data.status === "missing-current-residence";
  const birthPlace = data.location.birthPlaceName ?? "محل تولد ثبت نشده";
  const currentResidence =
    data.location.currentResidencePlaceName ?? "محل زندگی فعلی ثبت نشده";
  const currentResidenceIsRequired =
    data.currentResidenceRequired && data.location.currentResidenceRequired;
  const transitDateLabel = formatTransitLocalDate(data.transitLocalDate);
  const transitMomentLabel = formatTransitMoment(
    data.transitLocalDate,
    data.sampleLocalTime,
  );

  return (
    <section
      className="report-section report-personal-transit-section"
      data-personal-transit-visible-section={PERSONAL_TRANSIT_VISIBLE_SECTION_VERSION}
      data-personal-transit-comparison-depth={PERSONAL_TRANSIT_COMPARISON_DEPTH_VERSION}
      data-personal-transit-final-qa={PERSONAL_TRANSIT_FINAL_QA_VERSION}
    >
      <div className="report-section-heading">
        <span className="report-kicker">آسمان زمان ساخت گزارش نسبت به چارت تولد تو</span>
        <h2>ترنزیت ثبت‌شده برای چارت تولد</h2>
        <p>
          این بخش آسمانی را که هنگام ساخت گزارش ثبت شده روی همان چارت تولد می‌گذارد.
          بنابراین وقتی گزارش را بعداً باز می‌کنی، داده‌ی قدیمی با برچسب «امروز» نمایش
          داده نمی‌شود. چارت تولد از محل و زمان تولد می‌آید و زمان ترنزیت از محل زندگی
          فعلی؛ هالیوس تهران را بی‌اجازه جایگزین محل فعلی نمی‌کند.
        </p>
      </div>

      <div className="report-detail-grid report-personal-transit-context-grid">
        <article className="report-mini-card">
          <span>مبنای تولد</span>
          <strong>{birthPlace}</strong>
          {data.location.birthTimezone ? (
            <small>{data.location.birthTimezone}</small>
          ) : null}
        </article>

        <article className="report-mini-card">
          <span>مبنای ترنزیت گزارش</span>
          <strong>{currentResidence}</strong>
          {data.location.currentResidenceTimezone ? (
            <small>{data.location.currentResidenceTimezone}</small>
          ) : null}
          <small>بدون پیش‌فرض پنهان تهران</small>
        </article>

        <article className="report-mini-card">
          <span>زمان محاسبه</span>
          <strong>{transitMomentLabel}</strong>
          <small>این زمان همراه گزارش ذخیره شده و با بازکردن دوباره تازه‌سازی نمی‌شود.</small>
        </article>

        <article className="report-mini-card">
          <span>وضعیت خوانش</span>
          <strong>{formatStatusLabel(data.status)}</strong>
          <small>
            {currentResidenceIsRequired
              ? "محل زندگی فعلی برای تعیین زمان محلی این بخش ضروری است."
              : "داده‌ی محل فعلی برای این خوانش ضروری اعلام نشده است."}
          </small>
        </article>
      </div>

      {isMissingResidence ? (
        <div className="notice report-notice">
          <strong>مقایسه‌ی شخصی آسمان و چارت تولد هنوز ساخته نشده است.</strong>
          <p>
            برای تعیین زمان محلی این بخش، محل زندگی فعلی لازم است. تا وقتی این داده
            را نگرفته‌ایم، هالیوس ادعای شخصی درباره ترنزیت نمی‌سازد و از تهران
            به‌عنوان پیش‌فرض پنهان استفاده نمی‌کند.
          </p>
        </div>
      ) : null}

      {!isMissingResidence && hasAspects ? (
        <div className="report-personal-transit-depth">
          <div className="report-section-heading compact">
            <span className="report-kicker">مقایسه‌ی چارت تولد و آسمان ثبت‌شده</span>
            <h3>در {transitDateLabel} کدام بخش‌های چارت تولد پررنگ‌تر بوده‌اند؟</h3>
            <p>
              این کارت‌ها نشان می‌دهند آسمان ثبت‌شده روی کدام الگوی تولدی فشار،
              فرصت یا توجه بیشتری آورده است. آن‌ها را کنار جایگاه‌ها، رابطه‌های
              سیاره‌ای و نقاط ویژه بخوان؛ هر کارت فقط یک نشانه‌ی موقت برای توجه است،
              نه پیش‌بینی قطعی.
            </p>
          </div>

          <div className="report-personal-transit-groups">
            {groupedAspects.map((group) => (
              <section className="report-personal-transit-group" key={group.theme}>
                <div className="report-section-heading compact">
                  <span className="report-kicker">موضوع تولدی</span>
                  <h4>{group.theme}</h4>
                </div>
                <div className="report-aspect-grid report-personal-transit-grid">
                  {group.aspects.map((aspect) => (
                    <article className="report-aspect-card" key={aspect.id}>
                      <span className="report-kicker">
                        {getAspectAngleLabel(aspect.aspect)}
                      </span>
                      <h4>{formatAspectTitle(aspect)}</h4>
                      <p>
                        <strong>توجه اصلی:</strong>{" "}
                        {aspect.interpretation.attention}
                      </p>
                      <ul>
                        <li>
                          <strong>سناریوی احتمالی همان بازه:</strong>{" "}
                          {aspect.interpretation.scenario}
                        </li>
                        <li>
                          <strong>وقتی خوب استفاده می‌شود:</strong>{" "}
                          {aspect.interpretation.helpful}
                        </li>
                        <li>
                          <strong>گیر:</strong> {aspect.interpretation.friction}
                        </li>
                        <li>
                          <strong>کار کوچک:</strong> {aspect.interpretation.action}
                        </li>
                        <li>
                          <strong>جزئیات فنی:</strong>{" "}
                          {aspect.interpretation.technicalDetail}
                        </li>
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {!isMissingResidence && !hasAspects ? (
        <div className="notice report-notice">
          <strong>تماس نزدیک قابل گزارش در {transitDateLabel} پیدا نشد.</strong>
          <p>
            در محدوده رابطه‌های اصلی و اورب‌های تعریف‌شده، تماس نزدیکی پیدا نشد.
            نبود رابطه‌ی نزدیک هم یک نتیجه‌ی محاسباتی است و نباید با نشانه‌ی مصنوعی
            جایگزین شود.
          </p>
        </div>
      ) : null}

      <p
        className="report-muted-note"
        data-personal-transit-technical-disclaimer="true"
      >
        {data.technicalDisclaimer ??
          "این مقایسه فقط از snapshot ذخیره‌شده‌ی سیاره‌ها و اورب‌های همان زمان استفاده می‌کند؛ دست‌های ماه، لیلیت، خانه‌ها و زاویه‌ها وارد این محاسبه نشده‌اند و هیچ رویداد قطعی یا پیش‌بینی آینده ساخته نمی‌شود."}
      </p>
    </section>
  );
}

function getVisibleTransitAspects(
  data: PersonalTransitReportDataBridge,
  audienceMode: "caregiver" | "youth" | "adult",
): PersonalTransitReportDataBridgeSelectedAspectSummary[] {
  if (Array.isArray(data.visibleAspectHighlights)) {
    return data.visibleAspectHighlights.slice(0, 5);
  }

  return selectPersonalTransitHighlights(data.aspectHighlights, {
    audienceMode,
    maxVisible: 5,
  }).map((aspect) => ({
    ...aspect,
    relevanceScore: 0,
    interpretation: buildPersonalTransitBehavioralInterpretation(
      aspect,
      audienceMode,
    ),
  }));
}

function groupVisibleTransitAspects(
  aspects: PersonalTransitReportDataBridgeSelectedAspectSummary[],
) {
  const groups = new Map<
    string,
    PersonalTransitReportDataBridgeSelectedAspectSummary[]
  >();

  for (const aspect of aspects) {
    const theme = aspect.interpretation.theme;
    const current = groups.get(theme) ?? [];
    current.push(aspect);
    groups.set(theme, current);
  }

  return Array.from(groups, ([theme, grouped]) => ({
    theme,
    aspects: grouped,
  }));
}

function formatAspectTitle(
  aspect: PersonalTransitReportDataBridgeSelectedAspectSummary,
): string {
  return [
    getBodyLabel(aspect.transitBody),
    "در",
    getAspectLabel(aspect.aspect),
    "با",
    getBodyLabel(aspect.natalBody),
    "تولدی",
  ].join(" ");
}

function formatStatusLabel(status: PersonalTransitReportDataBridge["status"]): string {
  if (status === "ready") {
    return "داده‌ی ترنزیت ذخیره‌شده آماده است";
  }

  if (status === "partial-no-aspects") {
    return "داده آماده است؛ رابطه‌ی نزدیک پیدا نشده";
  }

  return "محل زندگی فعلی لازم است";
}

function formatTransitMoment(
  localDate: string | null | undefined,
  sampleLocalTime: string | null | undefined,
): string {
  const dateLabel = formatTransitLocalDate(localDate);
  const timeLabel = formatLocalTime(sampleLocalTime);

  return timeLabel ? `${dateLabel}، ساعت ${timeLabel}` : dateLabel;
}

function formatTransitLocalDate(localDate: string | null | undefined): string {
  if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return "زمان ساخت گزارش";
  }

  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatLocalTime(sampleLocalTime: string | null | undefined): string | null {
  if (!sampleLocalTime || !/^\d{2}:\d{2}$/.test(sampleLocalTime)) {
    return null;
  }

  return sampleLocalTime.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function getBodyLabel(body: string): string {
  return BODY_LABELS_FA[body] ?? body;
}

function getAspectLabel(aspect: string): string {
  return ASPECT_LABELS_FA[aspect] ?? aspect;
}

function getAspectAngleLabel(aspect: string): string {
  return ASPECT_ANGLE_LABELS_FA[aspect] ?? "زاویه‌ی اصلی";
}
