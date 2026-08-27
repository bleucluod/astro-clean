export const WIKI_LINK_SUGGESTION_STATUSES = [
  "suggested",
  "edited",
  "approved",
  "rejected",
  "conflict",
  "applied",
  "verified",
  "rolled_back",
] as const;

export type WikiLinkSuggestionStatus =
  (typeof WIKI_LINK_SUGGESTION_STATUSES)[number];

export type WikiLinkKind =
  | "article"
  | "category"
  | "core"
  | "cta"
  | "related"
  | "breadcrumb"
  | "context";

export type WikiLinkFindingSeverity = "warning" | "error";

export type WikiLinkFindingCode =
  | "OUTGOING_UNDER_MIN"
  | "OUTGOING_OVER_MAX"
  | "INCOMING_UNDER_MIN"
  | "INCOMING_UNDER_TARGET"
  | "INCOMING_OVER_MAX"
  | "MISSING_CORE_LINK"
  | "MULTIPLE_CORE_LINKS"
  | "INVALID_CORE_ROUTE"
  | "BREADCRUMB_ISSUE"
  | "CATEGORY_LINK_OVER_MAX"
  | "SELF_LINK"
  | "DUPLICATE_EDGE"
  | "MISSING_TARGET"
  | "UNPUBLISHED_TARGET"
  | "NOINDEX_TARGET"
  | "ONE_WORD_ARTICLE_ANCHOR"
  | "ONE_WORD_CORE_ANCHOR"
  | "ANCHOR_OUT_OF_BOUNDS"
  | "ARTICLE_CORE_ANCHOR_COLLISION"
  | "NO_NATURAL_PLACEMENT";

export type WikiLinkScanRules = {
  outgoingMin: number;
  outgoingMax: number;
  incomingMin: number;
  incomingTarget: number;
  incomingMax: number;
  breadcrumbRequired: boolean;
  categoryLinkMax: number;
  coreMax: number;
  coreRoutes: string[];
  anchorMinChars: number;
  anchorMaxChars: number;
  oneWordCoreAllowlist: string[];
  excludedStableIds: string[];
  prohibitSelf: boolean;
  prohibitDuplicate: boolean;
  prohibitUnpublishedTargets: boolean;
};

export type WikiLinkArticleInput = {
  id: string;
  stableId: string;
  slug: string;
  title: string;
  shortTitle: string;
  categoryId: string;
  status: string;
  indexable: boolean;
  publishedAt: string | null;
  scheduledFor: string | null;
  deletedAt: string | null;
  contentVersion: number;
  bodyMarkdown: string;
  relatedArticleIds: string[];
  contextLinks: Array<{ label: string; href: string }>;
  callToAction: { label: string; href: string } | null;
};

export type WikiLinkEdge = {
  sourceStableId: string;
  targetStableId: string | null;
  href: string;
  anchor: string;
  kind: WikiLinkKind;
  placement: string;
};

export type WikiLinkFinding = {
  code: WikiLinkFindingCode;
  severity: WikiLinkFindingSeverity;
  sourceStableId: string;
  targetStableId: string | null;
  details: Record<string, unknown>;
};

export type WikiLinkArticleSummary = {
  stableId: string;
  slug: string;
  title: string;
  categoryId: string;
  status: string;
  indexable: boolean;
  incoming: number;
  outgoing: number;
  categoryLinks: number;
  coreDestination: string | null;
  breadcrumbOk: boolean;
  findingCount: number;
  compliant: boolean;
};

export type WikiLinkGraphTargetState =
  | "published"
  | "scheduled"
  | "draft"
  | "noindex"
  | "missing";

export type WikiLinkGraphEdge = {
  sourceStableId: string;
  sourceTitle: string;
  sourceSlug: string;
  sourceStatus: string;
  sourcePath: string | null;
  targetStableId: string;
  targetTitle: string | null;
  targetSlug: string | null;
  targetStatus: string | null;
  targetPath: string | null;
  targetIndexable: boolean | null;
  targetScheduledFor: string | null;
  targetPublishedAt: string | null;
  targetState: WikiLinkGraphTargetState;
  anchor: string;
  href: string;
  placement: string;
};

export type WikiLinkGraphArticle = {
  stableId: string;
  slug: string;
  title: string;
  categoryId: string;
  status: string;
  indexable: boolean;
  publishedAt: string | null;
  scheduledFor: string | null;
  publicReady: boolean;
  bodyOutgoingCount: number;
  bodyIncomingCount: number;
  unresolvedOutgoingCount: number;
  outgoingBodyLinks: WikiLinkGraphEdge[];
  incomingBodyLinks: WikiLinkGraphEdge[];
};

export type WikiLinkGraphState = {
  generatedAt: string;
  scope: "body-only";
  notes: string[];
  summary: {
    totalArticles: number;
    published: number;
    scheduled: number;
    draft: number;
    bodyEdges: number;
    unresolvedOutgoing: number;
    missingTargets: number;
    unpublishedTargets: number;
    noindexTargets: number;
    articlesWithoutIncoming: number;
  };
  articles: WikiLinkGraphArticle[];
};

export type WikiLinkScanKpis = {
  liveArticleCount: number;
  managedArticleCount: number;
  fullyCompliant: number;
  underInlinked: number;
  outgoingOutsideRange: number;
  missingCoreLink: number;
  breadcrumbIssue: number;
  internalTargetIssue: number;
  oneWordViolation: number;
  anchorCollision: number;
  selfLink: number;
  duplicate: number;
  overOrUnderlinked: number;
};

export type WikiLinkScanResult = {
  contextualArticleEdges: WikiLinkEdge[];
  classifiedLinks: WikiLinkEdge[];
  findings: WikiLinkFinding[];
  articles: WikiLinkArticleSummary[];
  kpis: WikiLinkScanKpis;
};

export type WikiLinkSuggestionDraft = {
  sourceStableId: string;
  targetStableId: string;
  sourceContentVersion: number;
  currentAnchor: string;
  proposedAnchor: string;
  currentParagraph: string;
  proposedParagraph: string;
  placement: string;
  reason: string;
  confidence: number;
};

export type WikiLinkSuggestionBuildResult = {
  suggestions: WikiLinkSuggestionDraft[];
  noNaturalPlacementStableIds: string[];
};

export type WikiLinkAdminSuggestion = WikiLinkSuggestionDraft & {
  id: string;
  status: WikiLinkSuggestionStatus;
  sourceBodySha256: string;
  createdAt: string;
  updatedAt: string;
};

export type WikiLinkAdminState = {
  latestScan: {
    id: string;
    triggerKind: string;
    status: string;
    rulesVersion: number;
    articleCount: number;
    edgeCount: number;
    findingCount: number;
    suggestionCount: number;
    createdAt: string;
    completedAt: string | null;
  } | null;
  rules: WikiLinkScanRules & { version: number };
  kpis: WikiLinkScanKpis | null;
  articles: WikiLinkArticleSummary[];
  graph: WikiLinkGraphState;
  findings: WikiLinkFinding[];
  suggestions: WikiLinkAdminSuggestion[];
  detail: {
    article: WikiLinkArticleSummary;
    outgoing: WikiLinkEdge[];
    incoming: WikiLinkEdge[];
    suggestions: WikiLinkAdminSuggestion[];
    findings: WikiLinkFinding[];
  } | null;
};
