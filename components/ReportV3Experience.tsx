"use client";

import { ReportAdaptiveNarrative } from "@/components/report/ReportAdaptiveNarrative";

import { useEffect, useMemo } from "react";
import { ReportAspectRelationshipSections } from "@/components/ReportAspectRelationshipSections";
import { ReportPersonalPlanetChapters } from "@/components/report/ReportPersonalPlanetChapters";
import { ReportWholeChartSynthesis } from "@/components/report/ReportWholeChartSynthesis";
import {
  buildHumanFirstBirthReading,
  humanizeVisibleText,
  type HumanFirstBirthChapter,
} from "@/lib/report-output/human-first-report-reading";
import {
  buildLiveReportReadingContract,
  type LiveReportReadingContract,
  type ReportCorePlacement,
} from "@/lib/report-output/live-report-reading-contract";
import { enhanceReportOutputV3 } from "@/lib/report-output/report-v3";
import type {
  HumanFirstEvidence,
  HumanFirstNarrativeBlock,
} from "@/types/human-first-reading";
import type { AstrologyReport } from "@/types/astro";
import styles from "@/components/report/human-first-report.module.css";

type ReportV3ExperienceProps = {
  report: AstrologyReport;
  readingContract?: LiveReportReadingContract;
};

export function ReportV3Experience(props: ReportV3ExperienceProps) {
  if ((props.report.realEngine?.placements?.length ?? 0) > 0) {
    return <ReportAdaptiveNarrative report={props.report} />;
  }

  return <LegacyReportV3Experience {...props} />;
}

// HALLEUS_REPORT_ADAPTIVE_V3_COMPATIBILITY_20260808

function LegacyReportV3Experience({
  report,
  readingContract: suppliedContract,
}: ReportV3ExperienceProps) {
  const contract = useMemo(
    () => suppliedContract ?? buildLiveReportReadingContract(report),
    [report, suppliedContract],
  );
  const reading = useMemo(
    () => buildHumanFirstBirthReading(contract),
    [contract],
  );
  const enhancedReport = useMemo(
    () => enhanceReportOutputV3(report as unknown as Record<string, unknown>),
    [report],
  );

  const name = contract.displayName === "تو" ? "" : contract.displayName;

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      '[data-report-product-reader="human-first-report-experience"]',
    );
    if (!root) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reading-motion-focus]"),
    );
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const storageKey = `halleus:report-reading-focus:${report.id}`;
    const activate = (target: HTMLElement) => {
      for (const item of targets) {
        if (item === target) {
          item.setAttribute("data-reading-motion-active", "true");
        } else {
          item.removeAttribute("data-reading-motion-active");
        }
      }
      const focus = target.dataset.readingMotionFocus;
      if (!focus) return;
      try {
        window.sessionStorage.setItem(storageKey, focus);
      } catch {
        // Reading motion is optional; storage failure never blocks the report.
      }
      window.dispatchEvent(
        new CustomEvent("halleus:report-reading-focus", {
          detail: { reportId: report.id, focus },
        }),
      );
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        if (visible instanceof IntersectionObserverEntry) {
          activate(visible.target as HTMLElement);
        }
      },
      { rootMargin: "-18% 0px -58% 0px", threshold: [0.12, 0.35, 0.62] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [report.id]); // HALLEUS_REPORT_CHAPTER_FOCUS_BATCH8_20260807

  const moonPlacement = contract.corePlacements.find(
    (placement) => placement.id === "moon",
  );
  const coreQuestion = contract.hasReliableBirthTime
    ? "خورشید، ماه و طالع این چارت چه می‌گویند؟"
    : "خورشید و ماه این چارت چه می‌گویند؟";

  return (
    <div
      className={styles.natalReading}
      data-report-product-quality="human-first-birth-report"
      data-report-content-architecture="HALLEUS_REPORT_ASTROLOGY_FIRST_20260806"
    >
      <section
        className={styles.hero}
        data-report-astrology-first="sun-moon-rising-signature"
        data-reading-motion-card
        data-reading-motion-focus="overview"
        id="overview"
      >
        <p className={styles.eyebrow}>امضای نجومی چارت</p>
        <h1>{name ? `${name}؛ ${coreQuestion}` : coreQuestion}</h1>
        <CorePlacementSignature
          hasReliableBirthTime={contract.hasReliableBirthTime}
          placements={contract.corePlacements}
          signature={contract.chartSignature}
        />
        <div className={styles.opening}>
          {reading.opening.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section
        className={styles.section}
        id="primary-patterns"
        aria-labelledby="birth-primary-patterns-title"
      >
        <SectionHeading
          eyebrow="سه الگوی اصلی چارت"
          id="birth-primary-patterns-title"
          title="امضاهای نجومی که این چارت را متمایز می‌کنند"
          description="این سه الگو از جایگاه‌ها و تماس‌های برجسته همین چارت انتخاب شده‌اند؛ متن انسانی هر بخش را بخوان و پشتوانه نجومی آن را همان‌جا ببین."
        />
        <div className={styles.patternList}>
          {reading.primaryPatterns.map((pattern, index) => (
            <BirthPattern
              index={index}
              key={pattern.id}
              pattern={pattern}
            />
          ))}
        </div>
      </section>

      <section
        className={styles.section}
        id="strength-challenge"
        aria-labelledby="birth-strength-challenge-title"
      >
        <SectionHeading
          eyebrow="دو روی یک الگو"
          id="birth-strength-challenge-title"
          title="وقتی روی فرم خودتی، و وقتی فشار بالا می‌رود"
        />
        <div className={styles.valueFlow}>
          <article data-kind="strength">
            <span>وقتی روی فرم خودتی</span>
            <p>{humanizeVisibleText(contract.primaryStrength.body)}</p>
          </article>
          <article data-kind="challenge">
            <span>وقتی تحت فشار می‌ری</span>
            <p>{humanizeVisibleText(contract.primaryChallenge.body)}</p>
          </article>
        </div>

        <blockquote
          className={`${styles.saveableSentence} report-product-saveable-sentence`}
        >
          <header>
            <span>یک جمله برای این روزها</span>
          </header>
          <p>{humanizeVisibleText(contract.saveableSentence)}</p>
        </blockquote>
      </section>

      <ReportPersonalPlanetChapters profile={contract.personalPlanetChapters} />
      <ReportWholeChartSynthesis profile={contract.wholeChartSynthesis} />

      <section
        className={styles.section}
        id="friction-repair"
        aria-labelledby="birth-friction-repair-title"
      >
        <SectionHeading
          description={reading.frictionRepair.introduction}
          eyebrow="جنبه‌های شاخص"
          id="birth-friction-repair-title"
          title={reading.frictionRepair.title}
        />
        <AstrologySourceLine evidence={reading.frictionRepair.evidence} />
        <ChapterBody chapter={reading.frictionRepair} />
        <div className={styles.aspectShell}>
          <ReportAspectRelationshipSections report={report} />
        </div>
      </section>

      <section
        className={styles.section}
        id="growth-path"
        aria-labelledby="birth-growth-title"
      >
        <SectionHeading
          description={reading.growthPath.introduction}
          eyebrow="محور گره‌های ماه"
          id="birth-growth-title"
          title={reading.growthPath.title}
        />
        <AstrologySourceLine evidence={reading.growthPath.evidence} />
        <ChapterBody chapter={reading.growthPath} />

        <section className={styles.growthAxis} aria-label="محور رشد شخصی">
          <div className={styles.growthPoint}>
            <span>راهی که آشناتر است</span>
            <strong>{humanizeVisibleText(contract.growthAxis.familiarPattern)}</strong>
          </div>
          <div className={styles.growthArrow} aria-hidden="true">←</div>
          <div className={styles.growthPoint}>
            <span>انتخابی که می‌تواند تازه‌تر باشد</span>
            <strong>{humanizeVisibleText(contract.growthAxis.growthDirection)}</strong>
          </div>
          <p>{humanizeVisibleText(contract.growthAxis.bridge)}</p>
        </section>
      </section>

      <section
        className={styles.section}
        id="deeper-layers"
        aria-labelledby="birth-deeper-layers-title"
      >
        <SectionHeading
          eyebrow="لایه‌های تکمیلی چارت"
          id="birth-deeper-layers-title"
          title="حاکم چارت، خانه‌ها، تعادل انرژی و محورهای عمیق‌تر"
          description="هر بخش یک منبع نجومی جدا را باز می‌کند؛ فقط لایه‌هایی نمایش داده می‌شوند که داده معتبرشان در همین گزارش وجود دارد."
        />

        {reading.deeperLayers.length > 0 ? (
          <div className={styles.deepDiveList}>
            {reading.deeperLayers
              .filter(
                (section) =>
                  ![
                    "whole-chart-story",
                    "chart-ruler-story",
                    "balance-story",
                    "active-houses-story",
                    "node-axis-story",
                    "human-first-signature-deeper-layer",
                  ].includes(section.id),
              )
              .map((section) => (
              <details className={styles.deepDive} key={section.id}>
                <summary>
                  <strong>{section.title}</strong>
                  <small>{section.summary}</small>
                </summary>
                <div className={styles.deepDiveBody}>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        ) : null}


        {reading.limitations.length > 0 ? (
          <details className={styles.limitationsDisclosure}>
            <summary>این گزارش را تا کجا می‌شود دقیق خواند؟</summary>
            <ul>
              {reading.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
            <p>{humanizeVisibleText(enhancedReport.reportV3Disclaimer)}</p>
          </details>
        ) : null}
      </section>
    </div>
  );
}

function CorePlacementSignature({
  placements,
  signature,
  hasReliableBirthTime,
}: {
  placements: ReportCorePlacement[];
  signature: LiveReportReadingContract["chartSignature"];
  hasReliableBirthTime: boolean;
}) {
  const visiblePlacements = placements.filter(
    (placement) => placement.id !== "rising" || hasReliableBirthTime,
  );

  if (visiblePlacements.length === 0) return null;

  return (
    <section
      aria-label="شناسنامه نجومی چارت"
      className={styles.astrologySignature}
    >
      <div className={styles.signatureSummary}>
        <span>ریتم غالب چارت</span>
        <strong>{signature.title}</strong>
        <p>{signature.body}</p>
      </div>

      <div className={styles.corePlacementGrid}>
        {visiblePlacements.map((placement) => (
          <article
            className={styles.corePlacementCard}
            data-placement={placement.id}
            key={placement.id}
          >
            <span>{placement.label}</span>
            <strong>{placement.position}</strong>
            <p>{placement.role}</p>
          </article>
        ))}
      </div>

      {!hasReliableBirthTime ? (
        <p className={styles.birthTimeCaveat}>
          چون ساعت تولد دقیق ثبت نشده، طالع و خانه‌ها در این بخش نمایش داده
          نمی‌شوند؛ خورشید و ماه همچنان مستقل از ساعت خوانده شده‌اند.
        </p>
      ) : null}
    </section>
  );
}

function AstrologySourceLine({
  evidence,
  placement,
}: {
  evidence: HumanFirstEvidence[];
  placement?: ReportCorePlacement;
}) {
  const visibleEvidence = evidence.find((item) => {
    if (!item.detail.trim()) return false;
    return !placement || !item.detail.includes(placement.position);
  });

  if (!placement && !visibleEvidence) return null;

  return (
    <div
      aria-label="پشتوانه نجومی این بخش"
      className={styles.astrologySourceLine}
    >
      <span>پشتوانه نجومی</span>
      <div>
        {placement ? (
          <p>
            <strong>{placement.label}:</strong> {placement.position}
          </p>
        ) : null}
        {visibleEvidence ? (
          <p>
            <strong>{visibleEvidence.label}:</strong>{" "}
            {visibleEvidence.detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}
function BirthPattern({
  pattern,
  index,
}: {
  pattern: HumanFirstNarrativeBlock;
  index: number;
}) {
  return (
    <article className={styles.patternStory} data-reading-motion-card>
      <span className={styles.patternNumber}>
        {(index + 1).toLocaleString("fa-IR")}
      </span>
      <div className={styles.patternContent}>
        <h3>{pattern.title}</h3>
        <AstrologySourceLine evidence={pattern.evidence} />
        <p>{pattern.humanExperience}</p>
        <p>{pattern.effect}</p>

        <div className={styles.patternMoments}>
          <p>
            <strong>بیشتر چه وقت خودش را نشان می‌دهد؟</strong>
            {pattern.dailySituation}
          </p>
          <p>
            <strong>وقتی خوب پیش می‌رود</strong>
            {pattern.strength}
          </p>
          <p>
            <strong>وقتی گیر می‌کند</strong>
            {pattern.challenge}
          </p>
        </div>

        <div className={styles.patternHelp}>
          <strong>یک راه کوچک برای تغییر این الگو</strong>
          <p>{pattern.practicalStep}</p>
        </div>
        <EvidenceDisclosure evidence={pattern.evidence} />
      </div>
    </article>
  );
}

function ChapterBody({ chapter }: { chapter: HumanFirstBirthChapter }) {
  return (
    <div className={styles.chapterMain}>
      <div className={styles.chapterParagraphs}>
        {chapter.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className={styles.practiceLine}>
        <strong>یک راه کوچک برای امتحان‌کردن</strong>
        <p>{chapter.practicalStep}</p>
      </div>
      <EvidenceDisclosure evidence={chapter.evidence} />
    </div>
  );
}

function EvidenceDisclosure({
  evidence,
}: {
  evidence: HumanFirstNarrativeBlock["evidence"];
}) {
  if (evidence.length === 0) return null;

  return (
    <details className={styles.evidenceDisclosure}>
      <summary>جزئیات نجومی این نتیجه</summary>
      <div className={styles.evidenceBody}>
        {evidence.map((item) => (
          <p key={item.id}>
            <strong>{item.label}:</strong> {item.detail}
          </p>
        ))}
      </div>
    </details>
  );
}

function SectionHeading({
  eyebrow,
  id,
  title,
  description,
}: {
  eyebrow: string;
  id: string;
  title: string;
  description?: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
