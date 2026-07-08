export const TRANSIT_RULES_CONTRACT_VERSION = "v0.1.245-transit-rules-contract" as const;

export const TRANSIT_RULES_CONTRACT_STATUS = "rules-contract-only" as const;

export const TRANSIT_RULES_APPROVAL = {
  skyPulseRealTransitRuntime: false,
  natalToTransitRuntime: false,
  reportTransitNarrative: false,
  chartWheelTransitOverlay: false,
  externalTransitApi: false,
  newTransitRuntimeDependency: false,
} as const;

export const TRANSIT_RULES_SCOPE = {
  phaseOneMode: "sky-only-daily-transit-contract" as const,
  deferredMode: "natal-to-transit-personalized-pulse" as const,
  skyPulseCurrentRuntime: "tehran-moon-pulse-placeholder" as const,
  requiredNextMilestone: "transit-calculation-probe-before-sky-pulse-runtime" as const,
} as const;

export const TRANSIT_RULES_TIME_POLICY = {
  defaultPulseTimeZone: "Asia/Tehran" as const,
  dailyBoundary: "target-timezone-local-calendar-day" as const,
  canonicalSampleTime: "12:00:00" as const,
  userBirthTimezoneRequiredBeforeNatalTransit: true,
  noUtcOnlyDailyPulse: true,
} as const;

export const TRANSIT_RULES_PLANET_POLICY = {
  phaseOneBodies: [
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
  ] as const,
  deferredBodies: [
    "uranus",
    "neptune",
    "pluto",
    "lunar-nodes",
    "black-moon-lilith",
    "houses",
    "angles",
  ] as const,
  noLilithTransitInPhaseOne: true,
  noNodeTransitInPhaseOne: true,
} as const;

export const TRANSIT_RULES_ASPECT_POLICY = {
  phaseOneAspects: ["conjunction", "opposition", "trine", "square", "sextile"] as const,
  deferredAspects: ["quincunx", "semi-square", "sesquiquadrate", "minor-aspects"] as const,
  phaseOneOrbDegrees: {
    conjunction: 6,
    opposition: 6,
    trine: 5,
    square: 5,
    sextile: 4,
  } as const,
  moonOrbAdjustmentDegrees: 2,
  noUnboundedOrbs: true,
} as const;

export const TRANSIT_RULES_OUTPUT_BOUNDARIES = {
  noHardcodedSkyPulseClaim: true,
  noPersonalizedNatalTransitUntilConsentAndBirthDataPath: true,
  noPaidPrivateTransitSplitUntilReportPrivacyModel: true,
  noTransitSeoClaimUntilPublicConsentModel: true,
  noReportNarrativeClaimBeforeProbeAndGuards: true,
} as const;

export function getTransitRulesContract() {
  return {
    version: TRANSIT_RULES_CONTRACT_VERSION,
    status: TRANSIT_RULES_CONTRACT_STATUS,
    approval: TRANSIT_RULES_APPROVAL,
    scope: TRANSIT_RULES_SCOPE,
    timePolicy: TRANSIT_RULES_TIME_POLICY,
    planetPolicy: TRANSIT_RULES_PLANET_POLICY,
    aspectPolicy: TRANSIT_RULES_ASPECT_POLICY,
    outputBoundaries: TRANSIT_RULES_OUTPUT_BOUNDARIES,
  } as const;
}
