import type {
  SkyOnlyTransitAspectId,
  SkyOnlyTransitBodyId,
} from "./sky-only-transit-probe";

export const NATAL_TO_TRANSIT_CONTRACT_VERSION =
  "v0.1.252-natal-to-transit-contract" as const;

export const NATAL_TO_TRANSIT_CONTRACT_STATUS =
  "contract-only-no-calculation-runtime" as const;

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
  personalTransitStage: "foundation-contract" satisfies NatalToTransitMilestoneStage,
  scopeDecisionDone: true,
  contractDone: true,
  calculationProbeDone: false,
  dataBridgeDone: false,
  userVisibleDone: false,
  hardenedDone: false,
} as const;

export const NATAL_TO_TRANSIT_TIME_POLICY = {
  launchAudienceRegion: "iran",
  personalReportTimeZone: "Asia/Tehran",
  dailyBoundary: "tehran-local-calendar-day",
  currentSkySamplePolicy: "reuse-public-sky-pulse-tehran-local-day",
  userSelectableTimeZoneApproved: false,
  userLocationTimeZoneDeferred: true,
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
  noReportDataBridgeBeforeProbe: true,
  noVisibleReportSectionBeforeDataBridge: true,
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
  calculationProbeApproved: false,
  runtimeApproved: false,
  reportDataBridgeApproved: false,
  visibleReportSectionApproved: false,
  homepageRouteChangeApproved: false,
  accountPaymentChangeApproved: false,
  externalTransitApiApproved: false,
  newRuntimeDependencyApproved: false,
  userLocationOrNonIranTimezoneApproved: false,
} as const;

export const NATAL_TO_TRANSIT_NEXT_STEPS = {
  nextMilestone: "v0.1.253-natal-to-transit-calculation-probe",
  nextMilestonePurpose:
    "calculate bounded aspects between the real current Tehran sky and a real natal chart snapshot without adding report UI",
  followingMilestone: "v0.1.254-personal-transit-report-data-bridge",
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
    nextSteps: NATAL_TO_TRANSIT_NEXT_STEPS,
  };
}
