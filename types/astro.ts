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

export type RealEngineReportHouseContext = {
  requestedSystem: "whole-sign" | "equal-house" | "placeholder";
  appliedSystem: "whole-sign" | "equal-house" | "placeholder";
  confidence:
    | "calculated-ascendant"
    | "provided-ascendant"
    | "scaffold"
    | "placeholder";
  ascendantMethod:
    | "astronomy-engine-local-sidereal-time"
    | "provided"
    | "unknown";
  ascendantLongitude: number | null;
  firstHouseCuspLongitude: number;
  limitation: string | null;
};

export type RealEngineReportSnapshot = {
  version: "real-engine-preview-v1";
  generatedAt: string;
  cityLabel: string;
  utcIso: string;
  ascendantLongitude: number;
  houseContext?: RealEngineReportHouseContext;
  placements: RealEngineReportPlacement[];
  aspects?: RealEngineReportAspect[];
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
