// HALLEUS_FREE_ALL_ACCESS_MODE_BATCH1_R1
export const REPORT_MONETIZATION_MODES = ["FREE_ALL", "CONFIGURED"] as const;

export type ReportMonetizationMode =
  (typeof REPORT_MONETIZATION_MODES)[number];

export const DISCOVERED_MONETIZED_REPORT_TYPES = [
  {
    id: "birth_full_report",
    label: "گزارش کامل چارت تولد",
    configuredBehavior:
      "در حالت CONFIGURED، بازکردن دائمی هر گزارش کامل یک اعتبار full_report_credit مصرف می‌کند.",
  },
  {
    id: "relationship_comparison",
    label: "تحلیل رابطه",
    configuredBehavior:
      "در حالت CONFIGURED، ساخت هر تحلیل رابطه تازه یک اعتبار relationship_credit مصرف می‌کند؛ بازکردن نتیجه ذخیره‌شده مصرف دوباره ندارد.",
  },
] as const;

export function isReportMonetizationMode(
  value: unknown,
): value is ReportMonetizationMode {
  return (
    typeof value === "string" &&
    REPORT_MONETIZATION_MODES.includes(value as ReportMonetizationMode)
  );
}

export const REPORT_ACCESS_SECTION_STATES = [
  "hidden",
  "teaser",
  "free_full",
  "premium",
] as const;

export type ReportAccessSectionState =
  (typeof REPORT_ACCESS_SECTION_STATES)[number];

export const PLANET_CHAPTER_ACCESS_STATES = [
  "free",
  "teaser",
  "premium",
] as const;

export type PlanetChapterAccessState =
  (typeof PLANET_CHAPTER_ACCESS_STATES)[number];

export const REPORT_ACCESS_PLANET_IDS = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

export type ReportAccessPlanetId =
  (typeof REPORT_ACCESS_PLANET_IDS)[number];

export type ReportAccessPolicy = {
  version: number;
  monetizationMode: ReportMonetizationMode;
  topStoriesFreeCount: number;
  importantHousesFreeCount: number;
  importantAspectsFreeCount: number;
  weeklyActionsFreeCount: number;
  nodeAxis: ReportAccessSectionState;
  energyBalance: ReportAccessSectionState;
  planetChapters: Record<ReportAccessPlanetId, PlanetChapterAccessState>;
  evidence: "compact_free" | "full_free" | "premium_full";
  technical: {
    wheel: "free";
    appendix: "free" | "premium";
    provenance: "free" | "premium";
  };
  upgradeTitle: string | null;
  upgradeCtaLabel: string | null;
  upgradeSupportSentence: string | null;
};

export const DEFAULT_REPORT_ACCESS_POLICY: ReportAccessPolicy = {
  version: 1,
  monetizationMode: "CONFIGURED",
  topStoriesFreeCount: 1,
  importantHousesFreeCount: 1,
  importantAspectsFreeCount: 1,
  weeklyActionsFreeCount: 1,
  nodeAxis: "teaser",
  energyBalance: "teaser",
  planetChapters: {
    mercury: "premium",
    venus: "premium",
    mars: "premium",
    jupiter: "premium",
    saturn: "premium",
    uranus: "premium",
    neptune: "premium",
    pluto: "premium",
  },
  evidence: "compact_free",
  technical: {
    wheel: "free",
    appendix: "premium",
    provenance: "premium",
  },
  upgradeTitle: null,
  upgradeCtaLabel: null,
  upgradeSupportSentence: null,
};

// HALLEUS_DYNAMIC_REPORT_ACCESS_POLICY_R1
export function normalizeReportAccessPolicy(
  value: unknown,
  version = 1,
): ReportAccessPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_REPORT_ACCESS_POLICY, version };
  }

  const record = value as Record<string, unknown>;
  const int = (input: unknown, fallback: number, max: number) =>
    typeof input === "number" && Number.isInteger(input)
      ? Math.min(max, Math.max(0, input))
      : fallback;

  const section = (
    input: unknown,
    fallback: ReportAccessSectionState,
  ): ReportAccessSectionState =>
    typeof input === "string" &&
    REPORT_ACCESS_SECTION_STATES.includes(
      input as ReportAccessSectionState,
    )
      ? (input as ReportAccessSectionState)
      : fallback;

  const planetState = (
    input: unknown,
    fallback: PlanetChapterAccessState,
  ): PlanetChapterAccessState =>
    typeof input === "string" &&
    PLANET_CHAPTER_ACCESS_STATES.includes(
      input as PlanetChapterAccessState,
    )
      ? (input as PlanetChapterAccessState)
      : fallback;

  const rawPlanets =
    record.planetChapters &&
    typeof record.planetChapters === "object" &&
    !Array.isArray(record.planetChapters)
      ? (record.planetChapters as Record<string, unknown>)
      : {};

  const rawTechnical =
    record.technical &&
    typeof record.technical === "object" &&
    !Array.isArray(record.technical)
      ? (record.technical as Record<string, unknown>)
      : {};

  const stringOrNull = (input: unknown, max: number) =>
    typeof input === "string" && input.trim()
      ? input.trim().slice(0, max)
      : null;

  const evidence =
    record.evidence === "full_free" ||
    record.evidence === "premium_full" ||
    record.evidence === "compact_free"
      ? record.evidence
      : DEFAULT_REPORT_ACCESS_POLICY.evidence;

  return {
    version: Math.max(1, Math.trunc(version)),
    monetizationMode:
      record.monetizationMode === "FREE_ALL" ? "FREE_ALL" : "CONFIGURED",
    topStoriesFreeCount: int(
      record.topStoriesFreeCount,
      DEFAULT_REPORT_ACCESS_POLICY.topStoriesFreeCount,
      12,
    ),
    importantHousesFreeCount: int(
      record.importantHousesFreeCount,
      DEFAULT_REPORT_ACCESS_POLICY.importantHousesFreeCount,
      12,
    ),
    importantAspectsFreeCount: int(
      record.importantAspectsFreeCount,
      DEFAULT_REPORT_ACCESS_POLICY.importantAspectsFreeCount,
      12,
    ),
    weeklyActionsFreeCount: int(
      record.weeklyActionsFreeCount,
      DEFAULT_REPORT_ACCESS_POLICY.weeklyActionsFreeCount,
      6,
    ),
    nodeAxis: section(
      record.nodeAxis,
      DEFAULT_REPORT_ACCESS_POLICY.nodeAxis,
    ),
    energyBalance: section(
      record.energyBalance,
      DEFAULT_REPORT_ACCESS_POLICY.energyBalance,
    ),
    planetChapters: Object.fromEntries(
      REPORT_ACCESS_PLANET_IDS.map((planetId) => [
        planetId,
        planetState(
          rawPlanets[planetId],
          DEFAULT_REPORT_ACCESS_POLICY.planetChapters[planetId],
        ),
      ]),
    ) as ReportAccessPolicy["planetChapters"],
    evidence,
    technical: {
      wheel: "free",
      appendix:
        rawTechnical.appendix === "free" ? "free" : "premium",
      provenance:
        rawTechnical.provenance === "free" ? "free" : "premium",
    },
    upgradeTitle: stringOrNull(record.upgradeTitle, 160),
    upgradeCtaLabel: stringOrNull(record.upgradeCtaLabel, 120),
    upgradeSupportSentence: stringOrNull(
      record.upgradeSupportSentence,
      320,
    ),
  };
}

export function isReportSectionFull(
  state: ReportAccessSectionState,
  unlocked: boolean,
) {
  return unlocked || state === "free_full";
}

export function isReportSectionTeaser(
  state: ReportAccessSectionState,
  unlocked: boolean,
) {
  return !unlocked && state === "teaser";
}

export function getPlanetChapterAccess(
  policy: ReportAccessPolicy,
  planetId: string,
): PlanetChapterAccessState {
  if (
    REPORT_ACCESS_PLANET_IDS.includes(
      planetId as ReportAccessPlanetId,
    )
  ) {
    return policy.planetChapters[planetId as ReportAccessPlanetId];
  }
  return "free";
}
