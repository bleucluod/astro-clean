"use client";

import { useMemo } from "react";
import {
  assertAdaptiveAnchorIntegrity,
  buildAdaptiveReportPlan,
  normalizeAdaptiveActionKey,
  type AdaptiveNarrativeAnchor,
  type AdaptiveNarrativeEvidence,
  type AdaptivePlacementStory,
} from "@/lib/astrology/adaptive-report-planner";
import type { AstrologyReport } from "@/types/astro";

import styles from "./human-first-report.module.css";

type Props = {
  report: AstrologyReport;
};

function EvidenceDisclosure({
  evidence,
  reasons = [],
}: {
  evidence: AdaptiveNarrativeEvidence[];
  reasons?: string[];
}) {
  if (evidence.length === 0 && reasons.length === 0) return null;

  return (
    <details className={styles.adaptiveEvidence} data-adaptive-evidence>
      <summary>چرا این نتیجه؟</summary>
      {reasons.length > 0 ? (
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {evidence.length > 0 ? (
        <dl>
          {evidence.map((item) => (
            <div key={item.id} data-adaptive-evidence-source={item.sourceIds.join(",")}>
              <dt>{item.label}</dt>
              <dd>{item.detail}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </details>
  );
}

function StoryCard({ story, index, showAction }: { story: AdaptiveNarrativeAnchor; index: number; showAction: boolean }) {
  return (
    <article
      className={styles.adaptiveStoryCard}
      data-adaptive-anchor-id={story.anchorId}
      data-adaptive-anchor-kind={story.kind}
      data-adaptive-semantic-key={story.semanticKey}
    >
      <span className={styles.adaptiveIndex}>{(index + 1).toLocaleString("fa-IR")}</span>
      <div className={styles.adaptiveStoryBody}>
        <h3>{story.title}</h3>
        <p className={styles.adaptiveLead}>{story.summary}</p>
        {story.dailyLife ? (
          <div className={styles.adaptiveLivedBlock}>
            <strong>در زندگی واقعی</strong>
            <p>{story.dailyLife}</p>
          </div>
        ) : null}
        <div className={styles.adaptiveTwoColumn}>
          {story.healthyExpression ? (
            <div>
              <strong>وقتی خوب کار می‌کند</strong>
              <p>{story.healthyExpression}</p>
            </div>
          ) : null}
          {story.friction ? (
            <div>
              <strong>جایی که ممکن است گیر کند</strong>
              <p>{story.friction}</p>
            </div>
          ) : null}
        </div>
        {story.action && showAction ? (
          <p className={styles.adaptiveActionLine}>
            <strong>این هفته امتحان کن</strong>
            {story.action}
          </p>
        ) : null}
        <EvidenceDisclosure evidence={story.evidenceRefs} reasons={story.rankingReasons} />
      </div>
    </article>
  );
}

function PlacementCard({
  story,
  condensed = false,
  showAction = true,
}: {
  story: AdaptivePlacementStory;
  condensed?: boolean;
  showAction?: boolean;
}) {
  const { interpretation } = story;
  return (
    <article className={styles.adaptivePlacementCard} data-adaptive-placement={story.planetId}>
      <header>
        <div>
          <h3>{story.planetLabel}</h3>
          <p>
            {story.signLabel}
            {story.houseNumber ? ` · خانه ${story.houseNumber.toLocaleString("fa-IR")}` : ""}
            {story.retrograde ? " · پس‌رو" : ""}
          </p>
        </div>
      </header>
      {interpretation.dailyLifeExample ? <p>{interpretation.dailyLifeExample}</p> : null}
      {!condensed && story.importance !== "compact" && interpretation.healthyExpression ? (
        <p>
          <strong>توان سالم: </strong>
          {interpretation.healthyExpression}
        </p>
      ) : null}
      {!condensed && story.importance !== "compact" && interpretation.possibleFriction ? (
        <p>
          <strong>گیر محتمل: </strong>
          {interpretation.possibleFriction}
        </p>
      ) : null}
      {interpretation.smallExperiment && showAction ? (
        <p className={styles.adaptiveActionLine}>
          <strong>حرکت کوچک</strong>
          {interpretation.smallExperiment}
        </p>
      ) : null}
    </article>
  );
}

function modeCopy(mode: ReturnType<typeof buildAdaptiveReportPlan>["mode"]) {
  switch (mode) {
    case "cluster-led":
      return "این چارت بیشتر با یک تمرکز چندسیاره‌ای فهمیده می‌شود؛ اول همان سیستم را می‌خوانیم و بعد جزئیات را.";
    case "tension-led":
      return "یک رابطه یا الگوی فشرده بیشترین وزن روایی را دارد؛ اول رفتار آن را می‌بینی، بعد داده نجومی‌اش را.";
    case "axis-led":
      return "یک محور رفتاری تکرارشونده در این چارت مهم‌تر از فهرست‌کردن تک‌تک سیاره‌هاست.";
    case "ruler-led":
      return "سیاره راهبر چند بخش مهم چارت را به هم وصل می‌کند و برای همین در خوانش وزن بیشتری گرفته است.";
    default:
      return "این چارت بیشتر با توان‌های اصلی و تماس‌های نزدیکش فهمیده می‌شود؛ لازم نیست برای عمیق بودن حتماً یک بحران مرکزی داشته باشد.";
  }
}

export function ReportAdaptiveNarrative({ report }: Props) {
  const plan = useMemo(() => {
    const nextPlan = buildAdaptiveReportPlan(report);
    if (process.env.NODE_ENV !== "production") assertAdaptiveAnchorIntegrity(nextPlan);
    return nextPlan;
  }, [report]);

  // HALLEUS_REPORT_SEMANTIC_FINAL_QA_R18_20260808
  const rulerPlacement = plan.placementStories.find((story) => story.planetId === plan.chartRulerId);
  const hasRulerTopStory = plan.topStories.some((story) => story.kind === "ruler-story");
  const topStoryPlanetIds = useMemo(
    () => new Set(plan.topStories.filter((story) => story.kind === "planet").flatMap((story) => story.sourcePlanetIds)),
    [plan],
  );
  const weeklyActionKeys = useMemo(
    () => new Set(plan.weeklyActions.map(normalizeAdaptiveActionKey).filter(Boolean)),
    [plan],
  );
  const inlineActionFrequency = useMemo(() => {
    const values = [
      ...plan.topStories.map((story) => story.action),
      ...plan.importantAspects.map((story) => story.action),
      ...(plan.nodeStory ? [plan.nodeStory.experiment] : []),
      plan.balanceStory.action,
      ...plan.bigThree.map((story) => story.interpretation.smallExperiment),
      ...plan.placementStories.map((story) => story.interpretation.smallExperiment),
    ];
    const frequency = new Map<string, number>();
    for (const value of values) {
      const key = normalizeAdaptiveActionKey(value);
      if (!key) continue;
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
    return frequency;
  }, [plan]);
  const showInlineAction = (value: string) => {
    const key = normalizeAdaptiveActionKey(value);
    return Boolean(key) && !weeklyActionKeys.has(key) && (inlineActionFrequency.get(key) ?? 0) === 1;
  };

  return (
    <div
      className={styles.adaptiveNarrative}
      data-adaptive-report-plan={plan.version}
      data-adaptive-report-mode={plan.mode}
      data-adaptive-audience-mode={plan.audienceMode}
    >
      <section className={styles.adaptiveHero} id="overview" data-adaptive-report-section="overview" data-screenshot-ready>
        <p className={styles.eyebrow}>خلاصه</p>
        <h1>{report.input.name?.trim() ? `${report.input.name.trim()}؛ مهم‌ترین داستان‌های این چارت` : "مهم‌ترین داستان‌های این چارت"}</h1>
        <p>{modeCopy(plan.mode)}</p>
        <div className={styles.adaptiveMetaRow}>
          <span>زمان تقریبی مطالعه: {plan.readingMinutes.toLocaleString("fa-IR")} دقیقه</span>
          <span>{plan.topStories.length.toLocaleString("fa-IR")} داستان اصلی</span>
        </div>
      </section>

      <section className={styles.adaptiveSection} id="inner-world" data-adaptive-report-section="big-three">
        <header className={styles.adaptiveSectionHeader}>
          <p className={styles.eyebrow}>برای شروع</p>
          <h2>خورشید، ماه و رایزینگ</h2>
          <p>این سه جایگاه جهت اولیه را می‌دهند؛ بعدتر می‌بینی کدام‌یک در همین چارت واقعاً وزن بیشتری گرفته و کجا خودش را در زندگی نشان می‌دهد.</p>
        </header>
        <div className={styles.adaptivePlacementGrid}>
          {plan.bigThree.map((story) => (
            <PlacementCard
              key={story.planetId}
              story={story}
              condensed={topStoryPlanetIds.has(story.planetId)}
              showAction={showInlineAction(story.interpretation.smallExperiment)}
            />
          ))}
        </div>
        <div className={styles.adaptiveRulerStrip} data-adaptive-ruler={plan.chartRulerId}>
          <div>
            <span className={styles.eyebrow}>سیاره راهبر</span>
            <strong>{plan.chartRulerLabel}</strong>
          </div>
          <p>
            در زبان فنی، این همان حاکم سنتی طالع است. {hasRulerTopStory ? "در این چارت شواهد کافی داشته که خودش یکی از داستان‌های اصلی شود." : "اینجا فقط به‌عنوان قطب‌نما نگهش می‌داریم و آن را به زور به یک فصل بلند تبدیل نمی‌کنیم."}
          </p>
          {!hasRulerTopStory && rulerPlacement ? (
            <details>
              <summary>جایگاه راهبر را ببین</summary>
              <p>{rulerPlacement.interpretation.dailyLifeExample}</p>
            </details>
          ) : null}
        </div>
      </section>

      {plan.topStories.length > 0 ? (
        <section className={styles.adaptiveSection} id="primary-patterns" data-adaptive-report-section="top-stories">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>بیشترین وزن در همین چارت</p>
            <h2>مهم‌ترین الگوهای این چارت</h2>
            <p>این‌ها موضوع‌هایی هستند که چند شاهد واقعی چارت روی آن‌ها هم‌زمان تأکید می‌کنند. جزئیات نجومی هر داستان را فقط اگر خواستی باز کن.</p>
          </header>
          <div className={styles.adaptiveStoryList}>
            {plan.topStories.map((story, index) => (
              <StoryCard key={story.anchorId} story={story} index={index} showAction={showInlineAction(story.action)} />
            ))}
          </div>
        </section>
      ) : null}

      {plan.importantHouses.length > 0 ? (
        <section className={styles.adaptiveSection} id="mind-language" data-adaptive-report-section="important-houses">
          <header className={styles.adaptiveSectionHeader}>
            <p className={styles.eyebrow}>کجا بیشتر اتفاق می‌افتد؟</p>
            <h2>خانه‌های مهم</h2>
            <p>فقط حوزه‌هایی آمده‌اند که در همین چارت چند نشانه مهم به آن‌ها می‌رسند؛ برای هر کدام یک موقعیت روزمره هم می‌بینی.</p>
          </header>
          <div className={styles.adaptiveHouseGrid}>
            {plan.importantHouses.map((house) => (
              <article key={house.houseNumber} className={styles.adaptiveHouseCard} data-adaptive-house={house.houseNumber}>
                <h3>خانه {house.houseNumber.toLocaleString("fa-IR")}: {house.label}</h3>
                <p>{house.reason}</p>
                {house.livedExample ? <p className={styles.adaptiveLivedExample}>{house.livedExample}</p> : null}
                <EvidenceDisclosure evidence={house.evidence} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {plan.importantAspects.length > 0 ? (
        <section className={styles.adaptiveSection} id="relationships" data-adaptive-report-section="important-aspects">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>وقتی دو بخش چارت با هم فعال می‌شوند</p>
            <h2>رابطه‌های مهم</h2>
            <p>اول رفتار قابل لمس را می‌خوانی؛ نام جنبه، اورب و جزئیات فنی در همان کارت و در بخش بازشونده می‌مانند.</p>
          </header>
          <div className={styles.adaptiveAspectList}>
            {plan.importantAspects.map((story) => (
              <article key={story.aspect.id} className={styles.adaptiveAspectCard} data-adaptive-aspect-id={story.aspect.id}>
                <h3>{story.title}</h3>
                {story.dailyLife ? <p>{story.dailyLife}</p> : null}
                <div className={styles.adaptiveTwoColumn}>
                  {story.healthy ? (
                    <div><strong>وقتی خوب کار می‌کند</strong><p>{story.healthy}</p></div>
                  ) : null}
                  {story.friction ? (
                    <div><strong>جایی که گیر می‌کند</strong><p>{story.friction}</p></div>
                  ) : null}
                </div>
                {story.action && showInlineAction(story.action) ? <p className={styles.adaptiveActionLine}><strong>این هفته امتحان کن</strong>{story.action}</p> : null}
                <EvidenceDisclosure evidence={story.evidence} reasons={[`${story.aspect.aspectLabel} · اورب ${story.aspect.orb.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}°`]} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {plan.nodeStory ? (
        <section className={styles.adaptiveSection} id="growth-path" data-adaptive-report-section="lunar-node-axis">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>الگوی آشنا، انتخاب تازه</p>
            <h2>دست‌های ماه</h2>
            <p>این بخش حکم سرنوشت نیست. فقط نشان می‌دهد در فشار کدام رفتار آشناتر است و چه رفتار دیگری را می‌شود عمداً تمرین کرد.</p>
          </header>
          <article className={styles.adaptiveNodeCard}>
            <div><strong>در فشار، راه آشناتر</strong><p>{plan.nodeStory.familiarBehavior}</p></div>
            <div><strong>توان مفید همان راه</strong><p>{plan.nodeStory.usefulSkill}</p></div>
            <div><strong>وقتی زیادی به آن تکیه می‌کنی</strong><p>{plan.nodeStory.overuse}</p></div>
            <div><strong>انتخاب تازه‌تر</strong><p>{plan.nodeStory.freshBehavior}</p></div>
            {showInlineAction(plan.nodeStory.experiment) ? <p className={styles.adaptiveActionLine}><strong>این هفته امتحان کن</strong>{plan.nodeStory.experiment}</p> : null}
            <p className={styles.adaptiveConfidence}>{plan.nodeStory.confidence}</p>
            <EvidenceDisclosure evidence={plan.nodeStory.evidence} />
          </article>
        </section>
      ) : null}

      <section className={styles.adaptiveSection} id="strength-challenge" data-adaptive-report-section="balance">
        <header className={styles.adaptiveSectionHeader}>
          <p className={styles.eyebrow}>نه فقط شمارش</p>
          <h2>ترکیب انرژی‌ها</h2>
        </header>
        <article className={styles.adaptiveBalanceCard}>
          {plan.balanceStory.title !== "ترکیب انرژی‌ها" ? <h3>{plan.balanceStory.title}</h3> : null}
          <p>{plan.balanceStory.body}</p>
          {plan.balanceStory.action && showInlineAction(plan.balanceStory.action) ? <p className={styles.adaptiveActionLine}><strong>کاربرد عملی</strong>{plan.balanceStory.action}</p> : null}
        </article>
      </section>

      {plan.weeklyActions.length > 0 ? (
        <section className={styles.adaptiveSection} id="drive-direction" data-adaptive-report-section="weekly-actions">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>از خواندن به عمل</p>
            <h2>سه کار برای این هفته</h2>
            <p>سه حرکت از سه حوزه متفاوت انتخاب شده‌اند تا گزارش به یک فهرست تمرین تکراری تبدیل نشود.</p>
          </header>
          <ol className={styles.adaptiveWeeklyActions}>
            {plan.weeklyActions.map((action) => <li key={action}>{action}</li>)}
          </ol>
        </section>
      ) : null}

      {plan.placementStories.length > 0 ? (
        <section className={styles.adaptiveSection} id="deeper-layers" data-adaptive-report-section="placements">
          <header className={styles.adaptiveSectionHeader}>
            <p className={styles.eyebrow}>برای جزئیات بیشتر</p>
            <h2>سیاره‌ها در زندگی روزمره</h2>
            <p>سیاره‌هایی که در داستان‌های اصلی نقش بیشتری دارند عمق بیشتری گرفته‌اند؛ بقیه کوتاه‌تر می‌مانند و بخش فنی پایین صفحه همچنان کامل است.</p>
          </header>
          <div className={styles.adaptivePlacementGrid}>
            {plan.placementStories.map((story) => (
              <PlacementCard
                key={story.planetId}
                story={story}
                condensed={topStoryPlanetIds.has(story.planetId)}
                showAction={showInlineAction(story.interpretation.smallExperiment)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
