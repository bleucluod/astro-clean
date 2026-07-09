"use client";

import { RealChartWheel } from "./RealChartWheel";
import { ReportDetailFactsPanel } from "./ReportDetailFactsPanel";
import { ReportPlanetPlacementSections } from "./ReportPlanetPlacementSections";
import { ReportAspectRelationshipSections } from "./ReportAspectRelationshipSections";
import { ReportSpecialPointsNarrativeSection } from "./ReportSpecialPointsNarrativeSection";
import { PersonalTransitReportSection } from "./PersonalTransitReportSection"; import { ReportSynthesisSection } from "./ReportSynthesisSection";
import {
  formatZodiacLabel,
  formatZodiacSign,
  normalizeLongitude,
  zodiacSignFromLongitude,
} from "@/lib/astrology/zodiac-labels";
import type {
  AstrologyReport,
  RealEngineReportAngle,
  RealEngineReportCalculatedLilith,
  RealEngineReportCalculatedLunarNodes,
  RealEngineReportHouse,
  RealEngineReportLunarNodePoint,
  RealEngineReportLunarNodes,
  RealEngineReportPlacement,
} from "@/types/astro";
import type { PersonalTransitReportDataBridge } from "@/src/lib/report-output/personal-transit-report-data-bridge";

type ReportCardProps = {
  report: AstrologyReport;
};

type ReportWithPersonalTransitData = AstrologyReport & {
  engineData?: {
    personalTransitReportData?: PersonalTransitReportDataBridge | null;
  } | null;
  personalTransitReportData?: PersonalTransitReportDataBridge | null;
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

const ANGLE_ORDER = ["asc", "dsc", "mc", "ic"] as const;
type ReportAngleId = (typeof ANGLE_ORDER)[number];

const ANGLE_UI_COPY: Record<ReportAngleId, { title: string; axis: string }> = {
  asc: { title: "رایزینگ", axis: "محور من و شیوه ورود به جهان" },
  dsc: { title: "نقطه روبه‌رو", axis: "محور رابطه، آینه‌های نزدیک و دیگری" },
  mc: { title: "میانه آسمان", axis: "مسیر بیرونی، اعتبار و جهتی که در جهان ساخته می‌شود" },
  ic: { title: "ریشه آسمان", axis: "ریشه درونی، خانه، گذشته و جای امن روان" },
};

const HOUSE_FIELD_UI_LABELS: Record<number, string> = {
  1: "بدن، تصویر بیرونی و شروع‌های شخصی",
  2: "ارزش، امنیت و منابع",
  3: "ذهن، یادگیری و ارتباط نزدیک",
  4: "خانه، ریشه و امنیت درونی",
  5: "خلاقیت، عشق و بیان شخصی",
  6: "کار روزمره، بدن و مراقبت",
  7: "رابطه یک‌به‌یک و شراکت",
  8: "اعتماد، صمیمیت عمیق و دگرگونی",
  9: "معنا، سفر و جهان‌بینی",
  10: "مسیر اجتماعی، مسئولیت و اثر بیرونی",
  11: "دوستی‌ها، جمع‌ها و آینده‌سازی",
  12: "خلوت، ناخودآگاه و رهاسازی",
};

const PERSIAN_NUMBER_FORMATTER = new Intl.NumberFormat("fa-IR");

const REPORT_CARD_SAFETY_NOTE = "این گزارش یک خوانش نمادین و تأملی از چارت است؛ برای تصمیم‌های تخصصی زندگی، از مشورت با متخصص همان حوزه کمک بگیر.";

const CHART_ELEMENT_ORDER = ["fire", "earth", "air", "water"] as const;
const CHART_MODALITY_ORDER = ["cardinal", "fixed", "mutable"] as const;
const CHART_POLARITY_ORDER = ["masculine", "feminine"] as const;

type ChartElementKey = (typeof CHART_ELEMENT_ORDER)[number];
type ChartModalityKey = (typeof CHART_MODALITY_ORDER)[number];
type ChartPolarityKey = (typeof CHART_POLARITY_ORDER)[number];

type ZodiacBalanceMeta = {
  element: ChartElementKey;
  modality: ChartModalityKey;
  polarity: ChartPolarityKey;
};

type ChartBalanceItem = {
  id: string;
  label: string;
  count: number;
};

type ChartBalanceSummary = {
  elements: ChartBalanceItem[];
  modalities: ChartBalanceItem[];
  polarities: ChartBalanceItem[];
};

const SIGN_BALANCE: Record<string, ZodiacBalanceMeta> = {
  aries: { element: "fire", modality: "cardinal", polarity: "masculine" },
  taurus: { element: "earth", modality: "fixed", polarity: "feminine" },
  gemini: { element: "air", modality: "mutable", polarity: "masculine" },
  cancer: { element: "water", modality: "cardinal", polarity: "feminine" },
  leo: { element: "fire", modality: "fixed", polarity: "masculine" },
  virgo: { element: "earth", modality: "mutable", polarity: "feminine" },
  libra: { element: "air", modality: "cardinal", polarity: "masculine" },
  scorpio: { element: "water", modality: "fixed", polarity: "feminine" },
  sagittarius: { element: "fire", modality: "mutable", polarity: "masculine" },
  capricorn: { element: "earth", modality: "cardinal", polarity: "feminine" },
  aquarius: { element: "air", modality: "fixed", polarity: "masculine" },
  pisces: { element: "water", modality: "mutable", polarity: "feminine" },
};

const CHART_ELEMENT_LABELS: Record<ChartElementKey, string> = {
  fire: "آتش",
  earth: "زمین",
  air: "هوا",
  water: "آب",
};

const CHART_MODALITY_LABELS: Record<ChartModalityKey, string> = {
  cardinal: "کاردینال",
  fixed: "ثابت",
  mutable: "متغیر",
};

const CHART_POLARITY_LABELS: Record<ChartPolarityKey, string> = {
  masculine: "مذکر",
  feminine: "مونث",
};

type CoreCard = {
  id: string;
  title: string;
  eyebrow: string;
  value: string;
  description: string;
};

type PlanetHouseRow = {
  id: string;
  planetLabel: string;
  houseLabel: string;
  placementLabel: string;
};

type AngleSummaryRow = {
  id: string;
  title: string;
  positionLabel: string;
  axisLabel: string;
  houseLabel: string | null;
  sourceLabel: string | null;
};

type HouseSummaryRow = {
  id: string;
  title: string;
  signLabel: string;
  cuspLabel: string;
  fieldLabel: string;
  planetsLabel: string;
  anglesLabel: string;
};

type LunarNodeSummaryRow = {
  id: string;
  title: string;
  positionLabel: string;
  houseLabel: string | null;
  sourceLabel: string;
  meaning: string;
};

type LilithSummaryRow = {
  id: string;
  title: string;
  positionLabel: string;
  houseLabel: string | null;
  sourceLabel: string;
  reportGateLabel: string;
  modelNote: string;
};

type PlacementWithHouse = RealEngineReportPlacement & {
  house?: number | null;
  houseNumber?: number | null;
};

type AccuracySummary = {
  statusLabel: string;
  houseLabel: string;
  angleLabel: string;
  motionLabel: string;
  nodesLabel: string;
  lilithLabel: string;
  limitations: string[];
  warnings: string[];
};

export function ReportCard({ report }: ReportCardProps) {
  const realEngineAspects = report.realEngine?.aspects ?? [];
  const coreCards = buildCoreCards(report);
  const shownPlacements = report.realEngine?.placements ?? [];
  const retrogradePlanetIds = getRetrogradePlanetIds(report);
  const lunarNodeRows = buildLunarNodeRows(report);
  const lilithRow = buildLilithRow(report);
  const planetHouseRows = shownPlacements
    .map(buildPlanetHouseRow)
    .filter((row): row is PlanetHouseRow => row !== null);
  const angleRows = buildAngleRows(report);
  const houseRows = buildHouseRows(report, shownPlacements);
  const chartBalance = buildChartBalance(shownPlacements);
  const shownAspects = realEngineAspects.slice(0, 8);
  const hiddenAspectCount = Math.max(0, realEngineAspects.length - shownAspects.length);
  const birthTimeSummary = buildBirthTimeSummary(report);
  const birthMoonPhase = buildBirthMoonPhaseSummary(report);
  const accuracySummary = buildAccuracySummary(report);
  const personalTransitReportData = getPersonalTransitReportData(report);

  return (
    <article className="card report-card report-product-card">
      <header className="report-product-hero">
        <div className="report-product-hero-copy">
          <span className="badge report-product-badge">
            {report.realEngine
              ? "گزارش محاسبه‌شده هالیوس"
              : "گزارش نمادین هالیوس"}
          </span>

          <h2>
            {report.input.name
              ? `گزارش چارت تولد ${report.input.name}`
              : "گزارش چارت تولد"}
          </h2>

          <p>
            این کارت فقط جهت‌گیری اولیه می‌دهد: سه ستون اصلی، چرخ چارت و یک پشتوانه بسته برای داده‌های دقیق.
            روایت اصلی پایین صفحه می‌آید و جزئیات فنی جلوی خواندن را نمی‌گیرند.
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

          {birthTimeSummary ? (
            <div className="birth-details report-product-birth-details" aria-label="سن و تولد">
              <span>سن دقیق: {birthTimeSummary.exactAge}</span>
              <span>تا تولد بعدی: {birthTimeSummary.nextBirthday}</span>
            </div>
          ) : null}

          <div className="actions report-product-card-actions">
            <a className="button secondary" href="/reports">
              گزارش‌های من
            </a>

            <a className="button secondary" href="#personal-note">
              یادداشت کوتاه
            </a>
          </div>
        </div>
      </header>

      <section className="report-section report-core-section">
        <div className="report-section-heading">
          <span className="section-label">سه ستون اصلی</span>
          <h3>سه ستون اصلی و فاز ماه تولد</h3>
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
          {birthMoonPhase ? (
            <article className="report-core-card report-moon-phase-card" aria-label="فاز ماه تولد">
              <span>{birthMoonPhase.angleLabel}</span>
              <strong>فاز ماه تولد: {birthMoonPhase.title}</strong>
              <p>{birthMoonPhase.interpretation}</p>
            </article>
          ) : null}
        </div>
      </section>

      {report.realEngine ? (
        <section className="report-section report-calculation-section">
          <div className="report-section-heading">
            <span className="section-label">چرخ چارت</span>
            <h3>چارت تولد محاسبه‌شده</h3>
            <p>
              این چرخ برای دیدن نقشه کلی است، نه برای خواندن همه عددها.
              جایگاه‌ها، خانه‌ها، محورها و چند رابطه برجسته اینجا خلاصه شده‌اند؛
              داده‌های دقیق‌تر در پنل پشتوانه بسته مانده‌اند.
            </p>
          </div>

          <div className="report-chart-wheel-structure">
            <RealChartWheel
              placements={shownPlacements}
              ascendantLongitude={report.realEngine.ascendantLongitude}
              houses={report.realEngine.houses}
              angles={report.realEngine.angles}
              aspects={shownAspects}
              retrogradePlanetIds={Array.from(retrogradePlanetIds)}
              houseSystem={report.realEngine.houseSystem}
            />
          </div>

          <details className="report-placement-details report-polish-advanced-panel">
            <summary>پشتوانه محاسبه و داده‌های دقیق</summary>
            <p>
              این بخش برای شفافیت است. اگر فقط می‌خواهی گزارش را مثل یک روایت بخوانی،
              لازم نیست همه کارت‌های فنی را باز کنی.
            </p>

            <div className="report-placement-grid">
              <div className="mini-card">
                <strong>شهر و زمان محاسبه</strong>
                <span>{report.realEngine.cityLabel}</span>
                <span>زمان مرجع محاسبه: {formatShortUtc(report.realEngine.utcIso)}</span>
              </div>

              <div className="mini-card">
                <strong>رایزینگ</strong>
                <span>{formatRisingFromLongitude(report.realEngine.ascendantLongitude)}</span>
                <span>روش خانه‌ها: {formatHouseSystemLabel(report.realEngine.houseSystem)}</span>
              </div>

              {accuracySummary ? (
                <div className="mini-card">
                  <strong>مرز دقت</strong>
                  <span>{accuracySummary.statusLabel}</span>
                  <span>{accuracySummary.houseLabel}</span>
                  <span>{accuracySummary.angleLabel}</span>
                  <span>{accuracySummary.motionLabel}</span>
                  <span>{accuracySummary.nodesLabel}</span>
                  <span>{accuracySummary.lilithLabel}</span>
                  {accuracySummary.limitations.slice(0, 1).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : null}

              {report.realEngine.retrogrades?.status === "calculated" ? (
                <div className="mini-card">
                  <strong>حرکت برگشتی</strong>
                  <span>
                    {retrogradePlanetIds.size > 0
                      ? `سیاره‌های برگشتی: ${joinPersianList(
                          Array.from(retrogradePlanetIds).map((planetId) =>
                            getPlanetLabel(planetId, planetId),
                          ),
                        )}`
                      : "برای سیاره‌های محاسبه‌شده حرکت برگشتی ثبت نشده است."}
                  </span>
                  {report.realEngine.retrogrades.limitation ? (
                    <span>{sanitizeVisibleEngineCopy(report.realEngine.retrogrades.limitation)}</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {lunarNodeRows.length > 0 ? (
              <>
                <h4>دست‌های ماه با مدل نوسانی/واقعی محلی</h4>
                <div className="report-placement-grid">
                  {lunarNodeRows.map((node) => (
                    <div className="mini-card" key={node.id}>
                      <strong>{node.title}</strong>
                      <span>{node.positionLabel}</span>
                      {node.houseLabel ? <span>{node.houseLabel}</span> : null}
                      <span>{node.sourceLabel}</span>
                      <span>{node.meaning}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}



            {lilithRow ? (
              <>
                <h4>لیلیت نوسانی/واقعی محلی</h4>
                <div className="report-placement-grid">
                  <div className="mini-card" key={lilithRow.id}>
                    <strong>{lilithRow.title}</strong>
                    <span>{lilithRow.positionLabel}</span>
                    {lilithRow.houseLabel ? <span>{lilithRow.houseLabel}</span> : null}
                    <span>{lilithRow.sourceLabel}</span>
                    <span>{lilithRow.reportGateLabel}</span>
                    <span>{lilithRow.modelNote}</span>
                  </div>
                </div>
              </>
            ) : null}

            {angleRows.length > 0 ? (
              <>
                <h4>محورهای اصلی</h4>
                <div className="report-placement-grid">
                  {angleRows.map((item) => (
                    <div className="mini-card" key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.positionLabel}</span>
                      <span>{item.axisLabel}</span>
                      {item.houseLabel ? <span>{item.houseLabel}</span> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {planetHouseRows.length > 0 ? (
              <>
                <h4>جایگاه‌ها در خانه‌ها</h4>
                <div className="report-placement-grid">
                  {planetHouseRows.map((item) => (
                    <div className="mini-card" key={`house-${item.id}`}>
                      <strong>{item.planetLabel}</strong>
                      <span>{item.houseLabel}</span>
                      <span>{item.placementLabel}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {houseRows.length === 12 ? (
              <>
                <h4>۱۲ خانه</h4>
                <div className="report-placement-grid">
                  {houseRows.map((item) => (
                    <div className="mini-card" key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.signLabel}</span>
                      <span>{item.fieldLabel}</span>
                      <span>{item.planetsLabel}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {chartBalance ? (
              <>
                <h4>انرژی کلی چارت</h4>
                <div className="report-placement-grid">
                  <div className="mini-card">
                    <strong>عنصرها</strong>
                    <span>{formatBalanceLine(chartBalance.elements)}</span>
                  </div>
                  <div className="mini-card">
                    <strong>کیفیت‌ها</strong>
                    <span>{formatBalanceLine(chartBalance.modalities)}</span>
                  </div>
                  <div className="mini-card">
                    <strong>قطبیت</strong>
                    <span>{formatBalanceLine(chartBalance.polarities)}</span>
                  </div>
                </div>
              </>
            ) : null}
          </details>
        </section>
      ) : null}

      <ReportSpecialPointsNarrativeSection report={report} />

      <ReportPlanetPlacementSections report={report} />

      <ReportAspectRelationshipSections report={report} />

      {shownAspects.length > 0 ? (
        <section className="report-section report-aspect-section">
          <div className="report-section-heading">
            <span className="section-label">روابط سیاره‌ها</span>
            <h3>روابط مهم بین سیاره‌ها</h3>
            <p>
              اینجا رابطه‌هایی نمایش داده می‌شوند که از نظر وزن چارت مهم‌ترند: نورها، حاکم چارت، خانه‌های فعال، رابطه‌های تنشی و بعد اورب.
              بقیه داده‌ها در پشتوانه محاسبه باقی می‌مانند.
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
                  <span>{formatAspectAngleSummary(aspect)}</span>
                </div>
                <p>{aspect.narrative}</p>
              </article>
            ))}
          </div>

          {hiddenAspectCount > 0 ? (
            <p className="report-muted-note">
              {hiddenAspectCount.toLocaleString("fa-IR")} رابطه سیاره‌ای دیگر فقط در پشتوانه داده نگه داشته شده‌اند.
            </p>
          ) : null}
        </section>
      ) : null}

      <ReportDetailFactsPanel report={report} />

      <PersonalTransitReportSection data={personalTransitReportData} />

      <div className="notice report-notice report-product-notice">
        <p><ReportSynthesisSection
        coreCards={coreCards}
        aspectCount={realEngineAspects.length}
        shownAspectCount={shownAspects.length}
        houseCount={houseRows.length}
        lunarNodeCount={lunarNodeRows.length}
        hasLilith={Boolean(lilithRow)}
        personalTransitStatus={personalTransitReportData?.status ?? null}
      />

      {REPORT_CARD_SAFETY_NOTE}</p>
      </div>
    </article>
  );
}

function getPersonalTransitReportData(report: AstrologyReport): PersonalTransitReportDataBridge | null {
  const candidate = report as ReportWithPersonalTransitData;

  return (
    candidate.engineData?.personalTransitReportData ??
    candidate.personalTransitReportData ??
    null
  );
}

function buildAccuracySummary(report: AstrologyReport): AccuracySummary | null {
  const realEngine = report.realEngine;
  const quality = realEngine?.calculationQuality;

  if (!realEngine || !quality) {
    return null;
  }

  return {
    statusLabel: `وضعیت کلی: ${formatCalculationQualityStatus(quality.status)}`,
    houseLabel: `خانه‌ها: ${formatReliabilityStatus(quality.houseSystemStatus)}`,
    angleLabel: `محورها: ${formatReliabilityStatus(quality.anglesStatus)}`,
    motionLabel: `حرکت برگشتی: ${formatReliabilityStatus(quality.retrogradeStatus)}`,
    nodesLabel: formatDeferredPointStatus("دست‌های ماه", realEngine.lunarNodes?.status, quality.nodesStatus),
    lilithLabel: formatDeferredPointStatus("لیلیت", realEngine.lilith?.status, quality.lilithStatus),
    limitations: Array.isArray(quality.limitations)
      ? sanitizeVisibleEngineCopyList(quality.limitations)
      : [],
    warnings: Array.isArray(quality.warnings)
      ? sanitizeVisibleEngineCopyList(quality.warnings)
      : [],
  };
}


const VISIBLE_ENGINE_COPY_REPLACEMENTS = [
  {
    needle: "Retrograde motion is calculated",
    value:
      "حرکت برگشتی از تغییر جایگاه ظاهری سیاره‌ها نزدیک زمان تولد محاسبه می‌شود؛ اگر سیاره نزدیک ایستایی باشد، خوانش باید ملایم و محتاط باشد.",
  },
  {
    needle: "Local True/Osculating lunar nodes are calculated",
    value:
      "دست‌های ماه در این نسخه با مدل نوسانی/واقعی محلی محاسبه می‌شوند؛ منبع خارجی یا Swiss runtime استفاده نشده است.",
  },
  {
    needle: "Local True/Osculating Black Moon Lilith is calculated",
    value:
      "لیلیت نوسانی/واقعی محلی از بردار مکان و سرعت ماه محاسبه شده و فعلاً به صورت داده محدود در پشتوانه گزارش نمایش داده می‌شود؛ روایت تفسیری آن جداگانه فعال می‌شود.",
  },
  {
    needle: "Black Moon Lilith is not calculated",
    value:
      "لیلیت در این نسخه محاسبه نمی‌شود و وارد خوانش نشده است.",
  },
  {
    needle: "Natal accuracy depends",
    value:
      "دقت گزارش تولد به ساعت رسمی تولد، منطقه زمانی و مختصات شهر وابسته است؛ اگر ساعت تولد قطعی نباشد، خوانش خانه‌ها و محورها باید با احتیاط بیشتری انجام شود.",
  },
  {
    needle: "Timezone and midnight boundary handling",
    value:
      "مرزهای تغییر روز و تبدیل زمان در پشتوانه محاسباتی کنترل می‌شوند.",
  },
  {
    needle: "ASC and MC are calculated",
    value:
      "رایزینگ و میانه آسمان از زمان و مکان تولد محاسبه می‌شوند؛ نقطه روبه‌رو و ریشه آسمان از محور مقابل به دست می‌آیند.",
  },
  {
    needle: "MC is stored as an independent angle",
    value:
      "میانه آسمان یک محور مستقل در چارت است و نباید با خانه دهم یکی گرفته شود.",
  },
  {
    needle: "If the birth time is estimated",
    value:
      "اگر ساعت تولد تقریبی یا نامشخص باشد، خانه‌ها، محورها، حرکت برگشتی و زبان نهایی گزارش باید محتاطانه‌تر خوانده شوند.",
  },
  {
    needle: "Retrograde planets are identified",
    value:
      "سیاره‌های برگشتی از حرکت ظاهری آن‌ها نزدیک زمان تولد تشخیص داده شده‌اند؛ اگر سیاره نزدیک ایستایی باشد، خوانش باید ملایم باشد.",
  },
  {
    needle: "No retrograde planet was detected",
    value:
      "در زمان تولد، برای سیاره‌های محاسبه‌شده حرکت برگشتی ثبت نشده است.",
  },
] as const;

function sanitizeVisibleEngineCopyList(items: string[]): string[] {
  return items
    .map((item) => sanitizeVisibleEngineCopy(item))
    .filter((item): item is string => Boolean(item));
}

function sanitizeVisibleEngineCopy(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const text = value.trim();
  const replacement = VISIBLE_ENGINE_COPY_REPLACEMENTS.find((item) =>
    text.includes(item.needle),
  );

  if (replacement) {
    return replacement.value;
  }

  const localized = text
    .replaceAll("timezone", "منطقه زمانی")
    .replaceAll("Timezone", "منطقه زمانی")
    .replaceAll("retrograde", "حرکت برگشتی")
    .replaceAll("Retrograde", "حرکت برگشتی")
    .replaceAll("Mean Lunar Node", "دست‌های ماه با مدل میانگین")
    .replaceAll("True/Osculating Node", "دست‌های ماه با مدل نوسانی/واقعی محلی")
    .replaceAll("True Node", "مدل واقعی دست‌های ماه")
    .replaceAll("Black Moon Lilith", "لیلیت")
    .replaceAll("Lilith", "لیلیت");

  if (/[A-Za-z]{3,}/.test(localized)) {
    return "این یادداشت فنی در پشتوانه محاسبه نگه داشته شده است؛ برای خوانش، ساعت تولد، شهر و منطقه زمانی را با دقت وارد کن.";
  }

  return localized;
}

function formatDeferredPointStatus(
  label: string,
  deferredStatus: string | undefined,
  qualityStatus: string | undefined,
): string {
  if (deferredStatus === "calculated" || qualityStatus === "calculated") {
    return `${label}: محاسبه‌شده`;
  }

  if (deferredStatus === "blocked" || qualityStatus === "not-calculated") {
    return `${label}: هنوز عمداً محاسبه/نمایش داده نمی‌شود`;
  }

  return `${label}: در حال تکمیل`;
}

function formatCalculationQualityStatus(status: string): string {
  const labels: Record<string, string> = {
    complete: "کامل",
    partial: "جزئی/در حال تکمیل",
    preview: "پیش‌نمایش",
    blocked: "مسدود",
  };

  return labels[status] ?? status;
}

function formatReliabilityStatus(status: string): string {
  const labels: Record<string, string> = {
    "production-grade": "آماده خوانش دقیق",
    calculated: "محاسبه‌شده",
    derived: "مشتق‌شده",
    preview: "پیش‌نمایش",
    placeholder: "در حال تکمیل",
    "not-calculated": "محاسبه‌نشده",
  };

  return labels[status] ?? status;
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
      value: sun
        ? formatPlacementHeadline("خورشید", sun)
        : `خورشید در ${formatZodiacSign(report.chart.sunSign)}`,
      description:
        "یعنی خورشید اینجای چارت نشان می‌دهد کجا حس زنده بودن، اعتمادبه‌نفس و جهت اصلی زندگی پررنگ‌تر می‌شود.",
    },
    {
      id: "moon",
      title: "ماه",
      eyebrow: "نیاز احساسی",
      value: moon
        ? formatPlacementHeadline("ماه", moon)
        : `ماه در ${formatZodiacSign(report.chart.moonSign)}`,
      description:
        "یعنی ماه اینجای چارت از امنیت درونی، واکنش‌های احساسی و چیزی می‌گوید که دل تو برای آرام شدن لازم دارد.",
    },
    {
      id: "rising",
      title: "رایزینگ",
      eyebrow: "ورود به جهان",
      value:
        risingDegree === undefined
          ? `رایزینگ در ${formatZodiacLabel(risingSign)}`
          : `رایزینگ در ${formatZodiacLabel(risingSign)}، درجه ${formatDegree(risingDegree)}`,
      description:
        "یعنی رایزینگ رنگ اولین برخورد تو با موقعیت‌ها، بدن، فضاهای تازه و تصویری را که از خودت نشان می‌دهی مشخص می‌کند.",
    },
  ];
}

function findPlacement(report: AstrologyReport, id: string) {
  return report.realEngine?.placements.find((placement) => placement.id === id);
}

function getRetrogradePlanetIds(report: AstrologyReport): Set<string> {
  const retrogrades = report.realEngine?.retrogrades;

  if (retrogrades?.status !== "calculated" || !Array.isArray(retrogrades.planetIds)) {
    return new Set();
  }

  return new Set(retrogrades.planetIds.filter((planetId) => typeof planetId === "string" && planetId.length > 0));
}

function buildLunarNodeRows(report: AstrologyReport): LunarNodeSummaryRow[] {
  const lunarNodes = report.realEngine?.lunarNodes;

  if (!isCalculatedLunarNodes(lunarNodes)) {
    return [];
  }

  return [lunarNodes.northNode, lunarNodes.southNode]
    .filter(isValidLunarNodePoint)
    .map((node) => ({
      id: node.id,
      title: node.id === "north-node" ? "دست شمالی ماه" : "دست جنوبی ماه",
      positionLabel: `${formatZodiacLabel(node.signId)}، درجه ${formatDegree(node.degreeInSign)}`,
      houseLabel: typeof node.house === "number" ? `در خانه ${formatPersianNumber(node.house)}` : null,
      sourceLabel:
        node.id === "south-node"
          ? "به دست آمده از دست شمالی + ۱۸۰°"
          : lunarNodes.nodeType === "local-true-osculating"
            ? "محاسبه با مدل نوسانی/واقعی محلی"
            : "محاسبه با مدل میانگین",
      meaning:
        node.id === "north-node"
          ? "مسیر رشد، تمرین تازه و جهتی که روح به سمت آن کشیده می‌شود."
          : "الگوی آشنا، عادت‌های قدیمی و نقطه‌ای که راحت‌تر به آن برمی‌گردی.",
    }));
}


function buildLilithRow(report: AstrologyReport): LilithSummaryRow | null {
  const lilith = report.realEngine?.lilith;

  if (!isCalculatedLilith(lilith)) {
    return null;
  }

  return {
    id: lilith.id,
    title: "لیلیت نوسانی/واقعی محلی",
    positionLabel: `${formatZodiacLabel(lilith.signId)}، درجه ${formatDegree(lilith.degreeInSign)}`,
    houseLabel: typeof lilith.house === "number" ? `در خانه ${formatPersianNumber(lilith.house)}` : null,
    sourceLabel: "محاسبه محلی از بردار مکان و سرعت ماه؛ بدون API، بدون اجرای Swiss و بدون وابستگی تازه",
    reportGateLabel: lilith.approvedForReportOutput
      ? "آماده نمایش در گزارش"
      : "نمایش محدود داده؛ روایت تفسیری در مرحله جداگانه فعال می‌شود",
    modelNote: "این نقطه لیلیت میانگین، سیارک ۱۱۸۱ یا دارک‌مون/والدماث نیست.",
  };
}

function isCalculatedLilith(
  lilith: NonNullable<AstrologyReport["realEngine"]>["lilith"] | undefined,
): lilith is RealEngineReportCalculatedLilith {
  return Boolean(
    lilith &&
      lilith.status === "calculated" &&
      "id" in lilith &&
      lilith.id === "black-moon-lilith" &&
      "lilithType" in lilith &&
      lilith.lilithType === "local-true-osculating-black-moon-lilith" &&
      typeof lilith.longitude === "number" &&
      Number.isFinite(lilith.longitude) &&
      typeof lilith.degreeInSign === "number" &&
      Number.isFinite(lilith.degreeInSign),
  );
}

function isCalculatedLunarNodes(
  lunarNodes: RealEngineReportLunarNodes | undefined,
): lunarNodes is RealEngineReportCalculatedLunarNodes {
  return Boolean(
    lunarNodes &&
      lunarNodes.status === "calculated" &&
      "northNode" in lunarNodes &&
      "southNode" in lunarNodes &&
      (lunarNodes.nodeType === "mean" || lunarNodes.nodeType === "local-true-osculating"),
  );
}

function isValidLunarNodePoint(node: RealEngineReportLunarNodePoint): boolean {
  return (
    typeof node.longitude === "number" &&
    Number.isFinite(node.longitude) &&
    typeof node.degreeInSign === "number" &&
    Number.isFinite(node.degreeInSign)
  );
}

function buildAngleRows(report: AstrologyReport): AngleSummaryRow[] {
  const angles = report.realEngine?.angles;

  if (!angles) {
    return [];
  }

  return ANGLE_ORDER.map((id) => angles[id])
    .filter((angle): angle is RealEngineReportAngle => isValidReportAngle(angle))
    .map((angle) => {
      const copy = ANGLE_UI_COPY[angle.id as ReportAngleId];
      const positionLabel = `${formatZodiacLabel(angle.signId)}، درجه ${formatDegree(
        angle.degreeInSign,
      )}`;
      const houseLabel = typeof angle.house === "number" ? `در خانه ${formatPersianNumber(angle.house)}` : null;

      return {
        id: angle.id,
        title: copy.title,
        positionLabel,
        axisLabel: copy.axis,
        houseLabel,
        sourceLabel: formatAngleSourceLabel(angle),
      };
    });
}

function isValidReportAngle(angle: RealEngineReportAngle | undefined): angle is RealEngineReportAngle {
  return Boolean(
    angle &&
      ANGLE_ORDER.includes(angle.id as ReportAngleId) &&
      typeof angle.longitude === "number" &&
      Number.isFinite(angle.longitude) &&
      typeof angle.degreeInSign === "number" &&
      Number.isFinite(angle.degreeInSign),
  );
}

function buildHouseRows(
  report: AstrologyReport,
  placements: RealEngineReportPlacement[],
): HouseSummaryRow[] {
  const houses = report.realEngine?.houses ?? [];

  if (houses.length !== 12) {
    return [];
  }

  const placementLabelsById = new Map(
    placements.map((placement) => [placement.id, getPlanetLabel(placement.id, placement.label)]),
  );

  return houses
    .filter(isValidReportHouse)
    .sort((first, second) => first.number - second.number)
    .map((house) => {
      const explicitPlanetIds = Array.isArray(house.planetIds) ? house.planetIds : [];
      const fallbackPlanetIds = placements
        .filter((placement) => getPlacementHouseNumber(placement) === house.number)
        .map((placement) => placement.id);
      const planetLabels = Array.from(new Set([...explicitPlanetIds, ...fallbackPlanetIds]))
        .map((planetId) => placementLabelsById.get(planetId) ?? PLANET_LABELS_FA[planetId] ?? planetId)
        .filter(Boolean);
      const angleLabels = (Array.isArray(house.angleIds) ? house.angleIds : [])
        .map((angleId) => ANGLE_UI_COPY[angleId as ReportAngleId]?.title)
        .filter((label): label is string => Boolean(label));

      return {
        id: `house-${house.number}`,
        title: `خانه ${formatPersianNumber(house.number)}`,
        signLabel: `شروع در ${formatZodiacLabel(house.signId)}`,
        cuspLabel: `درجه شروع: ${formatDegree(house.degreeInSign)}`,
        fieldLabel: HOUSE_FIELD_UI_LABELS[house.number] ?? "میدان زندگی",
        planetsLabel: planetLabels.length > 0 ? `سیاره‌ها: ${joinPersianList(planetLabels)}` : "سیاره شاخصی در این خانه ذخیره نشده",
        anglesLabel: angleLabels.length > 0 ? `محورها: ${joinPersianList(angleLabels)}` : "محور اصلی در این خانه ذخیره نشده",
      };
    });
}

function isValidReportHouse(house: RealEngineReportHouse): house is RealEngineReportHouse {
  return (
    typeof house.number === "number" &&
    house.number >= 1 &&
    house.number <= 12 &&
    typeof house.cuspLongitude === "number" &&
    Number.isFinite(house.cuspLongitude) &&
    typeof house.degreeInSign === "number" &&
    Number.isFinite(house.degreeInSign)
  );
}

function formatAngleSourceLabel(angle: RealEngineReportAngle) {
  if (angle.source === "derived-opposition") {
    return "مشتق‌شده از محور مقابل";
  }

  if (angle.reliability === "calculated" || angle.source === "calculated") {
    return "محاسبه‌شده از زمان و مکان تولد";
  }

  return angle.limitation ?? null;
}

function formatHouseSystemLabel(system: string | undefined) {
  if (system === "whole-sign") {
    return "روش نشانه کامل";
  }

  if (system === "placidus") {
    return "پلاسیدوس";
  }

  if (system === "equal-house") {
    return "روش خانه برابر";
  }

  return "سیستم ذخیره‌شده در گزارش";
}

function buildChartBalance(placements: RealEngineReportPlacement[]): ChartBalanceSummary | null {
  const elementCounts = createBalanceCountMap(CHART_ELEMENT_ORDER);
  const modalityCounts = createBalanceCountMap(CHART_MODALITY_ORDER);
  const polarityCounts = createBalanceCountMap(CHART_POLARITY_ORDER);
  let countedPlacements = 0;

  placements.forEach((placement) => {
    const balanceMeta = SIGN_BALANCE[placement.signId];

    if (!balanceMeta) {
      return;
    }

    countedPlacements += 1;
    elementCounts[balanceMeta.element] += 1;
    modalityCounts[balanceMeta.modality] += 1;
    polarityCounts[balanceMeta.polarity] += 1;
  });

  if (countedPlacements === 0) {
    return null;
  }

  return {
    elements: formatBalanceItems(elementCounts, CHART_ELEMENT_ORDER, CHART_ELEMENT_LABELS),
    modalities: formatBalanceItems(modalityCounts, CHART_MODALITY_ORDER, CHART_MODALITY_LABELS),
    polarities: formatBalanceItems(polarityCounts, CHART_POLARITY_ORDER, CHART_POLARITY_LABELS),
  };
}

function createBalanceCountMap<T extends string>(order: readonly T[]) {
  return Object.fromEntries(order.map((id) => [id, 0])) as Record<T, number>;
}

function formatBalanceItems<T extends string>(
  counts: Record<T, number>,
  order: readonly T[],
  labels: Record<T, string>,
): ChartBalanceItem[] {
  return order.map((id) => ({
    id,
    label: labels[id],
    count: counts[id],
  }));
}

function formatBalanceLine(items: ChartBalanceItem[]) {
  return joinPersianList(
    items.map((item) => `${formatPersianNumber(item.count)} ${item.label}`),
  );
}

function formatAspectAngleSummary(aspect: {
  aspectLabel: string;
  angle?: number | null;
  separation?: number | null;
  orb: number;
}) {
  const aspectLabel = formatAspectTypeLabel(aspect.aspectLabel);
  const patternAngle =
    typeof aspect.angle === "number" && Number.isFinite(aspect.angle) ? formatDegree(aspect.angle) : null;
  const realAngle =
    typeof aspect.separation === "number" && Number.isFinite(aspect.separation)
      ? formatDegree(aspect.separation)
      : null;
  const orbLabel = formatDegree(aspect.orb);

  return [
    aspectLabel,
    patternAngle ? `زاویه الگو: ${patternAngle}` : null,
    realAngle ? `زاویه واقعی: ${realAngle}` : null,
    `اورب: ${orbLabel}`,
  ].filter(Boolean).join(" · ");
}

function formatAspectTypeLabel(label: string): string {
  const labels: Record<string, string> = {
    conjunction: "هم‌نشینی",
    Conjunction: "هم‌نشینی",
    opposition: "روبه‌رویی",
    Opposition: "روبه‌رویی",
    square: "چالش ۹۰ درجه",
    Square: "چالش ۹۰ درجه",
    trine: "هماهنگی ۱۲۰ درجه",
    Trine: "هماهنگی ۱۲۰ درجه",
    sextile: "فرصت ۶۰ درجه",
    Sextile: "فرصت ۶۰ درجه",
  };

  return labels[label] ?? label;
}

function buildPlanetHouseRow(placement: RealEngineReportPlacement): PlanetHouseRow | null {
  const houseNumber = getPlacementHouseNumber(placement);

  if (houseNumber === null) {
    return null;
  }

  return {
    id: placement.id,
    planetLabel: getPlanetLabel(placement.id, placement.label),
    houseLabel: `خانه ${formatPersianNumber(houseNumber)}`,
    placementLabel: formatPlacement(placement),
  };
}

function getPlacementHouseNumber(placement: RealEngineReportPlacement): number | null {
  const maybePlacement = placement as PlacementWithHouse;
  const rawHouseNumber =
    typeof maybePlacement.houseNumber === "number" ? maybePlacement.houseNumber : maybePlacement.house;

  if (typeof rawHouseNumber !== "number" || !Number.isFinite(rawHouseNumber)) {
    return null;
  }

  const houseNumber = Math.trunc(rawHouseNumber);

  return houseNumber >= 1 && houseNumber <= 12 ? houseNumber : null;
}

function getPlanetLabel(id: string, fallback: string) {
  return PLANET_LABELS_FA[id] ?? fallback;
}

function formatPlacement(placement: RealEngineReportPlacement) {
  return `${formatZodiacLabel(placement.signId)}، درجه ${formatDegree(
    placement.degreeInSign,
  )}`;
}

function formatPlacementHeadline(label: string, placement: RealEngineReportPlacement) {
  return `${label} در ${formatZodiacLabel(placement.signId)}، درجه ${formatDegree(
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

type BirthMoonPhaseSummary = {
  title: string;
  angleLabel: string;
  interpretation: string;
};

type BirthMoonPhaseCopy = {
  from: number;
  to: number;
  title: string;
  interpretation: string;
};

const BIRTH_MOON_PHASES: BirthMoonPhaseCopy[] = [
  {
    from: 337.5,
    to: 22.5,
    title: "ماه نو",
    interpretation:
      "در زبان نمادین هالیوس، این فاز ریتم شروع‌های آرام، گوش دادن به نیت‌های پنهان و ساختن از سکوت را پررنگ می‌کند.",
  },
  {
    from: 22.5,
    to: 67.5,
    title: "هلال افزاینده",
    interpretation:
      "این ریتم از تاریکی بیرون می‌آید؛ یعنی ساختن اعتماد، امتحان کردن قدم‌های کوچک و مراقبت از چیزی تازه.",
  },
  {
    from: 67.5,
    to: 112.5,
    title: "نیم‌ماه افزاینده",
    interpretation:
      "این فاز با تصمیم، واکنش روشن‌تر و نیاز به حرکت خوانده می‌شود؛ انگار احساسات می‌خواهند شکل عملی پیدا کنند.",
  },
  {
    from: 112.5,
    to: 157.5,
    title: "کوژ افزاینده",
    interpretation:
      "ریتم این فاز درباره کامل‌تر کردن، اصلاح کردن و آماده شدن برای دیده شدن است.",
  },
  {
    from: 157.5,
    to: 202.5,
    title: "بدر",
    interpretation:
      "ماه کامل نماد آگاهی عاطفی، بازتاب روشن‌تر و دیدن نیازهایی است که معمولاً در رابطه با جهان آشکار می‌شوند.",
  },
  {
    from: 202.5,
    to: 247.5,
    title: "کوژ کاهنده",
    interpretation:
      "این فاز با معنا کردن تجربه‌ها، بخشیدن، توضیح دادن و تبدیل احساس به فهم آرام‌تر پیوند دارد.",
  },
  {
    from: 247.5,
    to: 292.5,
    title: "نیم‌ماه کاهنده",
    interpretation:
      "نیم‌ماه کاهنده ریتم بازنگری، سبک کردن بارهای قدیمی و انتخاب دوباره از جای پخته‌تر را نشان می‌دهد.",
  },
  {
    from: 292.5,
    to: 337.5,
    title: "هلال کاهنده",
    interpretation:
      "این فاز نماد خلوت، رهاسازی و شنیدن صدای درونی قبل از شروع چرخه بعدی است.",
  },
];

type DurationParts = {
  years: number;
  months: number;
  days: number;
  hours: number;
};

type BirthDateParts = {
  year: number;
  month: number;
  day: number;
};

type BirthTimeParts = {
  hour: number;
  minute: number;
};

type BirthTimeSummary = {
  exactAge: string;
  nextBirthday: string;
};

function buildBirthMoonPhaseSummary(report: AstrologyReport): BirthMoonPhaseSummary | null {
  const sun = findPlacement(report, "sun");
  const moon = findPlacement(report, "moon");

  if (!sun || !moon) {
    return null;
  }

  const phaseAngle = normalizeLongitude(moon.longitude - sun.longitude);
  const phase = getBirthMoonPhaseCopy(phaseAngle);

  if (!phase) {
    return null;
  }

  return {
    title: phase.title,
    angleLabel: `زاویه ماه با خورشید: ${formatDegree(phaseAngle)}`,
    interpretation: phase.interpretation,
  };
}

function getBirthMoonPhaseCopy(phaseAngle: number) {
  return BIRTH_MOON_PHASES.find((phase) => {
    if (phase.from > phase.to) {
      return phaseAngle >= phase.from || phaseAngle < phase.to;
    }

    return phaseAngle >= phase.from && phaseAngle < phase.to;
  });
}

function buildBirthTimeSummary(report: AstrologyReport): BirthTimeSummary | null {
  const birthDateParts = parseBirthDateParts(report.input.birthDate);

  if (!birthDateParts) {
    return null;
  }

  const birthTimeParts = parseBirthTimeParts(report.input.birthTime);
  const now = new Date();
  const birthMoment = parseBirthMoment(report, birthDateParts, birthTimeParts);

  if (!birthMoment || birthMoment.getTime() > now.getTime()) {
    return null;
  }

  const nextBirthday = getNextBirthdayDate(now, birthDateParts, birthTimeParts);

  return {
    exactAge: formatDurationParts(diffCalendarParts(birthMoment, now), "کمتر از یک ساعت"),
    nextBirthday: formatDurationParts(diffCalendarParts(now, nextBirthday), "تولد امروز است"),
  };
}

function parseBirthMoment(
  report: AstrologyReport,
  birthDateParts: BirthDateParts,
  birthTimeParts: BirthTimeParts,
) {
  if (report.realEngine?.utcIso) {
    const utcBirthMoment = new Date(report.realEngine.utcIso);

    if (!Number.isNaN(utcBirthMoment.getTime())) {
      return utcBirthMoment;
    }
  }

  const localBirthMoment = new Date(
    birthDateParts.year,
    birthDateParts.month - 1,
    birthDateParts.day,
    birthTimeParts.hour,
    birthTimeParts.minute,
    0,
    0,
  );

  if (Number.isNaN(localBirthMoment.getTime())) {
    return null;
  }

  return localBirthMoment;
}

function parseBirthDateParts(value: string): BirthDateParts | null {
  const normalizedValue = normalizeNumberText(value).trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalizedValue);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function parseBirthTimeParts(value: string): BirthTimeParts {
  const normalizedValue = normalizeNumberText(value).trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(normalizedValue);

  if (!match) {
    return { hour: 0, minute: 0 };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: 0, minute: 0 };
  }

  return { hour, minute };
}

function getNextBirthdayDate(
  now: Date,
  birthDateParts: BirthDateParts,
  birthTimeParts: BirthTimeParts,
) {
  let nextBirthday = createBirthdayDate(now.getFullYear(), birthDateParts, birthTimeParts);

  if (nextBirthday.getTime() <= now.getTime()) {
    nextBirthday = createBirthdayDate(now.getFullYear() + 1, birthDateParts, birthTimeParts);
  }

  return nextBirthday;
}

function createBirthdayDate(
  year: number,
  birthDateParts: BirthDateParts,
  birthTimeParts: BirthTimeParts,
) {
  const birthday = new Date(
    year,
    birthDateParts.month - 1,
    birthDateParts.day,
    birthTimeParts.hour,
    birthTimeParts.minute,
    0,
    0,
  );

  if (birthday.getMonth() !== birthDateParts.month - 1) {
    return new Date(year, 1, 28, birthTimeParts.hour, birthTimeParts.minute, 0, 0);
  }

  return birthday;
}

function diffCalendarParts(from: Date, to: Date): DurationParts {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  let hours = to.getHours() - from.getHours();
  let minutes = to.getMinutes() - from.getMinutes();

  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }

  if (hours < 0) {
    days -= 1;
    hours += 24;
  }

  if (days < 0) {
    months -= 1;
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days, hours };
}

function formatDurationParts(parts: DurationParts, emptyLabel: string) {
  const formattedParts = [
    { value: parts.years, label: "سال" },
    { value: parts.months, label: "ماه" },
    { value: parts.days, label: "روز" },
    { value: parts.hours, label: "ساعت" },
  ]
    .filter((part) => part.value > 0)
    .map((part) => `${formatPersianNumber(part.value)} ${part.label}`);

  if (formattedParts.length === 0) {
    return emptyLabel;
  }

  return joinPersianList(formattedParts);
}

function joinPersianList(parts: string[]) {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }

  return `${parts.slice(0, -1).join("، ")} و ${parts[parts.length - 1]}`;
}

function formatPersianNumber(value: number) {
  return PERSIAN_NUMBER_FORMATTER.format(value);
}

function normalizeNumberText(value: string) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);

    if (persianIndex >= 0) {
      return String(persianIndex);
    }

    const arabicIndex = arabicDigits.indexOf(digit);

    return arabicIndex >= 0 ? String(arabicIndex) : digit;
  });
}
