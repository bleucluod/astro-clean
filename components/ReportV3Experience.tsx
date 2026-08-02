"use client";

import { useMemo } from "react";
import { ReportAspectRelationshipSections } from "@/components/ReportAspectRelationshipSections";
import { ReportSpecialPointsNarrativeSection } from "@/components/ReportSpecialPointsNarrativeSection";
import {
  buildLiveReportReadingContract,
  LIVE_REPORT_READING_CONTRACT_VERSION,
  type LiveReportReadingContract,
  type LiveReportThemeChapter,
} from "@/lib/report-output/live-report-reading-contract";
import { enhanceReportOutputV3 } from "@/lib/report-output/report-v3";
import type { AstrologyReport } from "@/types/astro";

type ReportV3ExperienceProps = {
  report: AstrologyReport;
  readingContract?: LiveReportReadingContract;
};

export function ReportV3Experience({
  report,
  readingContract: suppliedContract,
}: ReportV3ExperienceProps) {
  const readingContract = useMemo(
    () => suppliedContract ?? buildLiveReportReadingContract(report),
    [report, suppliedContract],
  );
  const enhancedReport = useMemo(
    () => enhanceReportOutputV3(report as unknown as Record<string, unknown>),
    [report],
  );
  const overviewChapter = readingContract.themeChapters.find(
    (chapter) => chapter.navigationId === "overview",
  );
  const innerWorldChapters = readingContract.themeChapters.filter(
    (chapter) => chapter.navigationId === "inner-world",
  );
  const relationshipChapters = readingContract.themeChapters.filter(
    (chapter) => chapter.navigationId === "relationships",
  );
  const growthChapters = readingContract.themeChapters.filter(
    (chapter) => chapter.navigationId === "growth-path",
  );

  return (
    <div
      className="report-product-natal-reading"
      data-live-report-reading-contract={LIVE_REPORT_READING_CONTRACT_VERSION}
      data-report-product-quality="complete-birth-report"
    >
      <section className="report-product-hero" id="overview">
        <div className="report-product-hero-motif" aria-hidden="true" />
        <div className="report-product-hero-copy">
          <div className="report-product-eyebrow-row">
            <span className="badge">گزارش تولد هالیوس</span>
            <span className="report-product-reading-time">
              حدود {readingContract.readingTime.natalMinutes.toLocaleString("fa-IR")} دقیقه خواندن اصلی
            </span>
          </div>
          <h1>
            {readingContract.displayName === "تو"
              ? "تصویر کلی چارت تولد"
              : `تصویر کلی چارت تولد ${readingContract.displayName}`}
          </h1>
          <div className="report-product-opening">
            {readingContract.personalOpening.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <a className="button report-product-main-cta" href="#inner-world">
            از دنیای درونی شروع کن
          </a>
        </div>

        <aside className="report-product-signature" aria-label="امضای چارت">
          <span className="section-label">امضای چارت</span>
          <h2>{readingContract.chartSignature.title}</h2>
          <p>{readingContract.chartSignature.body}</p>
          <small>
            بر اساس {readingContract.chartSignature.evidenceCount.toLocaleString("fa-IR")} جایگاه محاسبه‌شده
          </small>
        </aside>
      </section>

      <section className="report-product-core-row" aria-label="خورشید، ماه و رایزینگ">
        {readingContract.corePlacements.map((placement) => (
          <article key={placement.id} className="report-product-core-item">
            <span>{placement.label}</span>
            <strong>{placement.position}</strong>
            <small>{placement.role}</small>
          </article>
        ))}
      </section>

      <section className="report-product-overview-block" aria-labelledby="report-primary-patterns-title">
        <div className="report-product-section-heading">
          <span className="section-label">سه الگوی اصلی</span>
          <h2 id="report-primary-patterns-title">اول این سه چیز را نگه دار</h2>
          <p>این کارت‌ها اشارهٔ کوتاه‌اند؛ توضیح کامل هر الگو فقط در فصل صاحب آن می‌آید.</p>
        </div>
        <div className="report-product-pattern-grid">
          {readingContract.primaryPatterns.map((pattern, index) => (
            <article className="report-product-pattern-card" key={pattern.id}>
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <h3>{pattern.title}</h3>
              <p>{pattern.summary}</p>
              {pattern.evidence.length > 0 ? (
                <small>{pattern.evidence.join(" · ")}</small>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="report-product-strength-challenge" aria-label="نقطه قوت و چالش اصلی">
        <article className="report-product-value-card is-strength">
          <span className="section-label">{readingContract.primaryStrength.title}</span>
          <p>{readingContract.primaryStrength.body}</p>
        </article>
        <article className="report-product-value-card is-challenge">
          <span className="section-label">{readingContract.primaryChallenge.title}</span>
          <p>{readingContract.primaryChallenge.body}</p>
        </article>
      </section>

      <blockquote className="report-product-saveable-sentence">
        <span>جمله‌ای برای نگه‌داشتن</span>
        <p>{readingContract.saveableSentence}</p>
      </blockquote>

      <section className="report-product-reading-path" aria-labelledby="report-reading-path-title">
        <div>
          <span className="section-label">مسیر پیشنهادی خواندن</span>
          <h2 id="report-reading-path-title">لازم نیست همه‌چیز را یک‌باره بخوانی</h2>
        </div>
        <ol>
          {readingContract.recommendedReadingPath.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      {overviewChapter ? (
        <ReportChapterAccordion chapter={overviewChapter} defaultOpen />
      ) : null}

      <section className="report-product-section" id="inner-world">
        <div className="report-product-section-heading">
          <span className="section-label">دنیای درونی</span>
          <h2>احساسات، امنیت، ذهن و زبان</h2>
          <p>این دو فصل نشان می‌دهند چه چیزی آرامت می‌کند و چطور تجربه را به کلمه و تصمیم تبدیل می‌کنی.</p>
        </div>
        <div className="report-product-chapter-list">
          {innerWorldChapters.map((chapter, index) => (
            <ReportChapterAccordion chapter={chapter} defaultOpen={index === 0} key={chapter.id} />
          ))}
        </div>
      </section>

      <section className="report-product-section" id="relationships">
        <div className="report-product-section-heading">
          <span className="section-label">رابطه‌ها</span>
          <h2>نزدیکی، گفت‌وگو، مرز و ترمیم</h2>
          <p>این بخش پروفایل رابطه در یک چارت است؛ مقایسهٔ دو نفر یا حکم دربارهٔ سرنوشت رابطه نیست.</p>
        </div>
        <div className="report-product-chapter-list">
          {relationshipChapters.map((chapter) => (
            <ReportChapterAccordion chapter={chapter} defaultOpen key={chapter.id} />
          ))}
        </div>
        <ReportAspectRelationshipSections report={report} />
      </section>

      <section className="report-product-section" id="growth-path">
        <div className="report-product-section-heading">
          <span className="section-label">مسیر رشد</span>
          <h2>اراده، جهت و الگوهای تکرارشونده</h2>
          <p>این فصل‌ها گزارش را از توصیف به انتخاب‌های کوچک و قابل مشاهده وصل می‌کنند.</p>
        </div>
        <div className="report-product-chapter-list">
          {growthChapters.map((chapter, index) => (
            <ReportChapterAccordion chapter={chapter} defaultOpen={index === 0} key={chapter.id} />
          ))}
        </div>

        <section className="report-product-growth-axis" aria-label="محور رشد">
          <div className="report-product-axis-point is-familiar">
            <span>الگوی آشنا</span>
            <strong>{readingContract.growthAxis.familiarPattern}</strong>
          </div>
          <div className="report-product-axis-arrow" aria-hidden="true">←</div>
          <div className="report-product-axis-point is-growth">
            <span>جهت رشد</span>
            <strong>{readingContract.growthAxis.growthDirection}</strong>
          </div>
          <p>{readingContract.growthAxis.bridge}</p>
        </section>

        <ReportSpecialPointsNarrativeSection report={report} showNodes={false} />

        <section className="report-product-weekly-actions" aria-labelledby="report-weekly-actions-title">
          <div className="report-product-section-heading compact">
            <span className="section-label">سه کار این هفته</span>
            <h3 id="report-weekly-actions-title">فقط یکی را انتخاب کن و ادامه بده</h3>
          </div>
          <div className="report-product-weekly-grid">
            {readingContract.weeklyActions.map((action, index) => (
              <article key={action}>
                <span>{(index + 1).toLocaleString("fa-IR")}</span>
                <p>{action}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <details className="report-product-limitations">
        <summary>محدودیت‌ها و شیوهٔ درست خواندن گزارش</summary>
        <ul>
          {readingContract.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        <p>{enhancedReport.reportV3Disclaimer}</p>
      </details>
    </div>
  );
}

function ReportChapterAccordion({
  chapter,
  defaultOpen = false,
}: {
  chapter: LiveReportThemeChapter;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="report-product-chapter"
      data-report-theme-chapter={chapter.id}
      open={defaultOpen}
    >
      <summary>
        <span>
          <strong>{chapter.title}</strong>
          <small>{chapter.summary}</small>
        </span>
        <span aria-hidden="true">+</span>
      </summary>
      <div className="report-product-chapter-body">
        {chapter.relationshipGroups ? (
          <div className="report-product-relationship-grid">
            {chapter.relationshipGroups.map((group) => (
              <article key={group.id}>
                <h3>{group.title}</h3>
                {group.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </article>
            ))}
          </div>
        ) : (
          chapter.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
        )}
        {chapter.reflection ? (
          <p className="report-product-reflection">
            <strong>برای مکث:</strong> {chapter.reflection}
          </p>
        ) : null}
      </div>
    </details>
  );
}
