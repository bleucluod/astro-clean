import type { AstrologyReport } from "@/types/astro";

export function createShareText(report: AstrologyReport): string {
  return `گزارش Astro Clean من: خورشید در ${report.chart.sunSign.faName}، ماه در ${report.chart.moonSign.faName} و رایزینگ ${report.chart.risingSign.faName}. این یک تفسیر نمادین و سرگرم‌کننده است.`;
}
