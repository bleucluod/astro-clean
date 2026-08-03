import { buildRealSynastry, createSynastryNatalSnapshot } from "@/lib/astrology/synastry/real-synastry-engine";
import type { AstrologyReport } from "@/types/astro";
import type {
  ComparisonPrimaryPattern,
  ComparisonReading,
  ComparisonRecord,
  CreateComparisonInput,
  CreateComparisonResult,
} from "@/types/comparison-product";
import {
  COMPARISON_PRIVACY_VERSION,
  COMPARISON_PRODUCT_VERSION,
} from "@/types/comparison-product";
import type {
  RealSynastryReport,
  SynastryInterChartAspect,
} from "@/types/synastry-engine";

const EMOTIONAL_POINT_IDS = new Set(["moon", "venus", "saturn"]);

export function createPrivateComparison(
  chartAReport: AstrologyReport,
  chartBReport: AstrologyReport,
  input: CreateComparisonInput,
): CreateComparisonResult {
  if (!input.secondPersonConsentConfirmed) {
    return {
      ok: false,
      code: "consent-required",
      message: "برای استفاده از اطلاعات تولد نفر دوم، تأیید رضایت لازم است.",
      issues: ["رضایت استفاده خصوصی از اطلاعات نفر دوم تأیید نشده است."],
    };
  }

  if (input.chartAId === input.chartBId) {
    return {
      ok: false,
      code: "same-chart",
      message: "برای مقایسه، دو چارت متفاوت انتخاب کن.",
      issues: ["شناسه دو چارت یکسان است."],
    };
  }

  if (!chartAReport.realEngine) {
    return {
      ok: false,
      code: "chart-a-missing-engine",
      message: "چارت اول دادهٔ محاسبه‌شدهٔ کافی برای مقایسه ندارد.",
      issues: ["realEngine چارت اول موجود نیست."],
    };
  }

  if (!chartBReport.realEngine) {
    return {
      ok: false,
      code: "chart-b-missing-engine",
      message: "چارت دوم دادهٔ محاسبه‌شدهٔ کافی برای مقایسه ندارد.",
      issues: ["realEngine چارت دوم موجود نیست."],
    };
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const chartA = createSynastryNatalSnapshot({
    chartId: input.chartAId,
    label: normalizeLabel(input.chartALabel, chartAReport, "چارت اول"),
    birthTimeStatus: input.chartABirthTimeStatus,
    snapshot: chartAReport.realEngine,
  });
  const chartB = createSynastryNatalSnapshot({
    chartId: input.chartBId,
    label: normalizeLabel(input.chartBLabel, chartBReport, "چارت دوم"),
    birthTimeStatus: input.chartBBirthTimeStatus,
    snapshot: chartBReport.realEngine,
  });
  const synastryResult = buildRealSynastry({
    chartA,
    chartB,
    relationshipContext: input.relationshipContext,
    generatedAt,
  });

  if (!synastryResult.ok) {
    return {
      ok: false,
      code: "synastry-failed",
      message: "ساخت گزارش مقایسه کامل نشد. ورودی‌ها را بررسی و دوباره تلاش کن.",
      issues: synastryResult.issues,
    };
  }

  const record: ComparisonRecord = {
    version: COMPARISON_PRODUCT_VERSION,
    id: input.recordId ?? createComparisonId(),
    createdAt: generatedAt,
    updatedAt: generatedAt,
    relationshipContext: input.relationshipContext,
    chartAId: input.chartAId,
    chartBId: input.chartBId,
    chartALabel: chartA.label,
    chartBLabel: chartB.label,
    chartABirthTimeStatus: input.chartABirthTimeStatus,
    chartBBirthTimeStatus: input.chartBBirthTimeStatus,
    privacy: {
      version: COMPARISON_PRIVACY_VERSION,
      visibility: "private",
      indexingPolicy: "noindex",
      secondPersonConsentConfirmedAt: generatedAt,
      rawBirthInputStored: false,
    },
    report: synastryResult.report,
    reading: buildComparisonReading(synastryResult.report),
  };

  return { ok: true, record };
}

export function rebuildPrivateComparison(
  existing: ComparisonRecord,
  chartAReport: AstrologyReport,
  chartBReport: AstrologyReport,
): CreateComparisonResult {
  const rebuilt = createPrivateComparison(chartAReport, chartBReport, {
    chartAId: existing.chartAId,
    chartBId: existing.chartBId,
    chartALabel: existing.chartALabel,
    chartBLabel: existing.chartBLabel,
    chartABirthTimeStatus: existing.chartABirthTimeStatus,
    chartBBirthTimeStatus: existing.chartBBirthTimeStatus,
    relationshipContext: existing.relationshipContext,
    secondPersonConsentConfirmed: true,
    recordId: existing.id,
  });

  if (!rebuilt.ok) return rebuilt;

  return {
    ok: true,
    record: {
      ...rebuilt.record,
      createdAt: existing.createdAt,
    },
  };
}

export function getDefaultComparisonBirthTimeStatus(
  report: AstrologyReport,
): "exact" | "unknown" {
  const hasAngles = Boolean(report.realEngine?.angles && Object.keys(report.realEngine.angles).length > 0);
  const hasTwelveHouses = report.realEngine?.houses?.length === 12;

  if (!hasAngles || !hasTwelveHouses) return "unknown";
  if (report.input.birthTime.trim() === "12:00") return "unknown";

  return "exact";
}

export function getComparisonChartLabel(
  report: AstrologyReport,
  fallback = "چارت بدون نام",
): string {
  return report.input.name?.trim() || fallback;
}

function buildComparisonReading(report: RealSynastryReport): ComparisonReading {
  const primaryPatterns = selectPrimaryPatterns(report);
  const emotionalContacts = report.contacts
    .filter((contact) => isEmotionalContact(contact))
    .slice(0, 2);
  const repairContacts = report.contacts
    .filter((contact) => contact.polarity === "tension" || contact.polarity === "intense")
    .slice(0, 2);

  return {
    primaryPatterns,
    supportiveFa: report.synthesis.supportiveFa,
    frictionFa: report.synthesis.tensionFa,
    communicationFa: report.dynamics.communicationFa,
    emotionalSecurityFa: emotionalContacts.length > 0
      ? emotionalContacts.map((contact) => contact.readingFa).join(" ")
      : "برای امنیت عاطفی این رابطه، درخواست‌های روشن و ریتم قابل پیش‌بینی از تفسیرهای ذهنی مفیدتر است.",
    closenessIndependenceFa: report.dynamics.closenessIndependenceFa,
    boundariesRepairFa: repairContacts.length > 0
      ? repairContacts.map((contact) => contact.growthFa).join(" ")
      : "مرزها را پیش از اوج تنش نام‌گذاری کنید و بعد از اختلاف، به‌جای اثبات حقانیت روی یک اقدام کوچک و قابل تکرار توافق کنید.",
  };
}

function selectPrimaryPatterns(report: RealSynastryReport): ComparisonPrimaryPattern[] {
  const selected: ComparisonPrimaryPattern[] = [
    ...report.supportivePatterns,
    ...report.tensionPatterns,
  ]
    .sort(
      (left, right) =>
        right.relevanceScore - left.relevanceScore ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 3)
    .map((pattern) => ({
      id: pattern.id,
      kind: pattern.kind,
      titleFa: pattern.titleFa,
      summaryFa: pattern.summaryFa,
      contactIds: [...pattern.contactIds],
      relevanceScore: pattern.relevanceScore,
    }));
  const usedContactIds = new Set(selected.flatMap((pattern) => pattern.contactIds));

  for (const contact of report.contacts) {
    if (selected.length >= 3) break;
    if (usedContactIds.has(contact.id)) continue;

    selected.push({
      id: `contact-pattern-${contact.id}`,
      kind: contact.polarity === "supportive" ? "supportive" : "tension",
      titleFa: contact.titleFa,
      summaryFa: `${contact.readingFa} ${contact.growthFa}`,
      contactIds: [contact.id],
      relevanceScore: contact.relevanceScore,
    });
    usedContactIds.add(contact.id);
  }

  const fallbacks: ComparisonPrimaryPattern[] = [
    {
      id: "fallback-communication-pattern",
      kind: "supportive",
      titleFa: "ریتم گفت‌وگو",
      summaryFa: report.dynamics.communicationFa,
      contactIds: report.dynamics.evidenceContactIds.slice(0, 2),
      relevanceScore: -1,
    },
    {
      id: "fallback-closeness-pattern",
      kind: "supportive",
      titleFa: "نزدیکی و فاصله سالم",
      summaryFa: report.dynamics.closenessIndependenceFa,
      contactIds: report.dynamics.evidenceContactIds.slice(0, 2),
      relevanceScore: -2,
    },
    {
      id: "fallback-repair-pattern",
      kind: "tension",
      titleFa: "مرز و ترمیم",
      summaryFa: report.synthesis.tensionFa,
      contactIds: [],
      relevanceScore: -3,
    },
  ];

  for (const fallback of fallbacks) {
    if (selected.length >= 3) break;
    if (!selected.some((pattern) => pattern.id === fallback.id)) {
      selected.push(fallback);
    }
  }

  return selected.slice(0, 3);
}

function isEmotionalContact(contact: SynastryInterChartAspect): boolean {
  return (
    contact.categories.includes("closeness") ||
    EMOTIONAL_POINT_IDS.has(contact.pointA.id) ||
    EMOTIONAL_POINT_IDS.has(contact.pointB.id)
  );
}

function normalizeLabel(
  explicitLabel: string | null | undefined,
  report: AstrologyReport,
  fallback: string,
): string {
  return explicitLabel?.trim() || getComparisonChartLabel(report, fallback);
}

function createComparisonId(): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `comparison-${randomPart}`;
}
