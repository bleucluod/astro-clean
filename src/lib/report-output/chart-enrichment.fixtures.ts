import { buildNormalizedChart } from "../chart/normalized-chart";
import {
  buildChartReportEnrichment,
  buildPlacementSummaryKey,
  buildAspectSummaryKey,
  getChartReportEnrichmentStatus,
  hasReportReadyChartEnrichment,
  toHouseContextSummary,
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

      if (enrichment.houseContext.confidence !== "provided-ascendant") {
        failures.push(`Expected provided Ascendant house confidence, received ${enrichment.houseContext.confidence}`);
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
    id: "calculated-whole-sign-house-enrichment",
    assert: () => {
      const failures: string[] = [];
      const chart = buildNormalizedChart({
        source: "astronomy-engine-prototype",
        time: {
          date: "1994-02-20",
          time: "22:10",
          timezone: "Asia/Baku",
          placeName: "Baku",
        },
        house: {
          system: "whole-sign",
          ascendantLongitude: 47,
          ascendantMethod: "astronomy-engine-local-sidereal-time",
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
        ],
      });
      const enrichment = buildChartReportEnrichment(chart);
      const houseSummary = toHouseContextSummary(chart);

      if (enrichment.status !== "ready") {
        failures.push(`Expected calculated whole-sign metadata to be ready, received ${enrichment.status}`);
      }

      if (!hasReportReadyChartEnrichment(enrichment)) {
        failures.push("Calculated whole-sign house context should be report-ready.");
      }

      if (enrichment.houseContext.appliedSystem !== "whole-sign") {
        failures.push(`Expected whole-sign applied system, received ${enrichment.houseContext.appliedSystem}`);
      }

      if (enrichment.houseContext.confidence !== "calculated-ascendant") {
        failures.push(`Expected calculated Ascendant confidence, received ${enrichment.houseContext.confidence}`);
      }

      if (houseSummary.ascendantMethod !== "astronomy-engine-local-sidereal-time") {
        failures.push(`Expected SiderealTime ascendant method, received ${houseSummary.ascendantMethod}`);
      }

      if (enrichment.limitations.length !== 0) {
        failures.push(`Expected no calculated whole-sign limitations, received ${enrichment.limitations.join("; ")}`);
      }

      return failures;
    },
  },
  {
    id: "calculated-ascendant-house-metadata-enrichment",
    assert: () => {
      const failures: string[] = [];
      const chart = buildNormalizedChart({
        source: "astronomy-engine-prototype",
        time: {
          date: "1994-02-20",
          time: "22:10",
          timezone: "Asia/Baku",
          placeName: "Baku",
        },
        house: {
          system: "equal-house",
          firstHouseCuspLongitude: 47,
          ascendantLongitude: 47,
          ascendantMethod: "astronomy-engine-local-sidereal-time",
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
        ],
      });
      const enrichment = buildChartReportEnrichment(chart);
      const houseSummary = toHouseContextSummary(chart);

      if (enrichment.status !== "partial") {
        failures.push(`Expected calculated equal-house metadata to stay partial, received ${enrichment.status}`);
      }

      if (enrichment.houseContext.confidence !== "calculated-ascendant") {
        failures.push(`Expected calculated Ascendant confidence, received ${enrichment.houseContext.confidence}`);
      }

      if (houseSummary.ascendantMethod !== "astronomy-engine-local-sidereal-time") {
        failures.push(`Expected SiderealTime ascendant method, received ${houseSummary.ascendantMethod}`);
      }

      if (!enrichment.limitations.some((limitation) => limitation.includes("calculated Ascendant longitude"))) {
        failures.push("Expected calculated equal-house limitation to be visible.");
      }

      if (hasReportReadyChartEnrichment(enrichment)) {
        failures.push("Calculated equal-house metadata must not be treated as report-ready yet.");
      }

      return failures;
    },
  },
  {
    id: "equal-house-approximate-enrichment",
    assert: () => {
      const failures: string[] = [];
      const chart = buildNormalizedChart({
        source: "astronomy-engine-prototype",
        time: {
          date: "1994-02-20",
          time: "22:10",
          timezone: "Asia/Baku",
          placeName: "Baku",
        },
        house: {
          system: "equal-house",
          firstHouseCuspLongitude: 47,
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
        ],
      });
      const status = getChartReportEnrichmentStatus(chart);
      const enrichment = buildChartReportEnrichment(chart);

      if (status !== "partial" || enrichment.status !== "partial") {
        failures.push(`Expected approximate equal-house status to be partial, received ${status}/${enrichment.status}`);
      }

      if (hasReportReadyChartEnrichment(enrichment)) {
        failures.push("Approximate equal-house enrichment must not be treated as report-ready.");
      }

      if (enrichment.houseContext.confidence !== "scaffold") {
        failures.push(`Expected scaffold house confidence, received ${enrichment.houseContext.confidence}`);
      }

      if (!enrichment.limitations.some((limitation) => limitation.includes("current ascendant scaffold"))) {
        failures.push("Expected approximate equal-house limitation to be visible.");
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
