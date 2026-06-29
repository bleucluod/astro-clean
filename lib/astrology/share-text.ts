import {
  formatZodiacLabel,
  formatZodiacSign,
  zodiacSignFromLongitude,
} from "@/lib/astrology/zodiac-labels";
import type { AstrologyReport } from "@/types/astro";

function formatReportTitle(report: AstrologyReport): string {
  return report.input.name
    ? `گزارش Halleus برای ${report.input.name}`
    : "گزارش Halleus";
}

function formatBirthLine(report: AstrologyReport): string {
  return `تولد: ${report.input.birthDate}، ساعت ${report.input.birthTime}، ${report.input.birthCity}، ${report.input.birthCountry}`;
}

function formatChartLine(report: AstrologyReport): string {
  const sun = report.realEngine?.placements.find((placement) => placement.id === "sun");
  const moon = report.realEngine?.placements.find((placement) => placement.id === "moon");
  const rising = report.realEngine
    ? zodiacSignFromLongitude(report.realEngine.ascendantLongitude)
    : undefined;

  const sunLabel = sun
    ? formatZodiacLabel(sun.signId)
    : formatZodiacSign(report.chart.sunSign);
  const moonLabel = moon
    ? formatZodiacLabel(moon.signId)
    : formatZodiacSign(report.chart.moonSign);
  const risingLabel = rising
    ? formatZodiacLabel(rising)
    : formatZodiacSign(report.chart.risingSign);

  return `نشانه‌های اصلی: خورشید در ${sunLabel}، ماه در ${moonLabel}، رایزینگ ${risingLabel}`;
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
    "ساخته‌شده با Halleus",
  ].join("\n");
}
