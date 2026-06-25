import {
  assertHouseCoverage,
  assignHouseToLongitude,
  buildEqualHouseCusps,
  buildPlaceholderHouses,
  buildWholeSignHouses,
  getHouseNumberFromLongitude,
  getWholeSignFirstHouseCusp,
  normalizeHouseNumber,
} from "./houses";
import {
  calculateAngularSeparation,
  calculateMajorAspects,
  findMajorAspect,
  findMajorAspectBetweenPlacements,
  formatAspectOrb,
  getAspectDefinition,
  sortAspectsByOrb,
  type AspectPlacement,
  type MajorAspectId,
} from "./aspects";

export type HouseAspectQaFixture = {
  id: string;
  kind: "house" | "aspect";
  assert: () => string[];
};

const aspectPlacements: AspectPlacement[] = [
  { id: "sun", longitude: 10 },
  { id: "moon", longitude: 70 },
  { id: "mercury", longitude: 100 },
  { id: "venus", longitude: 190 },
  { id: "mars", longitude: 310 },
];

export const houseAspectQaFixtures: HouseAspectQaFixture[] = [
  {
    id: "house-number-normalization",
    kind: "house",
    assert: () => {
      const failures: string[] = [];

      if (normalizeHouseNumber(13) !== 1) {
        failures.push("13 should normalize to house 1");
      }

      if (normalizeHouseNumber(0) !== 12) {
        failures.push("0 should normalize to house 12");
      }

      return failures;
    },
  },
  {
    id: "whole-sign-first-house-cusp",
    kind: "house",
    assert: () => {
      const failures: string[] = [];
      const cusp = getWholeSignFirstHouseCusp(47);

      if (cusp !== 30) {
        failures.push(`Expected Taurus whole-sign cusp 30, received ${cusp}`);
      }

      return failures;
    },
  },
  {
    id: "whole-sign-house-coverage",
    kind: "house",
    assert: () => {
      const failures: string[] = [];
      const houses = buildWholeSignHouses(47);

      try {
        assertHouseCoverage(houses);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }

      if (houses[0]?.number !== 1 || houses[0]?.cuspLongitude !== 30) {
        failures.push("First whole-sign house should begin at 30 degrees.");
      }

      if (houses[11]?.number !== 12 || houses[11]?.cuspLongitude !== 0) {
        failures.push("Twelfth whole-sign house should wrap to 0 degrees.");
      }

      return failures;
    },
  },
  {
    id: "equal-house-assignment",
    kind: "house",
    assert: () => {
      const failures: string[] = [];
      const houseNumber = getHouseNumberFromLongitude(95, 20);
      const assignment = assignHouseToLongitude(95, 20, "equal-house");
      const houses = buildEqualHouseCusps(20);

      try {
        assertHouseCoverage(houses);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }

      if (houseNumber !== 3) {
        failures.push(`Expected longitude 95 from cusp 20 to be house 3, got ${houseNumber}`);
      }

      if (assignment.house !== 3) {
        failures.push(`Expected assignment house 3, got ${assignment.house}`);
      }

      if (assignment.cuspLongitude !== 80) {
        failures.push(`Expected house 3 cusp 80, got ${assignment.cuspLongitude}`);
      }

      return failures;
    },
  },
  {
    id: "placeholder-house-coverage",
    kind: "house",
    assert: () => {
      const failures: string[] = [];
      const houses = buildPlaceholderHouses();

      try {
        assertHouseCoverage(houses);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }

      if (houses[0]?.system !== "placeholder") {
        failures.push("Placeholder houses should be marked with placeholder system.");
      }

      return failures;
    },
  },
  {
    id: "angular-separation-wrap",
    kind: "aspect",
    assert: () => {
      const failures: string[] = [];
      const separation = calculateAngularSeparation(350, 10);

      if (separation !== 20) {
        failures.push(`Expected wrapped separation 20, received ${separation}`);
      }

      return failures;
    },
  },
  {
    id: "major-aspect-identification",
    kind: "aspect",
    assert: () => {
      const failures: string[] = [];
      const aspect = findMajorAspect(10, 70);

      if (!aspect || aspect.id !== "sextile") {
        failures.push(`Expected sextile, received ${aspect?.id ?? "none"}`);
      }

      return failures;
    },
  },
  {
    id: "placement-aspect-identification",
    kind: "aspect",
    assert: () => {
      const failures: string[] = [];
      const aspect = findMajorAspectBetweenPlacements(
        { id: "sun", longitude: 10 },
        { id: "moon", longitude: 190 },
      );

      if (!aspect || aspect.id !== "opposition") {
        failures.push(`Expected opposition, received ${aspect?.id ?? "none"}`);
      }

      if (aspect?.pointA !== "sun" || aspect?.pointB !== "moon") {
        failures.push("Aspect should preserve placement ids.");
      }

      return failures;
    },
  },
  {
    id: "major-aspect-batch-calculation",
    kind: "aspect",
    assert: () => {
      const failures: string[] = [];
      const aspects = sortAspectsByOrb(calculateMajorAspects(aspectPlacements));
      const ids = aspects.map((aspect) => aspect.id);

      for (const expectedId of ["sextile", "square", "opposition"] as MajorAspectId[]) {
        if (!ids.includes(expectedId)) {
          failures.push(`Expected calculated aspects to include ${expectedId}`);
        }
      }

      return failures;
    },
  },
  {
    id: "aspect-definition-and-formatting",
    kind: "aspect",
    assert: () => {
      const failures: string[] = [];
      const trine = getAspectDefinition("trine");
      const formatted = formatAspectOrb(1.234, 1);

      if (trine.angle !== 120) {
        failures.push(`Expected trine angle 120, received ${trine.angle}`);
      }

      if (formatted !== "1.2°") {
        failures.push(`Expected formatted orb 1.2°, received ${formatted}`);
      }

      return failures;
    },
  },
];

export function runHouseAspectQaFixtures(): string[] {
  const failures: string[] = [];

  for (const fixture of houseAspectQaFixtures) {
    const fixtureFailures = fixture.assert();

    for (const failure of fixtureFailures) {
      failures.push(`${fixture.id}: ${failure}`);
    }
  }

  return failures;
}
