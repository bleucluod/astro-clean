import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";
import type { ReportOutputSection } from "@/types/report-output";

type ReportWithSections = {
  interpretationSections?: ReportOutputSection[];
  outputQuality?: {
    score?: number;
    warnings?: string[];
  };
};

function countWords(text: string) {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

export function getReportV2Metrics(report: unknown) {
  if (!report || typeof report !== "object") {
    return {
      sectionCount: 0,
      wordCount: 0,
      readingMinutes: 0,
      qualityScore: undefined as number | undefined,
      warningCount: 0,
    };
  }

  const enhancedReport = enhanceReportOutputV2(report as Record<string, unknown>) as ReportWithSections;
  const sections = enhancedReport.interpretationSections ?? [];
  const wordCount = sections.reduce((total, section) => total + countWords(section.body), 0);

  return {
    sectionCount: sections.length,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 180)),
    qualityScore: enhancedReport.outputQuality?.score,
    warningCount: enhancedReport.outputQuality?.warnings?.length ?? 0,
  };
}

export function getReportV2SectionSummary(report: unknown) {
  if (!report || typeof report !== "object") {
    return [];
  }

  const enhancedReport = enhanceReportOutputV2(report as Record<string, unknown>) as ReportWithSections;
  const sections = enhancedReport.interpretationSections ?? [];

  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    kind: section.kind,
    wordCount: countWords(section.body),
  }));
}
