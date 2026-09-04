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
  birthTimeAccuracy?: "known" | "unknown";
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
  pointType?:
    | "luminary"
    | "personal-planet"
    | "social-planet"
    | "outer-planet"
    | "angle"
    | "calculated-point"
    | "unknown";
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  house?: number | null;
  method: string;
  // HALLEUS_FREE_ALL_ENGINE_MOTION_PERSISTENCE_20260815
  motion?: {
    status: "direct" | "retrograde" | "stationary";
    arcDegreesPerDay: number;
    sampleWindowHours: number;
    method: "astronomy-engine-geocentric-ecliptic-daily-motion";
  };
};

export type RealEngineChartElement = "fire" | "earth" | "air" | "water";
export type RealEngineChartModality = "cardinal" | "fixed" | "mutable";
export type RealEngineChartExpression = "active" | "receptive";

export type RealEngineChartSignatureEvidence = {
  placementId: string;
  signId: ZodiacKey;
  element: RealEngineChartElement;
  modality: RealEngineChartModality;
  expression: RealEngineChartExpression;
  weight: 1;
};

export type RealEngineChartSignature = {
  version: "chart-signature-v1";
  method: "equal-weight-major-planets";
  elementCounts: Record<RealEngineChartElement, number>;
  modalityCounts: Record<RealEngineChartModality, number>;
  expressionCounts: Record<RealEngineChartExpression, number>;
  dominantElement: RealEngineChartElement | null;
  dominantModality: RealEngineChartModality | null;
  dominantExpression: RealEngineChartExpression | null;
  lowElements: RealEngineChartElement[];
  lowModalities: RealEngineChartModality[];
  lowExpressions: RealEngineChartExpression[];
  zeroElements: RealEngineChartElement[];
  zeroModalities: RealEngineChartModality[];
  evidence: RealEngineChartSignatureEvidence[];
  excludedPlacementIds: string[];
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
  approvedForReportOutput: boolean;
  validationStatus: "independent-reference-fixtures-passed";
  validationReference: "swiss-ephemeris-2.10.03-offline-osculating-apogee";
  validationToleranceDegrees: number;
  limitation: string | null;
};

export type RealEngineReportLilith =
  | RealEngineReportDeferredCalculation
  | RealEngineReportCalculatedLilith;


// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R1_20260830
export type RealEngineReportSpecialPointId =
  | "chiron"
  | "part-of-fortune"
  | "vertex"
  | "ceres"
  | "pallas"
  | "juno"
  | "vesta"
  | "eris"
  | "pholus"
  | "nessus";

export type RealEngineReportSpecialPointCategory =
  | "core-special-point"
  | "advanced-body";

export type RealEngineReportSpecialPointVisibility =
  | "default-wheel"
  | "advanced-wheel";

export type RealEngineReportSpecialPointProvenance = {
  provider: string;
  reference: string | null;
  validation: string;
};

export type RealEngineReportCalculatedSpecialPoint = {
  status: "calculated";
  id: RealEngineReportSpecialPointId;
  labelFa: string;
  labelEn: string;
  category: RealEngineReportSpecialPointCategory;
  visibility: RealEngineReportSpecialPointVisibility;
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  house: RealEngineReportHouseNumber | null;
  method: string;
  source: string;
  reliability: RealEngineReportDataReliability;
  validationStatus:
    | "existing-formula-preserved"
    | "local-regression-fixture-passed"
    | "cross-ephemeris-reference-fixtures-passed"
    | "independent-reference-fixtures-passed";
  provenance: RealEngineReportSpecialPointProvenance;
  motion?: {
    status: "direct" | "retrograde" | "stationary";
    arcDegreesPerDay: number;
    sampleWindowHours: number;
    method: "jpl-spk-geocentric-apparent-ecliptic-of-date-central-difference";
  };
  calculationContext?: {
    sect?: "day" | "night";
    formulaId?: string;
    geometry?: string;
  };
};

export type RealEngineReportDeferredSpecialPoint = {
  status: "deferred";
  id: RealEngineReportSpecialPointId;
  labelFa: string;
  labelEn: string;
  category: RealEngineReportSpecialPointCategory;
  visibility: RealEngineReportSpecialPointVisibility;
  method: null;
  source: string;
  reliability: "not-calculated";
  validationStatus:
    | "provider-blocked"
    | "geometry-blocked"
    | "input-blocked";
  provenance: RealEngineReportSpecialPointProvenance;
  limitation: string;
};

export type RealEngineReportSpecialPoint =
  | RealEngineReportCalculatedSpecialPoint
  | RealEngineReportDeferredSpecialPoint;


// HALLEUS_ADVANCED_ASTROLOGY_SLICE3_SPECIALIST_LAYERS_20260831
export type RealEngineReportFixedStar = {
  id: string; labelFa: string; labelEn: string; longitude: number; signId: ZodiacKey;
  degreeInSign: number; house: RealEngineReportHouseNumber | null; source: string; catalogueVersion: string;
};
export type RealEngineReportFixedStarContact = {
  starId: string; starLabelFa: string; starLabelEn: string; anchorId: string; anchorLabel: string;
  anchorClass: "core-angle-or-luminary" | "other-natal-placement"; orbDegrees: number;
  narrativeEligibleByContactOnly: false;
};
export type RealEngineReportTraditionalLot = {
  id: "fortune" | "spirit" | "eros" | "necessity" | "courage" | "victory" | "nemesis";
  labelFa: string; labelEn: string; formulaId: string; tradition: string; sect: "day" | "night";
  dayNightBehavior: "sect-reversing"; longitude: number; signId: ZodiacKey; degreeInSign: number;
  house: RealEngineReportHouseNumber | null; houseSystemContext: "placidus-placement-only";
  wholeSignInterpretationApplied: false; source: string;
};
export type RealEngineReportSpecialistAstrology = {
  version: string;
  fixedStars: { catalogueVersion: string; stars: RealEngineReportFixedStar[]; conjunctionCandidateOrbDegrees: number; conjunctionCandidates: RealEngineReportFixedStarContact[]; narrativePromotion: "deferred-to-slice4-relevance"; };
  traditionalLots: { formulaSetVersion: string; lots: RealEngineReportTraditionalLot[]; houseInterpretationNote: string; };
  asteroidLab: { catalogueVersion: string; surface: "separate-search"; mainReportPromotion: "not-automatic"; };
};

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
  behavioralAudienceMode?: "caregiver" | "youth" | "adult";
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
  specialPoints?: RealEngineReportSpecialPoint[];
  specialistAstrology?: RealEngineReportSpecialistAstrology;
  chartSignature?: RealEngineChartSignature;
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
