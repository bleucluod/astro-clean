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

export type RealEngineReportSnapshot = {
  version: "real-engine-preview-v1";
  generatedAt: string;
  cityLabel: string;
  utcIso: string;
  ascendantLongitude: number;
  placements: RealEngineReportPlacement[];
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
