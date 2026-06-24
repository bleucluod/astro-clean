export type ChartEngineSlug = "mock-preview" | "traditional-astro" | "external-provider";

export type ChartEngineStage =
  | "mock-preview"
  | "contract-ready"
  | "calculation-ready"
  | "interpretation-ready"
  | "production";

export type ChartEngineInput = {
  name?: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthCountry: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthTimezone?: string;
};

export type ChartPlacement = {
  body: "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "ascendant";
  sign?: string;
  house?: number;
  degree?: number;
  retrograde?: boolean;
};

export type ChartEngineResult = {
  engine: ChartEngineSlug;
  stage: ChartEngineStage;
  input: ChartEngineInput;
  placements: ChartPlacement[];
  generatedAt: string;
  warnings: string[];
};

export type ChartEngineReadinessReport = {
  activeEngine: ChartEngineSlug;
  stage: ChartEngineStage;
  canReplaceMockReports: boolean;
  blockers: string[];
  recommendedNextSteps: string[];
};
