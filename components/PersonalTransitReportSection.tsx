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

  return (
    <section
      className="report-section report-personal-transit-section"
      data-personal-transit-visible-section={PERSONAL_TRANSIT_VISIBLE_SECTION_VERSION}
      data-personal-transit-comparison-depth={PERSONAL_TRANSIT_COMPARISON_DEPTH_VERSION}
    >
      <div className="report-section-heading">
        <span className="report-kicker">آسمان امروز نسبت به چارت تولد تو</span>
        <h2>ترنزیت امروز برای چارت تولد</h2>
        <p>
          این بخش آسمان امروز را روی همان چارت تولدی می‌گذارد که بالاتر خواندی:
          یعنی ترنزیت قرار نیست یک گزارش جدا باشد، بلکه می‌گوید امروز کدام
          placement، رابطه یا الگوی تولدی روشن‌تر می‌شود. چارت تولد از محل تولد
          و زمان تولد می‌آید، اما ترنزیت شخصی باید با محل زندگی فعلی خوانده شود؛
          هالیوس تهران را بی‌اجازه جایگزین محل فعلی نمی‌کند.
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
          <span>مبنای ترنزیت امروز</span>
          <strong>{currentResidence}</strong>
          {data.location.currentResidenceTimezone ? (
            <small>{data.location.currentResidenceTimezone}</small>
          ) : null}
          <small>بدون پیش‌فرض پنهان تهران</small>
        </article>

        <article className="report-mini-card">
          <span>وضعیت خوانش</span>
          <strong>{formatStatusLabel(data.status)}</strong>
          <small>
            {currentResidenceIsRequired
              ? "محل زندگی فعلی برای دقت این بخش ضروری است."
              : "داده‌ی محل فعلی برای این خوانش ضروری اعلام نشده است."}
          </small>
        </article>
      </div>

      {isMissingResidence ? (
        <div className="notice report-notice">
          <strong>مقایسه‌ی چارت تولد و چارت امروز هنوز کامل نیست.</strong>
          <p>
            برای خواندن دقیق این بخش، محل زندگی فعلی لازم است. تا وقتی این داده
            را نگرفته‌ایم، Halleus ادعای شخصی درباره آسمان امروز نمی‌سازد و از
            تهران به‌عنوان پیش‌فرض پنهان استفاده نمی‌کند.
          </p>
        </div>
      ) : null}

      {!isMissingResidence && hasAspects ? (
        <div className="report-personal-transit-depth">
          <div className="report-section-heading compact">
            <span className="report-kicker">مقایسه‌ی چارت تولد و چارت امروز</span>
            <h3>امروز کدام بخش‌های چارت تولد تو روشن‌تر می‌شود؟</h3>
            <p>
              این کارت‌ها می‌گویند آسمان امروز روی کدام الگوی تولدی فشار/فرصت/توجه
              می‌آورد. آن‌ها را کنار placementها، aspectها و special points بخوان؛
              این کارت‌ها را مثل چراغ‌های کوچک توجه بخوان، کنار بقیه بخش‌های گزارش.
            </p>
          </div>

          <div className="report-aspect-grid report-personal-transit-grid">
            {topAspects.map((aspect) => {
              const insight = buildTransitInsight(aspect);

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
          <strong>تماس نزدیک قابل گزارش پیدا نشد.</strong>
          <p>
            در محدوده aspectهای اصلی و orbهای تعریف‌شده، تماس نزدیک قابل گزارش
            پیدا نشد. این یعنی امروز نباید نشانه مصنوعی بسازیم؛ نبود aspect
            نزدیک هم یک داده محاسباتی است.
          </p>
        </div>
      ) : null}

      <p className="report-muted-note">
        این خوانش فقط از خورشید، ماه، عطارد، زهره، مریخ، مشتری، زحل، اورانوس،
        نپتون و پلوتو استفاده می‌کند. دست‌های ماه، لیلیت، خانه‌ها و زاویه‌ها
        برای ترنزیت شخصی هنوز deferred هستند.
      </p>
    </section>
  );
}

function buildTransitInsight(aspect: PersonalTransitReportDataBridgeAspectSummary) {
  const transitFocus =
    TRANSIT_BODY_FOCUS_FA[aspect.transitBody] ?? "جریان امروز";
  const natalField =
    NATAL_BODY_FIELD_FA[aspect.natalBody] ?? "یکی از الگوهای چارت تولد";
  const aspectTone =
    ASPECT_TONE_FA[aspect.aspect] ?? "تماس قابل مشاهده بین دو بخش چارت";

  return {
    focus: `${getBodyLabel(aspect.transitBody)} امروز می‌تواند ${transitFocus} را به ${natalField} وصل کند. کیفیت این تماس بیشتر شبیه ${aspectTone} است.`,
    helpful: `از این تماس برای دیدن واضح‌تر ${natalField} استفاده کن و آن را با آرامش و فاصله‌ی کافی نگاه کنی.`,
    growth: `اگر این بخش سنگین حس شد، آن را به‌عنوان دعوت به تنظیم ریتم، مرز و انتخاب آگاهانه بخوان و برایش ریتم تازه‌ای پیدا کن.`,
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
    return "داده ترنزیت شخصی آماده است";
  }

  if (status === "partial-no-aspects") {
    return "داده آماده است، aspect نزدیک پیدا نشده";
  }

  return "محل زندگی فعلی لازم است";
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
