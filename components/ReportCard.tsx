"use client";

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


const PERSIAN_NUMBER_FORMATTER = new Intl.NumberFormat("fa-IR");

type CoreCard = {
  id: string;
  title: string;
  eyebrow: string;
  value: string;
  description: string;
};

export function ReportCard({ report }: ReportCardProps) {
  const realEngineAspects = report.realEngine?.aspects ?? [];
  const coreCards = buildCoreCards(report);
  const shownPlacements = report.realEngine?.placements.slice(0, 8) ?? [];
  const shownAspects = realEngineAspects.slice(0, 5);
  const birthTimeSummary = buildBirthTimeSummary(report);

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
            این کارت خلاصه شخصی چارت توست: ورودی تولد، سه ستون اصلی، رایزینگ
            محاسبه‌شده، جایگاه‌های اصلی و روابط مهم سیاره‌ها را قبل از ورود به
            خوانش نهایی نشان می‌دهد.
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
              <strong>رایزینگ محاسبه‌شده</strong>
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
                  <span>
                    {aspect.aspectLabel} · اورب {formatDegree(aspect.orb)}
                  </span>
                </div>
                <p>{aspect.narrative}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
