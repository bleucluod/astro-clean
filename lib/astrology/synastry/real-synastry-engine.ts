import type {
  BuildRealSynastryInput,
  BuildSynastryNatalSnapshotInput,
  RealSynastryReport,
  RealSynastryResult,
  SynastryAspectDefinition,
  SynastryAspectPolarity,
  SynastryBiWheelData,
  SynastryChartSide,
  SynastryContactCategory,
  SynastryHouseCusp,
  SynastryHouseOverlay,
  SynastryInterChartAspect,
  SynastryNatalPoint,
  SynastryNatalSnapshot,
  SynastryPointReference,
} from "../../../types/synastry-engine";
import { REAL_SYNASTRY_CONTRACT_VERSION } from "../../../types/synastry-engine";
import {
  buildSynastryContactEvidenceFa,
  buildSynastryContactGrowthFa,
  buildSynastryContactReadingFa,
  buildSynastryDynamics,
  buildSynastryHouseOverlayReadingFa,
  buildSynastryPatterns,
  buildSynastryPersianSynthesis,
  getCanonicalSynastryPointLabelsFa,
  getSynastryPointIdLabelFa,
} from "./real-synastry-persian";
import type {
  RealEngineReportAngle,
  RealEngineReportHouse,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
  ZodiacKey,
} from "../../../types/astro";

const ASPECT_DEFINITIONS: readonly SynastryAspectDefinition[] = [
  { id: "conjunction", labelFa: "هم‌نشینی", angle: 0, defaultOrb: 7 },
  { id: "sextile", labelFa: "فرصت همکاری", angle: 60, defaultOrb: 4 },
  { id: "square", labelFa: "چالش فعال", angle: 90, defaultOrb: 5 },
  { id: "trine", labelFa: "جریان هماهنگ", angle: 120, defaultOrb: 5 },
  { id: "opposition", labelFa: "قطبیت", angle: 180, defaultOrb: 7 },
] as const;

const TRADITIONAL_CHART_RULER_BY_SIGN: Record<ZodiacKey, string> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};

const LUMINARY_IDS = new Set(["sun", "moon"]);
const PERSONAL_PLANET_IDS = new Set([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
]);
const SATURN_OUTER_IDS = new Set([
  "saturn",
  "uranus",
  "neptune",
  "pluto",
]);
const OUTER_IDS = new Set(["uranus", "neptune", "pluto"]);
const CLOSENESS_IDS = new Set(["moon", "venus", "mars"]);
const INDEPENDENCE_IDS = new Set(["saturn", "uranus", "pluto"]);
const OVERLAY_PLANET_IDS = new Set([
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
]);

const HOUSE_RELEVANCE: Partial<Record<RealEngineReportHouseNumber, number>> = {
  1: 20,
  4: 18,
  5: 15,
  7: 22,
  8: 17,
  10: 12,
  11: 10,
};

export function createSynastryNatalSnapshot(
  input: BuildSynastryNatalSnapshotInput,
): SynastryNatalSnapshot {
  const chartId = input.chartId.trim();
  const label = input.label?.trim() || "چارت";
  const source = input.snapshot;
  const limitations = [...(source.calculationQuality?.limitations ?? [])];
  const placements = normalizePlacements(source.placements);
  const exactTime = input.birthTimeStatus === "exact";
  const angles = exactTime ? normalizeAngles(source.angles) : [];
  const houses = exactTime ? normalizeHouses(source.houses) : [];
  const ascendant = angles.find((angle) => angle.id === "asc") ?? null;
  const chartRulerId = ascendant
    ? TRADITIONAL_CHART_RULER_BY_SIGN[ascendant.signId]
    : null;

  if (!exactTime) {
    limitations.push(
      "ساعت تولد نامشخص است؛ زاویه‌ها، حاکم چارت و خانه‌ها برای مقایسه استفاده نمی‌شوند.",
    );
  } else if (angles.length === 0) {
    limitations.push(
      "با وجود اعلام ساعت دقیق، زاویه معتبر در snapshot پیدا نشد؛ تماس‌های زاویه‌ای غیرفعال‌اند.",
    );
  }

  if (exactTime && houses.length !== 12) {
    limitations.push(
      "دوازده سرخانه معتبر در snapshot موجود نیست؛ هم‌پوشانی خانه‌ها غیرفعال است.",
    );
  }

  if (placements.length < 5) {
    limitations.push(
      "تعداد جایگاه‌های سیاره‌ای محدود است؛ نتیجه فقط بر داده‌های موجود تکیه دارد.",
    );
  }

  return {
    contractVersion: REAL_SYNASTRY_CONTRACT_VERSION,
    chartId,
    label,
    natalSnapshotVersion: source.version,
    natalGeneratedAt: source.generatedAt,
    birthTimeStatus: input.birthTimeStatus,
    chartRulerId,
    chartRulerMethod: chartRulerId
      ? "traditional-ruler-from-ascendant"
      : null,
    placements,
    angles,
    houses,
    houseSystem:
      houses.length === 12
        ? (source.houseSystem ??
          source.houseContext?.appliedSystem ??
          houses[0]?.system ??
          null)
        : null,
    limitations: uniqueStrings(limitations),
  };
}

export function buildRealSynastry(
  input: BuildRealSynastryInput,
): RealSynastryResult {
  const chartAIssues = validateSnapshot(input.chartA, "چارت اول");
  if (chartAIssues.length > 0) {
    return { ok: false, code: "invalid-chart-a", issues: chartAIssues };
  }

  const chartBIssues = validateSnapshot(input.chartB, "چارت دوم");
  if (chartBIssues.length > 0) {
    return { ok: false, code: "invalid-chart-b", issues: chartBIssues };
  }

  if (
    input.chartA.chartId === input.chartB.chartId &&
    input.chartA !== input.chartB
  ) {
    return {
      ok: false,
      code: "invalid-pair",
      issues: ["شناسه دو snapshot متفاوت نباید یکسان باشد."],
    };
  }

  const relationshipContext = input.relationshipContext ?? "general";
  const angleContactsAvailable =
    input.chartA.birthTimeStatus === "exact" &&
    input.chartB.birthTimeStatus === "exact" &&
    input.chartA.angles.length > 0 &&
    input.chartB.angles.length > 0;
  const houseOverlaysAvailable =
    input.chartA.birthTimeStatus === "exact" &&
    input.chartB.birthTimeStatus === "exact" &&
    input.chartA.houses.length === 12 &&
    input.chartB.houses.length === 12;

  const contacts = calculateInterChartAspects(
    input.chartA,
    input.chartB,
    angleContactsAvailable,
  );
  const houseOverlays = houseOverlaysAvailable
    ? calculateHouseOverlays(input.chartA, input.chartB)
    : [];
  const supportivePatterns = buildSynastryPatterns(contacts, "supportive");
  const tensionPatterns = buildSynastryPatterns(contacts, "tension");
  const limitations = buildPairLimitations(
    input.chartA,
    input.chartB,
    angleContactsAvailable,
    houseOverlaysAvailable,
  );
  const dynamics = buildSynastryDynamics(contacts);
  const synthesis = buildSynastryPersianSynthesis({
    chartA: input.chartA,
    chartB: input.chartB,
    relationshipContext,
    supportivePatterns,
    tensionPatterns,
    dynamics,
    limitations,
  });
  const biWheel = buildBiWheelData(input.chartA, input.chartB, contacts);

  const report: RealSynastryReport = {
    contractVersion: REAL_SYNASTRY_CONTRACT_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    relationshipContext,
    chartA: input.chartA,
    chartB: input.chartB,
    contacts,
    supportivePatterns,
    tensionPatterns,
    houseOverlays,
    dynamics,
    synthesis,
    biWheel,
    quality: {
      status:
        angleContactsAvailable &&
        houseOverlaysAvailable &&
        input.chartA.limitations.length === 0 &&
        input.chartB.limitations.length === 0
          ? "complete"
          : "partial",
      planetToPlanetAvailable: true,
      angleContactsAvailable,
      houseOverlaysAvailable,
      contactCount: contacts.length,
      supportivePatternCount: supportivePatterns.length,
      tensionPatternCount: tensionPatterns.length,
      limitations,
    },
  };

  return { ok: true, report };
}

export function calculateInterChartAspects(
  chartA: SynastryNatalSnapshot,
  chartB: SynastryNatalSnapshot,
  includeAngles =
    chartA.birthTimeStatus === "exact" &&
    chartB.birthTimeStatus === "exact",
): SynastryInterChartAspect[] {
  const pointsA = toPointReferences(chartA, "a", includeAngles);
  const pointsB = toPointReferences(chartB, "b", includeAngles);
  const contacts: SynastryInterChartAspect[] = [];

  for (const pointA of pointsA) {
    for (const pointB of pointsB) {
      const match = findAspect(pointA, pointB);
      if (!match) continue;

      const categories = classifyContactCategories(
        pointA,
        pointB,
        chartA,
        chartB,
      );
      const polarity = classifyPolarity(pointA, pointB, match.definition.id);
      const relevanceScore = scoreContact(
        pointA,
        pointB,
        match.orb,
        match.allowedOrb,
        match.definition.id,
        categories,
      );
      const labels = getCanonicalSynastryPointLabelsFa(pointA, pointB);
      const titleFa = `${labels[0]} ${match.definition.labelFa} ${labels[1]}`;

      contacts.push({
        id: buildContactId(pointA, pointB, match.definition.id),
        canonicalKey: buildCanonicalContactKey(
          pointA,
          pointB,
          match.definition.id,
        ),
        pointA,
        pointB,
        aspectId: match.definition.id,
        aspectLabel: match.definition.labelFa,
        angle: match.definition.angle,
        separation: round(match.separation, 6),
        orb: round(match.orb, 6),
        allowedOrb: match.allowedOrb,
        polarity,
        categories,
        relevanceScore,
        evidence: buildSynastryContactEvidenceFa({
          pointA,
          pointB,
          aspectLabel: match.definition.labelFa,
          orb: match.orb,
          categories,
        }),
        titleFa,
        readingFa: buildSynastryContactReadingFa({
          pointA,
          pointB,
          aspectId: match.definition.id,
          polarity,
          categories,
        }),
        growthFa: buildSynastryContactGrowthFa(
          match.definition.id,
          categories,
        ),
      });
    }
  }

  return contacts.sort(compareContacts);
}

export function calculateHouseOverlays(
  chartA: SynastryNatalSnapshot,
  chartB: SynastryNatalSnapshot,
): SynastryHouseOverlay[] {
  if (
    chartA.birthTimeStatus !== "exact" ||
    chartB.birthTimeStatus !== "exact" ||
    chartA.houses.length !== 12 ||
    chartB.houses.length !== 12
  ) {
    return [];
  }

  return [
    ...buildDirectionalOverlays(chartA, "a", chartB, "b"),
    ...buildDirectionalOverlays(chartB, "b", chartA, "a"),
  ].sort(
    (left, right) =>
      right.relevanceScore - left.relevanceScore ||
      left.id.localeCompare(right.id),
  );
}

function normalizePlacements(
  placements: readonly RealEngineReportPlacement[],
): SynastryNatalPoint[] {
  const seen = new Set<string>();
  const result: SynastryNatalPoint[] = [];

  for (const placement of placements) {
    if (
      !placement.id?.trim() ||
      seen.has(placement.id) ||
      !Number.isFinite(placement.longitude)
    ) {
      continue;
    }

    seen.add(placement.id);
    result.push({
      id: placement.id,
      label: getSynastryPointIdLabelFa(placement.id, placement.label),
      kind: "planet",
      longitude: normalizeLongitude(placement.longitude),
      signId: placement.signId,
      degreeInSign: normalizeDegreeInSign(placement.degreeInSign),
      sourceMethod: placement.method,
    });
  }

  return result.sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeAngles(
  angles: BuildSynastryNatalSnapshotInput["snapshot"]["angles"],
): SynastryNatalPoint[] {
  if (!angles) return [];

  return Object.values(angles)
    .filter((angle): angle is RealEngineReportAngle =>
      Boolean(angle && Number.isFinite(angle.longitude)),
    )
    .map((angle) => ({
      id: angle.id,
      label: getSynastryPointIdLabelFa(angle.id, angle.label),
      kind: "angle" as const,
      longitude: normalizeLongitude(angle.longitude),
      signId: angle.signId,
      degreeInSign: normalizeDegreeInSign(angle.degreeInSign),
      sourceMethod: angle.method,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeHouses(
  houses: readonly RealEngineReportHouse[] | undefined,
): SynastryHouseCusp[] {
  if (!houses || houses.length !== 12) return [];

  const seen = new Set<number>();
  const normalized: SynastryHouseCusp[] = [];
  for (const house of houses) {
    if (
      seen.has(house.number) ||
      !Number.isFinite(house.cuspLongitude)
    ) {
      return [];
    }
    seen.add(house.number);
    normalized.push({
      number: house.number,
      cuspLongitude: normalizeLongitude(house.cuspLongitude),
      signId: house.signId,
      system: house.system,
    });
  }

  normalized.sort((left, right) => left.number - right.number);
  const totalSpan = normalized.reduce((sum, house, index) => {
    const next = normalized[(index + 1) % normalized.length];
    const span = normalizeLongitude(next.cuspLongitude - house.cuspLongitude);
    return span > 0 ? sum + span : Number.NaN;
  }, 0);

  return Number.isFinite(totalSpan) && Math.abs(totalSpan - 360) < 0.000001
    ? normalized
    : [];
}

function validateSnapshot(
  snapshot: SynastryNatalSnapshot,
  label: string,
): string[] {
  const issues: string[] = [];
  if (!snapshot || typeof snapshot !== "object") {
    return [`${label} موجود نیست.`];
  }
  if (snapshot.contractVersion !== REAL_SYNASTRY_CONTRACT_VERSION) {
    issues.push(`${label} نسخه contract معتبر ندارد.`);
  }
  if (!snapshot.chartId.trim()) issues.push(`${label} شناسه ندارد.`);
  if (!snapshot.natalSnapshotVersion) {
    issues.push(`${label} نسخه natal snapshot ندارد.`);
  }
  if (!Array.isArray(snapshot.placements)) {
    issues.push(`${label} فهرست جایگاه سیاره‌ای معتبر ندارد.`);
    return uniqueStrings(issues);
  }
  if (snapshot.placements.length < 2) {
    issues.push(`${label} حداقل دو جایگاه سیاره‌ای معتبر نیاز دارد.`);
  }
  const ids = new Set<string>();
  for (const placement of snapshot.placements) {
    if (!placement.id.trim()) issues.push(`${label} جایگاه بدون شناسه دارد.`);
    if (ids.has(placement.id)) {
      issues.push(`${label} جایگاه تکراری ${placement.id} دارد.`);
    }
    ids.add(placement.id);
    if (!Number.isFinite(placement.longitude)) {
      issues.push(`${label} طول دایرةالبروجی نامعتبر دارد.`);
    }
  }
  if (snapshot.birthTimeStatus === "unknown") {
    if (snapshot.angles.length > 0 || snapshot.houses.length > 0) {
      issues.push(
        `${label} با ساعت نامشخص نباید زاویه یا خانه قابل استفاده داشته باشد.`,
      );
    }
  }
  return uniqueStrings(issues);
}

function toPointReferences(
  snapshot: SynastryNatalSnapshot,
  chartSide: SynastryChartSide,
  includeAngles: boolean,
): SynastryPointReference[] {
  return [...snapshot.placements, ...(includeAngles ? snapshot.angles : [])].map(
    (point) => ({ ...point, chartSide, chartId: snapshot.chartId }),
  );
}

function findAspect(
  pointA: SynastryPointReference,
  pointB: SynastryPointReference,
): {
  definition: SynastryAspectDefinition;
  separation: number;
  orb: number;
  allowedOrb: number;
} | null {
  const separation = angularSeparation(pointA.longitude, pointB.longitude);
  let best:
    | {
        definition: SynastryAspectDefinition;
        separation: number;
        orb: number;
        allowedOrb: number;
      }
    | null = null;

  for (const definition of ASPECT_DEFINITIONS) {
    const allowedOrb = getAllowedOrb(definition, pointA, pointB);
    const orb = Math.abs(separation - definition.angle);
    if (orb > allowedOrb) continue;
    if (!best || orb < best.orb) {
      best = { definition, separation, orb, allowedOrb };
    }
  }

  return best;
}

function getAllowedOrb(
  definition: SynastryAspectDefinition,
  pointA: SynastryPointReference,
  pointB: SynastryPointReference,
): number {
  if (pointA.kind === "angle" || pointB.kind === "angle") {
    return Math.min(definition.defaultOrb, 4);
  }
  if (LUMINARY_IDS.has(pointA.id) && LUMINARY_IDS.has(pointB.id)) {
    return definition.defaultOrb + 1;
  }
  if (OUTER_IDS.has(pointA.id) && OUTER_IDS.has(pointB.id)) {
    return Math.min(definition.defaultOrb, 3);
  }
  return definition.defaultOrb;
}

function classifyContactCategories(
  pointA: SynastryPointReference,
  pointB: SynastryPointReference,
  chartA: SynastryNatalSnapshot,
  chartB: SynastryNatalSnapshot,
): SynastryContactCategory[] {
  const ids = [pointA.id, pointB.id];
  const categories: SynastryContactCategory[] = [];
  if (ids.some((id) => LUMINARY_IDS.has(id))) categories.push("luminary");
  if (ids.some((id) => PERSONAL_PLANET_IDS.has(id))) {
    categories.push("personal-planet");
  }
  if (ids.some((id) => SATURN_OUTER_IDS.has(id))) {
    categories.push("saturn-outer");
  }
  if (pointA.kind === "angle" || pointB.kind === "angle") {
    categories.push("angle");
  }
  if (
    pointA.id === chartA.chartRulerId ||
    pointB.id === chartB.chartRulerId
  ) {
    categories.push("chart-ruler");
  }
  if (ids.includes("mercury")) categories.push("communication");
  if (ids.some((id) => CLOSENESS_IDS.has(id))) categories.push("closeness");
  if (ids.some((id) => INDEPENDENCE_IDS.has(id))) {
    categories.push("independence");
  }
  return [...new Set(categories)];
}

function classifyPolarity(
  pointA: SynastryPointReference,
  pointB: SynastryPointReference,
  aspectId: SynastryAspectDefinition["id"],
): SynastryAspectPolarity {
  if (aspectId === "sextile" || aspectId === "trine") return "supportive";
  if (aspectId === "square" || aspectId === "opposition") return "tension";

  const ids = new Set([pointA.id, pointB.id]);
  if (
    ids.has("saturn") ||
    ids.has("uranus") ||
    ids.has("pluto") ||
    pointA.kind === "angle" ||
    pointB.kind === "angle"
  ) {
    return "intense";
  }
  if (
    (ids.has("moon") && ids.has("venus")) ||
    (ids.has("sun") && ids.has("moon")) ||
    (ids.has("venus") && ids.has("mars")) ||
    (ids.size === 1 && ids.has("mercury"))
  ) {
    return "supportive";
  }
  return "neutral";
}

function scoreContact(
  pointA: SynastryPointReference,
  pointB: SynastryPointReference,
  orb: number,
  allowedOrb: number,
  aspectId: SynastryAspectDefinition["id"],
  categories: SynastryContactCategory[],
): number {
  const ids = [pointA.id, pointB.id];
  const tightness = Math.max(0, 1 - orb / allowedOrb);
  const outerOnly = ids.every((id) => OUTER_IDS.has(id));
  const score =
    tightness * 52 +
    (orb <= 1 ? 18 : orb <= 2 ? 9 : 0) +
    ids.filter((id) => LUMINARY_IDS.has(id)).length * 24 +
    ids.filter((id) => PERSONAL_PLANET_IDS.has(id)).length * 12 +
    (categories.includes("angle") ? 22 : 0) +
    (categories.includes("chart-ruler") ? 18 : 0) +
    (categories.includes("communication") ? 13 : 0) +
    (categories.includes("closeness") ? 10 : 0) +
    (ids.includes("saturn") ? 10 : 0) +
    (aspectId === "conjunction" ? 6 : 0) -
    (outerOnly ? 20 : 0);

  return Math.max(0, Math.round(score));
}

function buildBiWheelData(
  chartA: SynastryNatalSnapshot,
  chartB: SynastryNatalSnapshot,
  contacts: readonly SynastryInterChartAspect[],
): SynastryBiWheelData {
  const toWheelPoints = (
    snapshot: SynastryNatalSnapshot,
    chartSide: SynastryChartSide,
  ) =>
    [...snapshot.placements, ...snapshot.angles]
      .map((point) => ({
        chartSide,
        chartId: snapshot.chartId,
        pointId: point.id,
        pointKind: point.kind,
        longitude: point.longitude,
        signId: point.signId,
        label: point.label,
      }))
      .sort(
        (left, right) =>
          left.longitude - right.longitude ||
          left.pointId.localeCompare(right.pointId),
      );

  return {
    version: "synastry-bi-wheel-v1",
    innerChartSide: "a",
    outerChartSide: "b",
    innerPoints: toWheelPoints(chartA, "a"),
    outerPoints: toWheelPoints(chartB, "b"),
    aspectLines: contacts.map((contact) => ({
      contactId: contact.id,
      fromChartSide: contact.pointA.chartSide,
      fromPointId: contact.pointA.id,
      toChartSide: contact.pointB.chartSide,
      toPointId: contact.pointB.id,
      aspectId: contact.aspectId,
      polarity: contact.polarity,
      relevanceScore: contact.relevanceScore,
    })),
  };
}

function buildPairLimitations(
  chartA: SynastryNatalSnapshot,
  chartB: SynastryNatalSnapshot,
  angleContactsAvailable: boolean,
  houseOverlaysAvailable: boolean,
): string[] {
  const snapshotLimitations = [
    ...chartA.limitations,
    ...chartB.limitations,
  ].sort((left, right) => left.localeCompare(right, "fa"));
  const limitations = [
    "سینستری یک خوانش نمادین و تفسیری است و موفقیت یا شکست رابطه را پیش‌بینی نمی‌کند.",
    ...snapshotLimitations,
  ];

  if (!angleContactsAvailable) {
    limitations.push(
      "به‌دلیل نامشخص بودن ساعت تولد یا نبود زاویه معتبر در حداقل یکی از دو snapshot، تماس‌های زاویه‌ای محاسبه نشده‌اند؛ جنبه‌های سیاره‌به‌سیاره همچنان استفاده شده‌اند.",
    );
  }
  if (!houseOverlaysAvailable) {
    limitations.push(
      "هم‌پوشانی خانه‌ها فقط با ساعت معتبر و دوازده سرخانه آماده برای هر دو چارت محاسبه می‌شود و در این مقایسه غیرفعال است.",
    );
  }
  limitations.push(
    "این engine درصد سازگاری تولید نمی‌کند و نتیجه را از تطبیق نشانه خورشیدی به‌تنهایی نمی‌سازد.",
  );
  return uniqueStrings(limitations);
}

function buildDirectionalOverlays(
  source: SynastryNatalSnapshot,
  sourceSide: SynastryChartSide,
  target: SynastryNatalSnapshot,
  targetSide: SynastryChartSide,
): SynastryHouseOverlay[] {
  const direction = sourceSide === "a" ? "a-in-b" : "b-in-a";
  return source.placements
    .filter((placement) => OVERLAY_PLANET_IDS.has(placement.id))
    .map((placement) => {
      const targetHouse = assignHouseFromCusps(
        placement.longitude,
        target.houses,
      );
      const relevanceScore =
        20 +
        (PERSONAL_PLANET_IDS.has(placement.id) ? 18 : 0) +
        (LUMINARY_IDS.has(placement.id) ? 15 : 0) +
        (HOUSE_RELEVANCE[targetHouse] ?? 0);
      return {
        id: `${direction}:${source.chartId}:${placement.id}:${target.chartId}:house-${targetHouse}`,
        direction,
        sourceChartSide: sourceSide,
        sourceChartId: source.chartId,
        sourcePointId: placement.id,
        sourcePointLabel: placement.label,
        targetChartSide: targetSide,
        targetChartId: target.chartId,
        targetHouse,
        targetHouseSystem: target.houseSystem ?? "placeholder",
        relevanceScore,
        readingFa: buildSynastryHouseOverlayReadingFa({
          sourcePointLabel: placement.label,
          sourceChartLabel: source.label,
          targetChartLabel: target.label,
          targetHouse,
        }),
      } satisfies SynastryHouseOverlay;
    });
}

function assignHouseFromCusps(
  longitude: number,
  houses: readonly SynastryHouseCusp[],
): RealEngineReportHouseNumber {
  const ordered = [...houses].sort((left, right) => left.number - right.number);
  const normalizedLongitude = normalizeLongitude(longitude);
  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    const next = ordered[(index + 1) % ordered.length];
    const span = normalizeLongitude(next.cuspLongitude - current.cuspLongitude);
    const distance = normalizeLongitude(
      normalizedLongitude - current.cuspLongitude,
    );
    if (distance < span) return current.number;
  }
  return ordered[0]?.number ?? 1;
}

function buildCanonicalContactKey(
  pointA: SynastryPointReference,
  pointB: SynastryPointReference,
  aspectId: SynastryAspectDefinition["id"],
): string {
  const endpoints = [
    `${pointA.chartId}:${pointA.id}`,
    `${pointB.chartId}:${pointB.id}`,
  ].sort();
  return `${endpoints[0]}:${aspectId}:${endpoints[1]}`;
}

function buildContactId(
  pointA: SynastryPointReference,
  pointB: SynastryPointReference,
  aspectId: SynastryAspectDefinition["id"],
): string {
  return `synastry:${buildCanonicalContactKey(pointA, pointB, aspectId)}`;
}

function compareContacts(
  left: SynastryInterChartAspect,
  right: SynastryInterChartAspect,
): number {
  return (
    right.relevanceScore - left.relevanceScore ||
    left.orb - right.orb ||
    left.canonicalKey.localeCompare(right.canonicalKey)
  );
}

function angularSeparation(first: number, second: number): number {
  const raw = Math.abs(normalizeLongitude(first) - normalizeLongitude(second));
  return raw > 180 ? 360 - raw : raw;
}

function normalizeLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeDegreeInSign(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return normalizeLongitude(value) % 30;
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
