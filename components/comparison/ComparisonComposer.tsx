"use client";

import Link from "next/link";
import { AccountProductAccessCard } from "@/components/monetization/ProductAccessCards";
import { ProductLockedOffer } from "@/components/monetization/ProductAccessCards";
import { useProductAccess } from "@/lib/monetization/product-access-client";
import { trackComparePublicAggregateEvent } from "@/lib/config/analytics";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPrivateComparison,
  getComparisonChartLabel,
  getDefaultComparisonBirthTimeStatus,
} from "@/lib/comparison/comparison-product-service";
import {
  deletePrivateComparison,
  loadPrivateComparisons,
  savePrivateComparison,
  subscribeToPrivateComparisons,
} from "@/lib/comparison/comparison-storage";
import { loadReports } from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";
import type { ComparisonRecord } from "@/types/comparison-product";
import type {
  SynastryBirthTimeStatus,
  SynastryRelationshipContext,
} from "@/types/synastry-engine";

import styles from "./comparison.module.css";

const RELATIONSHIP_OPTIONS: ReadonlyArray<{
  value: SynastryRelationshipContext;
  label: string;
  description: string;
}> = [
  {
    value: "romantic",
    label: "عاطفی",
    description: "برای رابطه عاشقانه، نامزدی یا زندگی مشترک",
  },
  {
    value: "friendship",
    label: "دوستی",
    description: "برای صمیمیت، همراهی و مرزهای دوستی",
  },
  {
    value: "family",
    label: "خانوادگی",
    description: "برای رابطه والد، فرزند، خواهر، برادر یا خویشاوند",
  },
  {
    value: "work",
    label: "کاری",
    description: "برای همکاری، تقسیم نقش و ارتباط حرفه‌ای",
  },
  {
    value: "general",
    label: "عمومی",
    description: "برای مقایسه‌ای بدون فرض درباره نوع رابطه",
  },
];

export function ComparisonComposer({ embedded = false, initialMonetizationMode = "CONFIGURED" }: { embedded?: boolean; initialMonetizationMode?: "FREE_ALL" | "CONFIGURED" }) {
  const router = useRouter();
  const productAccess = useProductAccess();
  // HALLEUS_FREE_ALL_RELATIONSHIP_BATCH1_R1
  const effectiveMonetizationMode =
    productAccess.status === "loading"
      ? initialMonetizationMode
      : productAccess.access.policy.monetizationMode;
  // TEMPORARY_COMPARE_FREE_ACCESS_2026_09
  // Product decision: /compare is free during the current launch phase.
  // Keep the configured credit path dormant so this can be reversed later.
  const temporaryFreeRelationshipAccess = true;
  const freeAllAccess =
    temporaryFreeRelationshipAccess || effectiveMonetizationMode === "FREE_ALL";
  const [reports, setReports] = useState<AstrologyReport[]>([]);
  const [history, setHistory] = useState<ComparisonRecord[]>([]);
  const [chartAId, setChartAId] = useState("");
  const [chartBId, setChartBId] = useState("");
  const [chartATimeStatus, setChartATimeStatus] =
    useState<SynastryBirthTimeStatus>("unknown");
  const [chartBTimeStatus, setChartBTimeStatus] =
    useState<SynastryBirthTimeStatus>("unknown");
  const [relationshipContext, setRelationshipContext] =
    useState<SynastryRelationshipContext>("romantic");
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [productLocked, setProductLocked] = useState(false);

  const generationInFlightRef = useRef(false);
  const pendingGenerationRef = useRef<{
    signature: string;
    recordId: string;
  } | null>(null);
  const refreshLibrary = useCallback(() => {
    setReports(loadReports());
    setHistory(loadPrivateComparisons());
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(refreshLibrary);
    const unsubscribe = subscribeToPrivateComparisons(refreshLibrary);
    window.addEventListener("focus", refreshLibrary);
    window.addEventListener("astro-clean-data-changed", refreshLibrary);

    return () => {
      window.cancelAnimationFrame(frame);
      unsubscribe();
      window.removeEventListener("focus", refreshLibrary);
      window.removeEventListener("astro-clean-data-changed", refreshLibrary);
    };
  }, [refreshLibrary]);

  const usableReports = useMemo(
    () => reports.filter((report) => Boolean(report.realEngine)),
    [reports],
  );
  const chartA = useMemo(
    () => usableReports.find((report) => report.id === chartAId) ?? null,
    [chartAId, usableReports],
  );
  const chartB = useMemo(
    () => usableReports.find((report) => report.id === chartBId) ?? null,
    [chartBId, usableReports],
  );

  useEffect(() => {
    trackComparePublicAggregateEvent("compare_landing_view");
  }, []);

  useEffect(() => {
    if (chartAId || usableReports.length !== 1) return;
    const [onlyReport] = usableReports;
    const frame = window.requestAnimationFrame(() => {
      setChartAId(onlyReport.id);
      setChartATimeStatus(getDefaultComparisonBirthTimeStatus(onlyReport));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chartAId, usableReports]);


  function selectChartA(nextId: string) {
    setChartAId(nextId);
    if (nextId) trackComparePublicAggregateEvent("compare_slot_completed");
    const report = usableReports.find((item) => item.id === nextId);
    if (report) setChartATimeStatus(getDefaultComparisonBirthTimeStatus(report));
    setMessage("");
  }

  function selectChartB(nextId: string) {
    setChartBId(nextId);
    if (nextId) trackComparePublicAggregateEvent("compare_slot_completed");
    const report = usableReports.find((item) => item.id === nextId);
    if (report) setChartBTimeStatus(getDefaultComparisonBirthTimeStatus(report));
    setMessage("");
  }

  async function generateComparison() {
    if (generationInFlightRef.current) return;
    if (!chartA || !chartB) {
      setMessage("دو چارت محاسبه‌شده را انتخاب کن.");
      return;
    }
    if (!freeAllAccess && productAccess.status === "loading") {
      setMessage("وضعیت دسترسی هنوز در حال بررسی است.");
      return;
    }
    if (!freeAllAccess && productAccess.status === "unavailable") {
      setMessage("وضعیت دسترسی فعلاً قابل تأیید نیست.");
      return;
    }
    if (!freeAllAccess && productAccess.access.balances.relationship < 1) {
      setProductLocked(true);
      setMessage("برای ساخت تحلیل رابطه تازه یک اعتبار تحلیل رابطه لازم است.");
      return;
    }

    generationInFlightRef.current = true;
    trackComparePublicAggregateEvent("compare_generation_started");
    setProductLocked(false);
    setIsWorking(true);
    setMessage("");

    const signature = [
      chartA.id,
      chartB.id,
      chartATimeStatus,
      chartBTimeStatus,
      relationshipContext,
    ].join("|");
    const pending = pendingGenerationRef.current;
    const result = createPrivateComparison(chartA, chartB, {
      chartAId: chartA.id,
      chartBId: chartB.id,
      chartALabel: getComparisonChartLabel(chartA, "نفر اول"),
      chartBLabel: getComparisonChartLabel(chartB, "نفر دوم"),
      chartABirthTimeStatus: chartATimeStatus,
      chartBBirthTimeStatus: chartBTimeStatus,
      relationshipContext,
      recordId: pending?.signature === signature ? pending.recordId : undefined,
    });
    if (!result.ok) {
      generationInFlightRef.current = false;
      setIsWorking(false);
      setMessage(result.message);
      return;
    }

    pendingGenerationRef.current = {
      signature,
      recordId: result.record.id,
    };

    // HALLEUS_CONFIGURED_RELATIONSHIP_CONSUME_BATCH1_R1
    if (!freeAllAccess) {
      const consume = await productAccess.consumeRelationship(result.record.id);
      if (!consume.ok) {
        generationInFlightRef.current = false;
        setProductLocked(true);
        setIsWorking(false);
        setMessage(consume.error ?? "مصرف اعتبار تحلیل رابطه انجام نشد.");
        return;
      }
    }

    const storageResult = savePrivateComparison(result.record);
    if (!storageResult.ok) {
      generationInFlightRef.current = false;
      setIsWorking(false);
      setMessage(
        `${storageResult.message} تلاش دوباره با همان شناسه انجام می‌شود و اعتبار دوباره مصرف نمی‌شود.`,
      );
      return;
    }

    pendingGenerationRef.current = null;
    router.push(`/compare/${encodeURIComponent(result.record.id)}`);
  }
  function removeComparison(comparisonId: string) {
    const result = deletePrivateComparison(comparisonId);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setHistory(result.records);
  }

  const accessResolved =
    freeAllAccess ||
    (productAccess.status !== "loading" && productAccess.status !== "unavailable");
  const hasRelationshipCredit =
    freeAllAccess || productAccess.access.balances.relationship >= 1;
  const generationDisabled =
    isWorking ||
    !chartA ||
    !chartB ||
    !accessResolved ||
    !hasRelationshipCredit;
  return (
    <div
      className={styles.product}
      data-halleus-progressive-compare="batch4-r1"
      data-embedded={embedded ? "true" : undefined}
      data-app-like-builder="r11"
      data-builder-simplified="r12"
    >
      {!embedded ? <>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>تحلیل رابطه</p>
          <h1>تحلیل رابطه با مقایسه دو چارت تولد</h1>
          <p>
            این خوانش به‌جای یک نمره یا حکم قطعی، نشان می‌دهد کجا راحت‌تر به هم می‌رسید، کجا ممکن است سوءتفاهم بسازید و چه چیزی به امنیت و ترمیم رابطه کمک می‌کند.
          </p>
        </div>
        <div className={styles.privacyBadge}>
          <strong>خوانش چندلایه، نه یک نمره</strong>
          <span>الگوهای رابطه جداگانه توضیح داده می‌شوند تا نتیجه قابل‌استفاده‌تر باشد.</span>
        </div>
      </section>

      <section className={styles.landingOverview} aria-labelledby="synastry-overview-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>چارت سیناستری آنلاین</p>
          <h2 id="synastry-overview-title">سیناستری چه چیزی را کنار هم می‌گذارد؟</h2>
          <p>
            سیناستری جایگاه‌های دو چارت تولد را با هم می‌خواند تا الگوهای تماس، تفاوت و هم‌راهی روشن‌تر شوند. این خوانش برای رابطهٔ عاطفی، دوستی، خانواده، همکاری یا یک رابطهٔ عمومی قابل استفاده است؛ اما موفقیت یا شکست رابطه را پیش‌بینی نمی‌کند.
          </p>
        </div>
        <div className={styles.useCaseList} aria-label="کاربردهای تحلیل رابطه">
          {RELATIONSHIP_OPTIONS.map((option) => (
            <span key={option.value}>{option.label}</span>
          ))}
        </div>
      </section>

      <section className={styles.landingDynamics} aria-labelledby="synastry-dynamics-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>محورهای خوانش</p>
          <h2 id="synastry-dynamics-title">به‌جای یک نمره، چند بُعد رابطه را ببین</h2>
          <p>
            هر بخش از خوانش یک پرسش مشخص را دنبال می‌کند تا تفاوت میان کشش، امنیت، اصطکاک و امکان رشد گم نشود.
          </p>
        </div>
        <div className={styles.landingDynamicsGrid}>
          <article>
            <h3>گفت‌وگو</h3>
            <p>ریتم بیان، شنیدن و جاهایی که سوءبرداشت محتمل‌تر است.</p>
          </article>
          <article>
            <h3>امنیت عاطفی</h3>
            <p>شیوه‌های متفاوت دریافت حمایت، آرامش و پاسخ عاطفی.</p>
          </article>
          <article>
            <h3>نزدیکی و استقلال</h3>
            <p>تعادل میان باهم‌بودن، فضای شخصی و نیازهای متفاوت دو نفر.</p>
          </article>
          <article>
            <h3>مرز و تعهد</h3>
            <p>جاهایی که انتظار، مسئولیت یا تعریف رابطه نیاز به گفت‌وگوی روشن دارد.</p>
          </article>
          <article>
            <h3>اصطکاک و ترمیم</h3>
            <p>الگوهای تنش و راه‌هایی که می‌توانند بازگشت به گفت‌وگو را آسان‌تر کنند.</p>
          </article>
          <article>
            <h3>جهت رشد</h3>
            <p>پرسش‌ها و تمرین‌هایی برای دیدن انتخاب‌های آگاهانه‌تر در رابطه.</p>
          </article>
        </div>
      </section>

      <section className={styles.landingBoundary} aria-labelledby="synastry-boundary-title">
        <div>
          <p className={styles.eyebrow}>مرز خوانش</p>
          <h2 id="synastry-boundary-title">این خوانش حکم قطعی دربارهٔ رابطه نمی‌دهد</h2>
          <p>
            هالیوس درصد سازگاری نمی‌سازد و دربارهٔ آینده یا ارزش رابطه داوری نمی‌کند. هدف این خوانش روشن‌ترکردن الگوهایی است که میان دو نفر تکرار می‌شوند.
          </p>
        </div>
        <div className={styles.landingLinks}>
          <Link href="/chart">ساخت چارت تولد</Link>
        </div>
      </section>

      </> : null}

      <section
        className={styles.composerCard}
        aria-busy={isWorking}
        aria-labelledby="comparison-builder-title"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>ساخت تحلیل رابطه</p>
          <h2 id="comparison-builder-title">دو چارت را انتخاب کن</h2>
          <p>
            دو چارت ذخیره‌شده را انتخاب کن و بعد نوع رابطه را مشخص کن.
          </p>
        </div>

        {usableReports.length < 2 ? (
          <div className={styles.builderNotice}>
            <p>برای مقایسه به دو چارت ذخیره‌شده نیاز داری.</p>
            <Link className={styles.libraryLink} href="/chart">ساخت چارت تولد</Link>
          </div>
        ) : null}

        <section className={styles.flowStep} data-flow-step="charts">
          <div className={styles.stepHeading}>
            <span>۱–۲</span>
            <div>
              <h3>دو چارت متفاوت را آماده کن</h3>
              <p>می‌توانی از چارت‌های آماده انتخاب کنی یا برای ساخت چارت تازه به صفحهٔ <Link href="/chart">چارت تولد</Link> بروی.</p>
            </div>
          </div>
          <div className={styles.chartGrid}>
            <ChartPicker
              label="من"
              value={chartAId}
              reports={reports}
              excludedId={chartBId}
              timeStatus={chartATimeStatus}
              onChange={selectChartA}
              onTimeStatusChange={setChartATimeStatus}
            />
            <ChartPicker
              label="طرف مقابل"
              value={chartBId}
              reports={reports}
              excludedId={chartAId}
              timeStatus={chartBTimeStatus}
              onChange={selectChartB}
              onTimeStatusChange={setChartBTimeStatus}
            />
          </div>
        </section>

        <section className={styles.flowStep} data-flow-step="relationship">
          <div className={styles.stepHeading}>
            <span>۳</span>
            <div>
              <h3>زمینهٔ رابطه را مشخص کن</h3>
              <p>این انتخاب فقط لحن و تمرکز خوانش را تنظیم می‌کند و حکم قطعی درباره آینده رابطه نمی‌دهد.</p>
            </div>
          </div>
          <fieldset className={styles.relationshipFieldset}>
            <legend>نوع رابطه</legend>
            <div className={styles.relationshipGrid}>
              {RELATIONSHIP_OPTIONS.map((option) => (
                <label
                  className={styles.relationshipOption}
                  data-selected={relationshipContext === option.value}
                  key={option.value}
                >
                  <input
                    type="radio"
                    name="relationship-context"
                    value={option.value}
                    checked={relationshipContext === option.value}
                    onChange={() => {
                      setRelationshipContext(option.value);
                      trackComparePublicAggregateEvent("compare_relationship_selected");
                      setMessage("");
                    }}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        {message ? <p className={styles.errorMessage} role="alert">{message}</p> : null}

        {!freeAllAccess &&
        (productLocked || !hasRelationshipCredit) &&
        chartA &&
        chartB ? (
          <ProductLockedOffer
            productCode="relationship"
            title={`خوانش کامل ${getComparisonChartLabel(chartA)} و ${getComparisonChartLabel(chartB)}`}
            description={`برای زمینهٔ ${RELATIONSHIP_OPTIONS.find((item) => item.value === relationshipContext)?.label ?? "عمومی"}، پاسخ‌های این دو چارت پشت دسترسی Relationship می‌ماند؛ دادهٔ تولد نفر دوم برای بررسی اعتبار به سرور فرستاده نمی‌شود.`}
            items={["گفت‌وگو و سوءبرداشت", "امنیت عاطفی و نزدیکی", "اصطکاک، مرزها و ترمیم", "این نتیجه بعد از ساخت دوباره اعتبار مصرف نمی‌کند"]}
            href="/pricing"
          />
        ) : null}

        {!freeAllAccess ? (
<section className={styles.creditStage} data-flow-step="credit">
            <div className={styles.stepHeading}>
              <span>۵</span>
              <div>
                <h3>اعتبار رابطه و ساخت تحلیل</h3>
                <p>ساخت یک تحلیل تازه یک اعتبار رابطه مصرف می‌کند. بازکردن نتیجهٔ ذخیره‌شده اعتبار دیگری مصرف نمی‌کند.</p>
              </div>
            </div>
            <div className={styles.creditWidget}><AccountProductAccessCard /></div>
            <Link className={styles.purchasePath} href="/pricing">اعتبار کافی نداری؟ بسته‌های فعال را ببین</Link>
          </section>
        ) : null}

        <button
          className={styles.primaryButton}
          type="button"
          disabled={generationDisabled}
          onClick={generateComparison}
        >
          {isWorking
            ? "در حال ساخت خوانش…"
            : freeAllAccess
              ? "ساخت تحلیل رابطه"
              : "ساخت تحلیل رابطه — مصرف ۱ اعتبار"}
        </button>
      </section>

      {history.length > 0 ? (
        <section className={styles.historySection} aria-labelledby="comparison-history-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>خوانش‌های قبلی</p>
            <h2 id="comparison-history-title">مقایسه‌های قبلی</h2>
            <p>مقایسه‌های اخیرت را می‌توانی از همین‌جا باز یا حذف کنی.</p>
          </div>
          <div className={styles.historyGrid}>
            {history.map((record) => (
              <article className={styles.historyCard} key={record.id}>
                <div>
                  <span>{formatRelationshipContext(record.relationshipContext)}</span>
                  <h3>{record.chartALabel} و {record.chartBLabel}</h3>
                  <p>{formatPersianDate(record.updatedAt)}</p>
                </div>
                <div className={styles.cardActions}>
                  <Link className={styles.secondaryButton} href={`/compare/${record.id}`}>
                    باز کردن
                  </Link>
                  <button
                    className={styles.dangerButton}
                    type="button"
                    onClick={() => removeComparison(record.id)}
                  >
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ChartPicker({
  label,
  value,
  reports,
  excludedId,
  timeStatus,
  onChange,
  onTimeStatusChange,
}: {
  label: string;
  value: string;
  reports: AstrologyReport[];
  excludedId: string;
  timeStatus: SynastryBirthTimeStatus;
  onChange: (value: string) => void;
  onTimeStatusChange: (value: SynastryBirthTimeStatus) => void;
}) {
  const selected = reports.find((report) => report.id === value) ?? null;
  return (
    <div className={styles.chartPicker}>
      <label>
        <span>{label}</span>
        <select
          value={value}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onChange(event.target.value)
          }
        >
          <option value="">انتخاب چارت</option>
          {reports
            .filter((report) => report.id !== excludedId)
            .map((report) => (
              <option
                disabled={!report.realEngine}
                key={report.id}
                value={report.id}
              >
                {getComparisonChartLabel(report)} · {report.input.birthCity}
                {!report.realEngine ? " · محاسبه کامل نیست" : ""}
              </option>
            ))}
        </select>
      </label>
      {selected?.realEngine ? (
        <div className={styles.chartSelectionSummary}>
          <strong>{getComparisonChartLabel(selected)}</strong>
          <span>{selected.input.birthDate} · {selected.input.birthCity}</span>
        </div>
      ) : null}
      {value ? (
        <label className={styles.timeAccuracyChoice}>
          <input
            type="checkbox"
            checked={timeStatus === "exact"}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onTimeStatusChange(event.target.checked ? "exact" : "unknown")
            }
          />
          <span>
            <strong>ساعت تولد این چارت دقیق است</strong>
            <small>
              اگر ساعت دقیق نیست، رایزینگ و هم‌پوشانی خانه‌ها وارد خوانش نمی‌شوند؛ بقیهٔ پیوندها همچنان بررسی می‌شوند.
            </small>
          </span>
        </label>
      ) : null}
    </div>
  );
}
function formatRelationshipContext(context: SynastryRelationshipContext) {
  return RELATIONSHIP_OPTIONS.find((option) => option.value === context)?.label ?? "عمومی";
}

function formatPersianDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
