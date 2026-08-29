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
import { ProductLockedOffer } from "@/components/monetization/ProductAccessCards";
import {
  DEFAULT_REPORT_ACCESS_POLICY,
  getPlanetChapterAccess,
  isReportSectionFull,
  isReportSectionTeaser,
  type ReportAccessPolicy,
} from "@/lib/monetization/access-policy";
import type { AstrologyReport } from "@/types/astro";

import styles from "./human-first-report.module.css";

export type BirthReportAccessMode = "free" | "premium";

const PLANET_SYMBOLS: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
  asc: "ASC",
};

const STANDARD_ASPECT_LABELS: Record<string, string> = {
  conjunction: "مقارنه",
  sextile: "تسدیس",
  square: "مربع",
  trine: "تثلیث",
  opposition: "مقابله",
};

function splitAstrologyHeadline(value: string) {
  const separator = " — ";
  const at = value.indexOf(separator);
  if (at < 0) return { astrology: value, human: value };
  return {
    astrology: value.slice(0, at),
    human: value.slice(at + separator.length),
  };
}

type Props = {
  report: AstrologyReport;
  accessMode?: BirthReportAccessMode;
  accessPolicy?: ReportAccessPolicy;
  fullReportCredits?: number;
  onUnlockFullReport?: () => Promise<{ ok: boolean; error?: string }>;
};

function EvidenceDisclosure({
  evidence,
  reasons = [],
  compact = false,
}: {
  evidence: AdaptiveNarrativeEvidence[];
  reasons?: string[];
  compact?: boolean;
}) {
  if (evidence.length === 0 && reasons.length === 0) return null;
  const visibleEvidence = compact ? evidence.slice(0, 1) : evidence;
  const visibleReasons = compact ? reasons.slice(0, 1) : reasons;

  return (
    <details className={styles.adaptiveEvidence} data-adaptive-evidence>
      <summary>مبنای این برداشت</summary>
      {visibleReasons.length > 0 ? (
        <ul>
          {visibleReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {visibleEvidence.length > 0 ? (
        <dl>
          {visibleEvidence.map((item) => (
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

function StoryCard({ story, index, showAction, compactEvidence }: { story: AdaptiveNarrativeAnchor; index: number; showAction: boolean; compactEvidence: boolean }) {
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
              <strong>وقتی فشار بالا می‌رود</strong>
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
        <EvidenceDisclosure compact={compactEvidence} evidence={story.evidenceRefs} reasons={story.rankingReasons} />
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
          <h3>
            {`${PLANET_SYMBOLS[story.planetId] ?? ""} ${story.planetLabel}`.trim()} در {story.signLabel}
          </h3>
          <p>
            {story.houseNumber ? `خانه ${story.houseNumber.toLocaleString("fa-IR")}` : "بدون خانهٔ قابل اتکا"}
            {story.retrograde ? " · پس‌رو" : ""}
            {interpretation.focus ? ` · ${interpretation.focus}` : ""}
          </p>
        </div>
      </header>
      {interpretation.plainMeaning ? (
        <p className={styles.adaptiveLead}>{interpretation.plainMeaning}</p>
      ) : null}
      {interpretation.dailyLifeExample ? <p>{interpretation.dailyLifeExample}</p> : null}
      {!condensed && story.importance !== "compact" && interpretation.healthyExpression ? (
        <p>
          <strong>وقتی روی فرم است: </strong>
          {interpretation.healthyExpression}
        </p>
      ) : null}
      {!condensed && story.importance !== "compact" && interpretation.possibleFriction ? (
        <p>
          <strong>وقتی فشار بالا می‌رود: </strong>
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

export function ReportAdaptiveNarrative({
  report,
  accessMode = "free",
  accessPolicy = DEFAULT_REPORT_ACCESS_POLICY,
  fullReportCredits = 0,
  onUnlockFullReport,
}: Props) {
  const plan = useMemo(() => {
    const nextPlan = buildAdaptiveReportPlan(report);
    if (process.env.NODE_ENV !== "production") assertAdaptiveAnchorIntegrity(nextPlan);
    return nextPlan;
  }, [report]);

  const isPremium = accessMode === "premium";
  const visibleTopStories = isPremium
    ? plan.topStories
    : plan.topStories.slice(0, accessPolicy.topStoriesFreeCount);
  const visibleHouses = isPremium
    ? plan.importantHouses
    : plan.importantHouses.slice(0, accessPolicy.importantHousesFreeCount);
  const visibleAspects = isPremium
    ? plan.importantAspects
    : plan.importantAspects.slice(0, accessPolicy.importantAspectsFreeCount);
  const visibleWeeklyActions = isPremium
    ? plan.weeklyActions
    : plan.weeklyActions.slice(0, accessPolicy.weeklyActionsFreeCount);
  const nodeFull = isReportSectionFull(accessPolicy.nodeAxis, isPremium);
  const nodeTeaser = isReportSectionTeaser(accessPolicy.nodeAxis, isPremium);
  const balanceFull = isReportSectionFull(accessPolicy.energyBalance, isPremium);
  const balanceTeaser = isReportSectionTeaser(accessPolicy.energyBalance, isPremium);
  const visiblePlacementStories = isPremium
    ? plan.placementStories
    : plan.placementStories.filter(
        (story) => getPlanetChapterAccess(accessPolicy, story.planetId) !== "premium",
      );
  const compactEvidence =
    !isPremium && accessPolicy.evidence !== "full_free";
  const lockedPlacementLabels = plan.placementStories
    .filter(
      (story) =>
        !["sun", "moon"].includes(story.planetId) &&
        !isPremium &&
        getPlanetChapterAccess(accessPolicy, story.planetId) === "premium",
    )
    .map((story) => story.planetLabel);
  const lockedItems = [
    plan.topStories.length > visibleTopStories.length
      ? `${(plan.topStories.length - visibleTopStories.length).toLocaleString("fa-IR")} داستان اصلی دیگر`
      : "",
    plan.importantHouses.length > visibleHouses.length
      ? `${(plan.importantHouses.length - visibleHouses.length).toLocaleString("fa-IR")} خانهٔ برجستهٔ دیگر`
      : "",
    plan.importantAspects.length > visibleAspects.length
      ? `${(plan.importantAspects.length - visibleAspects.length).toLocaleString("fa-IR")} جنبهٔ مهم دیگر`
      : "",
    !nodeFull && plan.nodeStory ? "خوانش کامل محور رشد این چارت" : "",
    !balanceFull ? `خوانش کامل «${plan.balanceStory.title}»` : "",
    lockedPlacementLabels.length
      ? `فصل‌های عمیق‌تر: ${lockedPlacementLabels.slice(0, 6).join("، ")}${lockedPlacementLabels.length > 6 ? " و…" : ""}`
      : "",
    !isPremium &&
    (accessPolicy.technical.appendix === "premium" ||
      accessPolicy.technical.provenance === "premium")
      ? "جزئیات فنی و محاسبات کامل"
      : "",
  ].filter(Boolean);

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
    return isPremium && Boolean(key) && !weeklyActionKeys.has(key) && (inlineActionFrequency.get(key) ?? 0) === 1;
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

      {visibleTopStories.length > 0 ? (
          <div className={styles.adaptiveStoryList} data-adaptive-story-preview="three-headlines">
            {visibleTopStories.map((story, index) => (
              <article
                className={styles.adaptiveStoryCard}
                data-adaptive-preview-anchor={story.anchorId}
                key={`preview-${story.anchorId}`}
              >
                <span className={styles.adaptiveIndex}>{(index + 1).toLocaleString("fa-IR")}</span>
                <div className={styles.adaptiveStoryBody}>
                  <h3>{story.title}</h3>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className={styles.adaptiveSection} id="inner-world" data-adaptive-report-section="big-three">
        <header className={styles.adaptiveSectionHeader}>
          <p className={styles.eyebrow}>برای شروع</p>
          <h2>
            {plan.bigThree.some((story) => story.planetId === "asc")
              ? "خورشید، ماه، رایزینگ، عطارد، مریخ و زهره"
              : "خورشید، ماه، عطارد، مریخ و زهره"}
          </h2>
          <p>این جایگاه‌ها سریع‌ترین تصویر را از هویت، نیاز عاطفی، حضور، فکر، شیوه اقدام و سبک رابطه می‌دهند. هر کارت از جایگاه واقعی همین چارت شروع می‌شود، نه از توصیف عمومی نشان‌ها.</p>
        </header>
        <div className={styles.adaptivePlacementGrid}>
          {plan.bigThree.map((story) => (
            <PlacementCard
              key={story.planetId}
              story={story}
              condensed={topStoryPlanetIds.has(story.planetId) || (!isPremium && getPlanetChapterAccess(accessPolicy, story.planetId) === "teaser")}
              showAction={isPremium && showInlineAction(story.interpretation.smallExperiment)}
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

      {visiblePlacementStories.length > 0 ? (
        <section className={styles.adaptiveSection} id="deeper-layers" data-adaptive-report-section="placements">
          <header className={styles.adaptiveSectionHeader}>
            <p className={styles.eyebrow}>بعد از جایگاه‌های اصلی</p>
            <h2>سیاره‌ها در زندگی روزمره</h2>
            <p>سیاره‌هایی که در داستان‌های اصلی نقش بیشتری دارند عمق بیشتری گرفته‌اند؛ بقیه کوتاه‌تر می‌مانند و بخش فنی پایین صفحه همچنان کامل است.</p>
          </header>
          <div className={styles.adaptivePlacementGrid}>
            {visiblePlacementStories.map((story) => (
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
      {visibleTopStories.length > 0 ? (
        <section className={styles.adaptiveSection} id="primary-patterns" data-adaptive-report-section="top-stories">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>بیشترین وزن در همین چارت</p>
            <h2>مهم‌ترین الگوهای این چارت</h2>
            <p>این‌ها موضوع‌هایی هستند که چند شاهد واقعی چارت روی آن‌ها هم‌زمان تأکید می‌کنند. جزئیات نجومی هر داستان را فقط اگر خواستی باز کن.</p>
          </header>
          <div className={styles.adaptiveStoryList}>
            {visibleTopStories.map((story, index) => (
              <StoryCard compactEvidence={!isPremium} key={story.anchorId} story={story} index={index} showAction={showInlineAction(story.action)} />
            ))}
          </div>
        </section>
      ) : null}

      {visibleHouses.length > 0 ? (
        <section className={styles.adaptiveSection} id="mind-language" data-adaptive-report-section="important-houses">
          <header className={styles.adaptiveSectionHeader}>
            <p className={styles.eyebrow}>کجا بیشتر اتفاق می‌افتد؟</p>
            <h2>خانه‌های مهم</h2>
            <p>فقط حوزه‌هایی آمده‌اند که در همین چارت چند نشانه مهم به آن‌ها می‌رسند؛ برای هر کدام یک موقعیت روزمره هم می‌بینی.</p>
          </header>
          <div className={styles.adaptiveHouseGrid}>
            {visibleHouses.map((house) => (
              <article key={house.houseNumber} className={styles.adaptiveHouseCard} data-adaptive-house={house.houseNumber}>
                <p className={styles.eyebrow}>
                  خانه {house.houseNumber.toLocaleString("fa-IR")} · {house.label}
                </p>
                <p>{house.astrologyLabel}</p>
                <h3>{house.headline}</h3>
                <p>{house.synthesis}</p>
                {house.livedExample ? (
                  <p className={styles.adaptiveLivedExample}>
                    <strong>در زندگی واقعی: </strong>
                    {house.livedExample}
                  </p>
                ) : null}
                {house.pressure ? (
                  <div>
                    <strong>وقتی فشار بالا می‌رود</strong>
                    <p>{house.pressure}</p>
                  </div>
                ) : null}
                <EvidenceDisclosure compact={compactEvidence} evidence={house.evidence} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {visibleAspects.length > 0 ? (
        <section className={styles.adaptiveSection} id="relationships" data-adaptive-report-section="important-aspects">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>وقتی دو بخش چارت با هم فعال می‌شوند</p>
            <h2>رابطه‌های مهم</h2>
            <p>اول رفتار قابل لمس را می‌خوانی؛ نام جنبه، اورب و جزئیات فنی در همان کارت و در بخش بازشونده می‌مانند.</p>
          </header>
          <div className={styles.adaptiveAspectList}>
            {visibleAspects.map((story) => {
              const title = splitAstrologyHeadline(story.title);
              const aspectLabel =
                STANDARD_ASPECT_LABELS[story.aspect.aspectId] ?? story.aspect.aspectId;
              const angle = story.aspect.angle.toLocaleString("fa-IR");
              const orb = story.aspect.orb.toLocaleString("fa-IR", {
                maximumFractionDigits: 1,
              });
              return (
                <article key={story.aspect.id} className={styles.adaptiveAspectCard} data-adaptive-aspect-id={story.aspect.id}>
                  <p className={styles.eyebrow}>{title.astrology}</p>
                  <h3>{title.human}</h3>
                  <p>{aspectLabel} · {angle}° · اورب {orb}°</p>
                  {story.dailyLife ? <p>{story.dailyLife}</p> : null}
                  <div className={styles.adaptiveTwoColumn}>
                    {story.healthy ? (
                      <div><strong>وقتی خوب کار می‌کند</strong><p>{story.healthy}</p></div>
                    ) : null}
                    {story.friction ? (
                      <div><strong>وقتی فشار بالا می‌رود</strong><p>{story.friction}</p></div>
                    ) : null}
                  </div>
                  {story.action && showInlineAction(story.action) ? <p className={styles.adaptiveActionLine}><strong>این هفته امتحان کن</strong>{story.action}</p> : null}
                  <EvidenceDisclosure
                    compact={compactEvidence}
                    evidence={story.evidence}
                    reasons={[`${aspectLabel} ${angle}° · اورب ${orb}°`]}
                  />
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

            {!isPremium && lockedItems.length > 0 ? (
        <ProductLockedOffer
          productCode="full_report"
          title={accessPolicy.upgradeTitle ?? "ادامهٔ همین گزارش کامل"}
          description={
            accessPolicy.upgradeSupportSentence ??
            "نسخه رایگان پاسخ واقعی می‌دهد؛ یک اعتبار گزارش کامل فقط بخش‌هایی را باز می‌کند که با تنظیم فعلی هنوز قفل‌اند."
          }
          items={lockedItems}
          href="/pricing"
          availableCredits={fullReportCredits}
          onUnlock={onUnlockFullReport}
          unlockLabel={accessPolicy.upgradeCtaLabel}
        />
      ) : null}

      {nodeFull && plan.nodeStory ? (
        <section className={styles.adaptiveSection} id="growth-path" data-adaptive-report-section="lunar-node-axis">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>الگوی آشنا، انتخاب تازه</p>
            <h2>گره‌های ماه</h2>
            <p>گره جنوبی الگوی آشناتری را نشان می‌دهد که سریع‌تر به آن برمی‌گردی؛ گره شمالی مسیری است که زندگی بارها تو را به تمرین‌کردنش هل می‌دهد.</p>
          </header>
          <article className={styles.adaptiveNodeCard}>
            <div><strong>☋ الگوی گره جنوبی</strong><p>{plan.nodeStory.familiarBehavior}</p></div>
            <div><strong>توان مفید همان راه</strong><p>{plan.nodeStory.usefulSkill}</p></div>
            <div><strong>وقتی زیادی به آن تکیه می‌کنی</strong><p>{plan.nodeStory.overuse}</p></div>
            <div><strong>☊ مسیر گره شمالی</strong><p>{plan.nodeStory.freshBehavior}</p></div>
            {showInlineAction(plan.nodeStory.experiment) ? <p className={styles.adaptiveActionLine}><strong>این هفته امتحان کن</strong>{plan.nodeStory.experiment}</p> : null}
            <p className={styles.adaptiveConfidence}>{plan.nodeStory.confidence}</p>
            <EvidenceDisclosure evidence={plan.nodeStory.evidence} />
          </article>
        </section>
      ) : null}

      {balanceTeaser ? (
        <section className={styles.adaptiveSection} data-access-teaser="energy-balance">
          <p className={styles.eyebrow}>تعادل انرژی</p>
          <h2>{plan.balanceStory.title}</h2>
          <p>الگوی کامل این ترکیب در نسخه کامل همین گزارش باز می‌شود.</p>
        </section>
      ) : null}

      {balanceFull ? (
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
      ) : null}

      {visibleWeeklyActions.length > 0 ? (
        <section className={styles.adaptiveSection} id="drive-direction" data-adaptive-report-section="weekly-actions">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>از خواندن به عمل</p>
            <h2>{isPremium ? "سه کار برای این هفته" : "یک کار برای این هفته"}</h2>
            <p>سه حرکت از سه حوزه متفاوت انتخاب شده‌اند تا گزارش به یک فهرست تمرین تکراری تبدیل نشود.</p>
          </header>
          <ol className={styles.adaptiveWeeklyActions}>
            {visibleWeeklyActions.map((action) => <li key={action}>{action}</li>)}
          </ol>
        </section>
      ) : null}

    </div>
  );
}
