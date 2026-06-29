import type {
  ChartReportAspectSummary,
  ChartReportEnrichment,
  ChartReportPlacementSummary,
} from "./chart-enrichment";
import {
  getAspectCopyEntry,
  getCopyLibraryStats,
  getHouseCopyEntry,
  getPointCopyEntry,
  getSignCopyEntry,
} from "./real-chart-copy-library";

export const REAL_CHART_REPORT_COPY_VERSION = "0.1.100" as const;

export type RealChartReportCopyBlock = {
  id: string;
  title: string;
  body: string;
  sourceKeys: string[];
};

export function buildRealChartReportCopy(
  enrichment: ChartReportEnrichment,
): RealChartReportCopyBlock[] {
  const blocks: RealChartReportCopyBlock[] = [
    buildReadinessCopy(enrichment),
    ...enrichment.placements.slice(0, 5).map(buildPlacementCopy),
    ...enrichment.aspects.slice(0, 4).map(buildAspectCopy),
  ];

  if (enrichment.limitations.length > 0) {
    blocks.push(buildLimitationsCopy(enrichment.limitations));
  }

  blocks.push(buildCopyLibraryTransparencyBlock());

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
        "داده‌های اصلی چارت برای ساختن یک گزارش نمادین و قابل‌فهم آماده‌اند. متن گزارش می‌تواند از جایگاه‌ها، خانه‌ها و جنبه‌ها الهام بگیرد؛ بدون اینکه ادعای قطعیت، تشخیص یا پیش‌بینی قطعی داشته باشد.",
      sourceKeys: [enrichment.readinessLabel],
    };
  }

  if (enrichment.status === "partial") {
    return {
      id: "real-chart-partial-copy",
      title: "چارت در وضعیت آزمایشی است",
      body:
        "بخشی از داده‌های چارت آماده شده، اما هنوز برای تفسیر کامل کافی نیست. در این حالت گزارش باید محتاط، نمادین و شفاف باقی بماند و محدودیت‌های داده را پنهان نکند.",
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
  const point = getPointCopyEntry(placement.id);
  const sign = getSignCopyEntry(placement.signId);
  const house = getHouseCopyEntry(placement.house);
  const placementDataLine = [
    `${point.labelFa}:`,
    formatDegreeLabel(placement.degreeWithinSign),
    sign.labelFa,
    `/`,
    `${house.labelFa}.`,
  ].join(` `);

  return {
    id: `placement-copy-${placement.id}`,
    title: `${point.labelFa} در ${sign.labelFa} · ${formatDegreeLabel(placement.degreeWithinSign)} · ${house.labelFa}`,
    body:
      `${point.copy} ${sign.copy} ${house.copy} ${placementDataLine} ` +
      "این ترکیب باید مثل یک تم قابل‌تأمل خوانده شود، نه حکم قطعی درباره‌ی شخصیت یا آینده.",
    sourceKeys: [
      placement.summaryKey,
      `degree:${formatDegreeKey(placement.degreeWithinSign)}`,
      house.id,
      `tone:${point.tone}:${sign.tone}:${house.tone}`,
      ...point.keywords,
      ...sign.keywords,
      ...house.keywords,
    ],
  };
}

function formatDegreeLabel(value: number): string {
  const rounded = Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;

  return `${rounded}${String.fromCharCode(176)}`;
}

function formatDegreeKey(value: number): string {
  const rounded = Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;

  return rounded.toFixed(1);
}

export function buildAspectCopy(
  aspect: ChartReportAspectSummary,
): RealChartReportCopyBlock {
  const pointA = getPointCopyEntry(aspect.pointA);
  const pointB = getPointCopyEntry(aspect.pointB);
  const aspectEntry = getAspectCopyEntry(aspect.id);

  return {
    id: `aspect-copy-${aspect.pointA}-${aspect.id}-${aspect.pointB}`,
    title: `${pointA.labelFa} و ${pointB.labelFa}: ${aspectEntry.labelFa}`,
    body:
      `${aspectEntry.copy} در این رابطه، ${pointA.labelFa} و ${pointB.labelFa} مثل دو صدای متفاوت در یک گفت‌وگوی درونی دیده می‌شوند. ` +
      "متن باید به کاربر کمک کند الگو را ببیند، بدون اینکه او را بترساند یا محدود کند.",
    sourceKeys: [aspect.summaryKey, ...aspectEntry.keywords],
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

export function buildCopyLibraryTransparencyBlock(): RealChartReportCopyBlock {
  const stats = getCopyLibraryStats();

  return {
    id: "copy-library-transparency",
    title: "پایه‌ی محتوایی این نسخه",
    body:
      `این نسخه از ${stats.pointCount} نقطه، ${stats.signCount} برج، ${stats.houseCount} خانه و ${stats.aspectCount} جنبه‌ی اصلی برای ساخت متن نمادین استفاده می‌کند. ` +
      "هدف، ساختن گزارش انسانی‌تر و قابل‌فهم‌تر است؛ نه ادعای علمی یا قطعیت کامل.",
    sourceKeys: [
      `points:${stats.pointCount}`,
      `signs:${stats.signCount}`,
      `houses:${stats.houseCount}`,
      `aspects:${stats.aspectCount}`,
    ],
  };
}

export function getPointLabel(pointId: string, fallback: string): string {
  return getPointCopyEntry(pointId).labelFa || fallback;
}

export function getSignLabel(signId: string): string {
  return getSignCopyEntry(signId).labelFa;
}
