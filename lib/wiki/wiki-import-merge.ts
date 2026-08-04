import { createHash } from "node:crypto";
import type {
  WikiArticleSnapshot,
  WikiQueueReflowPolicy,
  WikiScheduleSettings,
} from "@/lib/wiki/wiki-cms-types";
import type { WikiQueuePositionCandidate } from "@/lib/wiki/wiki-queue-priority";
import {
  planWikiQueueReflow,
  type WikiQueueLockedJob,
  type WikiQueueReflowPlan,
} from "@/lib/wiki/wiki-queue-reflow";

export type WikiImportMergeCandidate = {
  snapshot: WikiArticleSnapshot;
  snapshotFingerprint: string;
};

export type WikiImportMergePlan = {
  planToken: string;
  packageHash: string;
  previewedAt: string;
  expiresAt: string;
  validArticleCount: number;
  quarantinedArticleCount: number;
  queue: WikiQueueReflowPlan;
};

export function fingerprintWikiImportSnapshot(snapshot: WikiArticleSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}

export function planWikiImportMerge(input: {
  packageHash: string;
  existingCandidates: WikiQueuePositionCandidate[];
  newCandidates: WikiImportMergeCandidate[];
  lockedJobs: WikiQueueLockedJob[];
  publishedStableIds: string[];
  settings: WikiScheduleSettings;
  previousDailyCapacity: number;
  policy: WikiQueueReflowPolicy;
  quarantinedArticleCount: number;
  previewedAt: string;
}): WikiImportMergePlan {
  if (!/^[0-9a-f]{64}$/.test(input.packageHash)) {
    throw new Error("Wiki import package hash is invalid.");
  }
  if (input.newCandidates.length === 0) {
    throw new Error("The Wiki package has no valid articles to merge.");
  }
  const stableIds = new Set(input.existingCandidates.map((item) => item.stableId));
  for (const candidate of input.newCandidates) {
    if (stableIds.has(candidate.snapshot.stableId)) {
      throw new Error(`Wiki merge candidate is already queued: ${candidate.snapshot.stableId}`);
    }
    stableIds.add(candidate.snapshot.stableId);
  }
  const currentLast = input.existingCandidates.reduce(
    (latest, candidate) => Math.max(latest, Date.parse(candidate.currentRunAt)),
    Date.parse(input.previewedAt),
  );
  const synthetic = input.newCandidates.map((candidate, index): WikiQueuePositionCandidate => ({
    jobId: `new:${candidate.snapshot.stableId}`,
    articleId: `new:${candidate.snapshot.stableId}`,
    revisionNumber: candidate.snapshot.contentVersion,
    stableId: candidate.snapshot.stableId,
    title: candidate.snapshot.title,
    articleRole: candidate.snapshot.articleRole,
    contentCluster: candidate.snapshot.contentCluster,
    publicationPriority: candidate.snapshot.publicationPriority,
    dependencyStableIds: candidate.snapshot.relatedArticleIds,
    currentRunAt: new Date(currentLast + (index + 1) * 1_000).toISOString(),
    status: "queued",
    updatedAt: candidate.snapshotFingerprint,
  }));
  const queue = planWikiQueueReflow({
    candidates: [...input.existingCandidates, ...synthetic],
    lockedJobs: input.lockedJobs,
    publishedStableIds: input.publishedStableIds,
    settings: input.settings,
    previousDailyCapacity: input.previousDailyCapacity,
    policy: input.policy,
    previewedAt: input.previewedAt,
  });
  const normalized = {
    packageHash: input.packageHash,
    previewedAt: queue.previewedAt,
    expiresAt: queue.expiresAt,
    validArticleCount: input.newCandidates.length,
    quarantinedArticleCount: input.quarantinedArticleCount,
    queue,
  };
  return {
    planToken: createHash("sha256").update(JSON.stringify({
      packageHash: input.packageHash,
      queuePlanToken: queue.planToken,
      snapshots: input.newCandidates.map((candidate) => ({
        stableId: candidate.snapshot.stableId,
        fingerprint: candidate.snapshotFingerprint,
      })).sort((left, right) => left.stableId.localeCompare(right.stableId, "en")),
    }), "utf8").digest("hex"),
    ...normalized,
  };
}
