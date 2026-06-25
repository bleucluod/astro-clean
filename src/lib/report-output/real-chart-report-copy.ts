import type {
  ChartReportAspectSummary,
  ChartReportEnrichment,
  ChartReportPlacementSummary,
} from "./chart-enrichment";

export const REAL_CHART_REPORT_COPY_VERSION = "0.1.49" as const;

export type RealChartReportCopyBlock = {
  id: string;
  title: string;
  body: string;
  sourceKeys: string[];
};

const SIGN_LABELS: Record<string, string> = {
  aries: "حمل",
  taurus: "ثور",
  gemini: "جوزا",
  cancer: "سرطان",
  leo: "اسد",
  virgo: "سنبله",
  libra: "میزان",
  scorpio: "عقرب",
  sagittarius: "قوس",
  capricorn: "جدی",
  aquarius: "دلو",
  pisces: "حوت",
  unknown: "نامشخص",
};

const POINT_LABELS: Record<string, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
};

const ASPECT_LABELS: Record<string, string> = {
  conjunction: "هم‌نشینی",
  sextile: "هماهنگی نرم",
  square: "چالش سازنده",
  trine: "جریان طبیعی",
  opposition: "کشش دو قطبی",
};

export function buildRealChartReportCopy(
  enrichment: ChartReportEnrichment,
): RealChartReportCopyBlock[] {
  const blocks: RealChartReportCopyBlock[] = [
    buildReadinessCopy(enrichment),
    ...enrichment.placements.slice(0, 4).map(buildPlacementCopy),
    ...enrichment.aspects.slice(0, 3).map(buildAspectCopy),
  ];

  if (enrichment.limitations.length > 0) {
    blocks.push(buildLimitationsCopy(enrichment.limitations));
  }

  return blocks;
}

export function buildReadinessCopy(
  enrichment: ChartReportEnrichment,
): RealChartReportCopyBlock {
  if (enrichment.status === "ready") {
    return {
      id: "real-chart-ready-copy",
      title: "چارت آماده‌ی غنی‌سازی گزارش است",
      body:
        "داده‌های اصلی چارت برای ساختن یک گزارش نمادین و قابل‌فهم آماده‌اند. این یعنی متن گزارش می‌تواند از جایگاه‌ها، خانه‌ها و جنبه‌ها الهام بگیرد؛ بدون اینکه ادعای قطعیت یا پیش‌بینی قطعی داشته باشد.",
      sourceKeys: [enrichment.readinessLabel],
    };
  }

  if (enrichment.status === "partial") {
    return {
      id: "real-chart-partial-copy",
      title: "چارت در وضعیت آزمایشی است",
      body:
        "بخشی از داده‌های چارت آماده شده، اما هنوز برای تفسیر کامل کافی نیست. در این حالت، گزارش باید محتاط، نمادین و شفاف باقی بماند و محدودیت‌های داده را پنهان نکند.",
      sourceKeys: [enrichment.readinessLabel],
    };
  }

  return {
    id: "real-chart-blocked-copy",
    title: "چارت هنوز به گزارش وصل نشده",
    body:
      "برای این گزارش هنوز داده‌ی کافی از چارت ذخیره نشده است. این حالت برای گزارش‌های قدیمی طبیعی است و بعد از اتصال کامل فرم تولد به engine، این بخش پُرتر می‌شود.",
    sourceKeys: [enrichment.readinessLabel],
  };
}

export function buildPlacementCopy(
  placement: ChartReportPlacementSummary,
): RealChartReportCopyBlock {
  const pointLabel = getPointLabel(placement.id, placement.label);
  const signLabel = getSignLabel(placement.signId);
  const houseText =
    placement.house === null ? "خانه‌ی نامشخص" : `خانه‌ی ${placement.house}`;

  return {
    id: `placement-copy-${placement.id}`,
    title: `${pointLabel} در ${signLabel}`,
    body:
      `در زبان نمادین چارت، ${pointLabel} در ${signLabel} می‌تواند یک تم قابل تأمل بسازد. ` +
      `قرار گرفتن آن در ${houseText} نشان می‌دهد این انرژی بیشتر در همان حوزه‌ی تجربه‌ی فردی دیده می‌شود. ` +
      "این جمله حکم قطعی نیست؛ فقط یک نقطه‌ی شروع برای خواندن شخصی و آرام گزارش است.",
    sourceKeys: [placement.summaryKey],
  };
}

export function buildAspectCopy(
  aspect: ChartReportAspectSummary,
): RealChartReportCopyBlock {
  const pointA = getPointLabel(aspect.pointA, aspect.pointA);
  const pointB = getPointLabel(aspect.pointB, aspect.pointB);
  const aspectLabel = ASPECT_LABELS[aspect.id] ?? aspect.id;

  return {
    id: `aspect-copy-${aspect.pointA}-${aspect.id}-${aspect.pointB}`,
    title: `${pointA} و ${pointB}: ${aspectLabel}`,
    body:
      `رابطه‌ی ${aspectLabel} میان ${pointA} و ${pointB} می‌تواند یک گفت‌وگوی درونی یا الگوی تکرارشونده را برجسته کند. ` +
      "در گزارش Halleus، این بخش باید به‌جای پیش‌بینی قطعی، به زبان تأملی و قابل لمس نوشته شود.",
    sourceKeys: [aspect.summaryKey],
  };
}

export function buildLimitationsCopy(limitations: string[]): RealChartReportCopyBlock {
  return {
    id: "real-chart-limitations-copy",
    title: "شفافیت درباره‌ی محدودیت‌ها",
    body:
      "این نسخه هنوز باید با احتیاط خوانده شود. بعضی بخش‌های محاسبه یا تفسیر ممکن است آزمایشی باشند و گزارش نباید جایگزین تصمیم پزشکی، حقوقی یا مالی شود.",
    sourceKeys: limitations,
  };
}

export function getPointLabel(pointId: string, fallback: string): string {
  return POINT_LABELS[pointId] ?? fallback;
}

export function getSignLabel(signId: string): string {
  return SIGN_LABELS[signId] ?? signId;
}
