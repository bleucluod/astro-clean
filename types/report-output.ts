export type ReportOutputVersion = "legacy-preview" | "v2-sectioned-preview";

export type ReportOutputSection = {
  id: string;
  title: string;
  kind: string;
  body: string;
};

export type ReportOutputQuality = {
  version: ReportOutputVersion;
  score: number;
  checkedAt: string;
  warnings: string[];
};

export type SectionedReportOutput = {
  outputVersion: ReportOutputVersion;
  interpretationSections: ReportOutputSection[];
  outputQuality: ReportOutputQuality;
};
