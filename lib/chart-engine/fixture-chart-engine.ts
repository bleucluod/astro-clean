import type { ChartEngineDriver } from "@/lib/chart-engine/chart-engine-driver";
import { validateChartEngineInput } from "@/lib/chart-engine/chart-engine-driver";
import type {
  ChartEngineInput,
  ChartEngineResult,
  ChartPlacement,
} from "@/types/chart-engine";

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const BODIES: Array<ChartPlacement["body"]> = [
  "sun",
  "moon",
  "ascendant",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
];

function createSeed(input: ChartEngineInput) {
  const raw = [
    input.name,
    input.birthDate,
    input.birthTime,
    input.birthCity,
    input.birthCountry,
    input.birthTimezone,
  ]
    .filter(Boolean)
    .join("|");

  return raw.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function createFixturePlacements(input: ChartEngineInput): ChartPlacement[] {
  const seed = createSeed(input);

  return BODIES.map((body, index) => {
    const signIndex = (seed + index * 3) % SIGNS.length;
    const degree = (seed + index * 11) % 30;

    return {
      body,
      sign: SIGNS[signIndex],
      house: ((seed + index) % 12) + 1,
      degree,
      retrograde: body !== "sun" && body !== "moon" && (seed + index) % 5 === 0,
    };
  });
}

export function createFixtureChartEngine(): ChartEngineDriver {
  return {
    slug: "mock-preview",

    async generate(input: ChartEngineInput): Promise<ChartEngineResult> {
      const validation = validateChartEngineInput(input);

      return {
        engine: "mock-preview",
        stage: validation.ok ? "calculation-ready" : "mock-preview",
        input,
        placements: validation.ok ? createFixturePlacements(input) : [],
        generatedAt: new Date().toISOString(),
        warnings: validation.ok
          ? [
              "Fixture chart engine is active. Placements are deterministic preview data, not real astronomical calculations yet.",
            ]
          : [`Missing required fields: ${validation.missingFields.join(", ")}`],
      };
    },

    getReadiness() {
      return {
        activeEngine: "mock-preview",
        stage: "calculation-ready",
        canReplaceMockReports: false,
        blockers: [
          "Fixture placements are not real astronomical calculations.",
          "Real calculation provider/library still needs a final decision.",
          "House system and ephemeris precision are not production-ready.",
        ],
        recommendedNextSteps: [
          "Use fixture placements to validate the full report generation flow.",
          "Choose the real astrology calculation strategy.",
          "Replace fixture placements with real ephemeris-based placements.",
          "Run report quality checks on real placement fixtures.",
        ],
      };
    },
  };
}
