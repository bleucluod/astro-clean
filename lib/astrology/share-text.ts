import type { AstrologyReport } from "@/types/astro";

function formatReportTitle(report: AstrologyReport): string {
  return report.input.name
    ? `Ú¯Ø²Ø§Ø±Ø´ Astro Clean Ø¨Ø±Ø§ÛŒ ${report.input.name}`
    : "Ú¯Ø²Ø§Ø±Ø´ Astro Clean";
}

function formatBirthLine(report: AstrologyReport): string {
  return `ØªÙˆÙ„Ø¯: ${report.input.birthDate}ØŒ Ø³Ø§Ø¹Øª ${report.input.birthTime}ØŒ ${report.input.birthCity}ØŒ ${report.input.birthCountry}`;
}

function formatChartLine(report: AstrologyReport): string {
  return `Ù†Ø´Ø§Ù†Ù‡â€ŒÙ‡Ø§ÛŒ Ø§ØµÙ„ÛŒ: Ø®ÙˆØ±Ø´ÛŒØ¯ Ø¯Ø± ${report.chart.sunSign.faName}ØŒ Ù…Ø§Ù‡ Ø¯Ø± ${report.chart.moonSign.faName}ØŒ Ø±Ø§ÛŒØ²ÛŒÙ†Ú¯ ${report.chart.risingSign.faName}`;
}

function formatInterpretations(report: AstrologyReport): string {
  return report.interpretations
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");
}

export function createReportText(
  report: AstrologyReport,
  note = "",
): string {
  const noteText = note.trim();

  const lines = [
    formatReportTitle(report),
    "",
    formatBirthLine(report),
    formatChartLine(report),
    "",
    "Ø®Ù„Ø§ØµÙ‡:",
    report.summary,
    "",
    "Ø¨Ø±Ø¯Ø§Ø´Øªâ€ŒÙ‡Ø§ÛŒ Ù†Ù…Ø§Ø¯ÛŒÙ†:",
    formatInterpretations(report),
    "",
    "ÛŒØ§Ø¯Ø¢ÙˆØ±ÛŒ:",
    report.safetyNote,
  ];

  if (noteText) {
    lines.push("", "ÛŒØ§Ø¯Ø¯Ø§Ø´Øª Ø´Ø®ØµÛŒ:", noteText);
  }

  lines.push("", "Ø³Ø§Ø®ØªÙ‡â€ŒØ´Ø¯Ù‡ Ø¨Ø§ Astro Clean");

  return lines.join("\n");
}

export function createShareText(report: AstrologyReport): string {
  return createReportText(report);
}
