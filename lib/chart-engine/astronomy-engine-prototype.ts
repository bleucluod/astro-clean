import type { ChartEngineDriver } from "@/lib/chart-engine/chart-engine-driver";
import { validateChartEngineInput } from "@/lib/chart-engine/chart-engine-driver";
import { createFixtureChartEngine } from "@/lib/chart-engine/fixture-chart-engine";
import { loadAstronomyEnginePackage } from "@/lib/chart-engine/astronomy-engine-loader";
import { longitudeToZodiac } from "@/lib/chart-engine/zodiac";
import type {
  ChartEngineInput,
  ChartEngineResult,
  ChartPlacement,
} from "@/types/chart-engine";
import type { AstronomyEnginePrototypeBody } from "@/types/astronomy-engine-prototype";

const BODY_TO_ASTRONOMY_NAME: Record<AstronomyEnginePrototypeBody, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
};

const CALCULATED_BODIES: AstronomyEnginePrototypeBody[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
];

function toUtcDate(input: ChartEngineInput) {
  const time = input.birthTime && input.birthTime.length >= 4 ? input.birthTime : "12:00";
  const dateText = `${input.birthDate}T${time}:00Z`;
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return new Date(`${input.birthDate}T12:00:00Z`);
  }

  return date;
}

function createPlacement(
  body: AstronomyEnginePrototypeBody,
  longitude: number,
  index: number,
): ChartPlacement {
  const zodiac = longitudeToZodiac(longitude);

  return {
    body,
    sign: zodiac.sign,
    house: index + 1,
    degree: zodiac.degree,
    retrograde: false,
  };
}

export function createAstronomyEnginePrototypeDriver(): ChartEngineDriver {
  const fallbackDriver = createFixtureChartEngine();

  return {
    slug: "mock-preview",

    async generate(input: ChartEngineInput): Promise<ChartEngineResult> {
      const validation = validateChartEngineInput(input);

      if (!validation.ok) {
        return fallbackDriver.generate(input);
      }

      const astronomy = await loadAstronomyEnginePackage();

      if (!astronomy) {
        const fallbackResult = await fallbackDriver.generate(input);

        return {
          ...fallbackResult,
          warnings: [
            "astronomy-engine package is not installed or could not be loaded. Fixture fallback is active.",
            ...fallbackResult.warnings,
          ],
        };
      }

      try {
        const date = toUtcDate(input);

        const placements = CALCULATED_BODIES.map((body, index) => {
          if (body === "sun") {
            const longitude = astronomy.SunPosition(date).elon;

            return createPlacement(body, longitude, index);
          }

          if (body === "moon") {
            const longitude = astronomy.EclipticGeoMoon(date).elon;

            return createPlacement(body, longitude, index);
          }

          const astronomyBodyName = BODY_TO_ASTRONOMY_NAME[body];
          const astronomyBody = astronomy.Body[astronomyBodyName];

          if (!astronomyBody) {
            throw new Error(`Missing Astronomy Engine body: ${astronomyBodyName}`);
          }

          const vector = astronomy.GeoVector(astronomyBody, date, true);
          const ecliptic = astronomy.Ecliptic(vector);

          return createPlacement(body, ecliptic.elon, index);
        });

        return {
          engine: "mock-preview",
          stage: "calculation-ready",
          input,
          placements,
          generatedAt: new Date().toISOString(),
          warnings: [
            "Astronomy Engine prototype is active for geocentric ecliptic longitudes.",
            "House values are placeholders until a house-system decision is implemented.",
            "Timezone handling currently treats submitted birth time as UTC for prototype validation.",
          ],
        };
      } catch (error) {
        const fallbackResult = await fallbackDriver.generate(input);

        return {
          ...fallbackResult,
          warnings: [
            `Astronomy Engine prototype failed and fixture fallback was used: ${
              error instanceof Error ? error.message : "unknown error"
            }`,
            ...fallbackResult.warnings,
          ],
        };
      }
    },

    getReadiness() {
      return {
        activeEngine: "mock-preview",
        stage: "calculation-ready",
        canReplaceMockReports: false,
        blockers: [
          "Prototype uses real astronomy longitudes when astronomy-engine is installed, but houses are placeholders.",
          "Birth timezone conversion is not production-ready.",
          "Aspects and house system still need explicit implementation.",
        ],
        recommendedNextSteps: [
          "Install astronomy-engine and validate placement output with fixed fixtures.",
          "Add timezone conversion based on stored birth timezone.",
          "Implement zodiac sign and degree QA fixtures.",
          "Choose and implement a house system.",
          "Add aspect calculation.",
        ],
      };
    },
  };
}
