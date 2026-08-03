import type { RealSynastryReport, SynastryBirthTimeStatus, SynastryPattern, SynastryRelationshipContext } from "@/types/synastry-engine";

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

export type ComparisonPrimaryPattern = Pick<
  SynastryPattern,
  "id" | "kind" | "titleFa" | "summaryFa" | "contactIds" | "relevanceScore"
>;

export type ComparisonReading = {
  primaryPatterns: ComparisonPrimaryPattern[];
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
