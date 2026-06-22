import type { AstrologyReport, BirthInput, MockChart } from "@/types/astro";
import { astrologySafetyNote } from "./safety";
import { createInterpretations, createSummary } from "./rule-engine";
import { getZodiacByIndex } from "./zodiac";

function sumText(text: string): number {
  return text
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
}

function getDayFromDate(date: string): number {
  const day = Number(date.split("-")[2]);
  return Number.isFinite(day) && day > 0 ? day : 1;
}

function getHourFromTime(time: string): number {
  const hour = Number(time.split(":")[0]);
  return Number.isFinite(hour) && hour >= 0 ? hour : 0;
}

export function createMockChart(input: BirthInput): MockChart {
  const day = getDayFromDate(input.birthDate);
  const hour = getHourFromTime(input.birthTime);
  const placeScore = sumText(`${input.birthCity}-${input.birthCountry}`);

  return {
    sunSign: getZodiacByIndex(day - 1),
    moonSign: getZodiacByIndex(day + hour),
    risingSign: getZodiacByIndex(placeScore + hour),
  };
}

export function createMockReport(input: BirthInput): AstrologyReport {
  const chart = createMockChart(input);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    input,
    chart,
    summary: createSummary(chart),
    interpretations: createInterpretations(chart),
    safetyNote: astrologySafetyNote,
  };
}
