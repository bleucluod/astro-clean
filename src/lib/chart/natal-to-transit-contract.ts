import type {
  SkyOnlyTransitAspectId,
  SkyOnlyTransitBodyId,
} from "./sky-only-transit-probe";

export const NATAL_TO_TRANSIT_CONTRACT_VERSION =
  "v0.1.252-natal-to-transit-contract" as const;

export const NATAL_TO_TRANSIT_CONTRACT_STATUS =
  "contract-synced-with-visible-report-section" as const;

export const NATAL_TO_TRANSIT_CONTRACT_MODE =
  "personal-report-daily-natal-to-transit" as const;

export type NatalToTransitMilestoneStage =
  | "not-started"
  | "foundation-contract"
  | "calculation-probe"
  | "data-bridge"
  | "user-visible"
  | "hardened";

export type NatalToTransitBodyId = SkyOnlyTransitBodyId;

export type NatalToTransitAspectId = SkyOnlyTransitAspectId;

export const NATAL_TO_TRANSIT_STAGE_POLICY = {
  publicSkyPulseStage: "user-visible-and-hardened",
  personalTransitStage: "user-visible" satisfies NatalToTransitMilestoneStage,
  scopeDecisionDone: true,
  contractDone: true,
  currentResidenceCorrectionDone: true,
  calculationProbeDone: true,
  dataBridgeDone: true,
  userVisibleDone: true,
  hardenedDone: false,
} as const;

export const NATAL_TO_TRANSIT_TIME_POLICY = {
  launchAudienceRegion: "iran",
  publicHomepagePulseTimeZone: "Asia/Tehran",
  natalChartLocationSource: "user-birth-place-and-birth-time",
  transitLocationSource: "user-current-residence",
  personalTransitLocationPolicy:
    "birth-place-for-natal-current-residence-for-transit",
  currentResidenceInputRequired: true,
  currentResidenceTimeZonePolicy: "iran-current-residence-timezone-for-launch",
  dailyBoundary: "current-residence-local-calendar-day",
  currentSkySamplePolicy: "current-residence-local-day-sample",
  noSilentTehranDefaultForPersonalTransit: true,
  missingCurrentResidencePolicy:
    "return-missing-current-residence-state-before-personal-precision",
  nonIranCurrentResidenceDeferred: true,
  noNonIranLaunchTimezoneClaim: true,
} as const;

export const NATAL_TO_TRANSIT_BODY_POLICY = {
  transitBodies: [
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
  ] satisfies NatalToTransitBodyId[],
  natalBodies: [
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
  ] satisfies NatalToTransitBodyId[],
  deferredTransitSpecialPoints: [
    "lunar-nodes",
    "black-moon-lilith",
    "houses",
    "angles",
  ],
  noLilithTransitInPhaseOne: true,
  noNodeTransitInPhaseOne: true,
  noHouseOrAngleTransitInPhaseOne: true,
} as const;

export const NATAL_TO_TRANSIT_ASPECT_POLICY = {
  aspects: [
    "conjunction",
    "opposition",
    "trine",
    "square",
    "sextile",
  ] satisfies NatalToTransitAspectId[],
  boundedOrbsRequired: true,
  noUnboundedOrAdHocAspects: true,
  orbPolicySource: "same-phase-one-transit-aspect-policy-until-probe-qa",
} as const;

export const NATAL_TO_TRANSIT_DATA_POLICY = {
  requiresUserEnteredBirthInput: true,
  requiresRealNatalChart: true,
  comparesCurrentTransitBodiesToNatalBodies: true,
  mustUseCalculatedCurrentSkyTransit: true,
  mustUseCalculatedNatalChartPositions: true,
  noStaticDailyPersonalClaim: true,
  noPersonalTransitFromSkyOnlyAspectAlone: true,
  reportDataBridgeAfterProbe: true,
  personalTransitReportDataPath: "engineData.personalTransitReportData",
  visibleReportSectionAfterDataBridge: true,
  requiresCurrentResidenceInput: true,
  noSilentTehranDefaultForPersonalTransit: true,
} as const;

export const NATAL_TO_TRANSIT_ACCESS_POLICY = {
  launchAccessModel: "free-and-no-login-supported",
  accountRequiredForLaunch: false,
  paymentRequiredForLaunch: false,
  paidPrivateTransitSegmentationDeferred: true,
  storageAndIndexingPolicyUnchangedInThisMilestone: true,
  noNewConsentFlowInThisMilestone: true,
} as const;

export const NATAL_TO_TRANSIT_COPY_POLICY = {
  publicLabel: "آسمان امروز نسبت به چارت تولد تو",
  seoPhrases: [
    "ترنزیت امروز برای چارت تولد",
    "تأثیر آسمان امروز روی چارت تولد",
    "آسمان امروز نسبت به چارت تولد تو",
    "ترنزیت روزانه چارت تولد",
  ],
  tone: "technical-plus-inspirational",
  noScaryCopy: true,
  noFatalisticCopy: true,
  noDeterministicPrediction: true,
  noMedicalFinancialOrLegalAdvice: true,
} as const;

export const NATAL_TO_TRANSIT_APPROVAL = {
  contractApproved: true,
  calculationProbeApproved: true,
  runtimeApproved: false,
  reportDataBridgeApproved: true,
  visibleReportSectionApproved: true,
  homepageRouteChangeApproved: false,
  accountPaymentChangeApproved: false,
  externalTransitApiApproved: false,
  newRuntimeDependencyApproved: false,
  currentResidenceProbeApproved: true,
  userLocationOrNonIranTimezoneApproved: false,
} as const;

export const NATAL_TO_TRANSIT_COMPLETED_MILESTONE_HISTORY = {
  calculationProbe: {
    completedMilestone: "v0.1.253-natal-to-transit-calculation-probe",
    preservedAfterDataBridge: true,
  },
  reportDataBridge: {
    completedMilestone: "v0.1.255-personal-transit-first-visible-report-section",
  },
  visibleReportSection: {
    completedMilestone: "v0.1.255-personal-transit-first-visible-report-section",
  },
} as const;

export const NATAL_TO_TRANSIT_NEXT_STEPS = {
  completedMilestone: "v0.1.254-personal-transit-report-data-bridge",
  completedMilestonePurpose:
    "show the first guarded personal transit section inside the report from engineData.personalTransitReportData",
  nextMilestone: "post-v0.1.255-report-depth-and-synthesis",
  followingMilestone: "public-private-consent-and-seo-after-core-report-depth",
  visibleMilestone: "v0.1.255-personal-transit-first-visible-report-section",
} as const;

export type NatalToTransitContract = {
  version: typeof NATAL_TO_TRANSIT_CONTRACT_VERSION;
  status: typeof NATAL_TO_TRANSIT_CONTRACT_STATUS;
  mode: typeof NATAL_TO_TRANSIT_CONTRACT_MODE;
  stage: typeof NATAL_TO_TRANSIT_STAGE_POLICY;
  timePolicy: typeof NATAL_TO_TRANSIT_TIME_POLICY;
  bodyPolicy: typeof NATAL_TO_TRANSIT_BODY_POLICY;
  aspectPolicy: typeof NATAL_TO_TRANSIT_ASPECT_POLICY;
  dataPolicy: typeof NATAL_TO_TRANSIT_DATA_POLICY;
  accessPolicy: typeof NATAL_TO_TRANSIT_ACCESS_POLICY;
  copyPolicy: typeof NATAL_TO_TRANSIT_COPY_POLICY;
  approval: typeof NATAL_TO_TRANSIT_APPROVAL;
  completedMilestoneHistory: typeof NATAL_TO_TRANSIT_COMPLETED_MILESTONE_HISTORY;
  nextSteps: typeof NATAL_TO_TRANSIT_NEXT_STEPS;
};

export function getNatalToTransitContract(): NatalToTransitContract {
  return {
    version: NATAL_TO_TRANSIT_CONTRACT_VERSION,
    status: NATAL_TO_TRANSIT_CONTRACT_STATUS,
    mode: NATAL_TO_TRANSIT_CONTRACT_MODE,
    stage: NATAL_TO_TRANSIT_STAGE_POLICY,
    timePolicy: NATAL_TO_TRANSIT_TIME_POLICY,
    bodyPolicy: NATAL_TO_TRANSIT_BODY_POLICY,
    aspectPolicy: NATAL_TO_TRANSIT_ASPECT_POLICY,
    dataPolicy: NATAL_TO_TRANSIT_DATA_POLICY,
    accessPolicy: NATAL_TO_TRANSIT_ACCESS_POLICY,
    copyPolicy: NATAL_TO_TRANSIT_COPY_POLICY,
    approval: NATAL_TO_TRANSIT_APPROVAL,
    completedMilestoneHistory: NATAL_TO_TRANSIT_COMPLETED_MILESTONE_HISTORY,
    nextSteps: NATAL_TO_TRANSIT_NEXT_STEPS,
  };
}
