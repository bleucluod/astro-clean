import type {
  RealSynastryReport,
  SynastryInterChartAspect,
  SynastryNatalPoint,
  SynastryNatalSnapshot,
  SynastryPointReference,
} from "@/types/synastry-engine";

/** Review policy v1. It does not change the customer-facing writer or access. */
export const COMPARISON_EVIDENCE_PLAN_VERSION = "compare-evidence-plan-v1";
const PERSONAL = new Set(["sun", "moon", "mercury", "venus", "mars"]);
const CONTEXT = new Set([...PERSONAL, "jupiter", "saturn"]);
const ANGLES = new Set(["asc", "dsc", "mc", "ic"]);
const OUTER_BOUNDARY = new Set(["saturn", "uranus", "pluto"]);

export type EvidenceChapterId =
  | "communication"
  | "emotional-security"
  | "attraction-intimacy"
  | "boundaries-commitment"
  | "friction-repair";

function eligiblePoint(point: SynastryNatalPoint, chart: SynastryNatalSnapshot) {
  return point.analysisEligible !== false &&
    (chart.birthTimeStatus === "exact" ||
      (!point.requiresExactBirthTime && point.kind === "planet" && point.id !== "moon"));
}

function pointContext(point: SynastryNatalPoint, chart: SynastryNatalSnapshot) {
  return {
    evidenceId: "natal-point:" + chart.chartId + ":" + point.id,
    ownerChartId: chart.chartId,
    ownerLabel: chart.label,
    pointId: point.id,
    signId: point.signId,
    degreeInSignAtReferenceTime: point.degreeInSign,
    natalHouse: chart.birthTimeStatus === "exact" ? point.natalHouse ?? null : null,
    birthTimeStatus: chart.birthTimeStatus,
    limitation: chart.birthTimeStatus === "unknown"
      ? "unknown-time-reference-position-not-exact-degree" : null,
  };
}

function extractChartFeatures(chart: SynastryNatalSnapshot) {
  const points = (chart.points?.length ? chart.points : [...chart.placements, ...chart.angles])
    .filter(point => eligiblePoint(point, chart));
  const pointIds = new Set(points.map(point => point.id));
  const aspects = (chart.engineSnapshot?.aspects ?? [])
    .filter(aspect => pointIds.has(aspect.firstPlanetId) && pointIds.has(aspect.secondPlanetId))
    .filter(aspect => PERSONAL.has(aspect.firstPlanetId) || PERSONAL.has(aspect.secondPlanetId))
    .sort((a, b) => a.orb - b.orb || a.id.localeCompare(b.id));
  const featurePoints = points.filter(point => CONTEXT.has(point.id) || point.id === "asc");
  const ranked = featurePoints.map(point => {
    const linked = aspects.filter(aspect =>
      aspect.firstPlanetId === point.id || aspect.secondPlanetId === point.id);
    const tight = linked.filter(aspect => aspect.orb <= 2);
    const isRuler = chart.birthTimeStatus === "exact" && point.id === chart.chartRulerId;
    const reasons = [
      ...(isRuler ? ["calculated-chart-ruler"] : []),
      ...(tight.length ? ["tight-personal-natal-aspect"] : []),
      ...(PERSONAL.has(point.id) ? ["personal-planet"] : []),
      ...(point.id === "asc" ? ["calculated-ascendant"] : []),
    ];
    return {
      ...pointContext(point, chart),
      reasons,
      prominenceScore: (isRuler ? 35 : 0) + tight.length * 12 +
        (PERSONAL.has(point.id) ? 10 : 0) + (point.id === "asc" ? 8 : 0),
      natalAspectIds: linked.slice(0, 3).map(aspect => "natal-aspect:" + chart.chartId + ":" + aspect.id),
    };
  }).sort((a, b) => b.prominenceScore - a.prominenceScore || a.pointId.localeCompare(b.pointId));
  return {
    chartId: chart.chartId,
    label: chart.label,
    birthTimeStatus: chart.birthTimeStatus,
    chartRulerId: chart.birthTimeStatus === "exact" ? chart.chartRulerId : null,
    dominantSignature: chart.birthTimeStatus === "exact" ? {
      element: chart.engineSnapshot?.chartSignature?.dominantElement ?? null,
      modality: chart.engineSnapshot?.chartSignature?.dominantModality ?? null,
      expression: chart.engineSnapshot?.chartSignature?.dominantExpression ?? null,
    } : null,
    prominent: ranked.slice(0, 5),
    context: ranked,
    natalAspects: aspects.slice(0, 6).map(aspect => ({
      evidenceId: "natal-aspect:" + chart.chartId + ":" + aspect.id,
      ownerChartId: chart.chartId,
      firstPointId: aspect.firstPlanetId,
      secondPointId: aspect.secondPlanetId,
      aspectId: aspect.aspectId,
      orb: aspect.orb,
    })),
    limitation: chart.birthTimeStatus === "unknown"
      ? "no-angles-houses-ruler-signature-or-unknown-moon; other positions are reference-time estimates" : null,
  };
}

function axisKey(contact: SynastryInterChartAspect) {
  function endpoint(point: SynastryPointReference) {
    const pointId = ["asc", "dsc"].includes(point.id) ? "horizon" :
      ["mc", "ic"].includes(point.id) ? "meridian" : point.id;
    return point.chartId + ":" + pointId;
  }
  return [endpoint(contact.pointA), endpoint(contact.pointB)].sort().join("|");
}

function rank(chapter: EvidenceChapterId, contact: SynastryInterChartAspect): number | null {
  const a = contact.pointA.id, b = contact.pointB.id;
  const ids = [a, b];
  const has = (id: string) => ids.includes(id);
  const tension = contact.polarity === "tension" || contact.polarity === "intense";
  const pair = (first: string, others: readonly string[]) =>
    (a === first && others.includes(b)) || (b === first && others.includes(a));
  const base = contact.relevanceScore;
  switch (chapter) {
    case "communication":
      return contact.categories.includes("communication") && has("mercury")
        ? base + (tension && contact.orb <= 1 ? 20 : 0) : null;
    case "emotional-security":
      return has("moon") && !has("mercury") && !has("mars")
        ? base : null;
    case "attraction-intimacy":
      if (pair("venus", ["venus", "sun", "mars", "uranus"])) {
        return base + 6 + (a === "venus" && b === "venus" ? 30 : 0);
      }
      return pair("sun", ["mars"]) ? base : null;
    case "boundaries-commitment":
      if (!ids.some(id => OUTER_BOUNDARY.has(id)) || has("moon") || has("mars") ||
          has("mercury")) return null;
      if (pair("saturn", ["sun", "venus", "asc", "dsc"])) {
        return base + 25 + (has("dsc") ? 5 : 0);
      }
      if (ids.some(id => PERSONAL.has(id) || ANGLES.has(id))) return base;
      return has("saturn") && ids.every(id => OUTER_BOUNDARY.has(id) || id === "neptune")
        ? base : null;
    case "friction-repair":
      return tension && has("mars") &&
        ids.some(id => PERSONAL.has(id) && id !== "mars" || OUTER_BOUNDARY.has(id) || ANGLES.has(id))
        ? base : null;
  }
}

const PRIORITY: EvidenceChapterId[] = [
  "friction-repair", "boundaries-commitment", "emotional-security",
  "attraction-intimacy", "communication",
];
const ORDER: EvidenceChapterId[] = [
  "communication", "emotional-security", "attraction-intimacy",
  "boundaries-commitment", "friction-repair",
];
const REASONS: Record<EvidenceChapterId, string> = {
  communication: "mercury-communication; exact-tension bonus for divergent interpretations",
  "emotional-security": "moon-contact; reserve mercury and mars patterns for their own chapters",
  "attraction-intimacy": "venus or sun-mars; prioritize mutual venus without using moon-security or saturn-commitment",
  "boundaries-commitment": "saturn/uranus/pluto; prefer saturn with personal planet or relationship axis",
  "friction-repair": "tense/intense mars contact; reserve concrete escalation before other chapters",
};
function witness(contact: SynastryInterChartAspect) {
  return {
    id: contact.id,
    canonicalKey: contact.canonicalKey,
    pointA: { chartId: contact.pointA.chartId, side: contact.pointA.chartSide, pointId: contact.pointA.id },
    pointB: { chartId: contact.pointB.chartId, side: contact.pointB.chartSide, pointId: contact.pointB.id },
    aspectId: contact.aspectId,
    orb: contact.orb,
    allowedOrb: contact.allowedOrb,
    polarity: contact.polarity,
    relevanceScore: contact.relevanceScore,
  };
}

/** Allocates factual witnesses before narrative writing. No fixed fixture IDs or prose. */
export function buildComparisonEvidencePlan(report: RealSynastryReport) {
  const charts = [report.chartA, report.chartB];
  const chartById = new Map(charts.map(chart => [chart.chartId, chart]));
  const contacts = report.contacts.filter(contact => {
    const a = chartById.get(contact.pointA.chartId), b = chartById.get(contact.pointB.chartId);
    return Boolean(a && b && eligiblePoint(contact.pointA, a) && eligiblePoint(contact.pointB, b) &&
      (report.quality.angleContactsAvailable || ![contact.pointA, contact.pointB].some(point => point.kind === "angle")));
  });
  const used = new Set<string>();
  function choose(chapter: EvidenceChapterId, support: boolean) {
    return contacts.map(contact => ({ contact, score: rank(chapter, contact) }))
      .filter((item): item is { contact: SynastryInterChartAspect; score: number } =>
        item.score !== null && !used.has(axisKey(item.contact)) &&
        (!support || (item.contact.orb <= 3.5 && item.contact.relevanceScore >= 60)))
      .sort((a, b) => b.score - a.score || a.contact.orb - b.contact.orb ||
        a.contact.canonicalKey.localeCompare(b.contact.canonicalKey))[0]?.contact ?? null;
  }
  const primary = new Map<EvidenceChapterId, SynastryInterChartAspect>();
  for (const chapter of PRIORITY) {
    const main = choose(chapter, false);
    if (main) {
      primary.set(chapter, main);
      used.add(axisKey(main));
    }
  }
  const chartFeatures = charts.map(extractChartFeatures);
  const chapterPlans = ORDER.map(chapter => {
    const main = primary.get(chapter) ?? null;
    const limited = main && chapter === "boundaries-commitment" &&
      ![main.pointA.id, main.pointB.id].some(id => PERSONAL.has(id) || ANGLES.has(id));
    const support = main && !limited ? choose(chapter, true) : null;
    if (support) used.add(axisKey(support));
    const primaryWitness = main ? witness(main) : null;
    const context = main ? [main.pointA, main.pointB].map(point => {
      const chart = chartById.get(point.chartId)!;
      return pointContext(point, chart);
    }) : [];
    return {
      chapter,
      status: !main ? "insufficient" : limited ? "limited" : "supported",
      primary: primaryWitness,
      primaryScore: main ? rank(chapter, main) : null,
      support: support ? witness(support) : null,
      context,
      reason: REASONS[chapter],
      limitation: limited ? "shared-slow-planet-contact-does-not-establish-different-expectations" :
        !main ? "no-unclaimed-eligible-contact" : null,
    };
  });
  return {
    version: COMPARISON_EVIDENCE_PLAN_VERSION,
    chartFeatures,
    eligibleContacts: contacts.map(witness),
    excludedContactIds: report.contacts.filter(contact => !contacts.includes(contact)).map(contact => contact.id),
    houseOverlays: report.quality.houseOverlaysAvailable && charts.every(chart => chart.birthTimeStatus === "exact")
      ? report.houseOverlays : [],
    chapterPlans,
  };
}
