"use client";

import type { LiveReportReadingContract } from "@/lib/report-output/live-report-reading-contract";
import type { ReportReadingSectionId } from "@/lib/storage/report-journey-client";
import styles from "./human-first-report.module.css";

type FiveMinuteReportSummaryProps = {
  contract: LiveReportReadingContract;
  onOpenFullReport: (sectionId: ReportReadingSectionId) => void;
};

type CoreId = "sun" | "moon" | "rising";

const CORE_EXPLAINERS: Record<
  CoreId,
  { title: string; beginner: string; cue: string }
> = {
  sun: {
    title: "خورشید؛ هویت و جهت",
    beginner:
      "خورشید در چارت تولد از هویت آگاهانه، جهت شخصی و بخشی از تو می‌گوید که می‌خواهی آن را بسازی و در جهان نشان بدهی.",
    cue: "اگر فقط یک سؤال از خورشید بپرسی: من وقتی واقعاً خودم هستم، چه چیزی را می‌خواهم زندگی کنم؟",
  },
  moon: {
    title: "ماه؛ احساس و امنیت",
    beginner:
      "ماه از واکنش‌های غریزی، نیازهای عاطفی و چیزی می‌گوید که برای آرام‌شدن، اعتمادکردن و احساس امنیت لازم داری.",
    cue: "اگر فقط یک سؤال از ماه بپرسی: وقتی هیچ‌کس نگاهم نمی‌کند، برای آرام‌شدن واقعاً به چه چیزی نیاز دارم؟",
  },
  rising: {
    title: "طالع؛ ورود و تصویر اولیه",
    beginner:
      "طالع یا رایزینگ شیوهٔ ورودت به موقعیت‌ها، واکنش اولیه و تصویری را توصیف می‌کند که دیگران معمولاً زودتر از بقیهٔ لایه‌های تو می‌بینند.",
    cue: "اگر فقط یک سؤال از طالع بپرسی: من معمولاً با چه حال‌وهوایی وارد جهان و رابطه با دیگران می‌شوم؟",
  },
};

function humanizePatternTitle(value: string): string {
  return value
    .replace(/^مرکز ثقل سیاره‌ای:\s*/u, "سیارهٔ برجسته: ")
    .replace(/^میدان پررنگ زندگی:\s*/u, "خانهٔ برجسته: ")
    .replace(/^امضای غالب:\s*/u, "امضای غالب: ")
    .trim();
}

export function FiveMinuteReportSummary({
  contract,
  onOpenFullReport,
}: FiveMinuteReportSummaryProps) {
  const displayName = contract.displayName.trim();
  const corePlacements = contract.corePlacements.filter(
    (placement) =>
      placement.id !== "rising" || contract.hasReliableBirthTime,
  );
  const chartRuler = contract.evidenceReferences.find((item) =>
    (item.label + " " + item.detail).includes("حاکم چارت"),
  );
  const patterns = contract.primaryPatterns.slice(0, 3);

  return (
    <section
      aria-labelledby="five-minute-report-title"
      className={styles.fiveMinuteSummary}
      data-chart-prominence-summary="deterministic-three-signatures"
      data-editorial-summary="astrology-first-beginner"
    >
      <header className={styles.summaryHero} data-screenshot-ready>
        <div className={styles.summaryHeroMeta}>
          <span>خلاصهٔ ۵ دقیقه‌ای چارت تولد</span>
          <strong>بدون نیاز به دانستن آسترولوژی</strong>
        </div>
        <p className={styles.summaryKicker}>سه پایهٔ اصلی را بفهم؛ بعد سراغ جزئیات برو.</p>
        <h1 id="five-minute-report-title">
          {displayName
            ? `${displayName}؛ خورشید، ماه و طالع تو از کجا شروع می‌شوند؟`
            : "خورشید، ماه و طالع تو از کجا شروع می‌شوند؟"}
        </h1>
        <p>
          عنوان‌ها عمداً آسترولوژیک مانده‌اند. زیر هر عنوان اول می‌فهمی آن بخش در چارت اصلاً دربارهٔ چیست،
          بعد جایگاه واقعی خودت را می‌بینی و در آخر ترجمهٔ شخصی همان جایگاه را می‌خوانی.
        </p>
      </header>

      <section
        className={styles.summaryBeginnerSection}
        aria-labelledby="summary-core-astrology-title"
      >
        <div className={styles.summarySectionHeading}>
          <span>سه پایهٔ چارت تولد</span>
          <h2 id="summary-core-astrology-title">خورشید، ماه و طالع؛ سه لایهٔ متفاوت از یک نفر</h2>
        </div>

        <div className={styles.summaryCoreGrid}>
          {corePlacements.map((placement) => {
            const id = placement.id as CoreId;
            const explainer = CORE_EXPLAINERS[id];
            if (!explainer) return null;
            return (
              <article
                className={styles.summaryCoreItem}
                data-screenshot-ready
                key={placement.id}
              >
                <div className={styles.summaryCoreHeading}>
                  <span className={styles.summaryAstrologyTitle}>{explainer.title}</span>
                  <strong className={styles.summaryPlacement}>{placement.position}</strong>
                </div>
                <h3>{`${explainer.title.split("؛")[0]} در چارت تو`}</h3>
                <p className={styles.summaryDefinition}>{explainer.beginner}</p>
                <p className={styles.summaryPersonalMeaning}>{placement.role}</p>
                <p className={styles.summaryBeginnerCue}>{explainer.cue}</p>
              </article>
            );
          })}
        </div>

        {!contract.hasReliableBirthTime ? (
          <p className={styles.summaryTimeNote}>
            چون ساعت تولد قابل اتکا نیست، طالع و خانه‌های وابسته به ساعت وارد این خلاصه نشده‌اند؛ چیزی برای پرکردن جای خالی حدس زده نمی‌شود.
          </p>
        ) : null}
      </section>

      <section
        className={styles.summaryCombination}
        data-screenshot-ready
        aria-labelledby="summary-signature-title"
      >
        <div className={styles.summarySectionHeading}>
          <span>امضای عناصر و کیفیت‌ها</span>
          <h2 id="summary-signature-title">ریتم غالب چارت تو</h2>
        </div>
        <p className={styles.summaryCombinationLead}>{contract.chartSignature.title}</p>
        <p className={styles.summaryCombinationBody}>{contract.chartSignature.body}</p>
        {chartRuler ? (
          <div className={styles.summaryRulerLine}>
            <span>حاکم چارت؛ مسیر راهبر</span>
            <strong>{chartRuler.label}</strong>
            <p>{chartRuler.detail}</p>
          </div>
        ) : null}
      </section>

      <section className={styles.summarySection} aria-labelledby="summary-patterns-title">
        <div className={styles.summarySectionHeading}>
          <span>برجستگی‌های واقعی همین چارت</span>
          <h2 id="summary-patterns-title">سه امضای نجومی که ارزش دارد اول ببینی</h2>
        </div>
        <div className={styles.summaryPatternGrid}>
          {patterns.map((pattern, index) => (
            <article
              className={styles.summaryPatternCard}
              data-screenshot-ready
              key={pattern.id}
            >
              <span className={styles.summaryPatternNumber}>
                {(index + 1).toLocaleString("fa-IR")}
              </span>
              <h3>{humanizePatternTitle(pattern.title)}</h3>
              <p>{pattern.summary}</p>
              {pattern.evidence.length > 0 ? (
                <details className={styles.summaryEvidenceDisclosure}>
                  <summary>چرا این نتیجه نجومی است؟</summary>
                  <ul>
                    {pattern.evidence.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <button
                className={styles.summaryLink}
                onClick={() => onOpenFullReport(pattern.destination)}
                type="button"
              >
                رفتن به فصل مرتبط
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.summaryFinalCta} data-screenshot-ready>
        <div>
          <span>حالا تصویر کلی را داری</span>
          <strong>در گزارش کامل می‌بینی هر نتیجه دقیقاً از کدام سیاره، خانه، جنبه یا الگوی چارت آمده است.</strong>
        </div>
        <button
          className={styles.summaryPrimaryAction}
          onClick={() => onOpenFullReport("overview")}
          type="button"
        >
          ادامه به گزارش کامل چارت تولد
        </button>
      </div>
    </section>
  );
}
