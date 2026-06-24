import type { ChartEngineInput, ChartPlacement } from "@/types/chart-engine";
import type { ReportSectionKind } from "@/types/report-quality";

export type InterpretationDriverSlug = "mock-preview" | "rule-based" | "ai-assisted";

export type InterpretationStage =
  | "blueprint-ready"
  | "module-ready"
  | "composition-ready"
  | "quality-gated"
  | "production";

export type InterpretationModuleId =
  | "overview"
  | "identity"
  | "emotional-pattern"
  | "relationships"
  | "career"
  | "growth"
  | "reflection-prompts"
  | "disclaimer";

export type InterpretationModuleBlueprint = {
  id: InterpretationModuleId;
  kind: ReportSectionKind;
  title: string;
  purpose: string;
  requiredPlacements: Array<ChartPlacement["body"]>;
  safetyNotes: string[];
};

export type InterpretationInput = {
  chartInput: ChartEngineInput;
  placements: ChartPlacement[];
  locale: "fa-IR";
};

export type InterpretationSection = {
  id: InterpretationModuleId;
  title: string;
  body: string;
  kind: ReportSectionKind;
};

export type InterpretationResult = {
  driver: InterpretationDriverSlug;
  stage: InterpretationStage;
  sections: InterpretationSection[];
  generatedAt: string;
  warnings: string[];
};

export type InterpretationReadinessReport = {
  activeDriver: InterpretationDriverSlug;
  stage: InterpretationStage;
  canComposeProductionReport: boolean;
  blockers: string[];
  recommendedNextSteps: string[];
};
