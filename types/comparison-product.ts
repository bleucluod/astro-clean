import type {
  RealEngineSynastryCoverageField,
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
  secondPersonConsentConfirmedAt?: string; // legacy records only
  rawBirthInputStored: false;
};

export type ComparisonPrimaryPattern = HumanFirstDirectionalNarrativeBlock & {
  kind: "supportive" | "tension";
  titleFa: string;
  summaryFa: string;
  contactIds: string[];
  relevanceScore: number;
};

export type ComparisonNarrativeChapterId =
  | "communication"
  | "emotional-security"
  | "attraction-intimacy"
  | "boundaries-commitment"
  | "friction-repair";
export type ComparisonNarrativeChapter = {
  id: ComparisonNarrativeChapterId;
  eyebrow: string;
  title: string;
  ownerContactId: string | null;
  crossReferencePatternId: string | null;
  crossReferencePatternTitle: string | null;
  block: HumanFirstDirectionalNarrativeBlock;
};
export type ComparisonGrowthReading = {
  personASkill: string;
  personBSkill: string;
  cycleToNotice: string;
  practicalStep: string;
  evidence: HumanFirstEvidence[];
};

// HALLEUS_COMPARE_FULL_INTERPRETATION_SLICE2_R5
export type ComparisonInterpretationCoverageState =
  | "interpreted"
  | "technically-explained"
  | "deferred-with-reason"
  | "unavailable-with-reason";

export type ComparisonInterpretationCoverageEntry = {
  field: RealEngineSynastryCoverageField;
  status: ComparisonInterpretationCoverageState;
  chartADataState: "preserved" | "unavailable";
  chartBDataState: "preserved" | "unavailable";
  reasonFa: string | null;
  evidenceIds: string[];
};

export type ComparisonOpeningEvidence = {
  sentenceId: string;
  paragraph: 1 | 2;
  evidenceIds: string[];
};

export type ComparisonContactInterpretation = {
  id: string;
  titleFa: string;
  pointAFactFa: string;
  pointBFactFa: string;
  aspectFa: string;
  importanceFa: string;
  healthyFa: string;
  stressFa: string;
  contextFa: string;
  natalContextFa: string;
  overlayContextFa: string;
  confidenceFa: string;
  evidenceIds: string[];
};

export type ComparisonOverlayInterpretation = {
  id: string;
  directionFa: string;
  titleFa: string;
  meaningFa: string;
  contextFa: string;
  supportiveFa: string;
  stressFa: string;
  confidenceFa: string;
  relatedContactIds: string[];
  evidenceIds: string[];
};

export type ComparisonDeepLayerItem = {
  id: string;
  titleFa: string;
  meaningFa: string;
  relationshipExpressionFa: string;
  supportiveExpressionFa: string;
  stressExpressionFa: string;
  contextualExpressionFa: string;
  confidenceFa: string;
  evidenceIds: string[];
};

export type ComparisonDeepLayer = {
  id: string;
  titleFa: string;
  summaryFa: string;
  items: ComparisonDeepLayerItem[];
};

export type ComparisonNatalContext = {
  chartSide: "a" | "b";
  chartLabel: string;
  summaryFa: string;
  factsFa: string[];
  evidenceIds: string[];
};

export type ComparisonCalculationExplanation = {
  summaryFa: string;
  confidenceFa: string;
  methodNotesFa: string[];
  warningsFa: string[];
};

export type ComparisonFullInterpretation = {
  version: "comparison-full-interpretation-v1";
  fingerprint: string;
  openingParagraphsFa: [string, string];
  openingEvidence: ComparisonOpeningEvidence[];
  contacts: ComparisonContactInterpretation[];
  overlays: ComparisonOverlayInterpretation[];
  deepLayers: ComparisonDeepLayer[];
  natalContexts: [ComparisonNatalContext, ComparisonNatalContext];
  coverage: ComparisonInterpretationCoverageEntry[];
  calculation: ComparisonCalculationExplanation;
};

export type ComparisonReading = {
  overviewFa: string;
  overviewParagraphsFa: [string, string];
  fullInterpretation?: ComparisonFullInterpretation;
  primaryPatterns: ComparisonPrimaryPattern[];
  chapters: ComparisonNarrativeChapter[];
  conversationQuestionsFa: [string, string, string];
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
  generatedAt?: string;
  recordId?: string;
};

export type ComparisonProductFailureCode =
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
