"use client";

import type {
  PersonalTransitReportDataBridge,
  PersonalTransitReportDataBridgeAspectSummary,
} from "@/src/lib/report-output/personal-transit-report-data-bridge";

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

const ASPECT_TONE_FA: Record<string, string> = {
  conjunction: "تمرکز و پررنگ‌شدن یک موضوع",
  opposition: "آینه، روبه‌رو شدن و نیاز به تعادل",
  trine: "جریان روان‌تر و فرصت طبیعی‌تر",
  square: "فشار سازنده، اصطکاک و نیاز به انتخاب آگاهانه",
  sextile: "فرصت کوچک اما قابل استفاده",
};

const TRANSIT_BODY_FOCUS_FA: Record<string, string> = {
  sun: "نورافکنی روی موضوعات روزمره و جهت فعلی",
  moon: "تغییر حال‌وهوا، واکنش عاطفی و نیاز لحظه‌ای",
  mercury: "فکر، گفت‌وگو، تصمیم و دریافت اطلاعات",
  venus: "رابطه، پسند، ارزش، لذت و پیوند",
  mars: "انگیزه، اقدام، خشم، جسارت و انرژی خام",
  jupiter: "رشد، گسترش، امید و اغراق احتمالی",
  saturn: "مرز، مسئولیت، واقع‌بینی و فشار بلوغ",
  uranus: "تغییر، بی‌قراری، آزادی و شکست الگو",
  neptune: "ابهام، الهام، رویا و نیاز به مرزبندی",
  pluto: "شدت، دگرگونی، کنترل و مواجهه عمیق",
};

const NATAL_BODY_FIELD_FA: Record<string, string> = {
  sun: "هویت، اراده و مسیر اصلی چارت تولد",
  moon: "نیاز عاطفی، امنیت درونی و واکنش ناخودآگاه",
  mercury: "ذهن، زبان، یادگیری و شیوه‌ی پردازش",
  venus: "رابطه، زیبایی، ارزش‌ها و میل به نزدیکی",
  mars: "جرئت، میل، خشم و شیوه‌ی اقدام",
  jupiter: "باور، امید، رشد و افق دید",
  saturn: "ترس، تعهد، مرز و درس‌های بلوغ",
  uranus: "استقلال، تفاوت و الگوی آزادی",
  neptune: "حساسیت، خیال، معنویت و مرزهای مبهم",
  pluto: "شدت روانی، قدرت، رهاسازی و دگرگونی",
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

  const hasAspects = data.aspectHighlights.length > 0;
  const topAspects = data.aspectHighlights.slice(0, 6);
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

          <div className="report-aspect-grid report-personal-transit-grid">
            {topAspects.map((aspect) => {
              const insight = buildTransitInsight(aspect, transitDateLabel);

              return (
                <article className="report-aspect-card" key={aspect.id}>
                  <span className="report-kicker">
                    {getAspectAngleLabel(aspect.aspect)}
                  </span>
                  <h4>{formatAspectTitle(aspect)}</h4>
                  <p>{insight.focus}</p>
                  <ul>
                    <li>
                      <strong>سمت کمک‌کننده:</strong> {insight.helpful}
                    </li>
                    <li>
                      <strong>سمت رشدی:</strong> {insight.growth}
                    </li>
                    <li>
                      <strong>اعتماد محاسباتی:</strong> اورب{" "}
                      {formatDegree(aspect.orb)} از سقف{" "}
                      {formatDegree(aspect.orbLimit)}؛ هرچه اورب کمتر باشد،
                      تماس نزدیک‌تر است.
                    </li>
                  </ul>
                </article>
              );
            })}
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

      <p className="report-muted-note">
        این مقایسه فقط از خورشید، ماه، عطارد، زهره، مریخ، مشتری، زحل، اورانوس،
        نپتون و پلوتو استفاده می‌کند. دست‌های ماه، لیلیت، خانه‌ها و زاویه‌ها در
        این نسخه وارد مقایسه‌ی ترنزیتی نشده‌اند.
      </p>
    </section>
  );
}

function buildTransitInsight(
  aspect: PersonalTransitReportDataBridgeAspectSummary,
  transitDateLabel: string,
) {
  const transitFocus =
    TRANSIT_BODY_FOCUS_FA[aspect.transitBody] ?? "جریان زمان گزارش";
  const natalField =
    NATAL_BODY_FIELD_FA[aspect.natalBody] ?? "یکی از الگوهای چارت تولد";
  const aspectTone =
    ASPECT_TONE_FA[aspect.aspect] ?? "تماس قابل مشاهده بین دو بخش چارت";

  return {
    focus: `${getBodyLabel(aspect.transitBody)} در ${transitDateLabel} می‌توانسته ${transitFocus} را به ${natalField} وصل کند. کیفیت این تماس بیشتر شبیه ${aspectTone} بوده است.`,
    helpful: `از این تماس برای مرور روشن‌تر ${natalField} استفاده کن؛ آن را به یک تجربه‌ی همان بازه وصل کن، نه به پیش‌بینی آینده.`,
    growth: "اگر این بخش سنگین بوده، آن را به‌عنوان دعوتی موقت برای تنظیم ریتم، مرز و انتخاب آگاهانه بخوان؛ نه حکم ثابت درباره زندگی.",
  };
}

function formatAspectTitle(
  aspect: PersonalTransitReportDataBridgeAspectSummary,
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

function formatDegree(value: number): string {
  return (
    value.toLocaleString("fa-IR", {
      maximumFractionDigits: 2,
    }) + " درجه"
  );
}
