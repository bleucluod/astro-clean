import { buildNormalizedChart } from "../chart/normalized-chart";
import {
  buildChartReportEnrichment,
  buildPlacementSummaryKey,
  buildAspectSummaryKey,
  getChartReportEnrichmentStatus,
  hasReportReadyChartEnrichment,
} from "./chart-enrichment";

export type ChartReportEnrichmentQaFixture = {
  id: string;
  assert: () => string[];
};

export const chartReportEnrichmentQaFixtures: ChartReportEnrichmentQaFixture[] = [
  {
    id: "ready-chart-enrichment",
    assert: () => {
      const failures: string[] = [];
      const chart = buildNormalizedChart({
        source: "fixture",
        time: {
          date: "1994-02-20",
          time: "22:10",
          timezone: "Asia/Baku",
          placeName: "Baku",
        },
        house: {
          system: "whole-sign",
          ascendantLongitude: 47,
        },
        placements: [
          {
            id: "sun",
            label: "Sun",
            pointType: "luminary",
            longitude: 10,
          },
          {
            id: "moon",
            label: "Moon",
            pointType: "luminary",
            longitude: 70,
          },
          {
            id: "venus",
            label: "Venus",
            pointType: "personal-planet",
            longitude: 190,
          },
        ],
      });
      const enrichment = buildChartReportEnrichment(chart);

      if (enrichment.status !== "ready") {
        failures.push(`Expected ready status, received ${enrichment.status}`);
      }

      if (!hasReportReadyChartEnrichment(enrichment)) {
        failures.push("Expected enrichment to be report-ready.");
      }

      if (enrichment.placements.length !== 3) {
        failures.push(`Expected 3 placement summaries, got ${enrichment.placements.length}`);
      }

      if (enrichment.sections.length !== 3) {
        failures.push(`Expected 3 enrichment sections, got ${enrichment.sections.length}`);
      }

      return failures;
    },
  },
  {
    id: "partial-chart-enrichment",
    assert: () => {
      const failures: string[] = [];
      const chart = buildNormalizedChart({
        source: "astronomy-engine-prototype",
        time: {
          date: "2000-01-01",
          time: "12:00",
          timezone: "UTC",
          placeName: "Prototype",
        },
        house: {
          system: "placeholder",
        },
        placements: [
          {
            id: "sun",
            label: "Sun",
            pointType: "luminary",
            longitude: 360,
          },
          {
            id: "moon",
            label: "Moon",
            pointType: "luminary",
            longitude: -1,
          },
        ],
      });
      const status = getChartReportEnrichmentStatus(chart);
      const enrichment = buildChartReportEnrichment(chart);

      if (status !== "partial") {
        failures.push(`Expected partial status, received ${status}`);
      }

      if (enrichment.limitations.length === 0) {
        failures.push("Expected partial enrichment to carry limitations.");
      }

      return failures;
    },
  },
  {
    id: "blocked-chart-enrichment",
    assert: () => {
      const failures: string[] = [];
      const chart = buildNormalizedChart({
        source: "manual",
        time: {
          date: "2001-05-09",
          timezone: "Europe/London",
          placeName: "London",
        },
        placements: [],
      });
      const enrichment = buildChartReportEnrichment(chart);

      if (enrichment.status !== "blocked") {
        failures.push(`Expected blocked status, received ${enrichment.status}`);
      }

      if (hasReportReadyChartEnrichment(enrichment)) {
        failures.push("Blocked enrichment must not be report-ready.");
      }

      return failures;
    },
  },
  {
    id: "summary-key-builders",
    assert: () => {
      const failures: string[] = [];
      const placementKey = buildPlacementSummaryKey("sun", "aries", 1);
      const aspectKey = buildAspectSummaryKey("sun", "trine", "moon");

      if (placementKey !== "placement:sun:sign-aries:house-1") {
        failures.push(`Unexpected placement key: ${placementKey}`);
      }

      if (aspectKey !== "aspect:sun:trine:moon") {
        failures.push(`Unexpected aspect key: ${aspectKey}`);
      }

      return failures;
    },
  },
];

export function runChartReportEnrichmentQaFixtures(): string[] {
  const failures: string[] = [];

  for (const fixture of chartReportEnrichmentQaFixtures) {
    for (const failure of fixture.assert()) {
      failures.push(`${fixture.id}: ${failure}`);
    }
  }

  return failures;
}
