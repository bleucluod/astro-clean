"use client";

import { useMemo } from "react";
import { ReportAspectRelationshipSections } from "@/components/ReportAspectRelationshipSections";
import {
  buildHumanFirstBirthReading,
  humanizeVisibleText,
  type HumanFirstBirthChapter,
} from "@/lib/report-output/human-first-report-reading";
import {
  buildLiveReportReadingContract,
  type LiveReportReadingContract,
} from "@/lib/report-output/live-report-reading-contract";
import { enhanceReportOutputV3 } from "@/lib/report-output/report-v3";
import type { HumanFirstNarrativeBlock } from "@/types/human-first-reading";
import type { AstrologyReport } from "@/types/astro";
import styles from "@/components/report/human-first-report.module.css";

type ReportV3ExperienceProps = {
  report: AstrologyReport;
  readingContract?: LiveReportReadingContract;
};

export function ReportV3Experience({
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

  return (
    <div
      className={styles.natalReading}
      data-report-product-quality="human-first-birth-report"
    >
      <section className={styles.hero} id="overview">
        <p className={styles.eyebrow}>داستان کلی چارت</p>
        <h1>
          {name
            ? `${name}؛ این چارت از چه داستانی می‌گوید؟`
            : "این چارت از چه داستانی می‌گوید؟"}
        </h1>
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
          eyebrow="سه الگوی اصلی"
          id="birth-primary-patterns-title"
          title="سه الگویی که بیشتر از همه در تو تکرار می‌شوند"
          description="هر کدام را کامل بخوان و بعد سراغ الگوی بعدی برو؛ قرار نیست سه روایت فشرده را هم‌زمان کنار هم نگه داری."
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

      <HumanChapter chapter={reading.innerWorld} eyebrow="دنیای درونی" />
      <HumanChapter chapter={reading.mindLanguage} eyebrow="فکر و بیان" />
      <HumanChapter chapter={reading.relationships} eyebrow="رابطه‌ها" />
      <HumanChapter chapter={reading.driveDirection} eyebrow="حرکت و جهت" />

      <section
        className={styles.section}
        id="friction-repair"
        aria-labelledby="birth-friction-repair-title"
      >
        <SectionHeading
          description={reading.frictionRepair.introduction}
          eyebrow="وقتی گیر می‌کنی"
          id="birth-friction-repair-title"
          title={reading.frictionRepair.title}
        />
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
          eyebrow="مسیر رشد"
          id="birth-growth-title"
          title={reading.growthPath.title}
        />
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
          eyebrow="برای وقتی که می‌خواهی عمیق‌تر بروی"
          id="birth-deeper-layers-title"
          title="لایه‌هایی که بعد از تصویر کلی معنای بیشتری پیدا می‌کنند"
          description="این بخش‌ها قرار نیست همان حرف‌ها را دوباره تکرار کنند؛ هر کدام زاویه تازه‌ای به داستان چارت اضافه می‌کنند."
        />

        {reading.deeperLayers.length > 0 ? (
          <div className={styles.deepDiveList}>
            {reading.deeperLayers.map((section) => (
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

function BirthPattern({
  pattern,
  index,
}: {
  pattern: HumanFirstNarrativeBlock;
  index: number;
}) {
  return (
    <article className={styles.patternStory}>
      <span className={styles.patternNumber}>
        {(index + 1).toLocaleString("fa-IR")}
      </span>
      <div className={styles.patternContent}>
        <h3>{pattern.title}</h3>
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

function HumanChapter({
  chapter,
  eyebrow,
}: {
  chapter: HumanFirstBirthChapter;
  eyebrow: string;
}) {
  return (
    <section
      className={styles.section}
      id={chapter.id}
      aria-labelledby={`${chapter.id}-title`}
    >
      <SectionHeading
        description={chapter.introduction}
        eyebrow={eyebrow}
        id={`${chapter.id}-title`}
        title={chapter.title}
      />
      <ChapterBody chapter={chapter} />
    </section>
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
      <summary>از کجای چارت می‌آید؟</summary>
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
