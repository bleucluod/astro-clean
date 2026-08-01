import type {
  AstrologyReport,
  BirthInput,
  RealEngineReportSnapshot,
} from "./astro";
import type {
  ReportOutputQuality,
  ReportOutputSection,
} from "./report-output";
import type { PersonalTransitReportDataBridge } from "../src/lib/report-output/personal-transit-report-data-bridge";

export const REPORT_GENERATION_CONTRACT_VERSION = "0.1.156" as const;

export type ReportGenerationContractVersion =
  typeof REPORT_GENERATION_CONTRACT_VERSION;

export type ReportGenerationStatus =
  | "real-chart-ready"
  | "real-chart-partial"
  | "fallback-preview"
  | "blocked-invalid-input";

export type ReportCalculationSource =
  | "real-chart-api"
  | "astronomy-engine"
  | "mock-fallback"
  | "manual-import"
  | "unknown";

export type ReportPublicationOwnerKind =
  | "local"
  | "guest"
  | "account"
  | "legacy";

export type ReportAccessTier = "preview" | "free" | "premium";

export type ReportPublicationIntent = "default" | "publish" | "unpublish";

export type ReportPublicationState =
  | "private"
  | "public"
  | "unpublished"
  | "restricted";

export type ReportPublicationConsentState =
  | "not-required"
  | "pending"
  | "granted"
  | "withdrawn";

export type ReportIdentityConsentState = "withheld" | "granted";

export type ReportPublicationPolicyInput = {
  ownerKind: ReportPublicationOwnerKind;
  tier: ReportAccessTier;
  publicationIntent?: ReportPublicationIntent;
  publicationConsentState?: ReportPublicationConsentState;
  identityConsentState?: ReportIdentityConsentState;
  adminRestricted?: boolean;
  legacyRecord?: boolean;
};

export type ReportPublicationPolicy = {
  version: "1";
  ownerKind: ReportPublicationOwnerKind;
  tier: ReportAccessTier;
  publicationState: ReportPublicationState;
  publicationConsentState: ReportPublicationConsentState;
  identityConsentState: ReportIdentityConsentState;
  indexingPolicy: "noindex" | "indexable";
  publiclyReadable: boolean;
  sitemapEligible: boolean;
  identityPublic: boolean;
  reasons: string[];
};

export type GeneratedReportVisibilityKind =
  | "local-private-preview"
  | "free-public-consent-required"
  | "free-public-indexable"
  | "paid-private"
  | "manual-review-private";

export type GeneratedReportIndexingPolicy =
  | "noindex"
  | "index-after-consent"
  | "indexable";

export type GeneratedReportConsent = {
  required: boolean;
  capturedAt: string | null;
  copyVersion: string;
  userFacingSummary: string;
};

export type GeneratedReportVisibility = {
  kind: GeneratedReportVisibilityKind;
  indexingPolicy: GeneratedReportIndexingPolicy;
  nickname: string | null;
  consent: GeneratedReportConsent;
  publicationPolicy: ReportPublicationPolicy;
  notes: string[];
};

export type GeneratedReportSeoDraft = {
  title: string | null;
  description: string | null;
  publicSlug: string | null;
  keywordClusterId: string | null;
  cohortKeys: string[];
  longTailKeywords: string[];
  internalLinkTargets: string[];
};

export type GeneratedReportEngineData<TNormalizedChart = unknown> = {
  source: ReportCalculationSource;
  status: ReportGenerationStatus;
  generatedAt: string;
  realEngineSnapshot: RealEngineReportSnapshot | null;
  normalizedChart: TNormalizedChart | null;
  chartReportEnrichment: unknown | null;
  personalTransitReportData?: PersonalTransitReportDataBridge | null;
  copyBlocks: unknown[];
  limitations: string[];
  warnings: string[];
};

export type ReportGenerationFallback = {
  used: boolean;
  reason: string | null;
  safeUserMessage: string | null;
};

export type GeneratedReportContract<TNormalizedChart = unknown> = {
  contractVersion: ReportGenerationContractVersion;
  generatedAt: string;
  status: ReportGenerationStatus;
  input: BirthInput;
  report: AstrologyReport | null;
  engineData: GeneratedReportEngineData<TNormalizedChart>;
  interpretationSections: ReportOutputSection[];
  outputQuality: ReportOutputQuality | null;
  visibility: GeneratedReportVisibility;
  seoDraft: GeneratedReportSeoDraft;
  fallback: ReportGenerationFallback;
};

export type ReportGenerationInput = {
  input: BirthInput;
  nickname?: string | null;
  requestedVisibility?: GeneratedReportVisibilityKind;
  reportOwnerKind?: Exclude<ReportPublicationOwnerKind, "legacy">;
  reportTier?: ReportAccessTier;
  publicationIntent?: ReportPublicationIntent;
  publicationConsentState?: ReportPublicationConsentState;
  identityConsentState?: ReportIdentityConsentState;
};

export type ReportGenerationSuccess<TNormalizedChart = unknown> = {
  ok: true;
  contract: GeneratedReportContract<TNormalizedChart>;
};

export type ReportGenerationFailure = {
  ok: false;
  status: "blocked-invalid-input";
  message: string;
  issues: string[];
};

export type ReportGenerationResult<TNormalizedChart = unknown> =
  | ReportGenerationSuccess<TNormalizedChart>
  | ReportGenerationFailure;

export function createEmptySeoDraft(): GeneratedReportSeoDraft {
  return {
    title: null,
    description: null,
    publicSlug: null,
    keywordClusterId: null,
    cohortKeys: [],
    longTailKeywords: [],
    internalLinkTargets: [],
  };
}
