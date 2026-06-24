import type {
  ReportQualityIssue,
  ReportQualityResult,
} from "@/types/report-quality";
import { getRequiredReportSections } from "@/lib/report-quality/report-section-schema";
import { checkReportSafetyText } from "@/lib/report-quality/safety-rules";

export function checkReportQuality(text: string): ReportQualityResult {
  const issues: ReportQualityIssue[] = [];

  if (text.trim().length < 500) {
    issues.push({
      ruleId: "section-balance",
      severity: "warning",
      message: "متن گزارش برای تجربه کامل کاربر کوتاه است.",
    });
  }

  for (const section of getRequiredReportSections()) {
    if (!text.includes(section.title)) {
      issues.push({
        ruleId: "section-balance",
        severity: section.kind === "disclaimer" ? "blocker" : "warning",
        message: `بخش ضروری پیدا نشد: ${section.title}`,
      });
    }
  }

  issues.push(...checkReportSafetyText(text));

  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const score = Math.max(0, 100 - blockerCount * 35 - warningCount * 10);

  return {
    ok: blockerCount === 0 && score >= 70,
    score,
    issues,
    checkedAt: new Date().toISOString(),
  };
}
