export type WikiIndexabilitySeverity = "ok" | "warning" | "blocked";

export type WikiIndexabilityArticleStatus = {
  id: string;
  stableId: string;
  slug: string;
  title: string;
  status: string;
  indexable: boolean;
  publishedAt: string | null;
  scheduledFor: string | null;
  expectedPath: string;
  publicReady: boolean;
  sitemapEligible: boolean;
  canonicalExpected: string;
  severity: WikiIndexabilitySeverity;
  reasons: string[];
  unresolvedInlineTargets: string[];
  pendingInlineTargets: string[];
  outgoing: {
    active: number;
    pending: number;
    disabled: number;
    failed: number;
  };
  incoming: {
    active: number;
    pending: number;
    disabled: number;
    failed: number;
  };
};

export type WikiIndexabilitySummary = {
  totalArticles: number;
  publicReady: number;
  sitemapEligible: number;
  ok: number;
  warning: number;
  blocked: number;
  publicWithoutInbound: number;
  publicBelowInboundTarget: number;
  unresolvedInlineTargets: number;
  pendingInlineTargets: number;
  activeLinks: number;
  pendingLinks: number;
  disabledLinks: number;
  failedLinks: number;
};

export type WikiIndexabilityObservabilityState = {
  generatedAt: string;
  summary: WikiIndexabilitySummary;
  articles: WikiIndexabilityArticleStatus[];
};
