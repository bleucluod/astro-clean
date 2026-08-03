"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

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

export function ComparisonComposer() {
  const router = useRouter();
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
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

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

  function selectChartA(nextId: string) {
    setChartAId(nextId);
    const report = usableReports.find((item) => item.id === nextId);
    if (report) setChartATimeStatus(getDefaultComparisonBirthTimeStatus(report));
    setMessage("");
  }

  function selectChartB(nextId: string) {
    setChartBId(nextId);
    const report = usableReports.find((item) => item.id === nextId);
    if (report) setChartBTimeStatus(getDefaultComparisonBirthTimeStatus(report));
    setMessage("");
  }

  function generateComparison() {
    if (!chartA || !chartB) {
      setMessage("دو چارت محاسبه‌شده را انتخاب کن.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    const result = createPrivateComparison(chartA, chartB, {
      chartAId: chartA.id,
      chartBId: chartB.id,
      chartALabel: getComparisonChartLabel(chartA, "نفر اول"),
      chartBLabel: getComparisonChartLabel(chartB, "نفر دوم"),
      chartABirthTimeStatus: chartATimeStatus,
      chartBBirthTimeStatus: chartBTimeStatus,
      relationshipContext,
      secondPersonConsentConfirmed: consentConfirmed,
    });

    if (!result.ok) {
      setIsWorking(false);
      setMessage(result.message);
      return;
    }

    const storageResult = savePrivateComparison(result.record);
    if (!storageResult.ok) {
      setIsWorking(false);
      setMessage(storageResult.message);
      return;
    }

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

  return (
    <main className={styles.product}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>مقایسه دو چارت</p>
          <h1>رابطه را از میان دو چارت بخوان</h1>
          <p>
            این گزارش به‌جای درصد سازگاری، الگوهای حمایت، اصطکاک، گفت‌وگو،
            امنیت عاطفی و مرزهای رابطه را از تماس‌های واقعی دو چارت کنار هم می‌گذارد.
          </p>
        </div>
        <div className={styles.privacyBadge}>
          <strong>خصوصی روی همین دستگاه</strong>
          <span>noindex · بدون لینک عمومی · بدون ارسال داده به Analytics</span>
        </div>
      </section>

      <section className={styles.composerCard} aria-labelledby="comparison-builder-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>ساخت مقایسه</p>
          <h2 id="comparison-builder-title">دو چارت را انتخاب کن</h2>
          <p>
            فقط جایگاه‌ها، زاویه‌ها و خانه‌های لازم وارد مقایسه می‌شوند؛ تاریخ، شهر
            و ساعت خام نفر دوم در رکورد مقایسه ذخیره نمی‌شود.
          </p>
        </div>

        {usableReports.length < 2 ? (
          <div className={styles.emptyState}>
            <strong>برای شروع به دو چارت محاسبه‌شده نیاز داری.</strong>
            <p>
              چارت دوم را در یک تب تازه بساز. وقتی به این صفحه برگردی، فهرست به‌صورت
              خودکار تازه می‌شود.
            </p>
            <Link className={styles.primaryButton} href="/chart" target="_blank" rel="noreferrer noopener">
              ساخت چارت دوم در تب تازه
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.chartGrid}>
              <ChartPicker
                label="چارت اول"
                value={chartAId}
                reports={usableReports}
                excludedId={chartBId}
                timeStatus={chartATimeStatus}
                onChange={selectChartA}
                onTimeStatusChange={setChartATimeStatus}
              />
              <ChartPicker
                label="چارت دوم"
                value={chartBId}
                reports={usableReports}
                excludedId={chartAId}
                timeStatus={chartBTimeStatus}
                onChange={selectChartB}
                onTimeStatusChange={setChartBTimeStatus}
              />
            </div>

            <div className={styles.builderToolbar}>
              <Link className={styles.secondaryButton} href="/chart" target="_blank" rel="noreferrer noopener">
                ساخت چارت تازه
              </Link>
              <button className={styles.textButton} type="button" onClick={refreshLibrary}>
                به‌روزرسانی فهرست چارت‌ها
              </button>
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
                      onChange={() => setRelationshipContext(option.value)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className={styles.consentBox}>
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setConsentConfirmed(event.target.checked)}
              />
              <span>
                <strong>اجازه استفاده از اطلاعات نفر دوم را دارم</strong>
                <small>
                  این رضایت فقط برای ساخت همین مقایسه خصوصی است و به معنی انتشار یا
                  نمایش عمومی اطلاعات نیست.
                </small>
              </span>
            </label>

            {message ? <p className={styles.errorMessage} role="alert">{message}</p> : null}

            <button
              className={styles.primaryButton}
              type="button"
              disabled={isWorking || !chartA || !chartB}
              onClick={generateComparison}
            >
              {isWorking ? "در حال ساخت مقایسه…" : "ساخت گزارش مقایسه"}
            </button>
          </>
        )}
      </section>

      <section className={styles.historySection} aria-labelledby="comparison-history-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>تاریخچه خصوصی</p>
          <h2 id="comparison-history-title">مقایسه‌های ذخیره‌شده</h2>
          <p>حداکثر شش مقایسه روی همین مرورگر نگه‌داری می‌شود.</p>
        </div>

        {history.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>هنوز مقایسه‌ای ذخیره نشده است.</strong>
          </div>
        ) : (
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
        )}
      </section>
    </main>
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
  return (
    <div className={styles.chartPicker}>
      <label>
        <span>{label}</span>
        <select value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
          <option value="">انتخاب چارت</option>
          {reports
            .filter((report) => report.id !== excludedId)
            .map((report) => (
              <option key={report.id} value={report.id}>
                {getComparisonChartLabel(report)} · {report.input.birthCity}
              </option>
            ))}
        </select>
      </label>

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
              اگر خاموش باشد، زاویه‌ها و هم‌پوشانی خانه‌ها وارد نتیجه نمی‌شوند.
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
