export const REPORT_REAL_CHART_BRIDGE_VERSION = "0.1.48" as const;

export type ReportRealChartBridgeStatus = "ready" | "partial" | "pending";

export type ReportRealChartBridgePlacement = {
  id: string;
  label: string;
  signId: string | null;
  house: number | null;
  summaryKey: string;
};

export type ReportRealChartBridgeAspect = {
  id: string;
  pointA: string;
  pointB: string;
  orb: number | null;
  polarity: string | null;
  summaryKey: string;
};

export type ReportRealChartBridge = {
  version: typeof REPORT_REAL_CHART_BRIDGE_VERSION;
  status: ReportRealChartBridgeStatus;
  readinessLabel: string;
  source: string;
  placementHighlights: ReportRealChartBridgePlacement[];
  aspectHighlights: ReportRealChartBridgeAspect[];
  limitations: string[];
};

type UnknownRecord = Record<string, unknown>;

export function buildReportRealChartBridge(report: unknown): ReportRealChartBridge {
  const reportObject = asRecord(report);
  const enrichment = findChartEnrichment(reportObject);
  const engineMetadata = asRecord(reportObject?.engineMetadata);
  const fallbackPlacements = readPlacementArray(
    readPath(reportObject, ["normalizedChart", "placements"]),
  )
    .concat(readPlacementArray(readPath(engineMetadata, ["placements"])))
    .concat(readPlacementArray(readPath(reportObject, ["realEngine", "placements"])))
    .concat(
      readPlacementArray(
        readPath(engineMetadata, ["realEngineSnapshot", "placements"]),
      ),
    );
  const fallbackAspects = readAspectArray(
    readPath(reportObject, ["normalizedChart", "aspects"]),
  )
    .concat(readAspectArray(readPath(engineMetadata, ["aspects"])))
    .concat(readAspectArray(readPath(reportObject, ["realEngine", "aspects"])))
    .concat(
      readAspectArray(readPath(engineMetadata, ["realEngineSnapshot", "aspects"])),
    );

  const placementHighlights = readPlacementArray(enrichment?.placements);
  const aspectHighlights = readAspectArray(enrichment?.aspects);

  const placements =
    placementHighlights.length > 0 ? placementHighlights : fallbackPlacements;
  const aspects = aspectHighlights.length > 0 ? aspectHighlights : fallbackAspects;
  const limitations = readStringArray(enrichment?.limitations).concat(
    readStringArray(readPath(reportObject, ["normalizedChart", "quality", "limitations"])),
  );
  const readinessLabel =
    readString(enrichment?.readinessLabel) ??
    readString(readPath(reportObject, ["normalizedChart", "readinessLabel"])) ??
    readString(engineMetadata?.readinessLabel) ??
    "not-connected-yet";
  const status = normalizeStatus(readString(enrichment?.status), placements.length);
  const source =
    readString(enrichment?.source) ??
    readString(readPath(reportObject, ["normalizedChart", "source"])) ??
    readString(engineMetadata?.source) ??
    "report-detail";

  return {
    version: REPORT_REAL_CHART_BRIDGE_VERSION,
    status,
    readinessLabel,
    source,
    placementHighlights: uniqueBySummaryKey(placements).slice(0, 8),
    aspectHighlights: uniqueBySummaryKey(aspects).slice(0, 8),
    limitations: uniqueStrings(limitations).slice(0, 5),
  };
}

export function hasReportRealChartBridgeData(
  bridge: ReportRealChartBridge,
): boolean {
  return bridge.placementHighlights.length > 0 || bridge.aspectHighlights.length > 0;
}

export function getReportRealChartBridgeTitle(
  bridge: ReportRealChartBridge,
): string {
  if (bridge.status === "ready") {
    return "چارت واقعی به گزارش وصل شده";
  }

  if (bridge.status === "partial") {
    return "چارت واقعی به‌صورت آزمایشی به گزارش وصل شده";
  }

  return "چارت واقعی برای این گزارش هنوز آماده نیست";
}

export function getReportRealChartBridgeDescription(
  bridge: ReportRealChartBridge,
): string {
  if (bridge.status === "ready") {
    return "این گزارش می‌تواند از جایگاه‌های نرمال‌شده، خانه‌ها و جنبه‌های چارت برای غنی‌سازی متن استفاده کند.";
  }

  if (bridge.status === "partial") {
    return "بخشی از داده‌های چارت آماده است، اما هنوز برای ادعای دقت نهایی یا تفسیر کامل کافی نیست.";
  }

  return "برای گزارش‌های قدیمی یا گزارش‌هایی که هنوز داده‌ی چارت ذخیره نکرده‌اند، این بخش فقط وضعیت اتصال را نشان می‌دهد.";
}

function findChartEnrichment(report: UnknownRecord | null): UnknownRecord | null {
  const candidates = [
    report?.chartReportEnrichment,
    report?.chartEnrichment,
    readPath(report, ["engineMetadata", "chartReportEnrichment"]),
    readPath(report, ["engineMetadata", "chartEnrichment"]),
  ];

  for (const candidate of candidates) {
    const object = asRecord(candidate);

    if (object) {
      return object;
    }
  }

  return null;
}

function normalizeStatus(
  status: string | null,
  placementCount: number,
): ReportRealChartBridgeStatus {
  if (status === "ready" || status === "partial" || status === "pending") {
    return status;
  }

  if (status === "blocked") {
    return "pending";
  }

  return placementCount > 0 ? "partial" : "pending";
}

function readPlacementArray(value: unknown): ReportRealChartBridgePlacement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const object = asRecord(item);

      if (!object) {
        return null;
      }

      const id = readString(object.id) ?? readString(object.pointId) ?? "unknown";
      const label = readString(object.label) ?? id;
      const signId =
        readString(object.signId) ??
        readString(readPath(object, ["zodiac", "signId"])) ??
        readString(readPath(object, ["zodiac", "sign", "id"]));
      const house =
        readNumber(object.house) ??
        readNumber(readPath(object, ["house", "house"])) ??
        readNumber(readPath(object, ["house", "number"]));
      const summaryKey =
        readString(object.summaryKey) ??
        `placement:${id}:sign-${signId ?? "unknown"}:${house === null ? "house-unknown" : `house-${house}`}`;

      return {
        id,
        label,
        signId,
        house,
        summaryKey,
      };
    })
    .filter((item): item is ReportRealChartBridgePlacement => Boolean(item));
}

function readAspectArray(value: unknown): ReportRealChartBridgeAspect[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const object = asRecord(item);

      if (!object) {
        return null;
      }

      const aspectId =
        readString(object.aspectId) ?? readString(object.id) ?? "aspect";
      const id = readString(object.aspectLabel) ?? aspectId;
      const pointA =
        readString(object.pointA) ??
        readString(object.firstPlanetLabel) ??
        readString(object.firstPlanetId) ??
        "point-a";
      const pointB =
        readString(object.pointB) ??
        readString(object.secondPlanetLabel) ??
        readString(object.secondPlanetId) ??
        "point-b";
      const summaryKey =
        readString(object.summaryKey) ??
        ["aspect", pointA, aspectId, pointB].join(":");

      return {
        id,
        pointA,
        pointB,
        orb: readNumber(object.orb),
        polarity: readString(object.polarity),
        summaryKey,
      };
    })
    .filter((item): item is ReportRealChartBridgeAspect => Boolean(item));
}

function uniqueBySummaryKey<TItem extends { summaryKey: string }>(
  items: TItem[],
): TItem[] {
  const seen = new Set<string>();
  const uniqueItems: TItem[] = [];

  for (const item of items) {
    if (seen.has(item.summaryKey)) {
      continue;
    }

    seen.add(item.summaryKey);
    uniqueItems.push(item);
  }

  return uniqueItems;
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items)];
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readPath(object: UnknownRecord | null, path: string[]): unknown {
  let current: unknown = object;

  for (const segment of path) {
    const currentObject = asRecord(current);

    if (!currentObject) {
      return null;
    }

    current = currentObject[segment];
  }

  return current;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}
