import type { ChartEngineInput } from "@/types/chart-engine";

export const CHART_ENGINE_FIXTURES: ChartEngineInput[] = [
  {
    name: "Preview Tehran",
    birthDate: "1992-03-21",
    birthTime: "12:00",
    birthCity: "Tehran",
    birthCountry: "Iran",
    birthLatitude: 35.6892,
    birthLongitude: 51.389,
    birthTimezone: "Asia/Tehran",
  },
  {
    name: "Preview Shiraz",
    birthDate: "1988-10-05",
    birthTime: "06:30",
    birthCity: "Shiraz",
    birthCountry: "Iran",
    birthLatitude: 29.5918,
    birthLongitude: 52.5837,
    birthTimezone: "Asia/Tehran",
  },
];

export function getChartEngineFixtures() {
  return CHART_ENGINE_FIXTURES;
}
