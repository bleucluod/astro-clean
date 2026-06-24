import type { ChartEngineDriver } from "@/lib/chart-engine/chart-engine-driver";
import { validateChartEngineInput } from "@/lib/chart-engine/chart-engine-driver";
import type { ChartEngineInput, ChartEngineResult } from "@/types/chart-engine";

export function createMockPreviewChartEngine(): ChartEngineDriver {
  return {
    slug: "mock-preview",

    async generate(input: ChartEngineInput): Promise<ChartEngineResult> {
      const validation = validateChartEngineInput(input);

      return {
        engine: "mock-preview",
        stage: "mock-preview",
        input,
        placements: [],
        generatedAt: new Date().toISOString(),
        warnings: validation.ok
          ? [
              "This is a preview engine contract. It does not calculate real placements yet.",
            ]
          : [`Missing required fields: ${validation.missingFields.join(", ")}`],
      };
    },

    getReadiness() {
      return {
        activeEngine: "mock-preview",
        stage: "contract-ready",
        canReplaceMockReports: false,
        blockers: [
          "Real astronomical calculation library/provider is not selected.",
          "Placement-to-interpretation mapping is not implemented.",
          "Report quality review workflow is not implemented.",
        ],
        recommendedNextSteps: [
          "Choose calculation strategy.",
          "Define placement output schema.",
          "Add deterministic test fixtures.",
          "Build interpretation modules after placement accuracy is verified.",
        ],
      };
    },
  };
}
