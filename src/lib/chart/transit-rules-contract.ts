export const TRANSIT_RULES_CONTRACT_VERSION = "v0.1.246-transit-product-scope-sync" as const;

export const TRANSIT_RULES_CONTRACT_STATUS = "product-scope-contract-only" as const;

export const TRANSIT_RULES_APPROVAL = {
  skyPulseRealTransitRuntime: false,
  natalToTransitRuntime: false,
  reportTransitNarrative: false,
  chartWheelTransitOverlay: false,
  externalTransitApi: false,
  newTransitRuntimeDependency: false,
} as const;

export const TRANSIT_RULES_SCOPE = {
  publicHomepageMode: "public-sky-only-daily-pulse" as const,
  personalReportMode: "personal-natal-to-transit-daily-pulse" as const,
  launchAccessModel: "free-and-no-login-supported" as const,
  skyPulseCurrentRuntime: "tehran-moon-pulse-placeholder" as const,
  requiredNextMilestone: "sky-only-transit-calculation-probe-before-runtime" as const,
  requiredFollowingMilestone: "personal-natal-to-transit-probe-after-sky-only-foundation" as const,
} as const;

export const TRANSIT_RULES_TIME_POLICY = {
  launchAudienceRegion: "iran" as const,
  homepagePulseTimeZone: "Asia/Tehran" as const,
  personalReportTimeZone: "Asia/Tehran" as const,
  userSelectableTimeZoneApproved: false,
  userLocationTimeZoneDeferred: true,
  dailyBoundary: "tehran-local-calendar-day" as const,
  canonicalSampleTime: "12:00:00" as const,
  noUserFacingUtcCopy: true,
  noNonIranLaunchTimezoneClaim: true,
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
    "uranus",
    "neptune",
    "pluto",
  ] as const,
  deferredSpecialPoints: [
    "lunar-nodes",
    "black-moon-lilith",
    "houses",
    "angles",
  ] as const,
  noLilithTransitInPhaseOne: true,
  noNodeTransitInPhaseOne: true,
  noHouseOrAngleTransitInPhaseOne: true,
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

export const TRANSIT_RULES_COPY_POLICY = {
  tone: "technical-plus-inspirational" as const,
  homepagePersianSeoPhrases: [
    "آسمان امروز",
    "ترنزیت امروز",
    "وضعیت آسمان امروز",
    "ترنزیت روزانه",
    "حال و هوای آسمان امروز",
  ] as const,
  personalPersianSeoPhrases: [
    "ترنزیت امروز برای چارت تولد",
    "تأثیر آسمان امروز روی چارت تولد",
    "ترنزیت امروز بر اساس تاریخ تولد",
    "وضعیت امروز چارت تولد من",
  ] as const,
  noFatalisticTransitCopy: true,
  noHardcodedSeoLandingClaimBeforeRuntime: true,
} as const;

export const TRANSIT_RULES_OUTPUT_BOUNDARIES = {
  noHardcodedSkyPulseClaim: true,
  noTransitCalculationBeforeProbe: true,
  noPersonalizedNatalTransitRuntimeBeforeProbe: true,
  noPaidPrivateTransitSplitAtLaunch: true,
  noReportNarrativeClaimBeforeProbeAndGuards: true,
  noDependencyOrApiTransitSource: true,
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
    copyPolicy: TRANSIT_RULES_COPY_POLICY,
    outputBoundaries: TRANSIT_RULES_OUTPUT_BOUNDARIES,
  } as const;
}
