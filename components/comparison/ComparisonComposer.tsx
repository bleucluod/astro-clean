"use client";

import { HALLEUS_ANALYTICS_ACTION } from "@/lib/analytics/first-party";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
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
  getComparisonChartLabel,
  getDefaultComparisonBirthTimeStatus,
} from "@/lib/comparison/comparison-product-service";
import {
  deletePrivateComparison,
  loadPrivateComparisons,
  subscribeToPrivateComparisons,
} from "@/lib/comparison/comparison-storage";
import { loadReports } from "@/lib/storage/reports-storage";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";
import {
  getAccountReportRecord,
  listAccountReportSummaries,
} from "@/lib/storage/account-report-read-client";
import type { ReportRecordSummary } from "@/types/storage";
import type { AstrologyReport, BirthInput } from "@/types/astro";
import type { ComparisonFormHandle } from "@/components/ChartForm";
import type {
  SynastryBirthTimeStatus,
  SynastryRelationshipContext,
} from "@/types/synastry-engine";

import { requestPremiumComparison } from "@/lib/comparison/comparison-premium-client";
import type { DirectBirth } from "@/lib/comparison/comparison-direct-input";
import type { ComparisonRecord } from "@/types/comparison-product";
import { ComparisonPremiumLibrary } from "./ComparisonPremiumLibrary";
import styles from "./comparison.module.css";
import chartStyles from "@/app/chart/chart-shell.module.css";

const DirectChartForm = dynamic(
  () => import("@/components/ChartForm").then((module) => module.ChartForm),
  { ssr: false, loading: () => <p role="status">در حال آماده‌سازی فرم…</p> },
);

const RELATIONSHIP_OPTIONS: ReadonlyArray<{
  value: SynastryRelationshipContext;
  label: string;
}> = [
  {
    value: "romantic",
    label: "عاطفی",
  },
  {
    value: "friendship",
    label: "دوستی",
  },
  {
    value: "family",
    label: "خانوادگی",
  },
  {
    value: "work",
    label: "کاری",
  },
  {
    value: "general",
    label: "عمومی",
  },
];

type AccountChartsState =
  | "checking"
  | "signed-out"
  | "ready"
  | "disabled"
  | "failed";

type ComparisonChartOption = {
  id: string;
  label: string;
  birthDate: string;
  birthCity: string;
  createdAt: string;
  source: "device" | "account" | "session";
  sourceLabel: string;
};
export function ComparisonComposer({ embedded = false, premiumEnabled = false }: { embedded?: boolean; premiumEnabled?: boolean }) {
  const router = useRouter();
  const [reports, setReports] = useState<AstrologyReport[]>([]);
  const formARef = useRef<ComparisonFormHandle>(null);
  const formBRef = useRef<ComparisonFormHandle>(null);
  const [initialInputA, setInitialInputA] = useState<BirthInput>();
  const [initialInputB, setInitialInputB] = useState<BirthInput>();
  const [readyA, setReadyA] = useState(false);
  const [readyB, setReadyB] = useState(false);
  const [history, setHistory] = useState<ComparisonRecord[]>([]);
  const [chartAId, setChartAId] = useState("");
  const [chartBId, setChartBId] = useState("");
  const [chartATimeStatus, setChartATimeStatus] =
    useState<SynastryBirthTimeStatus>("unknown");
  const [chartBTimeStatus, setChartBTimeStatus] =
    useState<SynastryBirthTimeStatus>("unknown");
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const generationInFlightRef = useRef(false);
  const accountOwnerRef = useRef<string | null | undefined>(undefined);
  const accountEpochRef = useRef(0);
  const [formRevision, setFormRevision] = useState(0);
  const pendingGenerationRef = useRef<{
    signature: string;
    recordId: string;
  } | null>(null);
  const [accountSummaries, setAccountSummaries] = useState<ReportRecordSummary[]>([]);
  const [accountReports, setAccountReports] = useState<AstrologyReport[]>([]);
  const [accountChartsState, setAccountChartsState] =
    useState<AccountChartsState>("checking");
  const [, setAccountChartsMessage] = useState(
    "در حال بررسی چارت‌های حساب…",
  );
  const [accountChartLoadingId, setAccountChartLoadingId] = useState<string | null>(
    null,
  );
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const refreshLibrary = useCallback(() => {
    setReports(loadReports());
    setHistory(loadPrivateComparisons());
  }, []);

  const refreshAccountLibrary = useCallback(async () => {
    const epoch = accountEpochRef.current;
    setAccountChartsState("checking");
    setAccountChartsMessage("در حال بررسی چارت‌های حساب…");

    const firstPage = await listAccountReportSummaries(1);
    if (epoch !== accountEpochRef.current) return;

    if (firstPage.status === "not-authenticated") {
      setAccountSummaries([]);
      setAccountReports([]);
      setAccountChartsState("signed-out");
      setAccountChartsMessage(
        "اگر چارت‌هایت در حساب هالیوس ذخیره شده‌اند، ورود را باز کن؛ بعد از ورود خودکار به انتخاب‌گرها اضافه می‌شوند.",
      );
      return;
    }

    if (firstPage.status === "account-read-disabled") {
      setAccountSummaries([]);
      setAccountReports([]);
      setAccountChartsState("disabled");
      setAccountChartsMessage(
        "خواندن گزارش‌های حساب در این محیط فعال نیست؛ چارت‌های همین دستگاه همچنان در دسترس‌اند.",
      );
      return;
    }

    if (firstPage.status !== "account-read-ready") {
      setAccountSummaries([]);
      setAccountReports([]);
      setAccountChartsState("failed");
      setAccountChartsMessage(
        "اتصال به کتابخانهٔ حساب برقرار نشد. می‌توانی با چارت‌های این دستگاه ادامه بدهی یا دوباره تلاش کنی.",
      );
      return;
    }

    const allSummaries = [...firstPage.summaries];
    const totalPages = Math.max(1, Math.ceil(firstPage.total / 25));
    let partialAccountLoad = false;

    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await listAccountReportSummaries(page);
      if (epoch !== accountEpochRef.current) return;
      if (nextPage.status !== "account-read-ready") {
        partialAccountLoad = true;
        break;
      }
      allSummaries.push(...nextPage.summaries);
    }

    const summaryById = new Map<string, ReportRecordSummary>();
    for (const summary of allSummaries) {
      if (summary.reportType === "comparison" || summary.status === "deleted") {
        continue;
      }
      summaryById.set(summary.id, summary);
    }

    const natalSummaries = [...summaryById.values()];
    setAccountSummaries(natalSummaries);

    if (natalSummaries.length === 0) {
      setAccountChartsState("ready");
      setAccountChartsMessage(
        "وارد حساب شدی، اما هنوز چارت تولدی در کتابخانهٔ حسابت پیدا نشد.",
      );
      return;
    }

    setAccountChartsState(partialAccountLoad ? "failed" : "ready");
    setAccountChartsMessage(
      partialAccountLoad
        ? `${natalSummaries.length.toLocaleString("fa-IR")} چارت حساب بارگذاری شد، اما بخشی از کتابخانه در دسترس نبود.`
        : `${natalSummaries.length.toLocaleString("fa-IR")} چارت تولد از حساب هالیوس آمادهٔ انتخاب است.`,
    );
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

  // HALLEUS_COMPARE_ACCOUNT_AUTH_SYNC_R11
  useEffect(() => {
    let disposed = false;
    const client = getSupabaseBrowserAuthClient();

    const refresh = () => {
      if (!disposed) {
        void refreshAccountLibrary();
      }
    };

    const initialTimer = window.setTimeout(refresh, 0);
    const subscription = client?.auth.onAuthStateChange((_event, session) => {
      const owner = session?.user.id ?? null;
      const previous = accountOwnerRef.current;
      if (previous !== owner) {
        accountOwnerRef.current = owner;
        accountEpochRef.current++;
        setAccountSummaries([]);
        setAccountReports([]);
        setAccountChartLoadingId(null);
        if (previous) {
          // Never retain a previous account's selected or editable birth data.
          pendingGenerationRef.current = null;
          setChartAId("");
          setChartBId("");
          setInitialInputA(undefined);
          setInitialInputB(undefined);
          setReadyA(false);
          setReadyB(false);
          setChartATimeStatus("unknown");
          setChartBTimeStatus("unknown");
          setFormRevision(n => n + 1);
        }
      }
      window.setTimeout(refresh, 0);
    }).data.subscription;

    return () => {
      disposed = true;
      window.clearTimeout(initialTimer);
      subscription?.unsubscribe();
    };
  }, [refreshAccountLibrary]);

  // HALLEUS_COMPARE_ACCOUNT_MODAL_R17
  useEffect(() => {
    if (!isAccountModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountModalOpen]);
  const mergedReports = useMemo(() => {
    const byId = new Map<string, AstrologyReport>();

    for (const report of reports) {
      byId.set(report.id, report);
    }

    for (const report of accountReports) {
      if (!byId.has(report.id)) {
        byId.set(report.id, report);
      }
    }

    return [...byId.values()];
  }, [accountReports, reports]);
  const usableReports = useMemo(
    () => mergedReports.filter((report) => Boolean(report.realEngine)),
    [mergedReports],
  );

  const chartOptions = useMemo<ComparisonChartOption[]>(() => {
    const byId = new Map<string, ComparisonChartOption>();

    for (const report of reports) {
      if (!report.realEngine) continue;

      byId.set(report.id, {
        id: report.id,
        label: getComparisonChartLabel(report),
        birthDate: report.input.birthDate,
        birthCity: report.input.birthCity,
        createdAt: report.createdAt,
        source: "device",
        sourceLabel: "این دستگاه",
      });
    }

    for (const summary of accountSummaries) {
      const existing = byId.get(summary.id);
      const accountLabel =
        summary.name?.trim() ||
        summary.title?.replace(/^گزارش\s*/, "").trim() ||
        "چارت ذخیره‌شده";

      if (existing) {
        byId.set(summary.id, {
          ...existing,
          sourceLabel: "حساب و این دستگاه",
        });
        continue;
      }

      byId.set(summary.id, {
        id: summary.id,
        label: accountLabel,
        birthDate: summary.birthDate,
        birthCity: summary.birthCity,
        createdAt: summary.createdAt,
        source: "account",
        sourceLabel: "حساب هالیوس",
      });
    }

    return [...byId.values()].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [accountSummaries, reports]);
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

  function openDirectEntry(slot: "a" | "b") {
    if (isWorking || accountChartLoadingId !== null) return;
    const report = slot === "a" ? chartA : chartB;
    const timeStatus = slot === "a" ? chartATimeStatus : chartBTimeStatus;
    if (!report) return;
    const input: BirthInput = {
      ...report.input,
      birthTimeAccuracy: timeStatus === "exact" && getDefaultComparisonBirthTimeStatus(report) === "exact" ? "known" : "unknown",
    };
    if (slot === "a") {
      setInitialInputA(input);
      setReadyA(false);
      setChartAId("");
    } else {
      setInitialInputB(input);
      setReadyB(false);
      setChartBId("");
    }
    setMessage("");
  }

  async function resolveChartSelection(nextId: string) {
    const localReport = reports.find(
      (report) => report.id === nextId && Boolean(report.realEngine),
    );
    if (localReport) return localReport;

    const cachedAccountReport = accountReports.find(
      (report) => report.id === nextId && Boolean(report.realEngine),
    );
    if (cachedAccountReport) return cachedAccountReport;

    if (!accountSummaries.some((summary) => summary.id === nextId)) {
      return null;
    }

    setAccountChartLoadingId(nextId);
    setMessage("");

    try {
      const epoch = accountEpochRef.current;
      const detail = await getAccountReportRecord(nextId);
      if (epoch !== accountEpochRef.current) return null;
      const accountReport = detail.reportRecord?.report ?? null;

      if (
        detail.status !== "account-read-ready" ||
        !accountReport ||
        !accountReport.realEngine
      ) {
        setMessage(
          "این گزارش حساب برای مقایسه آماده نیست یا محاسبهٔ کامل چارت در آن پیدا نشد.",
        );
        return null;
      }

      setAccountReports((current) => {
        const withoutDuplicate = current.filter(
          (report) => report.id !== accountReport.id,
        );
        return [...withoutDuplicate, accountReport];
      });

      return accountReport;
    } finally {
      setAccountChartLoadingId(null);
    }
  }

  async function selectChartA(nextId: string) {
    if (!nextId) {
      setChartAId("");
      setChartATimeStatus("unknown");
      setMessage("");
      return;
    }

    const report = await resolveChartSelection(nextId);
    if (!report) return;

    setChartAId(report.id);
    trackComparePublicAggregateEvent("compare_slot_completed");
    setChartATimeStatus(getDefaultComparisonBirthTimeStatus(report));
    setMessage("");
  }

  async function selectChartB(nextId: string) {
    if (!nextId) {
      setChartBId("");
      setChartBTimeStatus("unknown");
      setMessage("");
      return;
    }

    const report = await resolveChartSelection(nextId);
    if (!report) return;

    setChartBId(report.id);
    trackComparePublicAggregateEvent("compare_slot_completed");
    setChartBTimeStatus(getDefaultComparisonBirthTimeStatus(report));
    setMessage("");
  }
  async function generateComparison() {
    if (generationInFlightRef.current || accountChartLoadingId !== null || !premiumEnabled) return;
    generationInFlightRef.current = true;
    setIsWorking(true);
    setMessage("");
    trackComparePublicAggregateEvent("compare_generation_started");
    window.dispatchEvent(new CustomEvent(HALLEUS_ANALYTICS_ACTION, { detail: "compare_start" }));
    const epoch = accountEpochRef.current;
    let navigated = false;
    try {
      // Validate both slots before submitting; no individual chart save or
      // public report route is involved, including when using saved inputs.
      const prepared = await Promise.allSettled([
        chartA ? Promise.resolve(null) : formARef.current?.prepare() ?? Promise.reject(new Error("FORM_A")),
        chartB ? Promise.resolve(null) : formBRef.current?.prepare() ?? Promise.reject(new Error("FORM_B")),
      ]);
      if (epoch !== accountEpochRef.current) return;
      if (prepared[0].status !== "fulfilled" || prepared[1].status !== "fulfilled") {
        setMessage("مشخصات تولد هر دو نفر را بررسی کن و دوباره تلاش کن.");
        return;
      }
      function natal(input: BirthInput, status: SynastryBirthTimeStatus, fallback: string): DirectBirth {
        return {
          name: input.name?.trim() || fallback,
          birthDate: input.birthDate,
          birthTime: status === "exact" ? input.birthTime : "12:00",
          birthTimeAccuracy: status === "exact" ? "known" : "unknown",
          birthCity: input.birthCity.trim(),
          birthCountry: input.birthCountry.trim(),
          birthCityId: input.birthCityId?.trim() || undefined,
          birthLatitude: input.birthLatitude,
          birthLongitude: input.birthLongitude,
          birthTimezone: input.birthTimezone,
        };
      }
      const inputA = chartA?.input ?? prepared[0].value?.birthInput;
      const inputB = chartB?.input ?? prepared[1].value?.birthInput;
      if (!inputA || !inputB) throw Error("INCOMPLETE_PAIR");
      const birthA = natal(inputA, chartA ? chartATimeStatus : inputA.birthTimeAccuracy === "known" ? "exact" : "unknown", "نفر اول");
      const birthB = natal(inputB, chartB ? chartBTimeStatus : inputB.birthTimeAccuracy === "known" ? "exact" : "unknown", "نفر دوم");
      const signature = JSON.stringify([birthA,birthB]);
      const pending = pendingGenerationRef.current;
      const retryKey = pending?.signature === signature ? pending.recordId : crypto.randomUUID();
      pendingGenerationRef.current = {signature,recordId:retryKey};
      const reportId = await requestPremiumComparison({birthA,birthB,relationshipContext:"romantic",retryKey}, () => epoch === accountEpochRef.current);
      if (epoch !== accountEpochRef.current) return;
      if (!chartA) trackComparePublicAggregateEvent("compare_slot_completed");
      if (!chartB) trackComparePublicAggregateEvent("compare_slot_completed");
      window.dispatchEvent(new CustomEvent(HALLEUS_ANALYTICS_ACTION, { detail: "compare_complete" }));
      pendingGenerationRef.current = null;
      router.push("/compare/" + encodeURIComponent(reportId));
      navigated = true;
    } catch {
      setMessage("ساخت گزارش کامل نشد؛ مشخصات تولد را بررسی کن و دوباره تلاش کن.");
    } finally {
      if (!navigated) {
        generationInFlightRef.current = false;
        setIsWorking(false);
      }
    }
  }
  function removeComparison(comparisonId: string) {
    const result = deletePrivateComparison(comparisonId);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setHistory(result.records);
  }

  const generationDisabled = !premiumEnabled || isWorking || accountChartLoadingId !== null;
  const selectedChartCount = Number(Boolean(chartA || readyA)) + Number(Boolean(chartB || readyB));
  const pairReady = selectedChartCount === 2;

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
            سیناستری جایگاه‌های دو چارت تولد را با هم می‌خواند تا الگوهای تماس، تفاوت و هم‌راهی روشن‌تر شوند. این خوانش برای رابطهٔ عاطفی است؛ اما موفقیت یا شکست رابطه را پیش‌بینی نمی‌کند.
          </p>
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
        data-premium-pair-builder="r18" data-account-motion="r11" data-final-product-builder="r17"
        data-pair-ready={pairReady ? "true" : "false"}
      >
        {!premiumEnabled && <p role="status">ساخت گزارش تازه موقتاً در دسترس نیست.</p>}
        <div className={styles.finalBuilderHeader}>
          <div>
            <p className={styles.eyebrow}>تحلیل رابطه</p>
            <h2 id="comparison-builder-title">دو نفر را برای تحلیل آماده کن</h2>
          </div>

          <button
            className={styles.accountButton}
            data-state={accountChartsState}
            type="button"
            disabled={isWorking || accountChartLoadingId !== null}
            onClick={() => setIsAccountModalOpen(true)}
          >
            <span className={styles.accountButtonDot} aria-hidden="true" />
            <span>
              <strong>
                {accountChartsState === "ready" ? "حساب هالیوس" : "ورود به حساب"}
              </strong>
              <small>
                {accountChartsState === "ready"
                  ? accountSummaries.length > 0
                    ? `${accountSummaries.length.toLocaleString("fa-IR")} چارت آماده`
                    : "حساب متصل است"
                  : "چارت‌های ذخیره‌شده‌ات را بیاور"}
              </small>
            </span>
            <b aria-hidden="true">←</b>
          </button>
        </div>

        <div className={styles.builderProgress} aria-live="polite">
          <div>
            <span>مشخصات دو نفر</span>
            <strong>{selectedChartCount.toLocaleString("fa-IR")} از ۲</strong>
          </div>
          <i aria-hidden="true">
            <b style={{ width: `${selectedChartCount * 50}%` }} />
          </i>
        </div>


        {isAccountModalOpen ? (
          <div
            className={styles.accountModalBackdrop}
            role="presentation"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) {
                setIsAccountModalOpen(false);
              }
            }}
          >
            <section
              aria-labelledby="compare-account-modal-title"
              aria-modal="true"
              className={styles.accountModal}
              role="dialog"
            >
              <header className={styles.accountModalHeader}>
                <div>
                  <small>حساب هالیوس</small>
                  <h3 id="compare-account-modal-title">
                    چارت‌های ذخیره‌شده‌ات را بیاور
                  </h3>
                  <p>
                    وارد حساب شو تا چارت‌هایی که قبلاً ذخیره کرده‌ای در انتخاب‌گرها
                    نمایش داده شوند.
                  </p>
                </div>
                <button
                  aria-label="بستن پنجره ورود"
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                >
                  ×
                </button>
              </header>

              <div className={styles.accountModalPanel}>
                <SupabaseAuthPanel compact />
              </div>

              <footer className={styles.accountModalStatus} data-state={accountChartsState}>
                <span className={styles.accountStatusDot} aria-hidden="true" />
                <p>
                  {accountChartsState === "ready"
                    ? accountSummaries.length > 0
                      ? `${accountSummaries.length.toLocaleString("fa-IR")} چارت از حسابت در دسترس است.`
                      : "حساب متصل است؛ هنوز چارت ذخیره‌شده‌ای پیدا نشد."
                    : accountChartsState === "checking"
                      ? "در حال بررسی حساب…"
                      : accountChartsState === "failed"
                        ? "چارت‌های حسابت بارگذاری نشدند. دوباره تلاش کن."
                        : accountChartsState === "disabled"
                          ? "ورود به حساب در این محیط در دسترس نیست."
                          : "بعد از ورود، چارت‌های ذخیره‌شده‌ات اینجا در دسترس می‌شوند."}
                </p>
                {accountChartsState === "failed" ? (
                  <button type="button" onClick={() => void refreshAccountLibrary()}>
                    تلاش دوباره
                  </button>
                ) : null}
              </footer>
            </section>
          </div>
        ) : null}
        <section className={styles.flowStep} data-flow-step="charts">
          <div className={styles.directPeopleGrid} data-step-state={pairReady ? "complete" : "active"}>
            <section className={`${styles.directEntryPanel} ${chartStyles.formPanel}`} aria-labelledby="compare-person-a">
              <div className={`${styles.directEntryHeader} ${chartStyles.formPanelHeading}`}>
                <h4 id="compare-person-a">نفر اول</h4>
              </div>
              {chartA || chartOptions.some((option) => option.id !== chartBId) ? (
                <ChartPicker
                  label="نفر اول"
                  value={chartAId}
                  options={chartOptions}
                  selectedReport={chartA}
                  excludedId={chartBId}
                  timeStatus={chartATimeStatus}
                  onChange={selectChartA}
                  onTimeStatusChange={setChartATimeStatus}
                  onDirectEntry={() => openDirectEntry("a")}
                  disabled={isWorking}
                  isLoading={accountChartLoadingId !== null}
                />
              ) : null}
              {!chartA ? (
                <DirectChartForm
                  mode="comparison"
                  key={`a-${formRevision}`}
                  comparisonHeadingId="compare-person-a"
                  initialComparisonInput={initialInputA}
                  comparisonFormRef={formARef}
                  onComparisonReadyChange={setReadyA}
                  comparisonBusy={isWorking || accountChartLoadingId !== null}
                />
              ) : null}
            </section>
            <section className={`${styles.directEntryPanel} ${chartStyles.formPanel}`} aria-labelledby="compare-person-b">
              <div className={`${styles.directEntryHeader} ${chartStyles.formPanelHeading}`}>
                <h4 id="compare-person-b">نفر دوم</h4>
              </div>
              {chartB || chartOptions.some((option) => option.id !== chartAId) ? (
                <ChartPicker
                  label="نفر دوم"
                  value={chartBId}
                  options={chartOptions}
                  selectedReport={chartB}
                  excludedId={chartAId}
                  timeStatus={chartBTimeStatus}
                  onChange={selectChartB}
                  onTimeStatusChange={setChartBTimeStatus}
                  onDirectEntry={() => openDirectEntry("b")}
                  disabled={isWorking}
                  isLoading={accountChartLoadingId !== null}
                />
              ) : null}
              {!chartB ? (
                <DirectChartForm
                  mode="comparison"
                  key={`b-${formRevision}`}
                  comparisonHeadingId="compare-person-b"
                  initialComparisonInput={initialInputB}
                  comparisonFormRef={formBRef}
                  onComparisonReadyChange={setReadyB}
                  comparisonBusy={isWorking || accountChartLoadingId !== null}
                />
              ) : null}
            </section>
          </div>
        </section>

        {message ? <p className={styles.errorMessage} role="alert">{message}</p> : null}

        <button
          className={styles.primaryButton}
          type="button"
          disabled={generationDisabled}
          onClick={generateComparison}
        >
          {isWorking ? "در حال ساخت خوانش…" : "بررسی رابطه"}
        </button>
      </section>

      {premiumEnabled && <ComparisonPremiumLibrary checkoutEnabled={false} onComparePage />}
      {history.length > 0 ? (
        <section className={styles.historySection} aria-labelledby="comparison-history-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>خوانش‌های قبلی</p>
            <h2 id="comparison-history-title">مقایسه‌های قبلی</h2>
            <p>گزارش‌های قدیمی این دستگاه را می‌توانی از همین‌جا باز یا حذف کنی.</p>
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
  options,
  selectedReport,
  excludedId,
  timeStatus,
  onChange,
  onTimeStatusChange,
  onDirectEntry,
  disabled,
  isLoading,
}: {
  label: string;
  value: string;
  options: ComparisonChartOption[];
  selectedReport: AstrologyReport | null;
  excludedId: string;
  timeStatus: SynastryBirthTimeStatus;
  onChange: (value: string) => void | Promise<void>;
  onTimeStatusChange: (value: SynastryBirthTimeStatus) => void;
  onDirectEntry: () => void;
  disabled: boolean;
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.id === value) ?? null;
  const normalizedQuery = query.trim().toLowerCase();

  const availableOptions = options.filter((option) => option.id !== excludedId);
  const filteredOptions = availableOptions.filter((option) => {
    if (!normalizedQuery) return true;

    return [
      option.label,
      option.birthDate,
      option.birthCity,
      option.sourceLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const deviceOptions = filteredOptions.filter(
    (option) => option.source !== "account",
  );
  const accountOptions = filteredOptions.filter(
    (option) => option.source === "account",
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !pickerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function chooseOption(optionId: string) {
    if (disabled || isLoading) return;
    setIsOpen(false);
    setQuery("");
    void onChange(optionId);
  }

  function startDirectEntry() {
    if (disabled || isLoading) return;
    setIsOpen(false);
    setQuery("");
    onDirectEntry();
  }

  return (
    <article
      className={selectedReport ? styles.personCard : styles.optionalChartPicker}
      data-selected={selectedReport?.realEngine ? "true" : "false"}
    >
      {selectedReport ? (
        <>
          <div className={styles.personSummary}>
            <strong>{getComparisonChartLabel(selectedReport, label)}</strong>
            <span>{selectedReport.input.birthDate} · {selectedReport.input.birthCity}</span>
          </div>
          <button className={styles.directEntryButton} type="button" disabled={disabled || isLoading} onClick={startDirectEntry}>
            ویرایش مشخصات تولد
          </button>
        </>
      ) : null}
      <div className={styles.chartPickerShell} ref={pickerRef}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={styles.chartPickerTrigger}
          disabled={disabled || isLoading}
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span>
            <small>اختیاری</small>
            <strong>{selectedOption?.label ?? "انتخاب از چارت‌های ذخیره‌شده"}</strong>
          </span>
          <b aria-hidden="true">{isOpen ? "↑" : "↓"}</b>
        </button>

        {isOpen ? (
          <div className={styles.chartPickerPopover}>
            {availableOptions.length === 0 ? (
              <div className={styles.chartPickerZeroState}>
                <span className={styles.chartPickerZeroOrbit} aria-hidden="true" />
                <strong>هنوز چارتی برای انتخاب نداری</strong>
                <p>مشخصات تولد این نفر را همین‌جا وارد کن.</p>
                <button className={styles.directEntryButton} type="button" onClick={() => setIsOpen(false)}>
                  بستن
                </button>
              </div>
            ) : (
              <>
                <label className={styles.chartPickerSearch}>
              <span>جست‌وجو</span>
              <input
                autoFocus
                type="search"
                value={query}
                placeholder="نام، شهر یا تاریخ تولد"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className={styles.chartPickerResults}>
              {deviceOptions.length > 0 ? (
                <section className={styles.chartPickerGroup}>
                  <header>
                    <strong>در این نشست یا دستگاه</strong>
                    <span>{deviceOptions.length.toLocaleString("fa-IR")}</span>
                  </header>
                  <div>
                    {deviceOptions.map((option) => (
                      <button
                        className={styles.chartPickerOption}
                        data-selected={option.id === value ? "true" : "false"}
                        key={option.id}
                        type="button"
                        onClick={() => chooseOption(option.id)}
                      >
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.birthDate} · {option.birthCity}</small>
                        </span>
                        <em>{formatChartSavedAt(option.createdAt)}</em>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {accountOptions.length > 0 ? (
                <section className={styles.chartPickerGroup}>
                  <header>
                    <strong>حساب هالیوس</strong>
                    <span>{accountOptions.length.toLocaleString("fa-IR")}</span>
                  </header>
                  <div>
                    {accountOptions.map((option) => (
                      <button
                        className={styles.chartPickerOption}
                        data-selected={option.id === value ? "true" : "false"}
                        key={option.id}
                        type="button"
                        onClick={() => chooseOption(option.id)}
                      >
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.birthDate} · {option.birthCity}</small>
                        </span>
                        <em>{formatChartSavedAt(option.createdAt)}</em>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {filteredOptions.length === 0 ? (
                <div className={styles.chartPickerEmpty}>
                  <strong>چارتی پیدا نشد</strong>
                  <span>نام، شهر یا تاریخ تولد دیگری را جست‌وجو کن.</span>
                </div>
              ) : null}
            </div>
              </>
            )}
          </div>
        ) : null}
      </div>


      {value && selectedReport ? (
        <label className={styles.timeAccuracyChoice}>
          <input
            type="checkbox"
            disabled={disabled || isLoading || getDefaultComparisonBirthTimeStatus(selectedReport) === "unknown"}
            checked={timeStatus === "exact" && getDefaultComparisonBirthTimeStatus(selectedReport) === "exact"}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onTimeStatusChange(event.target.checked ? "exact" : "unknown")
            }
          />
          <span>
            <strong>ساعت تولد این چارت دقیق است</strong>
          </span>
        </label>
      ) : null}
    </article>
  );
}

function formatChartSavedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
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
