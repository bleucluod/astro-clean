export type RealChartEngineOptionId =
  | "astronomy-engine-mvp"
  | "swiss-ephemeris-commercial"
  | "external-astrology-api";

export type RealChartEngineDecisionStatus =
  | "recommended-for-mvp"
  | "blocked-by-license"
  | "blocked-by-dependency"
  | "future-option";

export type RealChartEngineOption = {
  id: RealChartEngineOptionId;
  label: string;
  status: RealChartEngineDecisionStatus;
  summary: string;
  strengths: string[];
  risks: string[];
  nextAction: string;
};

export type RealChartEngineDecision = {
  selectedOption: RealChartEngineOptionId;
  rationale: string;
  decisionDate: string;
  options: RealChartEngineOption[];
  implementationSteps: string[];
};
