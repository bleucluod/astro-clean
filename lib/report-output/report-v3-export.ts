import { enhanceReportOutputV3 } from "@/lib/report-output/report-v3";

type ReportLike = Record<string, unknown>;

export function createReportV3PlainText(report: unknown) {
  if (!report || typeof report !== "object") {
    return "گزارش در دسترس نیست.";
  }

  const enhancedReport = enhanceReportOutputV3(report as ReportLike);
  const lines: string[] = [];

  lines.push(enhancedReport.reportV3Summary.title);
  lines.push(enhancedReport.reportV3Summary.subtitle);
  lines.push("Halleus Report Output V3");
  lines.push("");

  for (const section of enhancedReport.reportV3Sections) {
    lines.push(`## ${section.title}`);
    lines.push(section.body);
    lines.push("");
  }

  lines.push("## یادآوری");
  lines.push(enhancedReport.reportV3Disclaimer);
  lines.push("");
  lines.push(`Reading minutes: ${enhancedReport.reportV3Summary.readingMinutes}`);
  lines.push(`Word count: ${enhancedReport.reportV3Summary.wordCount}`);

  return lines.join("\n");
}
