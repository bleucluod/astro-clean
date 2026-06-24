import type {
  RealChartEngineDecision,
  RealChartEngineOption,
} from "@/types/real-chart-engine";

export const REAL_CHART_ENGINE_OPTIONS: RealChartEngineOption[] = [
  {
    id: "astronomy-engine-mvp",
    label: "Astronomy Engine + Halleus astrology layer",
    status: "recommended-for-mvp",
    summary:
      "Use a JavaScript-friendly astronomy calculation layer first, then build the astrology-specific layer inside Halleus.",
    strengths: [
      "Good fit for Render and Next.js deployment.",
      "Avoids immediate commercial licensing complexity.",
      "Lets the current chart engine path become real gradually.",
      "Keeps interpretation and safety logic inside Halleus.",
    ],
    risks: [
      "Astrology-specific concepts like houses and aspects still need Halleus implementation.",
      "Accuracy and house-system choices require explicit QA fixtures.",
      "Not a drop-in full birth-chart product.",
    ],
    nextAction:
      "Create a prototype adapter that calculates Sun, Moon, and planetary longitudes for fixture birth data.",
  },
  {
    id: "swiss-ephemeris-commercial",
    label: "Swiss Ephemeris commercial path",
    status: "future-option",
    summary:
      "Use Swiss Ephemeris when the product is ready to handle professional licensing and more precise ephemeris requirements.",
    strengths: [
      "Astrology industry standard for high-precision ephemeris work.",
      "Stronger long-term option for professional-grade calculations.",
      "Better fit if Halleus becomes a paid astrology tool.",
    ],
    risks: [
      "License decision must be resolved before proprietary or commercial use.",
      "Deployment and wrapper choice can add complexity.",
      "Not ideal as the very first MVP implementation step.",
    ],
    nextAction:
      "Revisit after the MVP proves demand and the licensing budget/strategy is clear.",
  },
  {
    id: "external-astrology-api",
    label: "External astrology API",
    status: "blocked-by-dependency",
    summary:
      "Use a managed astrology API if speed matters more than control, but keep it out of the core MVP until pricing and reliability are clear.",
    strengths: [
      "Fastest route to full-looking chart outputs.",
      "Less calculation code to maintain internally.",
      "May include houses, aspects, and chart objects out of the box.",
    ],
    risks: [
      "Creates vendor lock-in.",
      "Recurring cost and rate limits can hurt early MVP economics.",
      "User data and privacy story becomes more complex.",
    ],
    nextAction:
      "Compare providers only if the local MVP path becomes too slow.",
  },
];

export const REAL_CHART_ENGINE_DECISION: RealChartEngineDecision = {
  selectedOption: "astronomy-engine-mvp",
  rationale:
    "For the next implementation step, Halleus should avoid license-heavy or vendor-locked paths and first make the existing engine adapter produce real astronomy data that can feed the report pipeline.",
  decisionDate: "2026-06-25",
  options: REAL_CHART_ENGINE_OPTIONS,
  implementationSteps: [
    "Add an adapter boundary for the selected real calculation path.",
    "Prototype Sun, Moon, and planet longitude calculations against fixed fixtures.",
    "Add sign mapping from ecliptic longitude.",
    "Add aspect and house-system decisions separately.",
    "Keep fixture engine as fallback until real calculations pass QA.",
  ],
};

export function getRealChartEngineDecision() {
  return REAL_CHART_ENGINE_DECISION;
}
