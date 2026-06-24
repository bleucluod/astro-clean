import type { ReportOutputSection } from "@/types/report-output";

export type ReportOutputV3Version = "v3-persian-sectioned-preview";

export type ReportOutputV3Summary = {
  version: ReportOutputV3Version;
  title: string;
  subtitle: string;
  sectionCount: number;
  wordCount: number;
  readingMinutes: number;
  qualityLabel: "آزمایشی" | "آماده بازبینی" | "نیازمند بازبینی";
};

export type ReportOutputV3 = {
  outputV3Version: ReportOutputV3Version;
  reportV3Summary: ReportOutputV3Summary;
  reportV3Sections: ReportOutputSection[];
  reportV3Disclaimer: string;
};
