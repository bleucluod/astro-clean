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

const PERSONAL_TRANSIT_VISIBLE_SECTION_VERSION =
  "v0.1.255-personal-transit-visible-report-section" as const;

export function PersonalTransitReportSection({
  data,
}: {
  data?: PersonalTransitReportDataBridge | null;
}) {
  if (!data) {
    return null;
  }

  const hasAspects = data.aspectHighlights.length > 0;
  const isMissingResidence = data.status === "missing-current-residence";
  const birthPlace = data.location.birthPlaceName ?? "محل تولد ثبت نشده";
  const currentResidence =
    data.location.currentResidencePlaceName ?? "محل زندگی فعلی ثبت نشده";

  return (
    <section
      className="report-section report-personal-transit-section"
      data-section-version={PERSONAL_TRANSIT_VISIBLE_SECTION_VERSION}
      aria-label="آسمان امروز نسبت به چارت تولد تو"
    >
      <div className="report-section-heading">
        <span className="section-label">ترنزیت امروز برای چارت تولد</span>
        <h3>{data.publicLabel}</h3>
        <p>
          این بخش آسمان امروز را با چارت تولد تو مقایسه می‌کند: چارت تولد از محل
          تولد و زمان تولد می‌آید، اما ترنزیت شخصی باید با محل زندگی فعلی خوانده
          شود. هالیوس برای گزارش شخصی، تهران را بی‌اجازه جایگزین محل فعلی نمی‌کند.
        </p>
      </div>

      <div className="report-placement-grid">
        <div className="mini-card">
          <strong>مبنای تولد</strong>
          <span>{birthPlace}</span>
          {data.location.birthTimezone ? <span>{data.location.birthTimezone}</span> : null}
        </div>

        <div className="mini-card">
          <strong>مبنای ترنزیت امروز</strong>
          <span>{currentResidence}</span>
          {data.location.currentResidenceTimezone ? (
            <span>{data.location.currentResidenceTimezone}</span>
          ) : null}
          <span>بدون پیش‌فرض پنهان تهران</span>
        </div>

        <div className="mini-card">
          <strong>وضعیت خوانش</strong>
          <span>{formatStatusLabel(data.status)}</span>
          <span>رایگان و بدون لاگین؛ فقط با داده محاسباتی</span>
        </div>
      </div>

      {isMissingResidence ? (
        <p className="report-muted-note">
          برای خواندن دقیق این بخش، محل زندگی فعلی لازم است. تا وقتی این داده را
          نگرفته‌ایم، Halleus ادعای شخصی درباره آسمان امروز نمی‌سازد و از تهران
          به‌عنوان پیش‌فرض پنهان استفاده نمی‌کند.
        </p>
      ) : null}

      {!isMissingResidence && hasAspects ? (
        <div className="report-aspect-grid">
          {data.aspectHighlights.slice(0, 4).map((aspect) => (
            <article className="report-aspect-card" key={aspect.summaryKey}>
              <div>
                <strong>{formatAspectTitle(aspect)}</strong>
                <span>
                  اورب {formatDegree(aspect.orb)} از سقف {formatDegree(aspect.orbLimit)}
                </span>
              </div>
              <p>
                این تماس، زبان مشاهده است نه حکم قطعی: آسمان امروز می‌تواند همان
                بخش از چارت تولد را روشن‌تر کند، اما تصمیم نهایی همچنان انسانی و
                زمینه‌مند است.
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {!isMissingResidence && !hasAspects ? (
        <p className="report-muted-note">
          در محدوده aspectهای اصلی و orbهای تعریف‌شده، تماس نزدیک قابل گزارش پیدا
          نشد. این یعنی امروز نباید نشانه مصنوعی بسازیم؛ نبود aspect نزدیک هم یک
          داده محاسباتی است.
        </p>
      ) : null}

      <p className="report-muted-note">
        این خوانش فقط از خورشید، ماه، عطارد، زهره، مریخ، مشتری، زحل، اورانوس،
        نپتون و پلوتو استفاده می‌کند. دست‌های ماه، لیلیت، خانه‌ها و زاویه‌ها برای
        ترنزیت شخصی هنوز deferred هستند.
      </p>
    </section>
  );
}

function formatAspectTitle(aspect: PersonalTransitReportDataBridgeAspectSummary): string {
  return [
    getBodyLabel(aspect.transitBody),
    getAspectLabel(aspect.aspect),
    "ناتال " + getBodyLabel(aspect.natalBody),
  ].join(" · ");
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

function formatDegree(value: number): string {
  return value.toLocaleString("fa-IR", { maximumFractionDigits: 2 }) + " درجه";
}
