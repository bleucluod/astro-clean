export type ZodiacKey =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type ZodiacSign = {
  key: ZodiacKey;
  faName: string;
  enName: string;
  element: "آتش" | "زمین" | "هوا" | "آب";
  quality: "کاردینال" | "ثابت" | "متغیر";
};

export type BirthInput = {
  name?: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthCountry: string;
  birthCityId?: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthTimezone?: string;
  currentResidenceCity?: string;
  currentResidenceCountry?: string;
  currentResidenceCityId?: string;
  currentResidenceLatitude?: number;
  currentResidenceLongitude?: number;
  currentResidenceTimezone?: string;
};

export type MockChart = {
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign: ZodiacSign;
};

export type RealEngineReportPlacement = {
  id: string;
  label: string;
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  house?: number | null;
  method: string;
};

export type RealEngineReportAspectKind =
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "opposition";

export type RealEngineReportAspect = {
  id: string;
  firstPlanetId: string;
  firstPlanetLabel: string;
  secondPlanetId: string;
  secondPlanetLabel: string;
  aspectId: RealEngineReportAspectKind;
  aspectLabel: string;
  glyph: string;
  angle: number;
  separation: number;
  orb: number;
  meaning: string;
  narrative: string;
};

export type RealEngineHouseSystem =
  | "whole-sign"
  | "equal-house"
  | "placidus"
  | "placeholder";

export type RealEngineReportDataReliability =
  | "production-grade"
  | "calculated"
  | "derived"
  | "preview"
  | "placeholder"
  | "not-calculated";

export type RealEngineReportAngleId = "asc" | "dsc" | "mc" | "ic";

export type RealEngineReportHouseNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type RealEngineReportAngle = {
  id: RealEngineReportAngleId;
  label: string;
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  method: string;
  source: "calculated" | "derived-opposition" | "provided" | "unknown";
  reliability: RealEngineReportDataReliability;
  house?: RealEngineReportHouseNumber | null;
  limitation: string | null;
};

export type RealEngineReportAngles = {
  asc?: RealEngineReportAngle;
  dsc?: RealEngineReportAngle;
  mc?: RealEngineReportAngle;
  ic?: RealEngineReportAngle;
};

export type RealEngineReportHouse = {
  number: RealEngineReportHouseNumber;
  signId: ZodiacKey;
  cuspLongitude: number;
  degreeInSign: number;
  system: RealEngineHouseSystem;
  method:
    | "whole-sign-from-ascendant"
    | "equal-house-from-ascendant"
    | "placidus-calculated"
    | "placeholder";
  reliability: RealEngineReportDataReliability;
  planetIds: string[];
  angleIds: RealEngineReportAngleId[];
  limitation: string | null;
};

export type RealEngineReportDeferredCalculation = {
  status: "not-calculated" | "calculated" | "blocked";
  method: string | null;
  limitation: string | null;
};

export type RealEngineReportLunarNodeId = "north-node" | "south-node";

export type RealEngineReportLunarNodeMethod =
  | "mean-lunar-node-j2000-meeus-formula"
  | "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date";

export type RealEngineReportLunarNodePoint = {
  id: RealEngineReportLunarNodeId;
  label: string;
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  house?: RealEngineReportHouseNumber | null;
  method: RealEngineReportLunarNodeMethod;
  source: "calculated" | "derived-opposition";
  reliability: RealEngineReportDataReliability;
  limitation: string | null;
};

export type RealEngineReportCalculatedLunarNodes = {
  status: "calculated";
  method: RealEngineReportLunarNodeMethod;
  nodeType: "mean" | "local-true-osculating";
  northNode: RealEngineReportLunarNodePoint;
  southNode: RealEngineReportLunarNodePoint;
  limitation: string | null;
};

export type RealEngineReportLunarNodes =
  | RealEngineReportDeferredCalculation
  | RealEngineReportCalculatedLunarNodes;

export type RealEngineReportLilithMethod =
  "local-osculating-black-moon-lilith-from-validated-probe";

export type RealEngineReportCalculatedLilith = {
  status: "calculated";
  id: "black-moon-lilith";
  label: "Local True/Osculating Black Moon Lilith";
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  house?: RealEngineReportHouseNumber | null;
  method: RealEngineReportLilithMethod;
  modelId: "true-osculating-black-moon-lilith";
  lilithType: "local-true-osculating-black-moon-lilith";
  source: "astronomy-engine-geomoonstate-local-state-vector";
  reliability: RealEngineReportDataReliability;
  approvedForReportOutput: false;
  limitation: string | null;
};

export type RealEngineReportLilith =
  | RealEngineReportDeferredCalculation
  | RealEngineReportCalculatedLilith;

export type RealEngineReportRetrogradeStatus = {
  status: "not-calculated" | "calculated" | "blocked";
  method: string | null;
  planetIds: string[];
  limitation: string | null;
};

export type RealEngineReportCalculationQuality = {
  status: "complete" | "partial" | "preview" | "blocked";
  houseSystemStatus: RealEngineReportDataReliability;
  anglesStatus: RealEngineReportDataReliability;
  retrogradeStatus: RealEngineReportDataReliability;
  nodesStatus: RealEngineReportDataReliability;
  lilithStatus: RealEngineReportDataReliability;
  limitations: string[];
  warnings: string[];
};

export type RealEngineReportHouseAvailability = "ready" | "unavailable";

export type RealEngineReportHouseUnavailableReason =
  | "polar-circle"
  | "non-convergence";

export type RealEngineReportHouseContext = {
  requestedSystem: RealEngineHouseSystem;
  appliedSystem: RealEngineHouseSystem;
  availability?: RealEngineReportHouseAvailability;
  unavailableReason?: RealEngineReportHouseUnavailableReason | null;
  confidence:
    | "calculated-ascendant"
    | "provided-ascendant"
    | "calculated-cusps"
    | "provided-cusps"
    | "scaffold"
    | "placeholder";
  ascendantMethod:
    | "astronomy-engine-local-sidereal-time"
    | "provided"
    | "unknown";
  ascendantLongitude: number | null;
  firstHouseCuspLongitude: number;
  cuspLongitudes?: number[] | null;
  calculationMethod?: string | null;
  limitation: string | null;
};

export type RealEngineReportSnapshot = {
  version: "real-engine-preview-v1" | "real-engine-preview-v2";
  generatedAt: string;
  cityLabel: string;
  utcIso: string;
  ascendantLongitude: number;
  houseContext?: RealEngineReportHouseContext;
  houseSystem?: RealEngineHouseSystem;
  houses?: RealEngineReportHouse[];
  angles?: RealEngineReportAngles;
  calculationQuality?: RealEngineReportCalculationQuality;
  retrogrades?: RealEngineReportRetrogradeStatus;
  lunarNodes?: RealEngineReportLunarNodes;
  lilith?: RealEngineReportLilith;
  placements: RealEngineReportPlacement[];
  aspects?: RealEngineReportAspect[];
  aspectHighlights?: RealEngineReportAspect[];
  note: string;
};

export type AstrologyReport = {
  id: string;
  createdAt: string;
  input: BirthInput;
  chart: MockChart;
  realEngine?: RealEngineReportSnapshot;
  summary: string;
  interpretations: string[];
  safetyNote: string;
};
