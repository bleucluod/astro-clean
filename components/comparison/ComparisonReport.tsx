"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ComparisonBiWheel } from "@/components/comparison/ComparisonBiWheel";
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
import type { ComparisonRecord } from "@/types/comparison-product";
import type {
  HumanFirstDirectionalNarrativeBlock,
  HumanFirstEvidence,
} from "@/types/human-first-reading";
import type {
  SynastryHouseOverlay,
  SynastryRelationshipContext,
} from "@/types/synastry-engine";

import styles from "./comparison.module.css";

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
      <main className={styles.product}>
        <div className={styles.emptyState} role="status">
          <strong>در حال باز کردن مقایسه…</strong>
        </div>
      </main>
    );
  }

  if (!record || !reading) {
    return (
      <main className={styles.product}>
        <div className={styles.emptyState}>
          <strong>این مقایسه روی این دستگاه پیدا نشد.</strong>
          <p>ممکن است پاک شده باشد یا در مرورگر دیگری ساخته شده باشد.</p>
          <Link className={styles.primaryButton} href="/compare">
            برگشت به مقایسه‌ها
          </Link>
        </div>
      </main>
    );
  }

  const labels = {
    a: normalizePersonLabel(record.chartALabel, "نفر اول"),
    b: normalizePersonLabel(record.chartBLabel, "نفر دوم"),
  };

  return (
    <main
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
          <p className={styles.heroLead}>{reading.overviewFa}</p>
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
          aria-selected={mode === "reading"}
          data-active={mode === "reading"}
          onClick={() => setMode("reading")}
          role="tab"
          type="button"
        >
          خوانش رابطه
        </button>
        <button
          aria-selected={mode === "technical"}
          data-active={mode === "technical"}
          onClick={() => setMode("technical")}
          role="tab"
          type="button"
        >
          جزئیات نجومی
        </button>
      </div>

      {mode === "reading" ? (
        <div className={styles.readingFlow}>
          <section
            className={styles.relationshipChapter}
            aria-labelledby="comparison-primary-patterns-title"
          >
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>سه الگوی اصلی میان شما</p>
              <h2 id="comparison-primary-patterns-title">
                سه چرخه‌ای که بهتر است زودتر بشناسید
              </h2>
              <p>
                هر الگو را کامل بخوان و بعد سراغ بعدی برو؛ قرار نیست سه روایت
                فشرده را هم‌زمان کنار هم نگه داری.
              </p>
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

          <RelationshipChapter
            eyebrow="جایی که راحت‌تر به هم نزدیک می‌شوید"
            title="وقتی تفاوت‌ها به کمک هم می‌آیند"
            blocks={[reading.support]}
            labels={labels}
          />

          <RelationshipChapter
            eyebrow="گفت‌وگو"
            title="جایی که ممکن است حرف هم را سخت‌تر بشنوید"
            intro="گاهی مسئله خودِ حرف نیست؛ سرعت پاسخ‌دادن، نیاز به مکث یا برداشتی است که هر نفر از سکوت و توضیح دیگری می‌سازد."
            blocks={[reading.misunderstanding, reading.communication]}
            labels={labels}
          />

          <RelationshipChapter
            eyebrow="امنیت و صمیمیت"
            title="چطور نزدیک می‌شوید و چقدر به فاصله نیاز دارید؟"
            intro="امنیت برای هر دو نفر می‌تواند معنای متفاوتی داشته باشد. این تفاوت وقتی گفته شود، به‌جای فاصله می‌تواند تبدیل به راهنمای نزدیکی شود."
            blocks={[reading.emotionalSecurity, reading.closenessIndependence]}
            labels={labels}
          />

          <RelationshipChapter
            eyebrow="مرز و ترمیم"
            title="وقتی رابطه گیر می‌کند، چطور دوباره به هم برمی‌گردید؟"
            intro="مرز روشن و ترمیم به‌موقع دو چیز جدا نیستند؛ هر دو کمک می‌کنند اختلاف به زخمی طولانی تبدیل نشود."
            blocks={[reading.boundariesCommitment, reading.frictionRepair]}
            labels={labels}
          />

          <section className={styles.relationshipChapter} id="comparison-growth">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>جهت رشد رابطه</p>
              <h2>این رابطه از هر نفر چه مهارتی می‌خواهد؟</h2>
            </div>
            <div className={styles.growthFlow}>
              <article>
                <span>{labels.a}</span>
                <p>{reading.growth.personASkill}</p>
              </article>
              <article>
                <span>{labels.b}</span>
                <p>{reading.growth.personBSkill}</p>
              </article>
            </div>
            <div className={styles.cycleLine}>
              <strong>چرخه‌ای که بهتر است زودتر ببینید</strong>
              <p>{reading.growth.cycleToNotice}</p>
            </div>
            <div className={styles.practiceLine}>
              <strong>یک کار کوچک که می‌تواند کمک کند</strong>
              <p>{reading.growth.practicalStep}</p>
            </div>
          </section>

          <section className={styles.limitationsCard}>
            <p className={styles.eyebrow}>حدود این خوانش</p>
            <p>{reading.readingLimitFa}</p>
          </section>
        </div>
      ) : null}

      {mode === "technical" ? (
        <div className={styles.technicalFlow}>
          <section className={styles.wheelSection}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>چرخ دو چارت</p>
              <h2>جایگاه دو چارت را روی یک تصویر ببین</h2>
              <p>
                این تصویر کمک می‌کند تماس‌هایی را که در خوانش دیدی روی چرخ
                پیدا کنی، بدون اینکه جای روایت انسانی را بگیرد.
              </p>
            </div>
            <ComparisonBiWheel report={record.report} />
          </section>

          <section className={styles.technicalDetails}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>همهٔ تماس‌ها</p>
              <h2>نام تماس، فاصلهٔ زاویه‌ای و اورب</h2>
              <p>
                نام تماس‌ها، جهت آن‌ها و فاصله از زاویهٔ دقیق را یک‌جا ببین.
              </p>
            </div>
            <div className={styles.contactList}>
              {record.report.contacts.map((contact) => (
                <article
                  className={styles.contactCard}
                  data-polarity={contact.polarity}
                  key={contact.id}
                >
                  <div>
                    <span>{contact.aspectLabel}</span>
                    <strong>{contact.titleFa}</strong>
                  </div>
                  <dl className={styles.contactFacts}>
                    <div>
                      <dt>فاصلهٔ زاویه‌ای</dt>
                      <dd>{formatDegree(contact.separation)}</dd>
                    </div>
                    <div>
                      <dt>اورب</dt>
                      <dd>{formatDegree(contact.orb)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          {record.report.houseOverlays.length > 0 ? (
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
    </main>
  );
}

function RelationshipChapter({
  eyebrow,
  title,
  intro,
  blocks,
  labels,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  blocks: HumanFirstDirectionalNarrativeBlock[];
  labels: { a: string; b: string };
}) {
  return (
    <section className={styles.relationshipChapter}>
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        {intro ? <p>{intro}</p> : null}
      </div>
      <div className={styles.chapterBlocks}>
        {blocks.map((block) => (
          <article className={styles.chapterBlock} key={block.id}>
            <h3>{block.title}</h3>
            <DirectionalStory block={block} labels={labels} />
          </article>
        ))}
      </div>
    </section>
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
