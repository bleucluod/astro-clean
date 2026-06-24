import type { ReportQualityIssue } from "@/types/report-quality";

const deterministicMarkers = [
  "قطعاً",
  "حتماً",
  "بی‌شک",
  "سرنوشت تو",
  "آینده تو دقیقاً",
];

const professionalAdviceMarkers = [
  "تشخیص پزشکی",
  "درمان قطعی",
  "توصیه حقوقی",
  "توصیه مالی",
  "سرمایه‌گذاری کن",
];

export function checkReportSafetyText(text: string): ReportQualityIssue[] {
  const issues: ReportQualityIssue[] = [];

  for (const marker of deterministicMarkers) {
    if (text.includes(marker)) {
      issues.push({
        ruleId: "no-deterministic-prediction",
        severity: "warning",
        message: `عبارت قطعیت‌دار پیدا شد: ${marker}`,
      });
    }
  }

  for (const marker of professionalAdviceMarkers) {
    if (text.includes(marker)) {
      issues.push({
        ruleId: "no-medical-legal-financial-advice",
        severity: "blocker",
        message: `عبارت توصیه تخصصی ممنوع پیدا شد: ${marker}`,
      });
    }
  }

  if (!text.includes("نمادین") && !text.includes("تأمل")) {
    issues.push({
      ruleId: "symbolic-language",
      severity: "info",
      message: "متن بهتر است روشن‌تر بگوید گزارش نمادین و تأملی است.",
    });
  }

  return issues;
}
