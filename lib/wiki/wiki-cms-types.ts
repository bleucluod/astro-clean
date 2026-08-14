import type {
  WikiArticleCallToAction,
  WikiArticleLink,
  WikiArticleSection,
  WikiArticleSource,
} from "@/lib/wiki/wiki-content";

export const WIKI_ARTICLE_STATUSES = [
  "draft",
  "scheduled",
  "published",
  "archived",
] as const;

export type WikiArticleStatus = (typeof WIKI_ARTICLE_STATUSES)[number];
export type WikiArticleRole = "pillar" | "support";
export type WikiImportMode = "auto_schedule" | "review_first" | "merge_queue";

export type WikiQueueReflowPolicy =
  | "preserve"
  | "priority"
  | "balanced_clusters";

export type WikiArticleSnapshot = {
  stableId: string;
  slug: string;
  title: string;
  shortTitle: string;
  seoTitle: string | null;
  metaDescription: string;
  categoryId: string;
  tags: string[];
  summary: string;
  intro: string;
  readingMinutes: number;
  publicationPriority: number;
  contentCluster: string;
  articleRole: WikiArticleRole;
  relatedArticleIds: string[];
  indexable: boolean;
  bodyMarkdown: string;
  keyPoints: string[];
  sections: WikiArticleSection[];
  contextLinks: WikiArticleLink[];
  sources: Array<string | WikiArticleSource>;
  callToAction: WikiArticleCallToAction | null;
  contentVersion: number;
};

export type WikiArticleAdminSummary = {
  id: string;
  stableId: string;
  slug: string;
  title: string;
  categoryId: string;
  status: WikiArticleStatus;
  indexable: boolean;
  contentVersion: number;
  articleRole: WikiArticleRole;
  contentCluster: string | null;
  publicationPriority: number;
  publishedAt: string | null;
  scheduledFor: string | null;
  deletedAt: string | null;
  hasDraft: boolean;
  pendingPublishAt: string | null;
  publishJobId: string | null;
  publishJobStatus: string | null;
  publishJobError: string | null;
  publishJobAttemptCount: number | null;
  publishJobLockedAt: string | null;
  publishJobCompletedAt: string | null;
  publishJobUpdatedAt: string | null;
  publishRevisionNumber?: number | null;
  publishPackageId?: string | null;
  publishPackageName?: string | null;
  // HALLEUS_WIKI_GLOBAL_POSITION_R44
  publishQueuePosition?: number | null;
  publishQueueSize?: number | null;
  updatedAt: string;
};

export type WikiArticleAdminPage = {
  articles: WikiArticleAdminSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
export type WikiPublicationJobView =
  | "active"
  | "failed"
  | "published"
  | "canceled";

export type WikiPublicationJobStatusFilter =
  | "all"
  | "queued"
  | "running"
  | "retry"
  | "failed"
  | "published"
  | "canceled";

export type WikiPublicationControlSummary = {
  activeTotal: number;
  queued: number;
  running: number;
  retrying: number;
  failed: number;
  nextJob: {
    id: string;
    articleId: string;
    stableId: string;
    title: string;
    runAt: string;
  } | null;
  queueEndAt: string | null;
  publishingPaused: boolean;
};

export type WikiPublicationPackageProgress = {
  packageId: string;
  packageName: string;
  total: number;
  active: number;
  published: number;
  failed: number;
  canceled: number;
  firstRunAt: string | null;
  lastRunAt: string | null;
};

export type WikiPublicationJobsPage = WikiArticleAdminPage & {
  view: WikiPublicationJobView;
  statusFilter: WikiPublicationJobStatusFilter;
  packageId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  visibleCount: number;
  expectedPageCount: number;
  summary: WikiPublicationControlSummary;
  todayTimeline: WikiArticleAdminSummary[];
  tomorrowTimeline: WikiArticleAdminSummary[];
  packages: WikiPublicationPackageProgress[];
};

export type WikiAdminPreviewData = {
  snapshot: WikiArticleSnapshot;
  internalLinkTargets: Record<string, { slug: string; label: string }>;
};


export type WikiContentGuideArticle = {
  stableId: string;
  slug: string;
  title: string;
  categoryId: string;
  status: WikiArticleStatus;
  contentVersion: number;
  articleRole: WikiArticleRole;
  contentCluster: string | null;
  publicationPriority: number;
  deletedAt: string | null;
};

export type WikiContentGuideQueueItem = {
  stableId: string;
  title: string;
  articleRole: WikiArticleRole;
  contentCluster: string | null;
  publicationPriority: number;
  runAt: string;
  jobStatus: "queued" | "running" | "retry" | "failed";
};

export type WikiRevisionSummary = {
  revisionNumber: number;
  status: "draft" | "scheduled" | "published" | "superseded" | "quarantined";
  changeNote: string | null;
  createdBy: string | null;
  createdAt: string;
  publishedAt: string | null;
  snapshot: WikiArticleSnapshot;
};

export type WikiScheduleSettings = {
  articlesPerWeek: number;
  maxArticlesPerDay: number;
  allowedWeekdays: number[];
  publishTime: string;
  timezone: string;
  minimumIntervalHours: number;
  blackoutDates: string[];
  pillarBeforeSupport: boolean;
  maxHorizonDays: number;
  publishingPaused: boolean;
};

export type WikiBulkSchedulePlanItem = {
  articleId: string;
  stableId: string;
  title: string;
  slug: string;
  articleRole: WikiArticleRole;
  publicationPriority: number;
  publishAt: string;
};

export type WikiBulkSchedulePlan = {
  planToken: string;
  previewedAt: string;
  expiresAt: string;
  items: WikiBulkSchedulePlanItem[];
};

export type WikiPackageArticleManifest = {
  article_id: string;
  version: number;
  file: string;
  title: string;
  slug: string;
  seo_title: string;
  meta_description: string;
  category: string;
  tags: string[];
  summary: string;
  reading_minutes: number;
  publication_priority: number;
  content_cluster: string;
  article_role: WikiArticleRole;
  related_article_ids: string[];
  indexable: boolean;
  short_title?: string;
  sources?: Array<string | WikiArticleSource>;
  call_to_action?: WikiArticleCallToAction;
};

export type WikiPackageManifest = {
  schema_version: 1;
  package_id: string;
  articles: WikiPackageArticleManifest[];
  assets?: Array<{
    path: string;
    alt: string;
  }>;
};

export type ValidatedWikiPackage = {
  fileName: string;
  packageHash: string;
  manifest: WikiPackageManifest;
  articles: Array<{
    manifest: WikiPackageArticleManifest;
    snapshot: WikiArticleSnapshot;
    assetPaths: string[];
  }>;
  quarantinedArticles: Array<{
    manifest: WikiPackageArticleManifest;
    errors: string[];
  }>;
  assets: Array<{
    path: string;
    alt: string;
    bytes: Uint8Array;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    contentHash: string;
  }>;
};

// HALLEUS_WIKI_IMPORT_PREVIEW_TYPES_R62
export type WikiImportPreviewPlan = {
  planToken: string;
  previewedAt: string;
  expiresAt: string;
  packageHash: string;
  packageName: string;
  mode: "auto_schedule" | "review_first";
  articleCount: number;
  validArticleCount: number;
  quarantinedArticleCount: number;
  assetCount: number;
  createCount: number;
  updateCount: number;
  firstScheduledFor: string | null;
  lastScheduledFor: string | null;
  items: Array<{
    stableId: string;
    title: string;
    operation: "create" | "update" | "quarantine";
    resultStatus: "drafted" | "scheduled" | "quarantined";
    scheduledFor?: string;
    errors: string[];
  }>;
};

export type WikiImportResult = {
  packageId: string;
  status: "imported" | "partially_imported" | "rejected";
  articleCount: number;
  importedCount: number;
  quarantinedCount: number;
  items: Array<{
    stableId: string;
    status: "drafted" | "scheduled" | "quarantined";
    articleId?: string;
    scheduledFor?: string;
    errors: string[];
  }>;
};

export type WikiImportPackageSummary = {
  packageId: string;
  packageName: string;
  importMode: WikiImportMode;
  importStatus: string;
  articleCount: number;
  importedCount: number;
  quarantinedCount: number;
  createdAt: string;
  completedAt: string | null;
  current: {
    published: number;
    scheduled: number;
    draft: number;
    archived: number;
    missing: number;
    deleted: number;
    openDrafts: number;
  };
};
