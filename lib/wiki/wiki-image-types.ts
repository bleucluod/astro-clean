export const WIKI_IMAGE_STYLE_VERSION = "halleus-home-chart-live-2026-08-15-v1";
export const WIKI_IMAGE_MAX_BATCH = 5;
export const WIKI_IMAGE_MAX_ATTEMPTS = 10;

export const WIKI_IMAGE_VARIANTS = [
  { width: 480, height: 270, maxBytes: 15_000 },
  { width: 768, height: 432, maxBytes: 30_000 },
  { width: 1200, height: 675, maxBytes: 50_000 },
] as const;

export type WikiImageState = "NO_IMAGE" | "DRAFT_IMAGE" | "READY" | "NEEDS_RETRY" | "REJECTED";
export type WikiImageStoredState = Exclude<WikiImageState, "NO_IMAGE">;
export type WikiImageAltState = "draft" | "reviewed";

export type WikiImageVariant = {
  width: number;
  height: number;
  url: string;
  storagePath: string;
  mimeType: "image/webp";
  byteSize: number;
  contentHash: string;
  perceptualHash: string;
};

export type WikiDedicatedImage = {
  state: "READY";
  alt: string;
  caption: string | null;
  width: 1200;
  height: 675;
  mimeType: "image/webp";
  url: string;
  srcSet: string;
  focalX: number;
  focalY: number;
};

export type WikiImageArticleRow = {
  articleId: string;
  stableId: string;
  slug: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
  status: string;
  indexable: boolean;
  publicationPriority: number;
  publishAt: string | null;
  state: WikiImageState;
  revision: number | null;
  altFa: string | null;
  altState: WikiImageAltState | null;
  caption: string | null;
  provenance: Record<string, unknown> | null;
  focalX: number | null;
  focalY: number | null;
  warnings: string[];
  assetId: string | null;
  imageUrl: string | null;
  variants: WikiImageVariant[];
  updatedAt: string | null;
};

export type WikiImageLibraryUsage = {
  stableId: string;
  title: string;
  state: WikiImageStoredState;
};

export type WikiImageLibraryAsset = {
  id: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  alt: string;
  createdAt: string;
  deletedAt: string | null;
  variants: WikiImageVariant[];
  variantCount: number;
  imageUrl: string | null;
  usedBy: WikiImageLibraryUsage[];
  bodyReferenceCount: number;
  usageCount: number;
};

export type WikiImageBatchItemSummary = {
  stableId: string;
  slug: string;
  title: string;
  status: string;
  attemptCount: number;
};

export type WikiImageBatchSummary = {
  id: string;
  batchNumber: string;
  status: string;
  articleCount: number;
  attemptCount: number;
  styleSnapshotVersion: string;
  createdAt: string;
  updatedAt: string;
  items: WikiImageBatchItemSummary[];
};

export type WikiImageReturnManifestItem = {
  stableId: string;
  slug: string;
  filename: string;
  mime: "image/webp";
  width: 1200;
  height: 675;
  bytes: number;
  checksum: string;
  briefVersion: number;
  provenance: Record<string, unknown>;
  altFaDraft: string;
  altState: "draft";
  focal?: { x: number; y: number };
  notes?: string;
  status: "READY" | "NEEDS_RETRY";
  visualQa?: {
    cropOk: boolean;
    noUnintendedText: boolean;
    noWatermark: boolean;
    noArtifacts: boolean;
    geometryOk: boolean;
    relevanceOk: boolean;
    compressionOk: boolean;
  };
};

export type WikiImageReturnManifest = {
  schemaVersion: 1;
  batchId: string;
  styleSnapshotVersion: string;
  attemptsTotal: number;
  items: WikiImageReturnManifestItem[];
};