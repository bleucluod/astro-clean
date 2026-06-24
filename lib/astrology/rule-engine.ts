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
    .join("، ");

  return `در این چارت mock، خورشید تو در ${chart.sunSign.faName}، ماه تو در ${chart.moonSign.faName} و رایزینگ تو ${chart.risingSign.faName} است. Engine v0 این ترکیب را به شکل نمادین و تفسیری بررسی می‌کند${
    topThemes ? ` و فعلاً این محورهای اصلی را برجسته می‌بیند: ${topThemes}.` : "."
  } این هنوز محاسبه واقعی نجومی نیست و برای تجربه MVP استفاده می‌شود.`;
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
