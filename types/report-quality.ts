export type ReportQualitySeverity = "info" | "warning" | "blocker";

export type ReportQualityRuleId =
  | "symbolic-language"
  | "no-deterministic-prediction"
  | "no-medical-legal-financial-advice"
  | "section-balance"
  | "clear-local-preview-state"
  | "persian-readable-tone";

export type ReportQualityIssue = {
  ruleId: ReportQualityRuleId;
  severity: ReportQualitySeverity;
  message: string;
};

export type ReportQualityResult = {
  ok: boolean;
  score: number;
  issues: ReportQualityIssue[];
  checkedAt: string;
};

export type ReportSectionKind =
  | "overview"
  | "identity"
  | "emotional-pattern"
  | "relationships"
  | "career"
  | "growth"
  | "timing-note"
  | "reflection-prompts"
  | "disclaimer";

export type ReportSectionBlueprint = {
  kind: ReportSectionKind;
  title: string;
  purpose: string;
  required: boolean;
  minWords: number;
  maxWords: number;
};

export type ReportToneProfile = {
  id: "halleus-symbolic-fa";
  language: "fa-IR";
  principles: string[];
  bannedClaims: string[];
};
