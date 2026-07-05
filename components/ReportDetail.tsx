"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { getReportRepository } from "@/lib/storage/report-repository";
import { getAccountReportRecord } from "@/lib/storage/account-report-read-client";
import type { AstrologyReport } from "@/types/astro";

import { ReportV3Experience } from "@/components/ReportV3Experience";
import { ChartReportBridgePanel } from "./ChartReportBridgePanel";

type ReportDetailProps = {
  reportId: string;
  reportSource?: ReportDetailSource;
};

type ReportDetailSource = "local" | "beta-db" | "account";

type BetaDatabaseReadResponse = {
  ok?: boolean;
  error?: string;
  reportRecord?: {
    report?: AstrologyReport;
    note?: string | null;
    favorite?: boolean | null;
  };
};

type ReportReadingStats = {
  displayName: string;
  aspectCount: number;
  houseCount: number;
  placementCount: number;
  hasRealEngine: boolean;
};

const reportRepository = getReportRepository();
const isBetaDatabaseSaveUiEnabled =
  process.env.NEXT_PUBLIC_HALLEUS_ENABLE_BETA_DB_SAVE_UI === "true";

const REPORT_QUICK_READING_MAP = [
  {
    label: "شروع",
    title: "خورشید، ماه، رایزینگ",
    description:
      "اول سه ستون اصلی را پیدا کن: هویت، نیاز عاطفی و شیوه ورود تو به جهان. این بخش سریع‌ترین راه برای گرفتن حس کلی گزارش است.",
  },
  {
    label: "عمق",
    title: "خانه‌ها، سیاره‌ها و جنبه‌ها",
    description:
      "بعد سراغ میدان‌های زندگی و گفت‌وگوی درونی چارت برو؛ اینجا گزارش از توصیف عمومی به خوانش شخصی‌تر نزدیک می‌شود.",
  },
  {
    label: "برگشت",
    title: "یک جمله را نگه دار",
    description:
      "در پایان فقط یک برداشت، سؤال یا تمرین را یادداشت کن. لازم نیست همه گزارش را یک‌باره حفظ یا حل کنی.",
  },
] as const;

const REPORT_READING_STEPS = [
  {
    label: "۱",
    title: "اول نقشه را ببین",
    description:
      "کارت بالای صفحه، سه ستون اصلی، چرخ چارت و پشتوانه محاسبه را خلاصه می‌کند؛ قبل از متن بلند، این بخش را مثل نقشه راه بخوان.",
  },
  {
    label: "۲",
    title: "بعد وارد خوانش کامل شو",
    description:
      "از تصویر کلی، خورشید/ماه/طالع، خانه‌ها و جنبه‌ها عبور کن؛ لازم نیست همه چیز را در یک نشست تمام کنی.",
  },
  {
    label: "۳",
    title: "در پایان یک برداشت نگه دار",
    description:
      "بعد از خواندن، فقط یک جمله یا سؤال شخصی را در یادداشت ذخیره کن تا گزارش از متن بلند به یک نقطه قابل برگشت تبدیل شود.",
  },
] as const;

const REPORT_TRUST_SIGNALS = [
  {
    label: "حریم خصوصی",
    title: "Private / noindex",
    description:
      "این نسخه برای خواندن شخصی طراحی شده است و گزارش‌ها عمومی یا indexable منتشر نمی‌شوند مگر در آینده با رضایت صریح کاربر.",
  },
  {
    label: "پشتوانه",
    title: "چارت محاسبه‌شده",
    description:
      "وقتی real engine فعال باشد، جایگاه‌ها، خانه‌ها و جنبه‌ها از داده چارت محاسبه‌شده خوانده می‌شوند؛ پیش‌نمایش محدود هم جداگانه مشخص می‌شود.",
  },
  {
    label: "مرز معنا",
    title: "زبان نمادین، نه حکم قطعی",
    description:
      "هالیوس برای خودشناسی و تأمل است؛ جایگزین مشورت تخصصی در تصمیم‌های پزشکی، مالی، حقوقی یا زندگی نیست.",
  },
] as const;

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("halleus-data-changed"));
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

function buildReportReadingStats(report: AstrologyReport): ReportReadingStats {
  const displayName = report.input.name?.trim() || "این گزارش";
  const realEngine = report.realEngine;

  return {
    displayName,
    aspectCount: realEngine?.aspects?.length ?? 0,
    houseCount: realEngine?.houses?.length ?? 0,
    placementCount: realEngine?.placements?.length ?? 0,
    hasRealEngine: Boolean(realEngine),
  };
}

export function ReportDetail({ reportId, reportSource = "local" }: ReportDetailProps) {
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [note, setNote] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadReport() {
      if (reportSource === "account") {
        const result = await getAccountReportRecord(reportId);

        if (!isActive) {
          return;
        }

        if (result.status !== "account-read-ready" || !result.reportRecord?.report) {
          setReport(null);
          setNote("");
          setMessage(result.message);
          setIsReady(true);
          return;
        }

        setReport(result.reportRecord.report);
        setNote(result.reportRecord.note ?? "");
        setMessage(`نسخه اکانتی گزارش باز شد: ${reportId}`);
        setIsReady(true);
        return;
      }

      if (reportSource === "beta-db") {
        if (!isBetaDatabaseSaveUiEnabled) {
          throw new Error("خواندن نسخه آزمایشی سرور غیرفعال است.");
        }

        const response = await fetch(
          `/api/reports/beta?reportId=${encodeURIComponent(reportId)}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | BetaDatabaseReadResponse
          | null;

        if (!response.ok || !payload?.ok || !payload.reportRecord?.report) {
          throw new Error(payload?.error ?? "گزارش آزمایشی سرور پیدا نشد.");
        }

        if (!isActive) {
          return;
        }

        setReport(payload.reportRecord.report);
        setNote(payload.reportRecord.note ?? "");
        setMessage(`گزارش آزمایشی سرور باز شد: ${reportId}`);
        setIsReady(true);
        return;
      }

      const selectedRecord = await reportRepository.getReport(reportId);

      if (!isActive) {
        return;
      }

      setReport(selectedRecord?.report ?? null);
      setNote(selectedRecord?.note ?? "");
      setIsReady(true);
    }

    const timer = window.setTimeout(() => {
      void loadReport();
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [reportId, reportSource]);

  async function handleSaveNote() {
    if (reportSource === "account") {
      setMessage("یادداشت نسخه اکانتی فعلاً فقط خواندنی است؛ ویرایش یادداشت اکانتی در batch بعدی اضافه می‌شود.");
      return;
    }

    const updatedRecord = await reportRepository.setNote(reportId, note);

    if (updatedRecord) {
      setNote(updatedRecord.note ?? "");
    }

    notifyLocalDataChanged();
    setMessage(note.trim() ? "یادداشت ذخیره شد." : "یادداشت پاک شد.");
  }

  if (!isReady) {
    return (
      <section className="grid">
        <div className="card">
          <span className="badge">در حال آماده‌سازی</span>

          <h1>گزارش تو در حال باز شدن است</h1>

          <p>
            هالیوس نسخه ذخیره‌شده گزارش را آماده می‌کند تا بتوانی دوباره آن
            را بخوانی، یادداشت اضافه کنی و مسیر بعدی را انتخاب کنی.
          </p>
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="grid">
        <EmptyState
          badge="گزارش پیدا نشد"
          title="این گزارش پیدا نشد"
          description={message || "این گزارش ممکن است پاک شده باشد، در حساب فعلی نباشد، یا روی مرورگر/دستگاه دیگری ساخته شده باشد."}
          actionHref="/reports"
          actionLabel="بازگشت به گزارش‌ها"
        />
      </section>
    );
  }

  const isAccountReportSource = reportSource === "account";

  return (
    <section className="grid">
      <ReportCard report={report} />

      {isAccountReportSource ? (
        <section className="card">
          <span className="badge">Account report</span>
          <h2>نسخه ذخیره‌شده در حساب</h2>
          <p>
            این گزارش از account storage خوانده شده و private/noindex است. ویرایش یادداشت اکانتی در این نسخه read-only مانده و migration یا حذف local reports انجام نمی‌شود.
          </p>
        </section>
      ) : null}

      <ReportReadingGuide report={report} />

      <ReportTrustPanel report={report} reportSource={reportSource} />

      <ReportHumanReadingMode report={report} />

      <div className="report-final-reading-anchor" id="final-reading">
        <ReportV3Experience report={report} />
      </div>

      <section className="card report-bottom-summary-panel" id="personal-note">
        <div className="report-section-heading">
          <span className="badge">پشتوانه گزارش</span>
          <h2>خلاصه محاسبه و یادداشت</h2>
          <p>
            سه کارت کوتاه برای مرور سریع: جایگاه‌های برجسته، جنبه‌های برجسته و
            یک یادداشت کوچک که کنار همین گزارش در پنل می‌ماند.
          </p>
        </div>

        <div className="report-calculation-grid report-bottom-summary-grid">
          <ChartReportBridgePanel report={report} />

          <article className="mini-card report-note-card report-note-card-mini">
            <span className="section-label">یادداشت قابل برگشت</span>
            <h3>یک برداشت را برای بعد نگه دار</h3>
            <p>از کل گزارش فقط یک جمله، سؤال یا تمرین را اینجا ذخیره کن.</p>

            <label className="field">
              <span>متن یادداشت</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="مثلاً: این هفته به رابطه خورشید و ماه خودم برگردم..."
                rows={3}
                disabled={isAccountReportSource}
              />
            </label>

            <div className="actions">
              <button
                className="button"
                type="button"
                onClick={handleSaveNote}
                disabled={isAccountReportSource}
              >
                {isAccountReportSource ? "یادداشت اکانتی read-only است" : "ذخیره در پنل"}
              </button>

              <button
                className="button secondary"
                type="button"
                onClick={() => setNote("")}
                disabled={isAccountReportSource}
              >
                پاک کردن
              </button>
            </div>

            {message ? <p className="success-message">{message}</p> : null}
          </article>
        </div>
      </section>

      <ReportNextStepPanel />
    </section>
  );
}

function ReportReadingGuide({ report }: { report: AstrologyReport }) {
  const stats = buildReportReadingStats(report);
  const aspectLabel = stats.aspectCount > 0
    ? `${stats.aspectCount.toLocaleString("fa-IR")} جنبه محاسبه‌شده`
    : "جنبه‌های اصلی در صورت وجود نمایش داده می‌شوند";
  const houseLabel = stats.houseCount > 0
    ? `${stats.houseCount.toLocaleString("fa-IR")} خانه Whole Sign`
    : "خانه‌ها وابسته به دقت ساعت و مکان تولد هستند";
  const placementLabel = stats.placementCount > 0
    ? `${stats.placementCount.toLocaleString("fa-IR")} جایگاه سیاره‌ای/نقطه‌ای`
    : "جایگاه‌ها در گزارش کامل توضیح داده می‌شوند";

  return (
    <section className="card report-reading-guide" id="reading-guide" aria-labelledby="report-reading-guide-title">
      <div className="report-section-heading">
        <span className="badge">نقشه سریع خواندن</span>
        <h2 id="report-reading-guide-title">از کجای گزارش شروع کنی؟</h2>
        <p>
          گزارش {stats.displayName} بلند و لایه‌لایه است. این نقشه سریع کمک
          می‌کند اول ستون‌های اصلی را ببینی، بعد سراغ عمق بروی و در پایان
          فقط یک برداشت شخصی را نگه داری.
        </p>
      </div>

      <div className="report-calculation-grid">
        {REPORT_QUICK_READING_MAP.map((item) => (
          <article className="mini-card" key={item.label}>
            <span className="section-label">{item.label}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="report-calculation-grid mt-4">
        {REPORT_READING_STEPS.map((step) => (
          <article className="mini-card" key={step.label}>
            <span className="section-label">قدم {step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>

      <div className="report-calculation-grid mt-4">
        <article className="mini-card">
          <span className="section-label">پشتوانه خوانش</span>
          <h3>{stats.hasRealEngine ? "چارت محاسبه‌شده" : "پیش‌نمایش محدود"}</h3>
          <p>{placementLabel}</p>
        </article>

        <article className="mini-card">
          <span className="section-label">خانه‌ها</span>
          <h3>میدان‌های زندگی</h3>
          <p>{houseLabel}</p>
        </article>

        <article className="mini-card">
          <span className="section-label">جنبه‌ها</span>
          <h3>گفت‌وگوی درونی چارت</h3>
          <p>{aspectLabel}</p>
        </article>
      </div>

      <div className="actions mt-4">
        <a className="button" href="#final-reading">
          شروع خواندن گزارش کامل
        </a>

        <a className="button secondary" href="#personal-note">
          رفتن به یادداشت
        </a>
      </div>
    </section>
  );
}

function ReportHumanReadingMode({ report }: { report: AstrologyReport }) {
  const stats = buildReportReadingStats(report);
  const readingLabel = stats.hasRealEngine ? "خوانش کامل محاسبه‌شده" : "خوانش محدود و محتاط";

  return (
    <section className="card report-human-reading-mode" aria-labelledby="report-human-reading-mode-title">
      <div className="report-section-heading">
        <span className="badge">ریتم خواندن</span>
        <h2 id="report-human-reading-mode-title">گزارش را یک‌باره تمام نکن</h2>
        <p>
          این گزارش برای مرور آرام ساخته شده است. اول تصویر کلی را بگیر، بعد فقط یک فصل نزدیک به تجربه امروزت را بخوان و در پایان یک جمله را به یادداشت تبدیل کن.
        </p>
      </div>

      <div className="report-human-reading-mode-grid">
        <article className="mini-card">
          <span className="section-label">حالت خواندن</span>
          <h3>{readingLabel}</h3>
          <p>
            اگر متن بلند شد، از نقشه راه و ترکیب نخستین شروع کن؛ لازم نیست همه خانه‌ها و جنبه‌ها را در یک نشست بخوانی.
          </p>
        </article>

        <article className="mini-card">
          <span className="section-label">تمرکز امروز</span>
          <h3>یک جمله، نه همه گزارش</h3>
          <p>
            از هر فصل فقط یک جمله نزدیک به تجربه‌ات را نگه دار. گزارش وقتی ارزشمندتر می‌شود که به مشاهده روزمره وصل شود.
          </p>
        </article>

        <article className="mini-card">
          <span className="section-label">پشتوانه</span>
          <h3>{stats.aspectCount.toLocaleString("fa-IR")} جنبه و {stats.houseCount.toLocaleString("fa-IR")} خانه</h3>
          <p>
            عددها فقط برای اعتمادند؛ معنی اصلی در این است که کدام الگو برای تو قابل مشاهده و قابل تمرین می‌شود.
          </p>
        </article>
      </div>
    </section>
  );
}

function ReportTrustPanel({
  report,
  reportSource,
}: {
  report: AstrologyReport;
  reportSource: ReportDetailSource;
}) {
  const stats = buildReportReadingStats(report);
  const sourceLabel = reportSource === "account"
    ? "نسخه ذخیره‌شده در حساب"
    : reportSource === "beta-db"
      ? "نسخه آزمایشی سرور"
      : "نسخه ذخیره‌شده روی همین مرورگر";

  return (
    <section className="card report-trust-panel" aria-labelledby="report-trust-title">
      <div className="report-section-heading">
        <span className="badge">سه چراغ اعتماد</span>
        <h2 id="report-trust-title">قبل از خواندن، بدان این گزارش چه هست و چه نیست</h2>
        <p>
          این بخش برای شفافیت است: گزارش از کجا آمده، چقدر به چارت محاسبه‌شده
          تکیه دارد و مرزهای خوانش نمادین هالیوس کجاست.
        </p>
      </div>

      <div className="report-calculation-grid">
        {REPORT_TRUST_SIGNALS.map((signal) => (
          <article className="mini-card" key={signal.label}>
            <span className="section-label">{signal.label}</span>
            <h3>{signal.title}</h3>
            <p>{signal.description}</p>
          </article>
        ))}
      </div>

      <div className="report-calculation-grid mt-4">
        <article className="mini-card">
          <span className="section-label">منبع گزارش</span>
          <h3>{sourceLabel}</h3>
          <p>
            {stats.hasRealEngine
              ? "این گزارش با داده real engine نمایش داده می‌شود و برای مرور شخصی آماده است."
              : "این گزارش پیش‌نمایش محدود است؛ اگر داده چارت کامل نباشد، متن هم با احتیاط خوانده می‌شود."}
          </p>
        </article>

        <article className="mini-card">
          <span className="section-label">مسیر بعدی</span>
          <h3>Save/account بدون اجبار</h3>
          <p>
            اگر گزارش را می‌خواهی نگه داری، مسیر حساب کاربری برای ذخیره و
            برگشتن به گزارش است؛ انتشار عمومی هنوز بخشی از این نسخه نیست.
          </p>
        </article>
      </div>
    </section>
  );
}
function ReportNextStepPanel() {
  return (
    <section className="card report-next-step-panel" aria-labelledby="report-next-step-title">
      <div className="report-section-heading">
        <span className="badge">بعد از خواندن</span>
        <h2 id="report-next-step-title">با گزارش چطور ادامه بدهی؟</h2>
        <p>
          اگر گزارش سنگین بود، یک بار دیگر فقط راهنمای خواندن و یادداشتت را
          مرور کن. هالیوس فعلاً رایگان و noindex است؛ هدف این نسخه، بهتر کردن
          تجربه خواندن گزارش و تست محصول است، نه فروش یا ایندکس عمومی.
        </p>
      </div>

      <div className="actions">
        <a className="button" href="/chart">
          ساخت گزارش تازه
        </a>

        <a className="button secondary" href="/reports">
          بازگشت به گزارش‌ها
        </a>
      </div>
    </section>
  );
}
