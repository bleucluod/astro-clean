import type { MajorAspectId } from "./aspects";
import {
  buildNormalizedChart,
  getChartReadinessLabel,
  getNormalizedPlacementById,
  normalizeHouseContext,
  toAspectPlacements,
  type BuildNormalizedChartInput,
  type NormalizedAscendantMethod,
  type NormalizedHouseConfidence,
} from "./normalized-chart";

export type NormalizedChartQaFixture = {
  id: string;
  input: BuildNormalizedChartInput;
  expectedPlacementCount: number;
  expectedHasReadyHouses: boolean;
  expectedReadinessLabel: string;
  expectedAspectIds: MajorAspectId[];
  expectedHouseConfidence: NormalizedHouseConfidence;
  expectedAscendantMethod: NormalizedAscendantMethod;
};

export const normalizedChartQaFixtures: NormalizedChartQaFixture[] = [
  {
    id: "ready-whole-sign-chart",
    input: {
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
          id: "mercury",
          label: "Mercury",
          pointType: "personal-planet",
          longitude: 100,
        },
        {
          id: "venus",
          label: "Venus",
          pointType: "personal-planet",
          longitude: 190,
        },
      ],
    },
    expectedPlacementCount: 4,
    expectedHasReadyHouses: true,
    expectedReadinessLabel: "ready-for-report-enrichment",
    expectedAspectIds: ["sextile", "square", "opposition"],
    expectedHouseConfidence: "provided-ascendant",
    expectedAscendantMethod: "provided",
  },
  {
    id: "calculated-ascendant-whole-sign-chart",
    input: {
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
    },
    expectedPlacementCount: 2,
    expectedHasReadyHouses: true,
    expectedReadinessLabel: "ready-for-report-enrichment",
    expectedAspectIds: ["sextile"],
    expectedHouseConfidence: "calculated-ascendant",
    expectedAscendantMethod: "astronomy-engine-local-sidereal-time",
  },
  {
    id: "calculated-ascendant-equal-house-chart",
    input: {
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
    },
    expectedPlacementCount: 2,
    expectedHasReadyHouses: true,
    expectedReadinessLabel: "partial-chart-ready",
    expectedAspectIds: ["sextile"],
    expectedHouseConfidence: "calculated-ascendant",
    expectedAscendantMethod: "astronomy-engine-local-sidereal-time",
  },
  {
    id: "approximate-equal-house-chart",
    input: {
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
    },
    expectedPlacementCount: 2,
    expectedHasReadyHouses: true,
    expectedReadinessLabel: "partial-chart-ready",
    expectedAspectIds: ["sextile"],
    expectedHouseConfidence: "scaffold",
    expectedAscendantMethod: "unknown",
  },
  {
    id: "placeholder-house-chart",
    input: {
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
    },
    expectedPlacementCount: 2,
    expectedHasReadyHouses: false,
    expectedReadinessLabel: "partial-chart-ready",
    expectedAspectIds: ["conjunction"],
    expectedHouseConfidence: "placeholder",
    expectedAscendantMethod: "unknown",
  },
  {
    id: "empty-manual-chart",
    input: {
      source: "manual",
      time: {
        date: "2001-05-09",
        timezone: "Europe/London",
        placeName: "London",
      },
      placements: [],
    },
    expectedPlacementCount: 0,
    expectedHasReadyHouses: false,
    expectedReadinessLabel: "not-ready",
    expectedAspectIds: [],
    expectedHouseConfidence: "placeholder",
    expectedAscendantMethod: "unknown",
  },
];

export function runNormalizedChartQaFixtures(): string[] {
  const failures: string[] = [];

  for (const fixture of normalizedChartQaFixtures) {
    const chart = buildNormalizedChart(fixture.input);
    const readinessLabel = getChartReadinessLabel(chart);
    const aspectIds = chart.aspects.map((aspect) => aspect.id);

    if (chart.placements.length !== fixture.expectedPlacementCount) {
      failures.push(
        `${fixture.id}: placement count ${chart.placements.length} !== ${fixture.expectedPlacementCount}`,
      );
    }

    if (chart.quality.hasReadyHouses !== fixture.expectedHasReadyHouses) {
      failures.push(
        `${fixture.id}: ready houses ${chart.quality.hasReadyHouses} !== ${fixture.expectedHasReadyHouses}`,
      );
    }

    if (chart.houseContext.confidence !== fixture.expectedHouseConfidence) {
      failures.push(
        `${fixture.id}: house confidence ${chart.houseContext.confidence} !== ${fixture.expectedHouseConfidence}`,
      );
    }

    if (chart.houseContext.ascendantMethod !== fixture.expectedAscendantMethod) {
      failures.push(
        `${fixture.id}: ascendant method ${chart.houseContext.ascendantMethod} !== ${fixture.expectedAscendantMethod}`,
      );
    }

    if (chart.quality.houseConfidence !== fixture.expectedHouseConfidence) {
      failures.push(
        `${fixture.id}: quality house confidence ${chart.quality.houseConfidence} !== ${fixture.expectedHouseConfidence}`,
      );
    }

    if (
      fixture.id === "approximate-equal-house-chart" &&
      !chart.quality.limitations.some((limitation) =>
        limitation.includes("current ascendant scaffold"),
      )
    ) {
      failures.push("approximate equal-house chart should carry a scaffold limitation");
    }

    if (
      fixture.id === "calculated-ascendant-equal-house-chart" &&
      !chart.quality.limitations.some((limitation) =>
        limitation.includes("calculated Ascendant longitude"),
      )
    ) {
      failures.push("calculated equal-house chart should carry a transitional house limitation");
    }

    if (
      fixture.id === "calculated-ascendant-whole-sign-chart" &&
      chart.quality.limitations.length !== 0
    ) {
      failures.push("calculated whole-sign chart should not carry house confidence limitations");
    }

    if (readinessLabel !== fixture.expectedReadinessLabel) {
      failures.push(
        `${fixture.id}: readiness ${readinessLabel} !== ${fixture.expectedReadinessLabel}`,
      );
    }

    for (const expectedAspectId of fixture.expectedAspectIds) {
      if (!aspectIds.includes(expectedAspectId)) {
        failures.push(`${fixture.id}: missing aspect ${expectedAspectId}`);
      }
    }

    if (chart.houses.length !== 12) {
      failures.push(`${fixture.id}: expected 12 houses, got ${chart.houses.length}`);
    }

    if (chart.placements.length > 0) {
      const firstPlacement = chart.placements[0];
      const foundPlacement = getNormalizedPlacementById(chart, firstPlacement.id);

      if (!foundPlacement) {
        failures.push(`${fixture.id}: could not find first placement by id`);
      }
    }

    if (toAspectPlacements(chart.placements).length !== chart.placements.length) {
      failures.push(`${fixture.id}: aspect placement conversion changed count`);
    }
  }

  const placeholderContext = normalizeHouseContext({ system: "whole-sign" });
  if (placeholderContext.appliedSystem !== "placeholder") {
    failures.push("missing ascendant should fall back to placeholder house context");
  }

  return failures;
}
