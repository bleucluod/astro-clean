import type { MockChart } from "@/types/astro";
import type { EngineChartInput, EngineInsight } from "@/lib/astro-engine";
import { generateEngineResult } from "@/lib/astro-engine";

export type EngineReportContent = {
  summary: string;
  interpretations: string[];
  safetyNote: string;
};

export function createEngineChartInput(chart: MockChart): EngineChartInput {
  return {
    sun: chart.sunSign.key,
    moon: chart.moonSign.key,
    rising: chart.risingSign.key,
  };
}

function formatInsight(insight: EngineInsight): string {
  return `${insight.title}: ${insight.summary}`;
}

export function createSummary(chart: MockChart): string {
  const engineResult = generateEngineResult(createEngineChartInput(chart));
  const topThemes = engineResult.insights
    .slice(0, 3)
    .map((insight) => insight.title)
    .join("ØŒ ");

  return `Ø¯Ø± Ø§ÛŒÙ† Ú†Ø§Ø±Øª mockØŒ Ø®ÙˆØ±Ø´ÛŒØ¯ ØªÙˆ Ø¯Ø± ${chart.sunSign.faName}ØŒ Ù…Ø§Ù‡ ØªÙˆ Ø¯Ø± ${chart.moonSign.faName} Ùˆ Ø±Ø§ÛŒØ²ÛŒÙ†Ú¯ ØªÙˆ ${chart.risingSign.faName} Ø§Ø³Øª. Engine v0 Ø§ÛŒÙ† ØªØ±Ú©ÛŒØ¨ Ø±Ø§ Ø¨Ù‡ Ø´Ú©Ù„ Ù†Ù…Ø§Ø¯ÛŒÙ† Ùˆ ØªÙØ³ÛŒØ±ÛŒ Ø¨Ø±Ø±Ø³ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ø¯${
    topThemes ? ` Ùˆ ÙØ¹Ù„Ø§Ù‹ Ø§ÛŒÙ† Ù…Ø­ÙˆØ±Ù‡Ø§ÛŒ Ø§ØµÙ„ÛŒ Ø±Ø§ Ø¨Ø±Ø¬Ø³ØªÙ‡ Ù…ÛŒâ€ŒØ¨ÛŒÙ†Ø¯: ${topThemes}.` : "."
  } Ø§ÛŒÙ† Ù‡Ù†ÙˆØ² Ù…Ø­Ø§Ø³Ø¨Ù‡ ÙˆØ§Ù‚Ø¹ÛŒ Ù†Ø¬ÙˆÙ…ÛŒ Ù†ÛŒØ³Øª Ùˆ Ø¨Ø±Ø§ÛŒ ØªØ¬Ø±Ø¨Ù‡ MVP Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.`;
}

export function createInterpretations(chart: MockChart): string[] {
  const engineResult = generateEngineResult(createEngineChartInput(chart));

  return engineResult.insights.map(formatInsight);
}

export function createReportContent(chart: MockChart): EngineReportContent {
  const engineResult = generateEngineResult(createEngineChartInput(chart));

  return {
    summary: createSummary(chart),
    interpretations: engineResult.insights.map(formatInsight),
    safetyNote: engineResult.safetyNote,
  };
}
