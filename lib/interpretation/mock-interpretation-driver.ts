import type { InterpretationDriver } from "@/lib/interpretation/interpretation-driver";
import { summarizePlacementCoverage } from "@/lib/interpretation/interpretation-driver";
import { getInterpretationModuleBlueprints } from "@/lib/interpretation/interpretation-modules";
import type {
  InterpretationInput,
  InterpretationResult,
} from "@/types/interpretation";

function buildPreviewBody(title: string, input: InterpretationInput) {
  const name = input.chartInput.name?.trim() || "این فرد";
  const city = input.chartInput.birthCity;
  const coverage = summarizePlacementCoverage(input);

  return `${title}: این بخش فعلاً با driver پیش‌نمایش ساخته می‌شود. برای ${name} در ${city}، خروجی نهایی بعداً بر اساس placementهای واقعی، لحن فارسی Halleus و quality gate کامل تولید خواهد شد. پوشش فعلی: ${coverage.placementCount} placement.`;
}

export function createMockInterpretationDriver(): InterpretationDriver {
  return {
    slug: "mock-preview",

    async compose(input: InterpretationInput): Promise<InterpretationResult> {
      const sections = getInterpretationModuleBlueprints().map((module) => ({
        id: module.id,
        title: module.title,
        kind: module.kind,
        body:
          module.id === "disclaimer"
            ? "یادآوری: این گزارش نمادین و تأملی است و جایگزین تصمیم پزشکی، حقوقی، مالی یا تصمیم قطعی زندگی نیست."
            : buildPreviewBody(module.title, input),
      }));

      return {
        driver: "mock-preview",
        stage: "module-ready",
        sections,
        generatedAt: new Date().toISOString(),
        warnings: [
          "Interpretation modules are ready, but real placement-based interpretation is not active yet.",
        ],
      };
    },

    getReadiness() {
      return {
        activeDriver: "mock-preview",
        stage: "module-ready",
        canComposeProductionReport: false,
        blockers: [
          "Real chart placements are not connected yet.",
          "Interpretation text has not been reviewed against real fixtures.",
          "Quality checker is not yet enforced in the generation flow.",
        ],
        recommendedNextSteps: [
          "Connect chart engine result to interpretation driver.",
          "Generate fixture-based sample reports.",
          "Run quality checker on composed reports.",
          "Replace legacy mock report text only after fixture review.",
        ],
      };
    },
  };
}
