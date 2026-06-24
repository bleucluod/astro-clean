import type { AstrologyReport } from "@/types/astro";

function formatReportTitle(report: AstrologyReport): string {
  return report.input.name
    ? `گزارش Astro Clean برای ${report.input.name}`
    : "گزارش Astro Clean";
}

function formatBirthLine(report: AstrologyReport): string {
  return `تولد: ${report.input.birthDate}، ساعت ${report.input.birthTime}، ${report.input.birthCity}، ${report.input.birthCountry}`;
}

function formatChartLine(report: AstrologyReport): string {
  return `نشانه‌های اصلی: خورشید در ${report.chart.sunSign.faName}، ماه در ${report.chart.moonSign.faName}، رایزینگ ${report.chart.risingSign.faName}`;
}

export function createShareText(report: AstrologyReport): string {
  const interpretations = report.interpretations
    .slice(0, 4)
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");

  return [
    formatReportTitle(report),
    "",
    formatBirthLine(report),
    formatChartLine(report),
    "",
    "خلاصه:",
    report.summary,
    "",
    "برداشت‌های نمادین:",
    interpretations,
    "",
    "یادآوری:",
    "این متن یک برداشت نمادین و تفسیری است، نه پیش‌بینی قطعی یا توصیه تخصصی.",
    "",
    "ساخته‌شده با Astro Clean",
  ].join("\n");
}
