"use client";

import { RealChartWheel } from "./RealChartWheel";
import {
  formatZodiacLabel,
  formatZodiacSign,
  normalizeLongitude,
  zodiacSignFromLongitude,
} from "@/lib/astrology/zodiac-labels";
import type {
  AstrologyReport,
  RealEngineReportAngle,
  RealEngineReportHouse,
  RealEngineReportPlacement,
} from "@/types/astro";

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

const ANGLE_ORDER = ["asc", "dsc", "mc", "ic"] as const;
type ReportAngleId = (typeof ANGLE_ORDER)[number];

const ANGLE_UI_COPY: Record<ReportAngleId, { title: string; axis: string }> = {
  asc: { title: "ASC / رایزینگ", axis: "محور من و شیوه ورود به جهان" },
  dsc: { title: "DSC / نقطه روبه‌رو", axis: "محور رابطه، آینه‌های نزدیک و دیگری" },
  mc: { title: "MC / میانه آسمان", axis: "مسیر بیرونی، اعتبار و جهتی که در جهان ساخته می‌شود" },
  ic: { title: "IC / ریشه آسمان", axis: "ریشه درونی، خانه، گذشته و جای امن روان" },
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
  const planetHouseRows = shownPlacements
    .map(buildPlanetHouseRow)
    .filter((row): row is PlanetHouseRow => row !== null);
  const angleRows = buildAngleRows(report);
  const houseRows = buildHouseRows(report, shownPlacements);
  const chartBalance = buildChartBalance(shownPlacements);
  const shownAspects = realEngineAspects;
  const birthTimeSummary = buildBirthTimeSummary(report);
  const birthMoonPhase = buildBirthMoonPhaseSummary(report);
  const accuracySummary = buildAccuracySummary(report);

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
            این کارت خلاصه شخصی چارت توست: اول ستون‌های اصلی را نشان می‌دهد و
            بخش‌های جزئی‌تر مثل خانه‌ها، motion و دقت تولد را در پنل‌های جدا می‌گذارد
            تا گزارش کامل باشد اما شلوغ و گیج‌کننده نشود.
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
            <span className="section-label">جزئیات محاسبه</span>
            <h3>پشتوانه محاسبه این گزارش</h3>
            <p>
              این چند مورد نشان می‌دهد گزارش با کدام شهر، رایزینگ و زمان تبدیل‌شده
              ساخته شده است؛ فقط برای شفافیت، نه برای درگیر کردن تو با جزئیات فنی.
            </p>
          </div>

          <div className="report-calculation-grid">
            <div className="mini-card">
              <strong>شهر محاسبه</strong>
              <span>{report.realEngine.cityLabel}</span>
            </div>

            <div className="mini-card">
              <strong>رایزینگ محاسبه‌شده</strong>
              <span>{formatRisingFromLongitude(report.realEngine.ascendantLongitude)}</span>
            </div>

            <div className="mini-card">
              <strong>زمان تبدیل‌شده</strong>
              <span>{formatShortUtc(report.realEngine.utcIso)}</span>
            </div>
          </div>

          {accuracySummary ? (
            <details className="report-placement-details report-accuracy-section report-polish-advanced-panel">
              <summary>دقت تولد و مرزهای محاسبه</summary>
              <p>
                این پنل مرز اعتماد گزارش را روشن می‌کند: اگر ساعت تولد یا شهر دقیق
                نباشد، خانه‌ها، محورها و motion باید محتاط‌تر خوانده شوند. گره‌های ماه
                و لیلیت تا وقتی منبع واقعی‌شان سخت‌گیرانه نشود، نمایش داده نمی‌شوند.
              </p>
              <div className="report-placement-grid">
                <div className="mini-card">
                  <strong>کیفیت محاسبه</strong>
                  <span>{accuracySummary.statusLabel}</span>
                  <span>{accuracySummary.houseLabel}</span>
                  <span>{accuracySummary.angleLabel}</span>
                  <span>{accuracySummary.motionLabel}</span>
                </div>
                <div className="mini-card">
                  <strong>نقاط ویژه هنوز قفل‌شده</strong>
                  <span>{accuracySummary.nodesLabel}</span>
                  <span>{accuracySummary.lilithLabel}</span>
                </div>
                <div className="mini-card">
                  <strong>یادآوری دقت تولد</strong>
                  <span>اگر ساعت تولد تقریبی باشد، خانه‌ها و محورهای چارت باید با احتیاط بیشتری خوانده شوند.</span>
                  {accuracySummary.limitations.slice(0, 2).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                  {accuracySummary.warnings.slice(0, 1).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </details>
          ) : null}

          <div className="report-chart-wheel-structure">
            <RealChartWheel
              placements={shownPlacements}
              ascendantLongitude={report.realEngine.ascendantLongitude}
              houses={report.realEngine.houses}
              angles={report.realEngine.angles}
              aspects={realEngineAspects}
              retrogradePlanetIds={Array.from(retrogradePlanetIds)}
              houseSystem={report.realEngine.houseSystem}
            />
          </div>

          <details className="report-placement-details" open>
            <summary>مشاهده جایگاه‌های اصلی</summary>
            <div className="report-placement-grid">
              {shownPlacements.map((placement) => (
                <div className="mini-card" key={placement.id}>
                  <strong>{getPlanetLabel(placement.id, placement.label)}</strong>
                  <span>{formatPlacement(placement)}</span>
                  {retrogradePlanetIds.has(placement.id) ? <span>حرکت برگشتی / Retrograde</span> : null}
                </div>
              ))}
            </div>
          </details>

          {report.realEngine?.retrogrades?.status === "calculated" ? (
            <details className="report-placement-details report-motion-section report-polish-advanced-panel">
              <summary>حرکت برگشتی سیاره‌ها</summary>
              <p>
                این بخش از داده motion محاسبه‌شده در real engine می‌آید. گره‌های ماه و
                لیلیت هنوز عمداً deferred هستند و تا وقتی منبع واقعی‌شان سخت‌گیرانه نشود
                در گزارش نمایش داده نمی‌شوند.
              </p>
              <div className="report-placement-grid">
                <div className="mini-card">
                  <strong>وضعیت retrograde</strong>
                  <span>
                    {retrogradePlanetIds.size > 0
                      ? `سیاره‌های برگشتی: ${joinPersianList(
                          Array.from(retrogradePlanetIds).map((planetId) =>
                            getPlanetLabel(planetId, planetId),
                          ),
                        )}`
                      : "در این چارت سیاره برگشتی از میان سیاره‌های محاسبه‌شده ثبت نشده است."}
                  </span>
                  {report.realEngine.retrogrades.limitation ? (
                    <span>{report.realEngine.retrogrades.limitation}</span>
                  ) : null}
                </div>
              </div>
            </details>
          ) : null}

          {planetHouseRows.length > 0 ? (
            <details className="report-placement-details" open>
              <summary>سیاره‌ها در خانه‌ها</summary>
              <div className="report-placement-grid">
                {planetHouseRows.map((item) => (
                  <div className="mini-card" key={`house-${item.id}`}>
                    <strong>{item.planetLabel}</strong>
                    <span>{item.houseLabel}</span>
                    <span>{item.placementLabel}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {angleRows.length > 0 ? (
            <details className="report-placement-details report-house-angle-section" open>
              <summary>محورهای اصلی چارت</summary>
              <p>
                این بخش فقط وقتی نمایش داده می‌شود که ASC، DSC، MC و IC در snapshot
                واقعی گزارش ذخیره شده باشند. MC/IC اینجا محور مستقل چارت‌اند، نه
                مترادف ساده خانه ۱۰ و ۴.
              </p>
              <div className="report-placement-grid">
                {angleRows.map((item) => (
                  <div className="mini-card" key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.positionLabel}</span>
                    <span>{item.axisLabel}</span>
                    {item.houseLabel ? <span>{item.houseLabel}</span> : null}
                    {item.sourceLabel ? <span>{item.sourceLabel}</span> : null}
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {houseRows.length === 12 ? (
            <details className="report-placement-details report-house-grid report-polish-advanced-panel">
              <summary>راهنمای ۱۲ خانه Whole Sign</summary>
              <p>
                خانه‌های این گزارش با سیستم {formatHouseSystemLabel(report.realEngine.houseSystem)}
                و از روی رایزینگ محاسبه‌شده ساخته شده‌اند. این جدول میدان‌های زندگی
                را نشان می‌دهد؛ سیاره‌ها و محورهای هر خانه فقط از داده ذخیره‌شده
                real engine خوانده می‌شوند.
              </p>
              <div className="report-placement-grid">
                {houseRows.map((item) => (
                  <div className="mini-card" key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.signLabel}</span>
                    <span>{item.cuspLabel}</span>
                    <span>{item.fieldLabel}</span>
                    <span>{item.planetsLabel}</span>
                    <span>{item.anglesLabel}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {chartBalance ? (
            <details className="report-placement-details report-polish-advanced-panel">
              <summary>انرژی کلی چارت</summary>
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
            </details>
          ) : null}
        </section>
      ) : null}

      {shownAspects.length > 0 ? (
        <section className="report-section report-aspect-section">
          <div className="report-section-heading">
            <span className="section-label">روابط سیاره‌ها</span>
            <h3>روابط مهم بین سیاره‌ها</h3>
            <p>
              جنبه‌ها نشان می‌دهند کدام بخش‌های چارت با هم جریان، حمایت، فشار یا
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
                  <span>{formatAspectAngleSummary(aspect)}</span>
                </div>
                <p>{aspect.narrative}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="notice report-notice report-product-notice">
        <p>{REPORT_CARD_SAFETY_NOTE}</p>
      </div>
    </article>
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
    nodesLabel: formatDeferredPointStatus("گره‌های ماه", realEngine.lunarNodes?.status, quality.nodesStatus),
    lilithLabel: formatDeferredPointStatus("لیلیت", realEngine.lilith?.status, quality.lilithStatus),
    limitations: Array.isArray(quality.limitations) ? quality.limitations : [],
    warnings: Array.isArray(quality.warnings) ? quality.warnings : [],
  };
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

  return `${label}: در حالت hardening`;
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
    "production-grade": "production-grade",
    calculated: "محاسبه‌شده",
    derived: "مشتق‌شده",
    preview: "پیش‌نمایش",
    placeholder: "placeholder",
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
    return "Whole Sign";
  }

  if (system === "placidus") {
    return "Placidus";
  }

  if (system === "equal-house") {
    return "Equal House";
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

function formatAspectAngleSummary(aspect: { aspectLabel: string; angle?: number | null; orb: number }) {
  const exactAngle =
    typeof aspect.angle === "number" && Number.isFinite(aspect.angle) ? formatDegree(aspect.angle) : null;
  const orbLabel = formatDegree(aspect.orb);

  return exactAngle
    ? `${aspect.aspectLabel} · زاویه واقعی ${exactAngle} · فاصله از زاویه دقیق (اورب) ${orbLabel}`
    : `${aspect.aspectLabel} · فاصله از زاویه دقیق (اورب) ${orbLabel}`;
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
