"use client";

import Link from "next/link";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
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
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";
import {
  getAccountReportRecord,
  listAccountReportSummaries,
} from "@/lib/storage/account-report-read-client";
import type { ReportRecordSummary } from "@/types/storage";
import { saveComparisonToAccount } from "@/lib/comparison/comparison-account-client";
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
  source: "device" | "account";
  sourceLabel: string;
};
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
  const [accountSummaries, setAccountSummaries] = useState<ReportRecordSummary[]>([]);
  const [accountReports, setAccountReports] = useState<AstrologyReport[]>([]);
  const [accountChartsState, setAccountChartsState] =
    useState<AccountChartsState>("checking");
  const [accountChartsMessage, setAccountChartsMessage] = useState(
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
    setAccountChartsState("checking");
    setAccountChartsMessage("در حال بررسی چارت‌های حساب…");

    const firstPage = await listAccountReportSummaries(1);

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
    const subscription = client?.auth.onAuthStateChange(() => {
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

  useEffect(() => {
    if (chartAId || usableReports.length !== 1) return;
    const [onlyReport] = usableReports;
    const frame = window.requestAnimationFrame(() => {
      setChartAId(onlyReport.id);
      setChartATimeStatus(getDefaultComparisonBirthTimeStatus(onlyReport));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chartAId, usableReports]);


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
      const detail = await getAccountReportRecord(nextId);
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

    const accountSaveResult = await saveComparisonToAccount(result.record, {
      navigationGraceMs: 0,
    });
    if (
      accountSaveResult.status !== "saved" &&
      accountSaveResult.status !== "guest-saved"
    ) {
      generationInFlightRef.current = false;
      setIsWorking(false);
      setMessage(
        `${accountSaveResult.message} نسخهٔ خصوصی روی همین دستگاه محفوظ است؛ برای ثبت در گزارش‌های هالیوس دوباره تلاش کن.`,
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
  const selectedChartCount = Number(Boolean(chartA)) + Number(Boolean(chartB));
  const pairReady = Boolean(chartA && chartB);
  const chartALabel = chartA ? getComparisonChartLabel(chartA, "نفر اول") : "نفر اول";
  const chartBLabel = chartB ? getComparisonChartLabel(chartB, "نفر دوم") : "نفر دوم";
  const selectedRelationship =
    RELATIONSHIP_OPTIONS.find((item) => item.value === relationshipContext) ??
    RELATIONSHIP_OPTIONS[0]!;

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
        data-premium-pair-builder="r18" data-account-motion="r11" data-final-product-builder="r17"
        data-pair-ready={pairReady ? "true" : "false"}
      >
        <div className={styles.finalBuilderHeader}>
          <div>
            <p className={styles.eyebrow}>تحلیل رابطه</p>
            <h2 id="comparison-builder-title">دو نفر را برای تحلیل انتخاب کن</h2>
            <p>
              چارت خودت و نفر مقابل را انتخاب کن؛ بعد نوع رابطه را مشخص می‌کنی.
            </p>
          </div>

          <button
            className={styles.accountButton}
            data-state={accountChartsState}
            type="button"
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
            <span>انتخاب دو نفر</span>
            <strong>{selectedChartCount.toLocaleString("fa-IR")} از ۲</strong>
          </div>
          <i aria-hidden="true">
            <b style={{ width: `${selectedChartCount * 50}%` }} />
          </i>
          <small>
            {pairReady
              ? "هر دو نفر انتخاب شدند"
              : selectedChartCount === 1
                ? "یک نفر دیگر را انتخاب کن"
                : "برای شروع، چارت هر دو نفر را انتخاب کن"}
          </small>
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
          <div className={styles.stepHeading}>
            <span>۱</span>
            <div>
              <h3>دو چارت را انتخاب کن</h3>
            </div>
          </div>          <div className={styles.chartGrid}>
            <ChartPicker
              label="نفر اول"
              value={chartAId}
              options={chartOptions}
              selectedReport={chartA}
              excludedId={chartBId}
              timeStatus={chartATimeStatus}
              onChange={selectChartA}
              onTimeStatusChange={setChartATimeStatus}
              isLoading={accountChartLoadingId !== null}
            />

            <div
              className={styles.pairOrbit}
              data-state={
                pairReady ? "ready" : selectedChartCount > 0 ? "partial" : "idle"
              }
              aria-hidden="true"
            >
              <span className={styles.orbitRing} />
              <span className={styles.orbitCore} />
              <span className={styles.orbitLine} />
              <span className={styles.orbitNodeA} />
              <span className={styles.orbitNodeB} />
            </div>
            <ChartPicker
              label="نفر دوم"
              value={chartBId}
              options={chartOptions}
              selectedReport={chartB}
              excludedId={chartAId}
              timeStatus={chartBTimeStatus}
              onChange={selectChartB}
              onTimeStatusChange={setChartBTimeStatus}
              isLoading={accountChartLoadingId !== null}
            />
          </div>
        </section>

        <section className={styles.flowStep} data-flow-step="relationship">
          <div className={styles.stepHeading}>
            <span>۲</span>
            <div>
              <h3>این دو نفر چه رابطه‌ای دارند؟</h3>
              <p>زمینه‌ای را انتخاب کن که به رابطهٔ واقعی این دو نفر نزدیک‌تر است.</p>
            </div>
          </div>          <fieldset className={styles.relationshipFieldset}>
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
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.relationshipContextNote}>
            <strong>{selectedRelationship.label}</strong>
            <span>{selectedRelationship.description}</span>
          </div>
        </section>


        {pairReady && chartA && chartB ? (
          <section className={styles.pairReview} aria-label="خلاصه پیش از ساخت تحلیل">
            <header>
              <small>خوانش آماده است</small>
              <strong>{chartALabel} × {chartBLabel}</strong>
              <span>{selectedRelationship.label}</span>
            </header>
            <div className={styles.pairReviewPeople}>
              <p><b>{chartALabel}</b><span>{chartA.input.birthDate} · {chartA.input.birthCity}</span><small>{chartATimeStatus === "exact" ? "ساعت دقیق ✓" : "ساعت نامشخص"}</small></p>
              <p><b>{chartBLabel}</b><span>{chartB.input.birthDate} · {chartB.input.birthCity}</span><small>{chartBTimeStatus === "exact" ? "ساعت دقیق ✓" : "ساعت نامشخص"}</small></p>
            </div>
            <div className={styles.pairReviewTopics}>
              <span>گفت‌وگو</span><span>امنیت عاطفی</span><span>کشش و صمیمیت</span><span>مرزها</span><span>ترمیم</span>
            </div>
          </section>
        ) : null}

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
            : pairReady
              ? `دیدن تحلیل ${chartALabel} و ${chartBLabel}`
              : "دو نفر را انتخاب کن"}
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
  options,
  selectedReport,
  excludedId,
  timeStatus,
  onChange,
  onTimeStatusChange,
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
    (option) => option.source === "device",
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
    setIsOpen(false);
    setQuery("");
    void onChange(optionId);
  }

  return (
    <article
      className={styles.personCard}
      data-selected={selectedReport?.realEngine ? "true" : "false"}
    >
      <header className={styles.personCardHeader}>
        <div>
          <small>{label}</small>
          <strong>
            {selectedReport
              ? getComparisonChartLabel(selectedReport, label)
              : "انتخاب چارت"}
          </strong>
        </div>
        <span>
          {isLoading
            ? "در حال بازیابی…"
            : selectedReport?.realEngine
              ? "آماده"
              : "انتخاب نشده"}
        </span>
      </header>

      <div
        className={styles.personCelestial}
        data-active={selectedReport?.realEngine ? "true" : "false"}
        aria-hidden="true"
      >
        <span className={styles.personCelestialRingOuter} />
        <span className={styles.personCelestialRingInner} />
        <span className={styles.personCelestialAxis} />
        <span className={styles.personCelestialCore} />
      </div>

      {selectedReport?.realEngine ? (
        <div className={styles.personSummary}>
          <strong>{getComparisonChartLabel(selectedReport, label)}</strong>
          <span>
            {selectedReport.input.birthDate} · {selectedReport.input.birthCity}
          </span>
          {selectedOption ? (
            <small>
              {selectedOption.sourceLabel} · {formatChartSavedAt(selectedOption.createdAt)}
            </small>
          ) : null}
        </div>
      ) : (
        <div className={styles.personEmpty}>
          <strong>یک چارت انتخاب کن</strong>
          <span>از فهرست جست‌وجو کن و چارت مناسب این نفر را بردار.</span>
        </div>
      )}

      <div className={styles.chartPickerShell} ref={pickerRef}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={styles.chartPickerTrigger}
          disabled={isLoading}
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span>
            <small>چارت انتخابی</small>
            <strong>{selectedOption?.label ?? "انتخاب چارت"}</strong>
          </span>
          <b aria-hidden="true">{isOpen ? "↑" : "↓"}</b>
        </button>

        {isOpen ? (
          <div className={styles.chartPickerPopover}>
            {availableOptions.length === 0 ? (
              <div className={styles.chartPickerZeroState}>
                <span className={styles.chartPickerZeroOrbit} aria-hidden="true" />
                <strong>هنوز چارتی برای انتخاب نداری</strong>
                <p>اول چارت تولد را بساز و بعد به این صفحه برگرد.</p>
                <Link
                  href="/chart"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  ساخت چارت تولد
                </Link>
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
                    <strong>روی این دستگاه</strong>
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
            checked={timeStatus === "exact"}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onTimeStatusChange(event.target.checked ? "exact" : "unknown")
            }
          />
          <span>
            <strong>ساعت تولد این چارت دقیق است</strong>
            <small>
              اگر ساعت دقیق نیست، رایزینگ و هم‌پوشانی خانه‌ها وارد خوانش نمی‌شوند؛
              بقیهٔ پیوندها همچنان بررسی می‌شوند.
            </small>
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
