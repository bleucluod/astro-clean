import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";
import type { ReportOutputSection } from "@/types/report-output";

type ReportLike = Record<string, unknown> & {
  interpretationSections?: ReportOutputSection[];
  outputQuality?: {
    score?: number;
    warnings?: string[];
  };
};

function getReportName(report: ReportLike) {
  const input = report.input;

  if (typeof input === "object" && input !== null) {
    const name = (input as Record<string, unknown>).name;

    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }

  return "گزارش Halleus";
}

export function createReportV2PlainText(report: unknown) {
  if (!report || typeof report !== "object") {
    return "گزارش در دسترس نیست.";
  }

  const enhancedReport = enhanceReportOutputV2(report as Record<string, unknown>) as ReportLike;
  const sections = enhancedReport.interpretationSections ?? [];
  const lines: string[] = [];

  lines.push(getReportName(enhancedReport));
  lines.push("Halleus Report Output V2");
  lines.push("");

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push(section.body);
    lines.push("");
  }

  if (enhancedReport.outputQuality?.score !== undefined) {
    lines.push(`Quality score: ${enhancedReport.outputQuality.score}`);
  }

  return lines.join("\n");
}
