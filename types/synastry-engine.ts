import type {
  RealEngineReportAspectKind,
  RealEngineReportHouseNumber,
  RealEngineHouseSystem,
  RealEngineReportSnapshot,
  ZodiacKey,
} from "./astro.js";

export const REAL_SYNASTRY_CONTRACT_VERSION = "real-synastry-v1" as const;
export const REAL_SYNASTRY_WRITER_VERSION = "real-synastry-persian-v1" as const;

export type RealSynastryContractVersion =
  typeof REAL_SYNASTRY_CONTRACT_VERSION;
export type RealSynastryWriterVersion = typeof REAL_SYNASTRY_WRITER_VERSION;

export type SynastryChartSide = "a" | "b";

export type SynastryRelationshipContext =
  | "romantic"
  | "friendship"
  | "family"
  | "work"
  | "general";

export type SynastryBirthTimeStatus = "exact" | "unknown";

export type SynastryPointKind = "planet" | "angle";

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
  aspectLines: SynastryBiWheelAspectLine[];
};

export type SynastryQuality = {
  status: "complete" | "partial";
  planetToPlanetAvailable: boolean;
  angleContactsAvailable: boolean;
  houseOverlaysAvailable: boolean;
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
