import { formatReportAspectDisplay } from "@/lib/astrology/report-aspect-display";
import type {
  AstrologyReport,
  RealEngineReportAspectKind,
  ZodiacKey,
} from "@/types/astro";

export const ADVANCED_RELEVANCE_ENGINE_VERSION =
  "advanced-relevance-v1-20260901" as const;
export const ADVANCED_ASPECT_POLICY_VERSION =
  "advanced-point-aware-orbs-v1-20260901" as const;

export type AdvancedNarrativeDecision =
  | "merge"
  | "support"
  | "standalone"
  | "suppress";

export type AdvancedEvidenceKind =
  | "special-point-aspect"
  | "fixed-star-conjunction"
  | "traditional-lot";

export type AdvancedAspectPolicy = {
  policyId: string;
  objectIds: readonly string[];
  allowedAspects: readonly RealEngineReportAspectKind[];
  maxOrbDegrees: number;
  standaloneEligible: boolean;
  generationalPenalty: number;
  note: string;
};

export type AdvancedStoryCandidate = {
  semanticKey: string;
  score: number;
  sourcePlanetIds: string[];
  sourceHouseIds: number[];
  sourceAspectIds: string[];
  sourceNodeIds?: string[];
};

export type AdvancedRelevanceEvidence = {
  id: string;
  evidenceKind: AdvancedEvidenceKind;
  objectIds: string[];
  sourceIds: string[];
  label: string;
  detail: string;
  score: number;
  decision: AdvancedNarrativeDecision;
  matchedStorySemanticKey: string | null;
  themeTags: string[];
  sharedThemeTags: string[];
  orbDegrees: number | null;
  aspectId: RealEngineReportAspectKind | null;
  reasons: string[];
};

export type AdvancedStoryAdjustment = {
  semanticKey: string;
  scoreBoost: number;
  evidence: AdvancedRelevanceEvidence[];
  absorbedEvidenceIds: string[];
  rankingReasons: string[];
};

export type AdvancedRelevancePlan = {
  version: typeof ADVANCED_RELEVANCE_ENGINE_VERSION;
  policyVersion: typeof ADVANCED_ASPECT_POLICY_VERSION;
  birthTimeReliable: boolean;
  decisions: AdvancedRelevanceEvidence[];
  storyAdjustments: AdvancedStoryAdjustment[];
  counts: Record<AdvancedNarrativeDecision, number>;
  asteroidLabAutoPromotion: false;
  traditionalLotModernAspectDoctrineApplied: false;
  fixedStarPolicy: "conjunction-only-tight-filter";
  notes: string[];
};

const MAJOR_ASPECT_ANGLES: Record<RealEngineReportAspectKind, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

export const ADVANCED_ASPECT_POLICIES: readonly AdvancedAspectPolicy[] = [
  {
    policyId: "major-planets-existing-policy",
    objectIds: [
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
    ],
    allowedAspects: ["conjunction", "sextile", "square", "trine", "opposition"],
    maxOrbDegrees: Number.NaN,
    standaloneEligible: true,
    generationalPenalty: 0,
    note: "Major planets keep the existing natal aspect policy; Slice 4 does not replace it.",
  },
  {
    policyId: "chiron-tight-major-aspects",
    objectIds: ["chiron"],
    allowedAspects: ["conjunction", "sextile", "square", "trine", "opposition"],
    maxOrbDegrees: 3,
    standaloneEligible: true,
    generationalPenalty: 0,
    note: "Chiron is tighter than major-planet policy and must gain relevance from personal context.",
  },
  {
    policyId: "fortune-vertex-tight-axis",
    objectIds: ["part-of-fortune", "vertex"],
    allowedAspects: ["conjunction", "opposition"],
    maxOrbDegrees: 1.5,
    standaloneEligible: false,
    generationalPenalty: 0,
    note: "Fortune and Vertex use a tight conjunction/opposition candidate policy.",
  },
  {
    policyId: "main-asteroids-moderate",
    objectIds: ["ceres", "pallas", "juno", "vesta"],
    allowedAspects: ["conjunction", "sextile", "square", "trine", "opposition"],
    maxOrbDegrees: 2.5,
    standaloneEligible: true,
    generationalPenalty: 0,
    note: "Ceres/Pallas/Juno/Vesta use a moderate 2.5 degree candidate window.",
  },
  {
    policyId: "slow-catalyst-boundary-tight",
    objectIds: ["eris", "pholus", "nessus"],
    allowedAspects: ["conjunction", "sextile", "square", "trine", "opposition"],
    maxOrbDegrees: 1.25,
    standaloneEligible: true,
    generationalPenalty: 12,
    note: "Eris/Pholus/Nessus use tight candidate windows; generational evidence is down-weighted.",
  },
  {
    policyId: "minor-asteroid-lab-only",
    objectIds: ["minor-asteroid"],
    allowedAspects: ["conjunction", "sextile", "square", "trine", "opposition"],
    maxOrbDegrees: 1.25,
    standaloneEligible: false,
    generationalPenalty: 16,
    note: "Minor asteroids are search/explore by default and never auto-promote from Asteroid Lab.",
  },
] as const;

const OBJECT_BASE_WEIGHT: Record<string, number> = {
  chiron: 58,
  "part-of-fortune": 48,
  vertex: 46,
  ceres: 44,
  pallas: 43,
  juno: 56,
  vesta: 44,
  eris: 30,
  pholus: 39,
  nessus: 39,
};

const OBJECT_THEME_TAGS: Record<string, string[]> = {
  chiron: ["sensitivity", "repair", "value", "self-worth"],
  "part-of-fortune": ["flow", "resources", "visibility", "ease"],
  vertex: ["encounter", "turning-point", "relationship", "choice"],
  ceres: ["care", "nurture", "support", "security"],
  pallas: ["pattern", "strategy", "problem-solving", "clarity"],
  juno: ["commitment", "partnership", "trust", "equality", "intimacy"],
  vesta: ["focus", "devotion", "mission", "attention"],
  eris: ["friction", "belonging", "voice", "disruption"],
  pholus: ["catalyst", "chain-reaction", "turning-point", "choice"],
  nessus: ["boundaries", "power", "accountability", "cycle"],
};

const PLANET_THEME_TAGS: Record<string, string[]> = {
  sun: ["identity", "visibility", "direction", "self-worth"],
  moon: ["emotion", "security", "care", "belonging"],
  mercury: ["mind", "language", "learning", "clarity"],
  venus: ["relationship", "value", "attraction", "equality"],
  mars: ["drive", "assertion", "boundaries", "action"],
  jupiter: ["growth", "belief", "opportunity", "meaning"],
  saturn: ["structure", "commitment", "boundary", "accountability"],
  uranus: ["change", "freedom", "disruption", "innovation"],
  neptune: ["imagination", "sensitivity", "ideal", "boundary"],
  pluto: ["power", "transformation", "intimacy", "control"],
  asc: ["identity", "body", "presence", "start"],
  mc: ["visibility", "direction", "work", "role"],
  dsc: ["relationship", "partnership", "equality", "other"],
  ic: ["security", "home", "roots", "private-life"],
};

const SIGN_THEME_TAGS: Record<ZodiacKey, string[]> = {
  aries: ["start", "assertion", "independence", "action"],
  taurus: ["stability", "continuity", "security", "value"],
  gemini: ["language", "learning", "curiosity", "connection"],
  cancer: ["security", "care", "home", "belonging"],
  leo: ["visibility", "creativity", "identity", "expression"],
  virgo: ["skill", "service", "refinement", "routine"],
  libra: ["relationship", "equality", "balance", "partnership"],
  scorpio: ["intimacy", "trust", "power", "vulnerability"],
  sagittarius: ["meaning", "belief", "growth", "exploration"],
  capricorn: ["structure", "responsibility", "work", "continuity"],
  aquarius: ["innovation", "community", "freedom", "pattern"],
  pisces: ["sensitivity", "imagination", "compassion", "boundary"],
};

const HOUSE_THEME_TAGS: Record<number, string[]> = {
  1: ["identity", "body", "presence", "start"],
  2: ["self-worth", "value", "resources", "security"],
  3: ["mind", "language", "learning", "local-life"],
  4: ["home", "roots", "security", "private-life"],
  5: ["creativity", "expression", "pleasure", "romance"],
  6: ["routine", "work", "skill", "care"],
  7: ["relationship", "partnership", "equality", "commitment"],
  8: ["intimacy", "shared-resources", "vulnerability", "trust"],
  9: ["belief", "meaning", "learning", "exploration"],
  10: ["visibility", "role", "work", "direction"],
  11: ["community", "future", "belonging", "network"],
  12: ["private-life", "rest", "sensitivity", "release"],
};

const LOT_THEME_TAGS: Record<string, string[]> = {
  spirit: ["direction", "choice", "intention", "agency"],
  eros: ["desire", "attraction", "relationship", "motivation"],
  necessity: ["constraint", "duty", "boundary", "pressure"],
  courage: ["assertion", "action", "risk", "drive"],
  victory: ["achievement", "visibility", "growth", "result"],
  nemesis: ["limit", "accountability", "correction", "boundary"],
};

const FIXED_STAR_BASE_WEIGHT = 38;
const LOT_BASE_WEIGHT = 34;
const ANGULAR_HOUSES = new Set<number>([1, 4, 7, 10]);
const PERSONAL_TARGETS = new Set(["sun", "moon", "mercury", "venus", "mars"]);
const CORE_TARGETS = new Set(["sun", "moon", "asc", "mc"]);

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeLongitude(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function separationDegrees(first: number, second: number): number {
  const raw = Math.abs(normalizeLongitude(first) - normalizeLongitude(second));
  return Math.min(raw, 360 - raw);
}

function houseThemes(house: number | null | undefined): string[] {
  return house && HOUSE_THEME_TAGS[house] ? HOUSE_THEME_TAGS[house] : [];
}

function signThemes(sign: string | null | undefined): string[] {
  return sign && sign in SIGN_THEME_TAGS
    ? SIGN_THEME_TAGS[sign as ZodiacKey]
    : [];
}

function objectThemes(id: string): string[] {
  return OBJECT_THEME_TAGS[normalizeId(id)] ?? [];
}

function targetThemes(id: string): string[] {
  return PLANET_THEME_TAGS[normalizeId(id)] ?? [];
}

function sharedTags(first: string[], second: string[]): string[] {
  const secondSet = new Set(second);
  return unique(first.filter((tag) => secondSet.has(tag)));
}

export function getAdvancedAspectPolicy(
  objectId: string,
): AdvancedAspectPolicy | null {
  const id = normalizeId(objectId);
  return (
    ADVANCED_ASPECT_POLICIES.find((policy) => policy.objectIds.includes(id)) ??
    null
  );
}

export function evaluateAdvancedAspectCandidate(input: {
  objectId: string;
  aspectId: RealEngineReportAspectKind;
  orbDegrees: number;
}) {
  const policy = getAdvancedAspectPolicy(input.objectId);
  if (!policy || !Number.isFinite(input.orbDegrees)) {
    return { accepted: false, policy, maxOrbDegrees: null } as const;
  }
  const accepted =
    policy.allowedAspects.includes(input.aspectId) &&
    input.orbDegrees <= policy.maxOrbDegrees;
  return { accepted, policy, maxOrbDegrees: policy.maxOrbDegrees } as const;
}

function nearestAllowedAspect(input: {
  objectId: string;
  firstLongitude: number;
  secondLongitude: number;
}) {
  const policy = getAdvancedAspectPolicy(input.objectId);
  if (!policy || !Number.isFinite(policy.maxOrbDegrees)) return null;
  const separation = separationDegrees(input.firstLongitude, input.secondLongitude);
  let best:
    | { aspectId: RealEngineReportAspectKind; angle: number; orbDegrees: number }
    | null = null;
  for (const aspectId of policy.allowedAspects) {
    const angle = MAJOR_ASPECT_ANGLES[aspectId];
    const orbDegrees = Math.abs(separation - angle);
    if (orbDegrees > policy.maxOrbDegrees) continue;
    if (!best || orbDegrees < best.orbDegrees) {
      best = { aspectId, angle, orbDegrees };
    }
  }
  return best;
}

function storyThemeTags(
  story: AdvancedStoryCandidate,
  report: AstrologyReport,
): string[] {
  const placements = report.realEngine?.placements ?? [];
  const placementById = new Map(
    placements.map((placement) => [normalizeId(placement.id), placement]),
  );
  return unique([
    ...story.sourcePlanetIds.flatMap((id) => targetThemes(id)),
    ...story.sourcePlanetIds.flatMap((id) => {
      const placement = placementById.get(normalizeId(id));
      return placement ? signThemes(placement.signId) : [];
    }),
    ...story.sourceHouseIds.flatMap((house) => houseThemes(house)),
    ...(story.sourceNodeIds?.length ? ["growth", "pattern", "direction"] : []),
  ]);
}

function matchStory(
  evidenceThemes: string[],
  stories: AdvancedStoryCandidate[],
  report: AstrologyReport,
) {
  let best:
    | { story: AdvancedStoryCandidate; shared: string[]; matchScore: number }
    | null = null;
  for (const story of stories) {
    const shared = sharedTags(evidenceThemes, storyThemeTags(story, report));
    const directHouseBonus = story.sourceHouseIds.length > 0 ? 2 : 0;
    const matchScore = shared.length * 5 + directHouseBonus;
    if (!best || matchScore > best.matchScore) {
      best = { story, shared, matchScore };
    }
  }
  return best && best.shared.length > 0 ? best : null;
}

export function classifyAdvancedStoryDecision(input: {
  score: number;
  sharedThemeCount: number;
  hasStoryMatch: boolean;
  standaloneEligible: boolean;
  evidenceKind: AdvancedEvidenceKind;
}): AdvancedNarrativeDecision {
  if (input.hasStoryMatch && input.sharedThemeCount >= 2 && input.score >= 72) {
    return "merge";
  }
  if (input.hasStoryMatch && input.sharedThemeCount >= 1 && input.score >= 52) {
    return "support";
  }
  if (
    !input.hasStoryMatch &&
    input.standaloneEligible &&
    input.evidenceKind === "special-point-aspect" &&
    input.score >= 82
  ) {
    return "standalone";
  }
  return "suppress";
}

function specialPointLabel(point: {
  id: string;
  labelFa?: string;
  labelEn?: string;
}) {
  return point.labelFa || point.labelEn || point.id;
}

function buildSpecialPointAspectEvidence(input: {
  report: AstrologyReport;
  stories: AdvancedStoryCandidate[];
  chartRulerId: string;
  point: {
    id: string;
    labelFa?: string;
    labelEn?: string;
    longitude: number;
    signId?: string;
    house?: number | null;
  };
  target: {
    id: string;
    label: string;
    longitude: number;
    signId?: string;
    house?: number | null;
    targetClass: "placement" | "angle" | "special-point";
  };
  birthTimeReliable: boolean;
}): AdvancedRelevanceEvidence | null {
  const pointId = normalizeId(input.point.id);
  const targetId = normalizeId(input.target.id);
  if (
    !input.birthTimeReliable &&
    (input.target.targetClass === "angle" || input.point.house != null || input.target.house != null)
  ) {
    if (input.target.targetClass === "angle") return null;
  }

  const aspect = nearestAllowedAspect({
    objectId: pointId,
    firstLongitude: input.point.longitude,
    secondLongitude: input.target.longitude,
  });
  if (!aspect) return null;
  const policy = getAdvancedAspectPolicy(pointId);
  if (!policy) return null;

  const pointThemeTags = unique([
    ...objectThemes(pointId),
    ...signThemes(input.point.signId),
    ...(input.birthTimeReliable ? houseThemes(input.point.house) : []),
  ]);
  const targetThemeTags = unique([
    ...targetThemes(targetId),
    ...signThemes(input.target.signId),
    ...(input.birthTimeReliable ? houseThemes(input.target.house) : []),
    ...(input.target.targetClass === "special-point" ? objectThemes(targetId) : []),
  ]);
  const evidenceThemes = unique([...pointThemeTags, ...targetThemeTags]);
  const storyMatch = matchStory(evidenceThemes, input.stories, input.report);
  const closeness = Math.max(
    0,
    1 - aspect.orbDegrees / Math.max(policy.maxOrbDegrees, 0.01),
  );
  const base = OBJECT_BASE_WEIGHT[pointId] ?? 32;
  const coreBonus = CORE_TARGETS.has(targetId) ? 14 : 0;
  const personalBonus = PERSONAL_TARGETS.has(targetId) ? 8 : 0;
  const rulerBonus = targetId === normalizeId(input.chartRulerId) ? 10 : 0;
  const angularHouseBonus =
    input.birthTimeReliable &&
    [input.point.house, input.target.house].some(
      (house) => typeof house === "number" && ANGULAR_HOUSES.has(house),
    )
      ? 8
      : 0;
  const themeBonus = (storyMatch?.shared.length ?? 0) * 4;
  const pairBonus = input.target.targetClass === "special-point" ? 6 : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      base +
        closeness * 25 +
        coreBonus +
        personalBonus +
        rulerBonus +
        angularHouseBonus +
        themeBonus +
        pairBonus -
        policy.generationalPenalty,
    ),
  );
  const decision = classifyAdvancedStoryDecision({
    score,
    sharedThemeCount: storyMatch?.shared.length ?? 0,
    hasStoryMatch: Boolean(storyMatch),
    standaloneEligible: policy.standaloneEligible,
    evidenceKind: "special-point-aspect",
  });
  // HALLEUS_SLICE5_ASPECT_DISPLAY_AUTHORITY
  return {
    id: `advanced:${pointId}:${targetId}:${aspect.aspectId}`,
    evidenceKind: "special-point-aspect",
    objectIds: unique([pointId, ...(input.target.targetClass === "special-point" ? [targetId] : [])]),
    sourceIds: unique([pointId, targetId]),
    label: `${specialPointLabel(input.point)} · ${input.target.label}`,
    detail: `${formatReportAspectDisplay(aspect.aspectId)} · اورب ${aspect.orbDegrees.toFixed(2)}°`,
    score,
    decision,
    matchedStorySemanticKey: storyMatch?.story.semanticKey ?? null,
    themeTags: evidenceThemes,
    sharedThemeTags: storyMatch?.shared ?? [],
    orbDegrees: aspect.orbDegrees,
    aspectId: aspect.aspectId,
    reasons: [
      `policy=${policy.policyId}`,
      `orb=${aspect.orbDegrees.toFixed(2)}°/${policy.maxOrbDegrees.toFixed(2)}°`,
      ...(coreBonus ? ["core-angle-or-luminary"] : []),
      ...(rulerBonus ? ["chart-ruler-contact"] : []),
      ...(angularHouseBonus ? ["angular-house-context"] : []),
      ...(storyMatch?.shared.length
        ? [`shared-themes=${storyMatch.shared.join(",")}`]
        : []),
      ...(!input.birthTimeReliable ? ["birth-time-uncertain-house-weight-disabled"] : []),
    ],
  };
}

function buildFixedStarEvidence(input: {
  report: AstrologyReport;
  stories: AdvancedStoryCandidate[];
  contact: {
    starId: string;
    starLabelFa: string;
    starLabelEn: string;
    anchorId: string;
    anchorLabel: string;
    anchorClass: "core-angle-or-luminary" | "other-natal-placement";
    orbDegrees: number;
  };
  birthTimeReliable: boolean;
}): AdvancedRelevanceEvidence | null {
  if (input.contact.orbDegrees > 1) return null;
  if (
    !input.birthTimeReliable &&
    ["asc", "mc", "dsc", "ic"].includes(normalizeId(input.contact.anchorId))
  ) {
    return null;
  }
  const anchorId = normalizeId(input.contact.anchorId);
  const themes = unique([
    "fixed-star",
    ...targetThemes(anchorId),
  ]);
  const storyMatch = matchStory(themes, input.stories, input.report);
  const closeness = Math.max(0, 1 - input.contact.orbDegrees / 1);
  const score = Math.min(
    100,
    FIXED_STAR_BASE_WEIGHT +
      closeness * 22 +
      (input.contact.anchorClass === "core-angle-or-luminary" ? 16 : 0) +
      (storyMatch?.shared.length ?? 0) * 4,
  );
  const decision = classifyAdvancedStoryDecision({
    score,
    sharedThemeCount: storyMatch?.shared.length ?? 0,
    hasStoryMatch: Boolean(storyMatch),
    standaloneEligible: false,
    evidenceKind: "fixed-star-conjunction",
  });
  return {
    id: `advanced:star:${input.contact.starId}:${anchorId}`,
    evidenceKind: "fixed-star-conjunction",
    objectIds: [input.contact.starId],
    sourceIds: [input.contact.starId, anchorId],
    label: `${input.contact.starLabelFa || input.contact.starLabelEn} · ${input.contact.anchorLabel}`,
    detail: `☌ ۰° · اورب ${input.contact.orbDegrees.toFixed(2)}°`,
    score,
    decision,
    matchedStorySemanticKey: storyMatch?.story.semanticKey ?? null,
    themeTags: themes,
    sharedThemeTags: storyMatch?.shared ?? [],
    orbDegrees: input.contact.orbDegrees,
    aspectId: "conjunction",
    reasons: [
      "fixed-star-conjunction-only",
      `orb=${input.contact.orbDegrees.toFixed(2)}°/1.00°`,
      ...(input.contact.anchorClass === "core-angle-or-luminary"
        ? ["core-angle-or-luminary"]
        : []),
    ],
  };
}
function buildTraditionalLotEvidence(input: {
  report: AstrologyReport;
  stories: AdvancedStoryCandidate[];
  lot: {
    id: string;
    labelFa: string;
    labelEn: string;
    signId: string;
    house: number | null;
    formulaId: string;
    tradition: string;
  };
  birthTimeReliable: boolean;
}): AdvancedRelevanceEvidence | null {
  const lotId = normalizeId(input.lot.id);
  if (lotId === "fortune") return null;
  const themes = unique([
    ...(LOT_THEME_TAGS[lotId] ?? []),
    ...signThemes(input.lot.signId),
    ...(input.birthTimeReliable ? houseThemes(input.lot.house) : []),
  ]);
  const storyMatch = matchStory(themes, input.stories, input.report);
  const angularBonus =
    input.birthTimeReliable &&
    typeof input.lot.house === "number" &&
    ANGULAR_HOUSES.has(input.lot.house)
      ? 5
      : 0;
  const sharedThemeCount = storyMatch?.shared.length ?? 0;
  const score = Math.min(
    68,
    LOT_BASE_WEIGHT + angularBonus + sharedThemeCount * 4,
  );
  const decision: AdvancedNarrativeDecision =
    storyMatch && sharedThemeCount >= 2 && score >= 48 ? "support" : "suppress";
  return {
    id: `advanced:lot:${lotId}`,
    evidenceKind: "traditional-lot",
    objectIds: [lotId],
    sourceIds: [`lot:${lotId}`],
    label: input.lot.labelFa || input.lot.labelEn || lotId,
    detail: "فرمول و سنت این سهم در جزئیات فنی گزارش ثبت شده است.",
    score,
    decision,
    matchedStorySemanticKey:
      decision === "support" ? storyMatch?.story.semanticKey ?? null : null,
    themeTags: themes,
    sharedThemeTags: storyMatch?.shared ?? [],
    orbDegrees: null,
    aspectId: null,
    reasons: [
      "traditional-lot-placement-theme-only",
      "modern-aspect-doctrine-not-applied",
      ...(angularBonus ? ["angular-house-context"] : []),
    ],
  };
}
function buildStoryAdjustments(
  decisions: AdvancedRelevanceEvidence[],
): AdvancedStoryAdjustment[] {
  const grouped = new Map<string, AdvancedRelevanceEvidence[]>();
  for (const item of decisions) {
    if (
      !item.matchedStorySemanticKey ||
      (item.decision !== "merge" && item.decision !== "support")
    ) {
      continue;
    }
    grouped.set(item.matchedStorySemanticKey, [
      ...(grouped.get(item.matchedStorySemanticKey) ?? []),
      item,
    ]);
  }
  return [...grouped.entries()].map(([semanticKey, evidence]) => {
    const sorted = evidence
      .slice()
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const narrativeEvidence = sorted.filter(
      (item) => item.evidenceKind !== "traditional-lot",
    );
    const lotSupport = sorted.filter(
      (item) => item.evidenceKind === "traditional-lot" && item.decision === "support",
    );
    const mergeCount = narrativeEvidence.filter(
      (item) => item.decision === "merge",
    ).length;
    const supportCount = narrativeEvidence.filter(
      (item) => item.decision === "support",
    ).length;
    return {
      semanticKey,
      scoreBoost: Math.min(
        22,
        mergeCount * 8 +
          supportCount * 3 +
          Math.min(6, narrativeEvidence.length) +
          Math.min(2, lotSupport.length),
      ),
      evidence: sorted,
      absorbedEvidenceIds: narrativeEvidence
        .filter((item) => item.decision === "merge")
        .map((item) => item.id),
      rankingReasons: [],
    };
  });
}

export function buildAdvancedRelevancePlan(input: {
  report: AstrologyReport;
  storyCandidates: AdvancedStoryCandidate[];
  chartRulerId: string;
}): AdvancedRelevancePlan {
  const report = input.report;
  const realEngine = report.realEngine;
  const birthTimeReliable = report.input.birthTimeAccuracy !== "unknown";
  if (!realEngine) {
    return {
      version: ADVANCED_RELEVANCE_ENGINE_VERSION,
      policyVersion: ADVANCED_ASPECT_POLICY_VERSION,
      birthTimeReliable,
      decisions: [],
      storyAdjustments: [],
      counts: { merge: 0, support: 0, standalone: 0, suppress: 0 },
      asteroidLabAutoPromotion: false,
      traditionalLotModernAspectDoctrineApplied: false,
      fixedStarPolicy: "conjunction-only-tight-filter",
      notes: ["No real-engine snapshot; advanced relevance remains empty."],
    };
  }

  const decisions: AdvancedRelevanceEvidence[] = [];
  const calculatedSpecialPoints = (realEngine.specialPoints ?? []).filter(
    (point) => point.status === "calculated",
  );
  const placements = realEngine.placements ?? [];
  const angles = realEngine.angles ?? {};
  const angleTargets = birthTimeReliable
    ? (["asc", "mc", "dsc", "ic"] as const)
        .map((id) => angles[id])
        .filter((angle): angle is NonNullable<typeof angle> => Boolean(angle))
        .map((angle) => ({
          id: angle.id,
          label: angle.label,
          longitude: angle.longitude,
          signId: angle.signId,
          house: angle.house ?? null,
          targetClass: "angle" as const,
        }))
    : [];

  for (const point of calculatedSpecialPoints) {
    const policy = getAdvancedAspectPolicy(point.id);
    if (!policy) continue;
    for (const placement of placements) {
      const item = buildSpecialPointAspectEvidence({
        report,
        stories: input.storyCandidates,
        chartRulerId: input.chartRulerId,
        point,
        target: {
          id: placement.id,
          label: placement.label,
          longitude: placement.longitude,
          signId: placement.signId,
          house: placement.house ?? null,
          targetClass: "placement",
        },
        birthTimeReliable,
      });
      if (item) decisions.push(item);
    }
    for (const angle of angleTargets) {
      const item = buildSpecialPointAspectEvidence({
        report,
        stories: input.storyCandidates,
        chartRulerId: input.chartRulerId,
        point,
        target: angle,
        birthTimeReliable,
      });
      if (item) decisions.push(item);
    }
  }

  for (let firstIndex = 0; firstIndex < calculatedSpecialPoints.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < calculatedSpecialPoints.length;
      secondIndex += 1
    ) {
      const first = calculatedSpecialPoints[firstIndex];
      const second = calculatedSpecialPoints[secondIndex];
      const firstPolicy = getAdvancedAspectPolicy(first.id);
      const secondPolicy = getAdvancedAspectPolicy(second.id);
      if (!firstPolicy || !secondPolicy) continue;
      const drivingPoint =
        firstPolicy.maxOrbDegrees <= secondPolicy.maxOrbDegrees ? first : second;
      const targetPoint = drivingPoint === first ? second : first;
      const item = buildSpecialPointAspectEvidence({
        report,
        stories: input.storyCandidates,
        chartRulerId: input.chartRulerId,
        point: drivingPoint,
        target: {
          id: targetPoint.id,
          label: specialPointLabel(targetPoint),
          longitude: targetPoint.longitude,
          signId: targetPoint.signId,
          house: targetPoint.house,
          targetClass: "special-point",
        },
        birthTimeReliable,
      });
      if (item) decisions.push(item);
    }
  }

  for (const contact of realEngine.specialistAstrology?.fixedStars
    ?.conjunctionCandidates ?? []) {
    const item = buildFixedStarEvidence({
      report,
      stories: input.storyCandidates,
      contact,
      birthTimeReliable,
    });
    if (item) decisions.push(item);
  }

  for (const lot of realEngine.specialistAstrology?.traditionalLots?.lots ?? []) {
    const item = buildTraditionalLotEvidence({
      report,
      stories: input.storyCandidates,
      lot,
      birthTimeReliable,
    });
    if (item) decisions.push(item);
  }

  const deduped = [...new Map(decisions.map((item) => [item.id, item])).values()]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const counts: Record<AdvancedNarrativeDecision, number> = {
    merge: 0,
    support: 0,
    standalone: 0,
    suppress: 0,
  };
  for (const item of deduped) counts[item.decision] += 1;

  return {
    version: ADVANCED_RELEVANCE_ENGINE_VERSION,
    policyVersion: ADVANCED_ASPECT_POLICY_VERSION,
    birthTimeReliable,
    decisions: deduped,
    storyAdjustments: buildStoryAdjustments(deduped),
    counts,
    asteroidLabAutoPromotion: false,
    traditionalLotModernAspectDoctrineApplied: false,
    fixedStarPolicy: "conjunction-only-tight-filter",
    notes: [
      "Advanced relevance consumes calculated snapshot evidence; it does not recalculate celestial positions.",
      "Minor Asteroid Lab selections never enter the main report automatically.",
      "Fixed stars are conjunction-only and cannot become standalone stories in Slice 4.",
      "Traditional Lots preserve formula/tradition context and are not given automatic modern aspect doctrine.",
      "Standalone advanced decisions are classified here; final narrative composition remains Slice 5 work.",
    ],
  };
}
