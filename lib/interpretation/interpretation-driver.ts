import type {
  InterpretationDriverSlug,
  InterpretationInput,
  InterpretationReadinessReport,
  InterpretationResult,
} from "@/types/interpretation";

export type InterpretationDriver = {
  slug: InterpretationDriverSlug;
  compose(input: InterpretationInput): Promise<InterpretationResult>;
  getReadiness(): InterpretationReadinessReport;
};

export function summarizePlacementCoverage(input: InterpretationInput) {
  const bodies = new Set(input.placements.map((placement) => placement.body));

  return {
    hasSun: bodies.has("sun"),
    hasMoon: bodies.has("moon"),
    hasAscendant: bodies.has("ascendant"),
    placementCount: bodies.size,
  };
}
