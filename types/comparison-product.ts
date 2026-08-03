import type {
  RealSynastryReport,
  SynastryBirthTimeStatus,
  SynastryRelationshipContext,
} from "@/types/synastry-engine";
import type {
  HumanFirstDirectionalNarrativeBlock,
  HumanFirstEvidence,
} from "@/types/human-first-reading";

export const COMPARISON_PRODUCT_VERSION = "comparison-product-v1" as const;
export const COMPARISON_PRIVACY_VERSION = "comparison-private-v1" as const;

export type ComparisonProductVersion = typeof COMPARISON_PRODUCT_VERSION;

export type ComparisonPrivacy = {
  version: typeof COMPARISON_PRIVACY_VERSION;
  visibility: "private";
  indexingPolicy: "noindex";
  secondPersonConsentConfirmedAt: string;
  rawBirthInputStored: false;
};

export type ComparisonPrimaryPattern = HumanFirstDirectionalNarrativeBlock & {
  kind: "supportive" | "tension";
  titleFa: string;
  summaryFa: string;
  contactIds: string[];
  relevanceScore: number;
};

export type ComparisonGrowthReading = {
  personASkill: string;
  personBSkill: string;
  cycleToNotice: string;
  practicalStep: string;
  evidence: HumanFirstEvidence[];
};

export type ComparisonReading = {
  overviewFa: string;
  primaryPatterns: ComparisonPrimaryPattern[];
  support: HumanFirstDirectionalNarrativeBlock;
  misunderstanding: HumanFirstDirectionalNarrativeBlock;
  communication: HumanFirstDirectionalNarrativeBlock;
  emotionalSecurity: HumanFirstDirectionalNarrativeBlock;
  closenessIndependence: HumanFirstDirectionalNarrativeBlock;
  boundariesCommitment: HumanFirstDirectionalNarrativeBlock;
  frictionRepair: HumanFirstDirectionalNarrativeBlock;
  growth: ComparisonGrowthReading;
  readingLimitFa: string;
  supportiveFa: string;
  frictionFa: string;
  communicationFa: string;
  emotionalSecurityFa: string;
  closenessIndependenceFa: string;
  boundariesRepairFa: string;
};

export type ComparisonRecord = {
  version: ComparisonProductVersion;
  id: string;
  createdAt: string;
  updatedAt: string;
  relationshipContext: SynastryRelationshipContext;
  chartAId: string;
  chartBId: string;
  chartALabel: string;
  chartBLabel: string;
  chartABirthTimeStatus: SynastryBirthTimeStatus;
  chartBBirthTimeStatus: SynastryBirthTimeStatus;
  privacy: ComparisonPrivacy;
  report: RealSynastryReport;
  reading: ComparisonReading;
};

export type CreateComparisonInput = {
  chartAId: string;
  chartBId: string;
  chartALabel?: string | null;
  chartBLabel?: string | null;
  chartABirthTimeStatus: SynastryBirthTimeStatus;
  chartBBirthTimeStatus: SynastryBirthTimeStatus;
  relationshipContext: SynastryRelationshipContext;
  secondPersonConsentConfirmed: boolean;
  generatedAt?: string;
  recordId?: string;
};

export type ComparisonProductFailureCode =
  | "consent-required"
  | "same-chart"
  | "chart-a-missing-engine"
  | "chart-b-missing-engine"
  | "synastry-failed";

export type CreateComparisonResult =
  | { ok: true; record: ComparisonRecord }
  | {
      ok: false;
      code: ComparisonProductFailureCode;
      message: string;
      issues: string[];
    };

export type ComparisonStorageResult =
  | { ok: true; records: ComparisonRecord[] }
  | { ok: false; message: string };
