"use client";

type ReportSynthesisCoreCard = {
  id: string;
  title: string;
  eyebrow?: string;
  value: string;
  description: string;
};

type ReportSynthesisSectionProps = {
  coreCards: ReportSynthesisCoreCard[];
  aspectCount: number;
  shownAspectCount: number;
  houseCount: number;
  lunarNodeCount: number;
  hasLilith: boolean;
  personalTransitStatus: string | null;
};

const REPORT_DEPTH_SYNTHESIS_VERSION =
  "v0.1.256-report-depth-synthesis-first-pass" as const;

export function ReportSynthesisSection({
  coreCards,
  aspectCount,
  shownAspectCount,
  houseCount,
  lunarNodeCount,
  hasLilith,
  personalTransitStatus,
}: ReportSynthesisSectionProps) {
  const primaryCards = coreCards.slice(0, 3);
  const transitLine = formatPersonalTransitLine(personalTransitStatus);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/75 p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          روایت ترکیبی گزارش
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-950">
          از داده‌های جدا تا یک تصویر واحد
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          این بخش نسخه اولِ سنتز گزارش است: سه ستون اصلی، روابط مهم،
          خانه‌های فعال و آسمان امروز نسبت به چارت تولد تو را کنار هم
          می‌گذارد تا گزارش کمتر شبیه فهرست داده‌ها و بیشتر شبیه یک
          خوانش منسجم دیده شود.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {primaryCards.map((card) => (
          <article
            key={card.id}
            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
          >
            <p className="text-xs font-medium text-slate-500">{card.eyebrow}</p>
            <h4 className="mt-1 font-bold text-slate-900">{card.title}</h4>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              {card.value}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <p className="rounded-2xl bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
          روابط مهم این گزارش از {formatPersianNumber(aspectCount)} aspect
          محاسبه‌شده شروع می‌شود و فعلاً {formatPersianNumber(shownAspectCount)}
          رابطه برجسته را برای خواندن سریع‌تر جلو می‌آورد. این یعنی روایت
          باید از تماس‌های واقعی سیاره‌ها عبور کند، نه از جمله‌های عمومی.
        </p>
        <p className="rounded-2xl bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
          پشتوانه خانه‌ها، محورها، دست‌های ماه و لیلیت هنوز به‌صورت
          شفاف در گزارش نگه داشته شده است: {formatPersianNumber(houseCount)}
          خانه، {formatPersianNumber(lunarNodeCount)} نقطه از دست‌های ماه
          و {hasLilith ? "لیلیت محاسبه‌شده" : "لیلیتِ بدون روایت کامل"} در
          خوانش بعدی باید به synthesis عمیق‌تر وصل شوند.
        </p>
      </div>

      <p className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-7 text-slate-700">
        {transitLine}
      </p>

      <p className="mt-3 text-xs leading-6 text-slate-500">
        نسخه guard: {REPORT_DEPTH_SYNTHESIS_VERSION}. این بخش نه جایگزین
        بخش‌های فنی است و نه ادعای قطعی می‌سازد؛ فقط مسیر خواندن گزارش را
        منسجم‌تر می‌کند.
      </p>
    </section>
  );
}

function formatPersonalTransitLine(status: string | null): string {
  if (status === "ready") {
    return "آسمان امروز نسبت به چارت تولد تو آماده خواندن است؛ این داده باید در کنار سه ستون اصلی و روابط سیاره‌ای دیده شود، نه جدا از متن زندگی.";
  }

  if (status === "partial-no-aspects") {
    return "ترنزیت شخصی داده دارد اما aspect نزدیک پیدا نشده است؛ نبود تماس نزدیک هم بخشی از خوانش صادقانه امروز است.";
  }

  if (status === "missing-current-residence") {
    return "برای ترنزیت شخصی هنوز محل زندگی فعلی لازم است؛ هالیوس نباید تهران یا هیچ شهر دیگری را بی‌اجازه جایگزین کند.";
  }

  return "اگر داده ترنزیت شخصی هنوز در گزارش نیست، سنتز فعلی فقط بر چارت تولد، خانه‌ها و روابط محاسبه‌شده تکیه می‌کند.";
}

function formatPersianNumber(value: number): string {
  return value.toLocaleString("fa-IR");
}
