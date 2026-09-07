import type {
  RealEngineReportAspectKind,
  RealEngineReportDataReliability,
  RealEngineReportHouseNumber,
  RealEngineHouseSystem,
  RealEngineReportSnapshot,
  ZodiacKey,
} from "./astro.js";

export const REAL_SYNASTRY_CONTRACT_VERSION = "real-synastry-v2" as const;
export const REAL_SYNASTRY_WRITER_VERSION = "real-synastry-persian-v1" as const;

export type RealSynastryContractVersion =
  | "real-synastry-v1"
  | typeof REAL_SYNASTRY_CONTRACT_VERSION;
export type RealSynastryWriterVersion = typeof REAL_SYNASTRY_WRITER_VERSION;

export type SynastryChartSide = "a" | "b";

export type SynastryRelationshipContext =
  | "romantic"
  | "friendship"
  | "family"
  | "work"
  | "general";

export type SynastryBirthTimeStatus = "exact" | "unknown";

export type SynastryPointKind =
  | "planet"
  | "angle"
  | "lunar-node"
  | "lilith"
  | "special-point"
  | "advanced-body"
  | "traditional-lot"
  | "fixed-star";

export type SynastryPointContactPolicy =
  | "major-aspects-v1"
  | "angle-major-aspects-v1"
  | "deferred-no-approved-orb-policy"
  | "not-contact-eligible";

export type SynastryPointHouseOverlayPolicy =
  | "derived-house-overlay-v1"
  | "requires-exact-birth-time"
  | "not-overlay-eligible";

export type SynastryPointMotion = {
  status: "direct" | "retrograde" | "stationary";
  arcDegreesPerDay: number;
  sampleWindowHours: number;
  method: string;
};

export const REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS = [
  "version",
  "generatedAt",
  "behavioralAudienceMode",
  "cityLabel",
  "utcIso",
  "ascendantLongitude",
  "houseContext",
  "houseSystem",
  "houses",
  "angles",
  "calculationQuality",
  "retrogrades",
  "lunarNodes",
  "lilith",
  "specialPoints",
  "specialistAstrology",
  "chartSignature",
  "placements",
  "aspects",
  "aspectHighlights",
  "note",
] as const satisfies readonly (keyof RealEngineReportSnapshot)[];

export type RealEngineSynastryCoverageField =
  (typeof REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS)[number];

type AssertNever<T extends never> = T;
export type SynastryMissingRealEngineCoverageFieldsMustStayNever = AssertNever<
  Exclude<keyof RealEngineReportSnapshot, RealEngineSynastryCoverageField>
>;

export type SynastryEngineDataCoverageState = "preserved" | "unavailable";
export type SynastryEngineInterpretationState =
  | "pending-slice2"
  | "technical-explanation-required"
  | "not-applicable";

export type SynastryEngineCoverageEntry = {
  field: RealEngineSynastryCoverageField;
  dataState: SynastryEngineDataCoverageState;
  interpretationState: SynastryEngineInterpretationState;
  reason: string | null;
};

export type SynastryEngineCoverageManifest = Record<
  RealEngineSynastryCoverageField,
  SynastryEngineCoverageEntry
>;

export type SynastryAspectPolarity =
  | "supportive"
  | "tension"
  | "intense"
  | "neutral";

export type SynastryContactCategory =
  | "luminary"
  | "personal-planet"
  | "saturn-outer"
  | "angle"
  | "chart-ruler"
  | "communication"
  | "closeness"
  | "independence";

export type SynastryNatalPoint = {
  id: string;
  label: string;
  kind: SynastryPointKind;
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  sourceMethod: string;

  /**
   * Fields below are optional for legacy real-synastry-v1 records.
   * createSynastryNatalSnapshot always populates them for v2 output.
   */
  natalHouse?: RealEngineReportHouseNumber | null;
  sourceReliability?: RealEngineReportDataReliability | null;
  motion?: SynastryPointMotion | null;
  contactPolicy?: SynastryPointContactPolicy;
  houseOverlayPolicy?: SynastryPointHouseOverlayPolicy;
  requiresExactBirthTime?: boolean;
  analysisEligible?: boolean;
  analysisLimitation?: string | null;
};
export type SynastryHouseCusp = {
  number: RealEngineReportHouseNumber;
  cuspLongitude: number;
  signId: ZodiacKey;
  system: RealEngineHouseSystem;
};

export type SynastryNatalSnapshot = {
  contractVersion: RealSynastryContractVersion;
  chartId: string;
  label: string;
  natalSnapshotVersion: RealEngineReportSnapshot["version"];
  natalGeneratedAt: string;
  birthTimeStatus: SynastryBirthTimeStatus;
  chartRulerId: string | null;
  chartRulerMethod: "traditional-ruler-from-ascendant" | null;

  /**
   * Legacy v1 comparison records may not contain these parity fields.
   * New v2 snapshots produced by createSynastryNatalSnapshot always do.
   */
  engineParityVersion?: "real-engine-synastry-parity-v1";
  engineSnapshot?: RealEngineReportSnapshot;
  engineCoverage?: SynastryEngineCoverageManifest;
  points?: SynastryNatalPoint[];

  placements: SynastryNatalPoint[];
  angles: SynastryNatalPoint[];
  houses: SynastryHouseCusp[];
  houseSystem: RealEngineHouseSystem | null;
  limitations: string[];
};
export type BuildSynastryNatalSnapshotInput = {
  chartId: string;
  label?: string | null;
  birthTimeStatus: SynastryBirthTimeStatus;
  snapshot: RealEngineReportSnapshot;
};

export type SynastryPointReference = SynastryNatalPoint & {
  chartSide: SynastryChartSide;
  chartId: string;
};

export type SynastryInterChartAspect = {
  id: string;
  canonicalKey: string;
  pointA: SynastryPointReference;
  pointB: SynastryPointReference;
  aspectId: RealEngineReportAspectKind;
  aspectLabel: string;
  angle: number;
  separation: number;
  orb: number;
  allowedOrb: number;
  polarity: SynastryAspectPolarity;
  categories: SynastryContactCategory[];
  relevanceScore: number;
  evidence: string[];
  titleFa: string;
  readingFa: string;
  growthFa: string;
};

export type SynastryHouseOverlay = {
  id: string;
  direction: "a-in-b" | "b-in-a";
  sourceChartSide: SynastryChartSide;
  sourceChartId: string;
  sourcePointId: string;
  sourcePointLabel: string;
  targetChartSide: SynastryChartSide;
  targetChartId: string;
  targetHouse: RealEngineReportHouseNumber;
  targetHouseSystem: RealEngineHouseSystem;
  relevanceScore: number;
  readingFa: string;
};

export type SynastryPattern = {
  id: string;
  kind: "supportive" | "tension";
  titleFa: string;
  summaryFa: string;
  contactIds: string[];
  relevanceScore: number;
};

export type SynastryDynamics = {
  communicationFa: string;
  closenessIndependenceFa: string;
  evidenceContactIds: string[];
};

export type SynastryPersianSynthesis = {
  writerVersion: RealSynastryWriterVersion;
  titleFa: string;
  openingFa: string;
  wholePairFa: string;
  supportiveFa: string;
  tensionFa: string;
  communicationFa: string;
  closenessIndependenceFa: string;
  limitationFa: string;
};

export type SynastryBiWheelPoint = {
  chartSide: SynastryChartSide;
  chartId: string;
  pointId: string;
  pointKind: SynastryPointKind;
  longitude: number;
  signId: ZodiacKey;
  label: string;
};

export type SynastryBiWheelAspectLine = {
  contactId: string;
  fromChartSide: SynastryChartSide;
  fromPointId: string;
  toChartSide: SynastryChartSide;
  toPointId: string;
  aspectId: RealEngineReportAspectKind;
  polarity: SynastryAspectPolarity;
  relevanceScore: number;
};

export type SynastryBiWheelData = {
  version: "synastry-bi-wheel-v1";
  innerChartSide: "a";
  outerChartSide: "b";
  innerPoints: SynastryBiWheelPoint[];
  outerPoints: SynastryBiWheelPoint[];
  /**
   * Added for the later shared Halleus wheel slice.
   * Optional keeps already-saved v1 comparison reports readable.
   */
  fullInnerPoints?: SynastryBiWheelPoint[];
  fullOuterPoints?: SynastryBiWheelPoint[];
  aspectLines: SynastryBiWheelAspectLine[];
};
export type SynastryQuality = {
  status: "complete" | "partial";
  planetToPlanetAvailable: boolean;
  angleContactsAvailable: boolean;
  houseOverlaysAvailable: boolean;
  /**
   * Parity counters are present on new v2 reports and optional on legacy v1.
   */
  engineParityComplete?: boolean;
  engineCoverageFieldCount?: number;
  normalizedPointCount?: number;
  deferredContactPointCount?: number;
  contactCount: number;
  supportivePatternCount: number;
  tensionPatternCount: number;
  limitations: string[];
};
export type RealSynastryReport = {
  contractVersion: RealSynastryContractVersion;
  generatedAt: string;
  relationshipContext: SynastryRelationshipContext;
  chartA: SynastryNatalSnapshot;
  chartB: SynastryNatalSnapshot;
  contacts: SynastryInterChartAspect[];
  supportivePatterns: SynastryPattern[];
  tensionPatterns: SynastryPattern[];
  houseOverlays: SynastryHouseOverlay[];
  dynamics: SynastryDynamics;
  synthesis: SynastryPersianSynthesis;
  biWheel: SynastryBiWheelData;
  quality: SynastryQuality;
};

export type BuildRealSynastryInput = {
  relationshipContext?: SynastryRelationshipContext;
  chartA: SynastryNatalSnapshot;
  chartB: SynastryNatalSnapshot;
  generatedAt?: string;
};

export type RealSynastryFailureCode =
  | "invalid-chart-a"
  | "invalid-chart-b"
  | "invalid-pair";

export type RealSynastryResult =
  | {
      ok: true;
      report: RealSynastryReport;
    }
  | {
      ok: false;
      code: RealSynastryFailureCode;
      issues: string[];
    };

export type SynastryAspectDefinition = {
  id: RealEngineReportAspectKind;
  labelFa: string;
  angle: number;
  defaultOrb: number;
};
