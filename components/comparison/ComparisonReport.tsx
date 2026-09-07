"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  buildHumanFirstComparisonReading,
  rebuildPrivateComparison,
} from "@/lib/comparison/comparison-product-service";
import {
  deletePrivateComparison,
  getPrivateComparison,
  savePrivateComparison,
  subscribeToPrivateComparisons,
} from "@/lib/comparison/comparison-storage";
import { loadReports } from "@/lib/storage/reports-storage";
import type {
  ComparisonFullInterpretation,
  ComparisonNarrativeChapter,
  ComparisonRecord,
} from "@/types/comparison-product";
import type {
  HumanFirstDirectionalNarrativeBlock,
  HumanFirstEvidence,
} from "@/types/human-first-reading";
import type {
  SynastryHouseOverlay,
  SynastryRelationshipContext,
} from "@/types/synastry-engine";

import styles from "./comparison.module.css";

const INITIAL_TECHNICAL_CONTACT_LIMIT = 8;
type TechnicalContactCategory =
  | "all"
  | "communication"
  | "emotional"
  | "attraction"
  | "boundaries"
  | "pressure"
  | "houses";
type TechnicalContactPolarity = "all" | "supportive" | "tension" | "intense" | "neutral";
type TechnicalContactSort = "relevance" | "orb";

const ComparisonBiWheel = dynamic(
  () =>
    import("@/components/comparison/ComparisonBiWheel").then(
      (module) => module.ComparisonBiWheel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className={styles.lazyWheelPlaceholder} role="status" aria-live="polite">
        چرخ فنی در حال آماده‌شدن است…
      </div>
    ),
  },
);

type ComparisonReportProps = {
  comparisonId: string;
};

type ComparisonMode = "reading" | "technical";

export function ComparisonReport({ comparisonId }: ComparisonReportProps) {
  const router = useRouter();
  const [record, setRecord] = useState<ComparisonRecord | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [mode, setMode] = useState<ComparisonMode>("reading");
  const [showAllContacts, setShowAllContacts] = useState(false);
  const [technicalCategory, setTechnicalCategory] = useState<TechnicalContactCategory>("all");
  const [technicalPolarity, setTechnicalPolarity] = useState<TechnicalContactPolarity>("all");
  const [technicalSort, setTechnicalSort] = useState<TechnicalContactSort>("relevance");

  const loadRecord = useCallback(() => {
    setRecord(getPrivateComparison(comparisonId));
    setIsReady(true);
  }, [comparisonId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(loadRecord);
    const unsubscribe = subscribeToPrivateComparisons(loadRecord);

    return () => {
      window.cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [loadRecord]);

  const reading = useMemo(() => {
    if (!record) return null;
    return buildHumanFirstComparisonReading(record.report, {
      chartALabel: record.chartALabel,
      chartBLabel: record.chartBLabel,
      chartABirthTimeStatus: record.chartABirthTimeStatus,
      chartBBirthTimeStatus: record.chartBBirthTimeStatus,
    });
  }, [record]);

  function regenerate() {
    if (!record) return;

    setIsWorking(true);
    setMessage("");

    const reports = loadReports();
    const chartA = reports.find((report) => report.id === record.chartAId);
    const chartB = reports.find((report) => report.id === record.chartBId);

    if (!chartA || !chartB) {
      setIsWorking(false);
      setMessage(
        "یکی از چارت‌های اصلی دیگر روی این دستگاه پیدا نمی‌شود؛ برای بازسازی، دوباره آن چارت را بساز.",
      );
      return;
    }

    const rebuilt = rebuildPrivateComparison(record, chartA, chartB);
    if (!rebuilt.ok) {
      setIsWorking(false);
      setMessage(rebuilt.message);
      return;
    }

    const saved = savePrivateComparison(rebuilt.record);
    if (!saved.ok) {
      setIsWorking(false);
      setMessage(saved.message);
      return;
    }

    setRecord(rebuilt.record);
    setIsWorking(false);
    setMessage("خوانش با اطلاعات فعلی دو چارت دوباره ساخته شد.");
  }

  function remove() {
    const result = deletePrivateComparison(comparisonId);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    router.push("/compare");
  }

  if (!isReady) {
    return (
      <div className={styles.product}>
        <div className={styles.emptyState} role="status">
          <strong>در حال باز کردن مقایسه…</strong>
        </div>
      </div>
    );
  }

  if (!record || !reading) {
    return (
      <div className={styles.product}>
        <div className={styles.emptyState}>
          <strong>این مقایسه روی این دستگاه پیدا نشد.</strong>
          <p>ممکن است پاک شده باشد یا در مرورگر دیگری ساخته شده باشد.</p>
          <Link className={styles.primaryButton} href="/compare">
            برگشت به مقایسه‌ها
          </Link>
        </div>
      </div>
    );
  }

  const labels = {
    a: normalizePersonLabel(record.chartALabel, "نفر اول"),
    b: normalizePersonLabel(record.chartBLabel, "نفر دوم"),
  };
  const filteredTechnicalContacts = filterTechnicalContacts(
    record.report.contacts,
    technicalCategory,
    technicalPolarity,
    technicalSort,
  );
  const visibleTechnicalContacts = showAllContacts
    ? filteredTechnicalContacts
    : filteredTechnicalContacts.slice(0, INITIAL_TECHNICAL_CONTACT_LIMIT);

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    current: ComparisonMode,
  ) {
    const key = event.key;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
    event.preventDefault();
    const next: ComparisonMode =
      key === "Home"
        ? "reading"
        : key === "End"
          ? "technical"
          : current === "reading"
            ? "technical"
            : "reading";
    setMode(next);
    window.requestAnimationFrame(() => {
      document.getElementById(`comparison-tab-${next}`)?.focus();
    });
  }

  return (
    <div
      className={`${styles.product} ${styles.humanFirstProduct}`}
      data-comparison-reading="human-first"
    >
      <span
        data-comparison-guard-marker="سه الگوی اصلی · امنیت عاطفی · نزدیکی و استقلال · مرز و ترمیم · تلاش دوباره و بازسازی"
        hidden
      />

      <section className={`${styles.reportHero} ${styles.humanReportHero}`}>
        <div>
          <p className={styles.eyebrow}>
            {formatRelationshipContext(record.relationshipContext)}
          </p>
          <h1>این رابطه از چه داستانی می‌گوید؟</h1>
          <div className={styles.overviewParagraphs}>
            {reading.overviewParagraphsFa.map((paragraph, index) => (
              <p className={styles.heroLead} key={index}>{paragraph}</p>
            ))}
          </div>
          <p className={styles.privateNote}>
            این خوانش خصوصی می‌ماند و فقط روی همین دستگاه ذخیره می‌شود.
          </p>
        </div>
        <aside className={styles.pairCard} aria-label="دو نفر این مقایسه">
          <span>{labels.a}</span>
          <b aria-hidden="true">↔</b>
          <span>{labels.b}</span>
        </aside>
      </section>

      <div
        className={styles.reportTabs}
        role="tablist"
        aria-label="بخش‌های مقایسه"
      >
        <button
          id="comparison-tab-reading"
          aria-controls="comparison-panel-reading"
          aria-selected={mode === "reading"}
          data-active={mode === "reading"}
          onClick={() => setMode("reading")}
          onKeyDown={(event) => handleTabKeyDown(event, "reading")}
          role="tab"
          tabIndex={mode === "reading" ? 0 : -1}
          type="button"
        >
          خوانش رابطه
        </button>
        <button
          id="comparison-tab-technical"
          aria-controls="comparison-panel-technical"
          aria-selected={mode === "technical"}
          data-active={mode === "technical"}
          onClick={() => setMode("technical")}
          onKeyDown={(event) => handleTabKeyDown(event, "technical")}
          role="tab"
          tabIndex={mode === "technical" ? 0 : -1}
          type="button"
        >
          جزئیات نجومی
        </button>
      </div>

      {mode === "reading" ? (
        <div
          className={styles.readingFlow}
          id="comparison-panel-reading"
          role="tabpanel"
          aria-labelledby="comparison-tab-reading"
          tabIndex={0}
        >
          <section className={styles.relationshipChapter} aria-labelledby="comparison-primary-patterns-title">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>سه الگوی اصلی میان شما</p>
              <h2 id="comparison-primary-patterns-title">سه چرخه‌ای که بهتر است زودتر بشناسید</h2>
              <p>این سه الگو فقط همین‌جا کامل توضیح داده می‌شوند؛ فصل‌های بعدی تماس اصلی دیگری می‌گیرند یا به این بخش ارجاع کوتاه می‌دهند.</p>
            </div>
            <div className={styles.relationshipPatternList}>
              {reading.primaryPatterns.map((pattern, index) => (
                <article className={styles.relationshipPattern} key={pattern.id}>
                  <span>{(index + 1).toLocaleString("fa-IR")}</span>
                  <div>
                    <h3>{pattern.title}</h3>
                    <DirectionalStory block={pattern} labels={labels} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className={styles.chapterSequence}>
            {reading.chapters.map((chapter) => (
              <NarrativeChapter chapter={chapter} key={chapter.id} />
            ))}
          </div>

          <FullInterpretationReading full={reading.fullInterpretation} />

          <section className={styles.relationshipChapter} id="comparison-growth">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>گام بعدی</p>
              <h2>از این خوانش چه چیزی را وارد گفت‌وگوی واقعی کنید؟</h2>
            </div>
            <div className={styles.growthFlow}>
              <article><span>{labels.a}</span><p>{reading.growth.personASkill}</p></article>
              <article><span>{labels.b}</span><p>{reading.growth.personBSkill}</p></article>
            </div>
            <div className={styles.practiceLine}>
              <strong>یک کار کوچک که می‌تواند کمک کند</strong>
              <p>{reading.growth.practicalStep}</p>
            </div>
            <div className={styles.conversationQuestions}>
              <strong>سه سؤال برای گفت‌وگو</strong>
              <ol>
                {reading.conversationQuestionsFa.map((question) => <li key={question}>{question}</li>)}
              </ol>
            </div>
          </section>

          <section className={styles.limitationsCard}>
            <p className={styles.eyebrow}>حدود این خوانش</p>
            <p>{reading.readingLimitFa}</p>
          </section>
        </div>
      ) : null}
      {mode === "technical" ? (
        <div
          className={styles.technicalFlow}
          id="comparison-panel-technical"
          role="tabpanel"
          aria-labelledby="comparison-tab-technical"
          tabIndex={0}
        >
          <ComparisonBiWheel report={record.report} />

          <section className={styles.technicalDetails}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>جزئیات فنی</p>
              <h2>تماس‌ها را مرحله‌به‌مرحله باز کن</h2>
              <p>در شروع فقط هشت تماس مهم دیده می‌شود. دسته، polarity و ترتیب نمایش را می‌توانی بدون تغییر خود محاسبه فیلتر کنی.</p>
            </div>
            <div className={styles.technicalToolbar}>
              <label className={styles.technicalControl}>
                <span>دسته</span>
                <select value={technicalCategory} onChange={(event) => { setTechnicalCategory(event.target.value as TechnicalContactCategory); setShowAllContacts(false); }}>
                  <option value="all">همه</option>
                  <option value="communication">گفت‌وگو</option>
                  <option value="emotional">عاطفه و امنیت</option>
                  <option value="attraction">کشش و صمیمیت</option>
                  <option value="boundaries">مرز و استقلال</option>
                  <option value="pressure">فشار و اصطکاک</option>
                  <option value="houses">خانه‌ها</option>
                </select>
              </label>
              <label className={styles.technicalControl}>
                <span>کیفیت تماس</span>
                <select value={technicalPolarity} onChange={(event) => { setTechnicalPolarity(event.target.value as TechnicalContactPolarity); setShowAllContacts(false); }}>
                  <option value="all">همه</option>
                  <option value="supportive">حمایتی</option>
                  <option value="tension">تنش</option>
                  <option value="intense">فشرده</option>
                  <option value="neutral">خنثی</option>
                </select>
              </label>
              <label className={styles.technicalControl}>
                <span>مرتب‌سازی</span>
                <select value={technicalSort} onChange={(event) => setTechnicalSort(event.target.value as TechnicalContactSort)}>
                  <option value="relevance">اهمیت</option>
                  <option value="orb">اورب کمتر</option>
                </select>
              </label>
            </div>

            {technicalCategory === "houses" ? (
              <p className={styles.technicalEmpty}>فیلتر خانه‌ها فعال است؛ هم‌پوشانی‌های جهت‌دار پایین نمایش داده می‌شوند.</p>
            ) : visibleTechnicalContacts.length > 0 ? (
              <>
                <div className={styles.contactList}>
                  {visibleTechnicalContacts.map((contact) => (
                    <article className={styles.contactCard} data-polarity={contact.polarity} key={contact.id}>
                      <div>
                        <span>{contact.aspectLabel}</span>
                        <strong data-person-direction="true">{directionalAspectTitle(contact, labels)}</strong>
                        <small className={styles.contactDirection}>{contact.titleFa}</small>
                      </div>
                      <p className={styles.contactReason}>{describeContactImportance(contact)}</p>
                      <div className={styles.contactCategoryTags}>
                        {contact.categories.map((category) => <span key={category}>{formatContactCategory(category)}</span>)}
                      </div>
                      <dl className={styles.contactFacts}>
                        <div><dt>فاصلهٔ زاویه‌ای</dt><dd>{formatDegree(contact.separation)}</dd></div>
                        <div><dt>اورب</dt><dd>{formatDegree(contact.orb)}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
                {filteredTechnicalContacts.length > INITIAL_TECHNICAL_CONTACT_LIMIT ? (
                  <button className={styles.showAllContacts} type="button" aria-expanded={showAllContacts} onClick={() => setShowAllContacts((value) => !value)}>
                    {showAllContacts ? "نمایش تماس‌های مهم" : "نمایش همهٔ " + filteredTechnicalContacts.length.toLocaleString("fa-IR") + " تماس"}
                  </button>
                ) : null}
              </>
            ) : (
              <p className={styles.technicalEmpty}>با این فیلتر تماس دیگری برای نمایش نیست.</p>
            )}
          </section>
          {(technicalCategory === "all" || technicalCategory === "houses") && record.report.houseOverlays.length > 0 ? (
            <section className={styles.technicalDetails}>
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>هم‌پوشانی خانه‌ها</p>
                <h2>هر نفر کدام بخش زندگی دیگری را بیشتر فعال می‌کند؟</h2>
                <p>
                  این بخش هر جایگاه را جداگانه و در جهت درست رابطه می‌خواند؛
                  یعنی روشن می‌کند حضور یک نفر دقیقاً کدام بخش از تجربهٔ نفر دیگر
                  را بیدارتر می‌کند و این اثر در زندگی واقعی چه شکلی پیدا می‌کند.
                </p>
              </div>

              <div className={styles.overlayDirections}>
                {groupHouseOverlays(record.report.houseOverlays, labels).map(
                  (group) => (
                    <section className={styles.overlayDirection} key={group.id}>
                      <div className={styles.overlayDirectionHeading}>
                        <span>{group.sourceLabel}</span>
                        <h3>
                          {group.sourceLabel} در زندگی {group.targetLabel}
                        </h3>
                        <p>
                          این جایگاه‌ها نشان می‌دهند حضور، واکنش‌ها و انتخاب‌های{" "}
                          {group.sourceLabel} کدام حوزه‌های زندگی{" "}
                          {group.targetLabel} را زودتر فعال می‌کنند.
                        </p>
                      </div>

                      <div className={styles.overlayNarrativeList}>
                        {group.overlays.map((overlay) => {
                          const narrative = buildHouseOverlayNarrative(
                            overlay,
                            group.sourceLabel,
                            group.targetLabel,
                          );

                          return (
                            <article
                              className={styles.overlayNarrativeCard}
                              key={overlay.id}
                            >
                              <div className={styles.overlayNarrativeHeading}>
                                <span>
                                  خانه{" "}
                                  {overlay.targetHouse.toLocaleString("fa-IR")}
                                </span>
                                <h4>{narrative.title}</h4>
                              </div>

                              <p className={styles.overlayNarrativeLead}>
                                {narrative.opening}
                              </p>

                              <div className={styles.overlayNarrativeParts}>
                                <section>
                                  <strong>
                                    در زندگی واقعی ممکن است این‌طور دیده شود
                                  </strong>
                                  <p>{narrative.example}</p>
                                </section>
                                <section>
                                  <strong>وقتی این پیوند خوب پیش می‌رود</strong>
                                  <p>{narrative.strength}</p>
                                </section>
                                <section>
                                  <strong>زیر فشار ممکن است</strong>
                                  <p>{narrative.challenge}</p>
                                </section>
                                <section>
                                  <strong>یک راه کوچک برای بهترشدن</strong>
                                  <p>{narrative.practice}</p>
                                </section>
                              </div>

                              <details className={styles.overlayNarrativeEvidence}>
                                <summary>از کجای دو چارت می‌آید؟</summary>
                                <p>{overlay.readingFa}</p>
                              </details>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ),
                )}
              </div>
            </section>
          ) : null}

        </div>
      ) : null}
      {message ? (
        <p className={styles.statusMessage} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.reportActions} aria-label="مدیریت مقایسه">
        <Link className={styles.secondaryButton} href="/compare">
          برگشت به تاریخچه
        </Link>
        <button
          className={styles.secondaryButton}
          type="button"
          disabled={isWorking}
          onClick={regenerate}
        >
          {isWorking ? "در حال بازسازی…" : "ساخت دوباره با اطلاعات فعلی"}
        </button>
        <button className={styles.dangerButton} type="button" onClick={remove}>
          حذف این مقایسه
        </button>
      </section>
    </div>
  );
}

// HALLEUS_COMPARE_FULL_INTERPRETATION_SLICE2_R5
function FullInterpretationReading({
  full,
}: {
  full: ComparisonFullInterpretation | undefined;
}) {
  if (!full) return null;

  return (
    <>
      <section
        className={styles.relationshipChapter}
        id="comparison-deeper-layers"
        data-full-interpretation="deeper-layers"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>لایه‌های عمیق‌تر</p>
          <h2>چیزهایی که فقط با تماس‌های اصلی توضیح داده نمی‌شوند</h2>
          <p>
            این بخش نودها، لیلیت، کایرون و نقاط پیشرفته، سهم‌های سنتی، ستاره‌های
            ثابت، حرکت بازگشتی، امضای چارت و جنبه‌های تولد را فقط در محدودهٔ
            داده‌ای که موتور واقعاً دارد توضیح می‌دهد.
          </p>
        </div>
        <div className={styles.fullInterpretationStack}>
          {full.deepLayers.map((layer) => (
            <details className={styles.fullInterpretationDetails} key={layer.id}>
              <summary>
                <span>{layer.titleFa}</span>
                <small>{layer.items.length.toLocaleString("fa-IR")} مورد</small>
              </summary>
              <p>{layer.summaryFa}</p>
              <div className={styles.fullInterpretationItems}>
                {layer.items.map((item) => (
                  <article className={styles.fullInterpretationItem} key={item.id}>
                    <h3>{item.titleFa}</h3>
                    <p>{item.meaningFa}</p>
                    <p>{item.relationshipExpressionFa}</p>
                    <div className={styles.interpretationContrast}>
                      <div>
                        <strong>وقتی سازنده‌تر کار می‌کند</strong>
                        <p>{item.supportiveExpressionFa}</p>
                      </div>
                      <div>
                        <strong>وقتی زیر فشار می‌رود</strong>
                        <p>{item.stressExpressionFa}</p>
                      </div>
                    </div>
                    <p>{item.contextualExpressionFa}</p>
                    <small>{item.confidenceFa}</small>
                    <EvidenceIds ids={item.evidenceIds} />
                  </article>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section
        className={styles.relationshipChapter}
        id="comparison-all-contact-interpretations"
        data-full-interpretation="all-contacts"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>تمام تماس‌های محاسبه‌شده</p>
          <h2>هیچ تماس محاسبه‌شده‌ای فقط به خاطر وزن کمتر حذف نشده است</h2>
          <p>
            ترتیب همچنان بر اساس اهمیت است، اما همهٔ تماس‌های موجود explanation،
            زمینهٔ natal، اثر context و evidence خودشان را دارند.
          </p>
        </div>
        <div className={styles.fullInterpretationStack}>
          {full.contacts.map((contact) => (
            <details className={styles.fullInterpretationDetails} key={contact.id}>
              <summary>
                <span>{contact.titleFa}</span>
                <small>{contact.aspectFa}</small>
              </summary>
              <div className={styles.fullInterpretationItem}>
                <p>{contact.pointAFactFa}</p>
                <p>{contact.pointBFactFa}</p>
                <p>{contact.importanceFa}</p>
                <div className={styles.interpretationContrast}>
                  <div>
                    <strong>حالت سالم‌تر</strong>
                    <p>{contact.healthyFa}</p>
                  </div>
                  <div>
                    <strong>زیر فشار</strong>
                    <p>{contact.stressFa}</p>
                  </div>
                </div>
                <p>{contact.contextFa}</p>
                <p>{contact.natalContextFa}</p>
                <p>{contact.overlayContextFa}</p>
                <small>{contact.confidenceFa}</small>
                <EvidenceIds ids={contact.evidenceIds} />
              </div>
            </details>
          ))}
        </div>
      </section>

      {full.overlays.length > 0 ? (
        <section
          className={styles.relationshipChapter}
          id="comparison-all-overlay-interpretations"
          data-full-interpretation="all-overlays"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>تمام هم‌پوشانی‌های خانه‌ای</p>
            <h2>اثر هر نفر در زندگی دیگری، با جهت و context روشن</h2>
          </div>
          <div className={styles.fullInterpretationStack}>
            {full.overlays.map((overlay) => (
              <details className={styles.fullInterpretationDetails} key={overlay.id}>
                <summary>
                  <span>{overlay.titleFa}</span>
                  <small>{overlay.directionFa}</small>
                </summary>
                <div className={styles.fullInterpretationItem}>
                  <p>{overlay.meaningFa}</p>
                  <p>{overlay.contextFa}</p>
                  <div className={styles.interpretationContrast}>
                    <div>
                      <strong>ظرفیت</strong>
                      <p>{overlay.supportiveFa}</p>
                    </div>
                    <div>
                      <strong>فشار</strong>
                      <p>{overlay.stressFa}</p>
                    </div>
                  </div>
                  <small>{overlay.confidenceFa}</small>
                  <EvidenceIds ids={overlay.evidenceIds} />
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section
        className={styles.relationshipChapter}
        id="comparison-natal-context"
        data-full-interpretation="natal-context"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>زمینهٔ natal هر دو نفر</p>
          <h2>چرا یک تماس مشابه برای این دو نفر الزاماً یکسان تجربه نمی‌شود؟</h2>
        </div>
        <div className={styles.fullInterpretationStack}>
          {full.natalContexts.map((context) => (
            <details className={styles.fullInterpretationDetails} key={context.chartSide}>
              <summary>{context.chartLabel}</summary>
              <div className={styles.fullInterpretationItem}>
                <p>{context.summaryFa}</p>
                <ul className={styles.fullInterpretationFacts}>
                  {context.factsFa.map((fact, index) => (
                    <li key={`${context.chartSide}-${index}`}>{fact}</li>
                  ))}
                </ul>
                <EvidenceIds ids={context.evidenceIds} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section
        className={styles.relationshipChapter}
        id="comparison-calculation-quality"
        data-full-interpretation="calculation-quality"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>کیفیت و محدودیت محاسبات</p>
          <h2>کجا می‌شود مطمئن‌تر خواند و کجا باید محتاط‌تر بود؟</h2>
        </div>
        <div className={styles.fullInterpretationItem}>
          <p>{full.calculation.summaryFa}</p>
          <p>{full.calculation.confidenceFa}</p>
          <details className={styles.inlineTechnicalDetails}>
            <summary>روش‌ها و provenance</summary>
            <ul className={styles.fullInterpretationFacts}>
              {full.calculation.methodNotesFa.map((item, index) => (
                <li key={`method-${index}`}>{item}</li>
              ))}
            </ul>
          </details>
          {full.calculation.warningsFa.length > 0 ? (
            <details className={styles.inlineTechnicalDetails}>
              <summary>هشدارها و محدودیت‌ها</summary>
              <ul className={styles.fullInterpretationFacts}>
                {full.calculation.warningsFa.map((item, index) => (
                  <li key={`warning-${index}`}>{item}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </section>
    </>
  );
}

function TechnicalEngineAudit({
  report,
  full,
}: {
  report: ComparisonRecord["report"];
  full: ComparisonFullInterpretation | undefined;
}) {
  if (!full) return null;
  return (
    <section
      className={styles.technicalDetails}
      data-full-interpretation="technical-audit"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Audit کامل موتور</p>
        <h2>پوشش تفسیری و snapshot کامل هر دو چارت</h2>
        <p>
          این بخش برای audit است: هیچ field موتور به دلیل technical بودن حذف نشده و
          snapshot کامل در progressive disclosure قابل بررسی است.
        </p>
      </div>
      <div className={styles.coverageGrid}>
        {full.coverage.map((entry) => (
          <article className={styles.coverageItem} key={entry.field}>
            <strong>{entry.field}</strong>
            <span>{entry.status}</span>
            <small>
              A: {entry.chartADataState} · B: {entry.chartBDataState}
            </small>
            <p>{entry.reasonFa}</p>
          </article>
        ))}
      </div>
      <details className={styles.rawEngineDetails}>
        <summary>Full normalized engine snapshot — نفر اول</summary>
        <pre className={styles.technicalJson}>
          {JSON.stringify(report.chartA.engineSnapshot ?? null, null, 2)}
        </pre>
      </details>
      <details className={styles.rawEngineDetails}>
        <summary>Full normalized engine snapshot — نفر دوم</summary>
        <pre className={styles.technicalJson}>
          {JSON.stringify(report.chartB.engineSnapshot ?? null, null, 2)}
        </pre>
      </details>
      <details className={styles.rawEngineDetails}>
        <summary>Full normalized point inventory</summary>
        <pre className={styles.technicalJson}>
          {JSON.stringify(
            {
              chartA: report.chartA.points ?? [
                ...report.chartA.placements,
                ...report.chartA.angles,
              ],
              chartB: report.chartB.points ?? [
                ...report.chartB.placements,
                ...report.chartB.angles,
              ],
            },
            null,
            2,
          )}
        </pre>
      </details>
    </section>
  );
}

function EvidenceIds({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <details className={styles.inlineTechnicalDetails}>
      <summary>شواهد این ادعا</summary>
      <ul className={styles.evidenceIdList}>
        {ids.map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ul>
    </details>
  );
}

function NarrativeChapter({ chapter }: { chapter: ComparisonNarrativeChapter }) {
  return (
    <section className={styles.relationshipChapter} data-owner-contact={chapter.ownerContactId ?? "fallback"}>
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>{chapter.eyebrow}</p>
        <h2>{chapter.title}</h2>
        {chapter.crossReferencePatternTitle ? (
          <p className={styles.chapterCrossReference}>این محور در الگوی اصلی «{chapter.crossReferencePatternTitle}» هم دیده شد؛ اینجا به‌جای تکرار همان روایت، فقط کاربرد روزمره‌اش را می‌بینی.</p>
        ) : null}
      </div>
      <ChapterStory block={chapter.block} />
    </section>
  );
}

function ChapterStory({ block }: { block: HumanFirstDirectionalNarrativeBlock }) {
  return (
    <article className={styles.chapterStory}>
      <h3>{block.title}</h3>
      <p className={styles.storyLead}>{block.humanExperience}</p>
      <div className={styles.chapterExample}>
        <strong>در زندگی روزمره</strong>
        <p>{block.dailySituation}</p>
      </div>
      <div className={styles.chapterMomentGrid}>
        <p><strong>در حالت سالم</strong>{block.strength}</p>
        <p><strong>زیر فشار</strong>{block.challenge}</p>
      </div>
      <div className={styles.practiceLine}>
        <strong>یک پیشنهاد عملی</strong>
        <p>{block.practicalStep}</p>
      </div>
      <EvidenceDisclosure evidence={block.evidence} />
    </article>
  );
}

function DirectionalStory({
  block,
  labels,
}: {
  block: HumanFirstDirectionalNarrativeBlock;
  labels: { a: string; b: string };
}) {
  return (
    <div className={styles.directionalStory}>
      <p className={styles.storyLead}>{block.humanExperience}</p>
      <div className={styles.perspectiveGrid}>
        <article>
          <span>{labels.a}</span>
          <p>{block.personA}</p>
        </article>
        <article>
          <span>{labels.b}</span>
          <p>{block.personB}</p>
        </article>
      </div>
      <div className={styles.cycleLine}>
        <strong>چرخه‌ای که میان شما شکل می‌گیرد</strong>
        <p>{block.cycle}</p>
      </div>
      <div className={styles.relationshipMoments}>
        <p>
          <strong>بیشتر چه وقت خودش را نشان می‌دهد؟</strong>
          {block.dailySituation}
        </p>
        <p>
          <strong>وقتی خوب پیش می‌رود</strong>
          {block.strength}
        </p>
        <p>
          <strong>وقتی سخت می‌شود</strong>
          {block.challenge}
        </p>
      </div>
      <div className={styles.practiceLine}>
        <strong>یک راه کوچک برای بهترشدن</strong>
        <p>{block.practicalStep}</p>
      </div>
      <EvidenceDisclosure evidence={block.evidence} />
    </div>
  );
}

function EvidenceDisclosure({ evidence }: { evidence: HumanFirstEvidence[] }) {
  if (evidence.length === 0) return null;

  return (
    <details className={styles.relationshipEvidence}>
      <summary>از کجای دو چارت می‌آید؟</summary>
      <div>
        {evidence.map((item) => (
          <p key={item.id}>
            <strong>{item.label}:</strong> {item.detail}
          </p>
        ))}
      </div>
    </details>
  );
}


function directionalAspectTitle(
  contact: { pointA: { label: string; chartSide: "a" | "b" }; pointB: { label: string; chartSide: "a" | "b" }; aspectLabel: string },
  labels: { a: string; b: string },
) {
  return `${contact.pointA.label}ِ ${labels[contact.pointA.chartSide]} در ${contact.aspectLabel} با ${contact.pointB.label}ِ ${labels[contact.pointB.chartSide]}`;
}

function filterTechnicalContacts(
  contacts: ComparisonRecord["report"]["contacts"],
  category: TechnicalContactCategory,
  polarity: TechnicalContactPolarity,
  sort: TechnicalContactSort,
) {
  if (category === "houses") return [];
  return [...contacts]
    .filter((contact) => polarity === "all" || contact.polarity === polarity)
    .filter((contact) => matchesTechnicalCategory(contact, category))
    .sort((left, right) =>
      sort === "orb"
        ? left.orb - right.orb || right.relevanceScore - left.relevanceScore
        : right.relevanceScore - left.relevanceScore || left.orb - right.orb,
    );
}

function matchesTechnicalCategory(
  contact: ComparisonRecord["report"]["contacts"][number],
  category: TechnicalContactCategory,
) {
  if (category === "all") return true;
  const ids = new Set([contact.pointA.id, contact.pointB.id]);
  if (category === "communication") return contact.categories.includes("communication") || ids.has("mercury");
  if (category === "emotional") return contact.categories.includes("closeness") || ids.has("moon") || ids.has("venus") || ids.has("saturn");
  if (category === "attraction") return contact.categories.includes("closeness") || ids.has("venus") || ids.has("mars");
  if (category === "boundaries") return contact.categories.includes("independence") || ids.has("saturn") || ids.has("uranus") || ids.has("pluto");
  if (category === "pressure") return contact.polarity === "tension" || contact.polarity === "intense" || ids.has("saturn") || ids.has("pluto");
  return true;
}

function describeContactImportance(contact: ComparisonRecord["report"]["contacts"][number]) {
  if (contact.categories.includes("communication")) return "این تماس مستقیماً روی شیوهٔ شنیدن، توضیح‌دادن یا سوءبرداشت میان دو نفر اثر می‌گذارد.";
  if (contact.categories.includes("closeness")) return "این تماس به کشش، صمیمیت یا تعریف هر نفر از نزدیکی وزن بیشتری می‌دهد.";
  if (contact.categories.includes("independence")) return "این تماس برای مرز، آزادی عمل و نحوهٔ تنظیم فاصله مهم است.";
  if (contact.polarity === "tension" || contact.polarity === "intense") return "به‌خاطر فشار یا شدت بالاتر، این تماس می‌تواند زودتر در چرخهٔ تعارض دیده شود.";
  return "این تماس به‌خاطر relevance بالاتر در میان شواهد فنی این خوانش زودتر نمایش داده شده است.";
}

function formatContactCategory(category: string) {
  const labels: Record<string, string> = {
    luminary: "نورها",
    "personal-planet": "سیاره‌های شخصی",
    "saturn-outer": "زحل و بیرونی‌ها",
    angle: "زاویه‌ها",
    "chart-ruler": "حاکم چارت",
    communication: "گفت‌وگو",
    closeness: "نزدیکی",
    independence: "استقلال",
  };
  return labels[category] ?? category;
}

type HouseOverlayNarrative = {
  title: string;
  opening: string;
  example: string;
  strength: string;
  challenge: string;
  practice: string;
};

type PointOverlayProfile = {
  theme: string;
  influence: string;
  strength: string;
  pressure: string;
  sourcePractice: string;
};

type HouseOverlayProfile = {
  area: string;
  activation: string;
  example: (sourceLabel: string, targetLabel: string, pointTheme: string) => string;
  strength: string;
  challenge: string;
  targetPractice: string;
};

const POINT_OVERLAY_PROFILES: Record<string, PointOverlayProfile> = {
  sun: {
    theme: "هویت، اعتمادبه‌نفس و میل به دیده‌شدن",
    influence: "حضور روشن، انتخاب شخصی و نیاز به ابراز خود",
    strength:
      "به طرف مقابل کمک می‌کند خواسته و جایگاه خودش را جدی‌تر ببیند و با وضوح بیشتری انتخاب کند",
    pressure:
      "ممکن است ناخواسته فضا را به سمت خواسته، ریتم یا تعریف خودش از موفقیت ببرد",
    sourcePractice:
      "نظر و خواسته‌اش را به شکل دعوت مطرح کند، نه به شکل نسخهٔ نهایی برای زندگی طرف مقابل",
  },
  moon: {
    theme: "احساس، امنیت عاطفی و واکنش‌های خودکار",
    influence: "نیازهای عاطفی، حس مراقبت و واکنش‌های بی‌واسطه",
    strength:
      "فضایی می‌سازد که در آن احساسات زودتر دیده و نیازهای پنهان‌تر قابل گفت‌وگو می‌شوند",
    pressure:
      "ممکن است حساسیت، دلخوری یا نیاز به اطمینان را در این حوزه بیشتر کند",
    sourcePractice:
      "پیش از واکنش، نیاز عاطفی پشت حرفش را روشن و مستقیم بیان کند",
  },
  mercury: {
    theme: "فکر، گفت‌وگو و شیوهٔ معناکردن اتفاق‌ها",
    influence: "پرسش، توضیح، تحلیل و رفت‌وآمد ذهنی",
    strength:
      "به طرف مقابل کمک می‌کند موضوعات این بخش را نام‌گذاری کند و درباره‌شان دقیق‌تر فکر کند",
    pressure:
      "ممکن است این حوزه را بیش از حد تحلیل کند، با سؤال‌های پی‌درپی خسته‌کننده شود یا زود نتیجه بگیرد",
    sourcePractice:
      "میان پرسیدن، توضیح‌دادن و واقعاً شنیدن تعادل نگه دارد",
  },
  venus: {
    theme: "محبت، کشش، لذت و چیزهایی که ارزشمند به نظر می‌رسند",
    influence: "گرمی، توجه، سلیقه و میل به نزدیک‌شدن",
    strength:
      "احساس دوست‌داشتنی‌بودن و لذت مشترک را در این بخش بیشتر می‌کند",
    pressure:
      "ممکن است برای حفظ هماهنگی، تفاوت‌های واقعی یا ناراحتی‌های کوچک را نادیده بگیرد",
    sourcePractice:
      "محبت را روشن نشان دهد، اما رضایت ظاهری را جای گفت‌وگوی صادقانه نگذارد",
  },
  mars: {
    theme: "میل، اقدام، مرز و شیوهٔ روبه‌روشدن با اختلاف",
    influence: "انرژی، تصمیم، کشش و حرکت مستقیم",
    strength:
      "به این بخش سرعت، جرئت و توان شروع‌کردن می‌دهد",
    pressure:
      "ممکن است عجله، رقابت، تحریک‌پذیری یا فشار برای تصمیم فوری ایجاد کند",
    sourcePractice:
      "خواستن را صریح بگوید، اما به زمان و مرز طرف مقابل هم جا بدهد",
  },
  jupiter: {
    theme: "رشد، امید، معنا و میل به تجربهٔ بیشتر",
    influence: "گسترش، خوش‌بینی و دیدن امکان‌های تازه",
    strength:
      "افق این بخش را بازتر می‌کند و به طرف مقابل جرئت تجربه یا رشد می‌دهد",
    pressure:
      "ممکن است وعده‌ها، انتظارها یا اندازهٔ برنامه‌ها را بزرگ‌تر از ظرفیت واقعی کند",
    sourcePractice:
      "شوق و امید را با قدم‌های واقعی و تعهدهای قابل انجام همراه کند",
  },
  saturn: {
    theme: "تعهد، مسئولیت، زمان و مرزهای جدی",
    influence: "ساختار، احتیاط، وظیفه و نیاز به قابل‌اعتمادبودن",
    strength:
      "می‌تواند این بخش را پایدارتر، منظم‌تر و قابل اتکاتر کند",
    pressure:
      "ممکن است حس قضاوت، سنگینی، محدودیت یا ترس از اشتباه را بیشتر کند",
    sourcePractice:
      "مرز و مسئولیت را روشن کند، بدون اینکه نقش داور یا والد رابطه را بگیرد",
  },
  uranus: {
    theme: "آزادی، تغییر، تازگی و شکستن الگوهای قدیمی",
    influence: "غافلگیری، استقلال و میل به متفاوت‌بودن",
    strength:
      "به این بخش هوای تازه می‌آورد و امکان انتخاب‌های کمتر تکراری را نشان می‌دهد",
    pressure:
      "ممکن است بی‌ثباتی، فاصلهٔ ناگهانی یا تصمیم‌های غیرقابل پیش‌بینی بسازد",
    sourcePractice:
      "نیاز به آزادی و تغییر را پیش از قطع ارتباط یا تغییر ناگهانی توضیح دهد",
  },
  neptune: {
    theme: "همدلی، خیال، آرمان و چیزهایی که مرز روشنی ندارند",
    influence: "حساسیت، رؤیاپردازی و پیوند احساسی ظریف",
    strength:
      "می‌تواند مهربانی، الهام و درک بدون توضیح زیاد را در این بخش بیشتر کند",
    pressure:
      "ممکن است ابهام، انتظار ناگفته، خیال‌پردازی یا ندیدن واقعیت‌های ناراحت‌کننده ایجاد کند",
    sourcePractice:
      "احساس و امید را با سؤال روشن، واقعیت قابل بررسی و مرز مشخص همراه کند",
  },
  pluto: {
    theme: "شدت، قدرت، ترس از دست‌دادن و دگرگونی عمیق",
    influence: "کشش عمیق، حساسیت به کنترل و میل به رفتن تا ریشهٔ موضوع",
    strength:
      "می‌تواند صداقت عمیق، شجاعت روبه‌روشدن و تغییر واقعی در این بخش ایجاد کند",
    pressure:
      "ممکن است وسواس، کنترل، حسادت، آزمون‌گرفتن یا واکنش‌های همه‌یا‌هیچ را بیشتر کند",
    sourcePractice:
      "شدت احساس را به درخواست روشن تبدیل کند و از کنترل یا آزمون‌گرفتن فاصله بگیرد",
  },
};

const HOUSE_OVERLAY_PROFILES: Record<number, HouseOverlayProfile> = {
  1: {
    area: "هویت، ظاهر، شروع‌ها و شیوه‌ای که فرد خودش را به دنیا نشان می‌دهد",
    activation:
      "طرف مقابل زودتر متوجه می‌شود چگونه دیده می‌شود، چه تصویری از خودش دارد و با چه اعتمادبه‌نفسی وارد موقعیت‌ها می‌شود",
    example: (source, target, point) =>
      `مثلاً ${source} ممکن است با ${point} کاری کند که ${target} درباره ظاهر، تصمیم شخصی، نحوه معرفی خودش یا شروع یک مسیر تازه واکنش فوری‌تری نشان دهد.`,
    strength:
      "حضور یکدیگر می‌تواند جرئت خودبودن، انتخاب شخصی و شروع‌کردن را بیشتر کند",
    challenge:
      "طرف مقابل ممکن است احساس کند دائماً زیر نگاه، تعریف یا انتظار دیگری قرار دارد",
    targetPractice:
      "تفاوت میان «این اثر را از تو می‌گیرم» و «باید مطابق تصویر تو باشم» را روشن نگه دارد",
  },
  2: {
    area: "ارزش شخصی، پول، مالکیت، امنیت و چیزهایی که فرد نمی‌خواهد به‌آسانی از دست بدهد",
    activation:
      "موضوع ارزشمندی، درآمد، خرج‌کردن، مالکیت و امنیت ملموس زودتر وارد رابطه می‌شود",
    example: (source, target, point) =>
      `مثلاً ${point} از سوی ${source} می‌تواند باعث شود ${target} درباره خرج‌کردن، پس‌انداز، هدیه، تقسیم هزینه‌ها یا ارزش کاری که انجام می‌دهد جدی‌تر فکر کند.`,
    strength:
      "رابطه می‌تواند حس ثبات، حمایت عملی و احترام به ارزش‌های شخصی را بیشتر کند",
    challenge:
      "اختلاف بر سر پول، مالکیت، وابستگی یا این حس که «قدر من دانسته نمی‌شود» ممکن است پررنگ شود",
    targetPractice:
      "ارزش عاطفی، ارزش مالی و حق مالکیت را با هم قاطی نکند و درباره هرکدام جداگانه حرف بزند",
  },
  3: {
    area: "گفت‌وگوی روزمره، پیام‌ها، یادگیری، رفت‌وآمد و شیوهٔ برداشت از حرف‌ها",
    activation:
      "حرف‌زدن، سؤال‌پرسیدن و معنی‌کردن رفتارهای کوچک به بخش فعالی از رابطه تبدیل می‌شود",
    example: (source, target, point) =>
      `مثلاً یک پیام کوتاه، شوخی، توضیح یا سؤال از طرف ${source} می‌تواند ذهن ${target} را ساعت‌ها درگیر کند یا او را به گفت‌وگویی تازه بکشاند؛ به‌خصوص وقتی ${point} پررنگ باشد.`,
    strength:
      "رابطه می‌تواند کنجکاوی، یادگیری و توان توضیح‌دادن تجربه‌ها را بیشتر کند",
    challenge:
      "سوءبرداشت، حرف‌زدن بیش از شنیدن یا حساس‌شدن به لحن و جزئیات کوچک ممکن است تکرار شود",
    targetPractice:
      "پیش از نتیجه‌گیری، برداشت خودش را بازگو کند و فرصت اصلاح به طرف مقابل بدهد",
  },
  4: {
    area: "خانه، خانواده، گذشته، خلوت و حس امنیت عاطفی",
    activation:
      "حضور طرف مقابل به لایه‌های خصوصی‌تر، خاطره‌ها و تعریف فرد از خانه و تعلق نزدیک می‌شود",
    example: (source, target, point) =>
      `مثلاً ${source} با ${point} ممکن است در ${target} میل به ساختن خانه، حرف‌زدن از کودکی، نزدیک‌شدن به خانواده یا برعکس نیاز به محافظت از خلوت شخصی را فعال کند.`,
    strength:
      "میان دو نفر می‌تواند حس پناه، آشنایی و امکان ساختن فضای امن شکل بگیرد",
    challenge:
      "حساسیت‌های خانوادگی، زخم‌های قدیمی یا توقع‌های ناگفته درباره خانه و مراقبت ممکن است وارد رابطه شوند",
    targetPractice:
      "نیاز به خانه، خانواده و خلوت را به‌جای حدس‌زدن، با جمله‌های روشن بیان کند",
  },
  5: {
    area: "عشق، قرار، بازی، خلاقیت، لذت و میل به دیده‌شدن از سر شوق",
    activation:
      "رابطه این بخش را زنده‌تر می‌کند و میل به ابراز محبت، تفریح یا خلق‌کردن را بالا می‌برد",
    example: (source, target, point) =>
      `مثلاً ${point} از سوی ${source} می‌تواند ${target} را به قرارهای شادتر، شوخی، ساختن چیزی مشترک، ابراز علاقه یا نشان‌دادن بخشی خلاق‌تر از خودش تشویق کند.`,
    strength:
      "احساس زنده‌بودن، بازیگوشی، کشش و تحسین متقابل بیشتر می‌شود",
    challenge:
      "نیاز به توجه، رقابت برای دیده‌شدن یا تبدیل رابطه به منبع دائمی هیجان ممکن است فشار بسازد",
    targetPractice:
      "لذت و توجه را بخواهد، اما ارزش رابطه را فقط با شدت هیجان نسنجد",
  },
  6: {
    area: "کارهای روزانه، نظم، مسئولیت عملی، سلامت و شیوهٔ کمک‌کردن",
    activation:
      "رابطه خیلی زود وارد جزئیات زندگی روزمره و این سؤال می‌شود که چه کسی چه کاری را انجام می‌دهد",
    example: (source, target, point) =>
      `مثلاً ${source} با ${point} ممکن است روی برنامه خواب، کار، غذا، نظافت، ورزش یا تقسیم کارهای روزانهٔ ${target} اثر بگذارد.`,
    strength:
      "دو نفر می‌توانند زندگی یکدیگر را منظم‌تر، سبک‌تر و قابل مدیریت‌تر کنند",
    challenge:
      "کمک ممکن است به ایرادگیری، کنترل جزئیات یا احساس خدمت‌کردن یک‌طرفه تبدیل شود",
    targetPractice:
      "کمک خواسته‌شده را از اصلاح‌کردن ناخواسته جدا کند و درباره تقسیم کار توافق مشخص بسازد",
  },
  7: {
    area: "شراکت، تعهد، مذاکره، انتخاب شریک و توقعی که هر نفر از رابطه دارد",
    activation:
      "طرف مقابل مستقیماً وارد تعریف فرد از «ما» می‌شود و موضوع تعهد، برابری و قراردادهای رابطه را پررنگ می‌کند",
    example: (source, target, point) =>
      `مثلاً ${point} از سوی ${source} می‌تواند ${target} را وادار کند درباره نام رابطه، آینده، میزان تعهد، انصاف یا توقعی که از شریک دارد موضع روشن‌تری بگیرد.`,
    strength:
      "دو نفر می‌توانند یکدیگر را جدی‌تر ببینند و مهارت مذاکره و همکاری را رشد دهند",
    challenge:
      "فرافکنی، وابستگی به تأیید طرف مقابل یا انتظار اینکه دیگری همه کمبودها را جبران کند ممکن است پررنگ شود",
    targetPractice:
      "خواسته از شریک را به توافق دوطرفه تبدیل کند، نه آزمونی که دیگری باید حدس بزند",
  },
  8: {
    area: "اعتماد، صمیمیت عمیق، رازها، حسادت، قدرت و منابع مشترک",
    activation:
      "رابطه به لایه‌هایی می‌رسد که معمولاً به‌آسانی در اختیار هر کسی قرار نمی‌گیرند",
    example: (source, target, point) =>
      `مثلاً ${source} با ${point} ممکن است ${target} را به حرف‌زدن درباره اعتماد، رابطه جنسی، ترس از دست‌دادن، بدهی، پول مشترک یا چیزی که مدت‌ها پنهان مانده نزدیک کند.`,
    strength:
      "ظرفیت صداقت عمیق، پیوند واقعی و عبور مشترک از بحران بیشتر می‌شود",
    challenge:
      "کنترل، حسادت، ترس از وابستگی یا استفاده از سکوت و راز به‌عنوان قدرت ممکن است وارد رابطه شود",
    targetPractice:
      "مرزهای صمیمیت، پول و اطلاعات شخصی را پیش از بحران روشن و قابل بازبینی کند",
  },
  9: {
    area: "باورها، معنا، تحصیل، سفر و افقی که فرد برای زندگی خودش می‌بیند",
    activation:
      "طرف مقابل نگاه فرد به دنیا را گسترده‌تر می‌کند یا او را وادار می‌کند باورهایش را دوباره بررسی کند",
    example: (source, target, point) =>
      `مثلاً ${point} از سوی ${source} می‌تواند ${target} را به سفر، یادگیری، تغییر یک باور قدیمی یا فکرکردن به مسیر بزرگ‌تری برای آینده دعوت کند.`,
    strength:
      "رابطه می‌تواند الهام، رشد فکری و تجربه‌های تازه بیاورد",
    challenge:
      "موعظه‌کردن، برتری فکری یا تلاش برای قانع‌کردن طرف مقابل به یک حقیقت واحد ممکن است فاصله بسازد",
    targetPractice:
      "تفاوت باور را تهدید نبیند و درباره تجربه‌ای که پشت هر باور است کنجکاو بماند",
  },
  10: {
    area: "مسیر شغلی، مسئولیت اجتماعی، اعتبار و تصویری که فرد می‌خواهد در جهان بسازد",
    activation:
      "حضور طرف مقابل روی هدف‌های بلندمدت، انتخاب‌های شغلی و حس موفقیت اثر مستقیم می‌گذارد",
    example: (source, target, point) =>
      `مثلاً ${source} با ${point} ممکن است ${target} را به گرفتن مسئولیت، تغییر شغل، جدی‌ترشدن درباره هدف یا فکرکردن به تصویری که دیگران از او می‌بینند سوق دهد.`,
    strength:
      "دو نفر می‌توانند به پیشرفت، پشتکار و روشن‌شدن جهت بلندمدت یکدیگر کمک کنند",
    challenge:
      "رابطه ممکن است به میدان قضاوت، فشار برای موفقیت یا رقابت بر سر جایگاه تبدیل شود",
    targetPractice:
      "حمایت از مسیر شغلی را از تعیین‌کردن مسیر زندگی طرف مقابل جدا نگه دارد",
  },
  11: {
    area: "دوستی، جمع، شبکه اجتماعی، آرزوهای آینده و هدف‌های مشترک",
    activation:
      "رابطه فرد را به آدم‌ها، ایده‌ها و برنامه‌هایی وصل می‌کند که فراتر از زندگی دونفره‌اند",
    example: (source, target, point) =>
      `مثلاً ${point} از سوی ${source} می‌تواند ${target} را وارد یک جمع تازه کند، یک پروژه مشترک بسازد یا او را وادار کند درباره آینده و رؤیاهایش جدی‌تر حرف بزند.`,
    strength:
      "دوستی، همکاری و داشتن افق مشترک می‌تواند پایه‌ای پایدار برای رابطه بسازد",
    challenge:
      "جمع دوستان، تفاوت در سبک اجتماعی یا اولویت‌دادن به آینده نسبت به نیازهای اکنون ممکن است فاصله ایجاد کند",
    targetPractice:
      "برای دوستی‌های بیرون رابطه و هدف‌های مشترک، مرز و زمان واقعی تعریف کند",
  },
  12: {
    area: "ناخودآگاه، خلوت، ترس‌های بی‌نام، رؤیاها و احساساتی که مستقیم گفته نمی‌شوند",
    activation:
      "حضور طرف مقابل چیزهایی را بیدار می‌کند که ممکن است اول فقط به شکل حس، خواب، سکوت یا کشش مبهم تجربه شوند",
    example: (source, target, point) =>
      `مثلاً ${source} با ${point} ممکن است در ${target} حس آشنایی عجیب، نیاز به فاصله، رؤیاهای پررنگ یا ناراحتی‌ای ایجاد کند که توضیح‌دادنش در ابتدا آسان نیست.`,
    strength:
      "می‌تواند همدلی عمیق، آرامش در خلوت و فهم ظریف احساسات را بیشتر کند",
    challenge:
      "ابهام، نجات‌دادن، پنهان‌کاری یا نسبت‌دادن احساسات ناگفته به طرف مقابل ممکن است زیاد شود",
    targetPractice:
      "به حس‌های مبهم احترام بگذارد، اما آن‌ها را با سؤال روشن و واقعیت قابل مشاهده بررسی کند",
  },
};

function groupHouseOverlays(
  overlays: SynastryHouseOverlay[],
  labels: { a: string; b: string },
) {
  return [
    {
      id: "a-in-b",
      sourceLabel: labels.a,
      targetLabel: labels.b,
      overlays: overlays.filter((overlay) => overlay.direction === "a-in-b"),
    },
    {
      id: "b-in-a",
      sourceLabel: labels.b,
      targetLabel: labels.a,
      overlays: overlays.filter((overlay) => overlay.direction === "b-in-a"),
    },
  ].filter((group) => group.overlays.length > 0);
}

function buildHouseOverlayNarrative(
  overlay: SynastryHouseOverlay,
  sourceLabel: string,
  targetLabel: string,
): HouseOverlayNarrative {
  const point =
    POINT_OVERLAY_PROFILES[overlay.sourcePointId] ??
    ({
      theme: overlay.sourcePointLabel,
      influence: `کیفیت‌های مربوط به ${overlay.sourcePointLabel}`,
      strength: "می‌تواند این بخش را روشن‌تر و قابل گفت‌وگوتر کند",
      pressure: "ممکن است این بخش را بیش از اندازه فعال یا حساس کند",
      sourcePractice: "اثر خودش را صریح بگوید و برای واکنش طرف مقابل جا بگذارد",
    } satisfies PointOverlayProfile);
  const house = HOUSE_OVERLAY_PROFILES[overlay.targetHouse];

  return {
    title: `${overlay.sourcePointLabel}ِ ${sourceLabel} در خانه ${overlay.targetHouse.toLocaleString("fa-IR")}ِ ${targetLabel}`,
    opening:
      `${overlay.sourcePointLabel} در این جهت، ${point.theme}ِ ${sourceLabel} را وارد حوزهٔ ${house.area} در زندگی ${targetLabel} می‌کند. ` +
      `${point.influence} باعث می‌شود ${house.activation}.`,
    example: house.example(sourceLabel, targetLabel, point.influence),
    strength: `${point.strength}. هم‌زمان ${house.strength}.`,
    challenge: `${point.pressure}. در این خانه، ${house.challenge}.`,
    practice:
      `${sourceLabel} بهتر است ${point.sourcePractice}. ${targetLabel} هم بهتر است ${house.targetPractice}.`,
  };
}

function normalizePersonLabel(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized && normalized !== "چارت بدون نام" ? normalized : fallback;
}

function formatRelationshipContext(context: SynastryRelationshipContext) {
  const labels: Record<SynastryRelationshipContext, string> = {
    romantic: "رابطه عاطفی",
    friendship: "رابطه دوستی",
    family: "رابطه خانوادگی",
    work: "رابطه کاری",
    general: "مقایسه عمومی",
  };

  return labels[context];
}

function formatDegree(value: number) {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value)}°`;
}
