"use client";

import { formatZodiacLabel } from "@/lib/astrology/zodiac-labels";
import type {
  AstrologyReport,
  RealEngineReportHouse,
  ZodiacKey,
} from "@/types/astro";

type ReportDetailFactsPanelProps = {
  report: AstrologyReport;
};

type MoonSignFact = {
  value: string;
  detail: string;
  sourceLabel: string;
};

type RetrogradeFact = {
  statusLabel: string;
  items: string[];
  note: string | null;
};

type HouseCuspFact = {
  id: string;
  title: string;
  cuspLabel: string;
  fieldLabel: string;
};

const REPORT_DETAIL_FACTS_PANEL_VERSION = "v0.1.258-report-detail-visible-facts-panel" as const;

const PERSIAN_NUMBER_FORMATTER = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

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

export function ReportDetailFactsPanel({ report }: ReportDetailFactsPanelProps) {
  const moonSignFact = buildMoonSignFact(report);
  const retrogradeFact = buildRetrogradeFact(report);
  const houseCuspFacts = buildHouseCuspFacts(report);

  if (!report.realEngine && !moonSignFact) {
    return null;
  }

  return (
    <section
      className="report-section report-detail-facts-panel"
      data-report-detail-facts-version={REPORT_DETAIL_FACTS_PANEL_VERSION}
    >
      <div className="section-heading report-section-heading">
        <span className="badge">جزئیات پایه چارت</span>
        <h3>نشان ماه، حرکت برگشتی و شروع خانه‌ها</h3>
        <p>
          این پنل داده‌هایی را که معمولاً کاربر دنبالشان می‌گردد از متن فنی جدا می‌کند:
          نشان ماه تولد، وضعیت حرکت برگشتی سیاره‌ها و اینکه هر خانه از کدام درجه و نشان شروع می‌شود.
        </p>
      </div>

      <div className="report-grid report-detail-facts-grid">
        {moonSignFact ? (
          <article className="report-mini-card" data-report-detail-fact="moon-sign">
            <span className="report-card-eyebrow">نشان ماه تولد</span>
            <strong>{moonSignFact.value}</strong>
            <p>{moonSignFact.detail}</p>
            <small>{moonSignFact.sourceLabel}</small>
          </article>
        ) : null}

        <article className="report-mini-card" data-report-detail-fact="retrograde-motion">
          <span className="report-card-eyebrow">حرکت برگشتی</span>
          <strong>{retrogradeFact.statusLabel}</strong>
          {retrogradeFact.items.length > 0 ? (
            <p>{retrogradeFact.items.join("، ")}</p>
          ) : (
            <p>برای سیاره‌های محاسبه‌شده، موردی برای نمایش در این پنل ثبت نشده است.</p>
          )}
          {retrogradeFact.note ? <small>{retrogradeFact.note}</small> : null}
        </article>
      </div>

      {houseCuspFacts.length > 0 ? (
        <div className="report-detail-house-cusps" data-report-detail-fact="house-cusps">
          <div className="report-detail-house-cusps-heading">
            <h4>شروع هر خانه</h4>
            <p>
              این ردیف‌ها نشان می‌دهند هر خانه از کدام درجه و کدام نشان آغاز می‌شود؛
              در خوانش‌های بعدی، placementها و رابطه‌ها به همین ساختار وصل می‌شوند.
            </p>
          </div>

          <div className="report-technical-grid report-house-cusp-grid">
            {houseCuspFacts.map((house) => (
              <article key={house.id} className="report-technical-row report-house-cusp-row">
                <strong>{house.title}</strong>
                <span>{house.cuspLabel}</span>
                <small>{house.fieldLabel}</small>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildMoonSignFact(report: AstrologyReport): MoonSignFact | null {
  const moonPlacement = report.realEngine?.placements?.find(
    (placement) => placement.id === "moon",
  );

  if (moonPlacement) {
    const signLabel = formatZodiacLabel(moonPlacement.signId);
    const degreeLabel = formatDegree(moonPlacement.degreeInSign);

    return {
      value: signLabel,
      detail: degreeLabel
        ? `ماه تولد در ${degreeLabel} درجه‌ی ${signLabel} قرار دارد.`
        : `ماه تولد در نشان ${signLabel} قرار دارد.`,
      sourceLabel: "بر اساس جایگاه محاسبه‌شده ماه در چارت تولد",
    };
  }

  const fallbackMoonSign = report.chart?.moonSign;
  if (!fallbackMoonSign) {
    return null;
  }

  return {
    value: fallbackMoonSign.faName,
    detail: `ماه تولد در نشان ${fallbackMoonSign.faName} نمایش داده شده است.`,
    sourceLabel: "بر اساس خلاصه چارت فعلی؛ داده واقعی جایگاه ماه در اولویت است.",
  };
}

function buildRetrogradeFact(report: AstrologyReport): RetrogradeFact {
  const retrogradeSource = report.realEngine?.retrogrades;

  if (!retrogradeSource) {
    return {
      statusLabel: "داده حرکت برگشتی ثبت نشده",
      items: [],
      note: "این گزارش هنوز منبع حرکت برگشتی قابل نمایش ندارد.",
    };
  }

  if (retrogradeSource.status !== "calculated") {
    return {
      statusLabel: "حرکت برگشتی هنوز قطعی محاسبه نشده",
      items: [],
      note: retrogradeSource.limitation ?? "برای این گزارش، وضعیت حرکت برگشتی در حالت قطعی نیست.",
    };
  }

  const items = retrogradeSource.planetIds.map((planetId) => {
    const label = getPlanetLabel(planetId);
    return `${label}: حرکت برگشتی`;
  });

  return {
    statusLabel:
      items.length > 0
        ? `${PERSIAN_NUMBER_FORMATTER.format(items.length)} سیاره با حرکت برگشتی`
        : "حرکت برگشتی محاسبه شد؛ سیاره برگشتی ثبت نشد",
    items,
    note: retrogradeSource.limitation ?? "این وضعیت از لایه محاسبه حرکت سیاره‌ها آمده است.",
  };
}

function buildHouseCuspFacts(report: AstrologyReport): HouseCuspFact[] {
  const houses = report.realEngine?.houses ?? [];

  return houses
    .slice()
    .sort((first, second) => first.number - second.number)
    .map((house) => buildHouseCuspFact(house));
}

function buildHouseCuspFact(house: RealEngineReportHouse): HouseCuspFact {
  const signLabel = formatZodiacLabel(house.signId as ZodiacKey);
  const degreeLabel = formatDegree(house.degreeInSign);

  return {
    id: `house-${house.number}`,
    title: `خانه ${PERSIAN_NUMBER_FORMATTER.format(house.number)}`,
    cuspLabel: degreeLabel
      ? `شروع از ${degreeLabel} درجه‌ی ${signLabel}`
      : `شروع از نشان ${signLabel}`,
    fieldLabel: HOUSE_FIELD_UI_LABELS[house.number] ?? "حوزه نمادین این خانه",
  };
}

function formatDegree(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return PERSIAN_NUMBER_FORMATTER.format(Math.round(value * 10) / 10);
}

function getPlanetLabel(planetId: string): string {
  return PLANET_LABELS_FA[planetId] ?? planetId;
}
