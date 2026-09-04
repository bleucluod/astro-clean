import { buildAdaptiveReportPlan } from "@/lib/astrology/adaptive-report-planner";
import type { AstrologyReport, RealEngineReportAspectKind } from "@/types/astro";

export const REPORT_ADVANCED_WHEEL_POLICY_VERSION =
  "slice6-advanced-wheel-policy-v1-20260901" as const;

export const REPORT_WHEEL_DEFAULT_VISIBLE_IDS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "asc",
  "dsc",
  "mc",
  "ic",
  "north-node",
  "south-node",
  "black-moon-lilith",
  "chiron",
  "part-of-fortune",
  "vertex",
] as const;

export const REPORT_WHEEL_ADVANCED_TOGGLE_IDS = [
  "ceres",
  "pallas",
  "juno",
  "vesta",
  "eris",
  "pholus",
  "nessus",
] as const;

const DEFAULT_OVERLAY_IDS = new Set<string>([
  "north-node",
  "south-node",
  "chiron",
  "part-of-fortune",
  "vertex",
]);
const ADVANCED_OVERLAY_IDS = new Set<string>(REPORT_WHEEL_ADVANCED_TOGGLE_IDS);
const ANGLE_IDS = new Set(["asc", "dsc", "mc", "ic"]);
const DEFAULT_LINE_SCORE_GATE = 78;
const FIXED_STAR_SCORE_GATE = 65;
const MAX_DEFAULT_ADVANCED_LINES = 4;
const MAX_OPTIONAL_ADVANCED_LINES = 4;
const MAX_RELEVANT_FIXED_STARS = 2;

export type ReportAdvancedWheelMarkerLayer = "default" | "advanced" | "fixed-star";

export type ReportAdvancedWheelMarker = {
  id: string;
  label: string;
  glyph: string;
  longitude: number;
  layer: ReportAdvancedWheelMarkerLayer;
  source: "snapshot" | "relevance";
  score: number | null;
};

export type ReportAdvancedWheelLine = {
  id: string;
  firstId: string;
  secondId: string;
  firstLongitude: number;
  secondLongitude: number;
  aspectId: RealEngineReportAspectKind;
  orbDegrees: number;
  score: number;
  layer: "default" | "advanced";
};

export type ReportAdvancedWheelPolicy = {
  version: typeof REPORT_ADVANCED_WHEEL_POLICY_VERSION;
  defaultVisibleIds: readonly string[];
  advancedToggleIds: readonly string[];
  defaultMarkers: ReportAdvancedWheelMarker[];
  advancedMarkers: ReportAdvancedWheelMarker[];
  relevantFixedStars: ReportAdvancedWheelMarker[];
  defaultAspectLines: ReportAdvancedWheelLine[];
  advancedAspectLines: ReportAdvancedWheelLine[];
  existingRendererOwns: readonly ["black-moon-lilith"];
  asteroidLabAutoIncluded: false;
  pointVisibilityIndependentFromAspectLines: true;
  birthTimeReliable: boolean;
  chironAvailable: boolean;
  suppressedAngleDerivedIds: string[];
};

type PointRow = {
  id: string;
  longitude: number;
};

const MARKER_META: Record<string, { label: string; glyph: string }> = {
  "north-node": { label: "گره شمالی", glyph: "☊" },
  "south-node": { label: "گره جنوبی", glyph: "☋" },
  chiron: { label: "کایران", glyph: "⚷" },
  "part-of-fortune": { label: "سهم سعادت", glyph: "⊗" },
  vertex: { label: "ورتکس", glyph: "Vx" },
  ceres: { label: "سرس", glyph: "⚳" },
  pallas: { label: "پالاس", glyph: "⚴" },
  juno: { label: "جونو", glyph: "⚵" },
  vesta: { label: "وستا", glyph: "⚶" },
  eris: { label: "اریس", glyph: "E" },
  pholus: { label: "فولوس", glyph: "Ph" },
  nessus: { label: "نسوس", glyph: "N" },
};

function normalizeId(value: string): string {
  return value.trim().toLowerCase();
}

function finiteLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function markerForPoint(
  point: PointRow,
  layer: "default" | "advanced",
): ReportAdvancedWheelMarker | null {
  const meta = MARKER_META[point.id];
  if (!meta || !finiteLongitude(point.longitude)) return null;
  return {
    id: point.id,
    label: meta.label,
    glyph: meta.glyph,
    longitude: point.longitude,
    layer,
    source: "snapshot",
    score: null,
  };
}

function collectSnapshotPoints(report: AstrologyReport): Map<string, PointRow> {
  const result = new Map<string, PointRow>();
  const engine = report.realEngine;
  if (!engine) return result;

  for (const placement of engine.placements ?? []) {
    if (finiteLongitude(placement.longitude)) {
      result.set(normalizeId(placement.id), {
        id: normalizeId(placement.id),
        longitude: placement.longitude,
      });
    }
  }

  for (const id of ["asc", "dsc", "mc", "ic"] as const) {
    const angle = engine.angles?.[id];
    if (angle && finiteLongitude(angle.longitude)) {
      result.set(id, { id, longitude: angle.longitude });
    }
  }

  const lunarNodes = engine.lunarNodes;
  if (
    lunarNodes?.status === "calculated" &&
    "northNode" in lunarNodes &&
    "southNode" in lunarNodes
  ) {
    if (finiteLongitude(lunarNodes.northNode.longitude)) {
      result.set("north-node", {
        id: "north-node",
        longitude: lunarNodes.northNode.longitude,
      });
    }
    if (finiteLongitude(lunarNodes.southNode.longitude)) {
      result.set("south-node", {
        id: "south-node",
        longitude: lunarNodes.southNode.longitude,
      });
    }
  }

  if (
    engine.lilith?.status === "calculated" &&
    "approvedForReportOutput" in engine.lilith &&
    engine.lilith.approvedForReportOutput === true &&
    finiteLongitude(engine.lilith.longitude)
  ) {
    result.set("black-moon-lilith", {
      id: "black-moon-lilith",
      longitude: engine.lilith.longitude,
    });
  }

  for (const point of engine.specialPoints ?? []) {
    if (point.status !== "calculated" || !finiteLongitude(point.longitude)) continue;
    result.set(normalizeId(point.id), {
      id: normalizeId(point.id),
      longitude: point.longitude,
    });
  }

  return result;
}

function getRelevantFixedStars(
  report: AstrologyReport,
  decisions: ReturnType<typeof buildAdaptiveReportPlan>["advancedRelevance"]["decisions"],
): ReportAdvancedWheelMarker[] {
  const stars = report.realEngine?.specialistAstrology?.fixedStars?.stars ?? [];
  const byId = new Map(stars.map((star) => [normalizeId(star.id), star]));
  return decisions
    .filter(
      (item) =>
        item.evidenceKind === "fixed-star-conjunction" &&
        item.decision !== "suppress" &&
        item.score >= FIXED_STAR_SCORE_GATE,
    )
    .flatMap((item) => {
      const starId = normalizeId(item.objectIds[0] ?? "");
      const star = byId.get(starId);
      if (!star || !finiteLongitude(star.longitude)) return [];
      return [
        {
          id: star.id,
          label: star.labelFa || star.labelEn,
          glyph: "★",
          longitude: star.longitude,
          layer: "fixed-star" as const,
          source: "relevance" as const,
          score: item.score,
        },
      ];
    })
    .filter(
      (item, index, list) =>
        list.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.id.localeCompare(b.id))
    .slice(0, MAX_RELEVANT_FIXED_STARS);
}

function buildRelevantLines(
  points: Map<string, PointRow>,
  decisions: ReturnType<typeof buildAdaptiveReportPlan>["advancedRelevance"]["decisions"],
): { defaultLines: ReportAdvancedWheelLine[]; advancedLines: ReportAdvancedWheelLine[] } {
  const rows: ReportAdvancedWheelLine[] = [];

  for (const item of decisions) {
    if (
      item.evidenceKind !== "special-point-aspect" ||
      item.score < DEFAULT_LINE_SCORE_GATE ||
      (item.decision !== "merge" && item.decision !== "standalone") ||
      !item.aspectId ||
      !finiteLongitude(item.orbDegrees)
    ) {
      continue;
    }

    const [rawFirst, rawSecond] = item.sourceIds;
    const firstId = normalizeId(rawFirst ?? "");
    const secondId = normalizeId(rawSecond ?? "");
    if (!firstId || !secondId) continue;

    const first = points.get(firstId);
    const second = points.get(secondId);
    if (!first || !second) continue;

    const advanced = ADVANCED_OVERLAY_IDS.has(firstId) || ADVANCED_OVERLAY_IDS.has(secondId);
    const allowedDefault =
      DEFAULT_OVERLAY_IDS.has(firstId) ||
      DEFAULT_OVERLAY_IDS.has(secondId) ||
      ANGLE_IDS.has(firstId) ||
      ANGLE_IDS.has(secondId) ||
      points.has(firstId) ||
      points.has(secondId);
    if (!advanced && !allowedDefault) continue;

    rows.push({
      id: item.id,
      firstId,
      secondId,
      firstLongitude: first.longitude,
      secondLongitude: second.longitude,
      aspectId: item.aspectId,
      orbDegrees: item.orbDegrees,
      score: item.score,
      layer: advanced ? "advanced" : "default",
    });
  }

  const deduped = [...new Map(rows.map((row) => [row.id, row])).values()].sort(
    (a, b) => b.score - a.score || a.orbDegrees - b.orbDegrees || a.id.localeCompare(b.id),
  );
  return {
    defaultLines: deduped
      .filter((row) => row.layer === "default")
      .slice(0, MAX_DEFAULT_ADVANCED_LINES),
    advancedLines: deduped
      .filter((row) => row.layer === "advanced")
      .slice(0, MAX_OPTIONAL_ADVANCED_LINES),
  };
}

export function buildReportAdvancedWheelPolicy(
  report: AstrologyReport,
): ReportAdvancedWheelPolicy {
  const plan = buildAdaptiveReportPlan(report);
  const points = collectSnapshotPoints(report);
  const birthTimeReliable = plan.advancedRelevance.birthTimeReliable;
  const suppressedAngleDerivedIds: string[] = [];

  const defaultMarkers = ["north-node", "south-node", "chiron", "part-of-fortune", "vertex"]
    .flatMap((id) => {
      if (!birthTimeReliable && (id === "part-of-fortune" || id === "vertex")) {
        suppressedAngleDerivedIds.push(id);
        return [];
      }
      const point = points.get(id);
      const marker = point ? markerForPoint(point, "default") : null;
      return marker ? [marker] : [];
    });

  const advancedMarkers = REPORT_WHEEL_ADVANCED_TOGGLE_IDS.flatMap((id) => {
    const point = points.get(id);
    const marker = point ? markerForPoint(point, "advanced") : null;
    return marker ? [marker] : [];
  });

  const relevantFixedStars = getRelevantFixedStars(
    report,
    plan.advancedRelevance.decisions,
  );
  const lines = buildRelevantLines(points, plan.advancedRelevance.decisions);

  return {
    version: REPORT_ADVANCED_WHEEL_POLICY_VERSION,
    defaultVisibleIds: REPORT_WHEEL_DEFAULT_VISIBLE_IDS,
    advancedToggleIds: REPORT_WHEEL_ADVANCED_TOGGLE_IDS,
    defaultMarkers,
    advancedMarkers,
    relevantFixedStars,
    defaultAspectLines: lines.defaultLines,
    advancedAspectLines: lines.advancedLines,
    existingRendererOwns: ["black-moon-lilith"],
    asteroidLabAutoIncluded: false,
    pointVisibilityIndependentFromAspectLines: true,
    birthTimeReliable,
    chironAvailable: points.has("chiron"),
    suppressedAngleDerivedIds,
  };
}
