import { createHash } from "node:crypto";
import type {
  WikiArticleRole,
  WikiArticleSnapshot,
  WikiBulkSchedulePlan,
  WikiScheduleSettings,
} from "@/lib/wiki/wiki-cms-types";
import { computeWikiScheduleSlots } from "@/lib/wiki/wiki-scheduling";

export const WIKI_BULK_SCHEDULE_MAX_ARTICLES = 100;
export const WIKI_BULK_SCHEDULE_PREVIEW_TTL_MS = 15 * 60 * 1000;

export class WikiBulkScheduleError extends Error {
  readonly status: number;
  readonly code: string;
  readonly articleId?: string;
  readonly dependencyStableId?: string;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    articleId?: string;
    dependencyStableId?: string;
  }) {
    super(input.message);
    this.name = "WikiBulkScheduleError";
    this.status = input.status;
    this.code = input.code;
    this.articleId = input.articleId;
    this.dependencyStableId = input.dependencyStableId;
  }
}

export type WikiBulkScheduleCandidate = {
  articleId: string;
  stableId: string;
  title: string;
  slug: string;
  contentVersion: number;
  publicationPriority: number;
  contentCluster: string;
  articleRole: WikiArticleRole;
  draftUpdatedAt: string;
  snapshotFingerprint: string;
  dependencyStableIds: string[];
};

export type WikiBulkScheduleExistingJob = {
  id: string;
  articleId: string;
  stableId: string;
  runAt: string;
  status: "queued" | "retry" | "running";
  updatedAt: string;
};

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}

export function fingerprintWikiBulkScheduleSnapshot(
  snapshot: WikiArticleSnapshot,
) {
  return createHash("sha256")
    .update(JSON.stringify(snapshot), "utf8")
    .digest("hex");
}

function compareCandidates(
  left: WikiBulkScheduleCandidate,
  right: WikiBulkScheduleCandidate,
  pillarBeforeSupport: boolean,
) {
  if (left.publicationPriority !== right.publicationPriority) {
    return right.publicationPriority - left.publicationPriority;
  }

  if (pillarBeforeSupport && left.articleRole !== right.articleRole) {
    return left.articleRole === "pillar" ? -1 : 1;
  }

  if (left.contentCluster !== right.contentCluster) {
    return left.contentCluster.localeCompare(right.contentCluster, "en");
  }

  return left.stableId.localeCompare(right.stableId, "en");
}

function orderCandidates(
  candidates: WikiBulkScheduleCandidate[],
  pillarBeforeSupport: boolean,
) {
  const selectedStableIds = new Set(
    candidates.map((candidate) => candidate.stableId),
  );
  const remaining = new Map(
    candidates.map((candidate) => [candidate.stableId, candidate]),
  );
  const output: WikiBulkScheduleCandidate[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((candidate) =>
      candidate.dependencyStableIds.every(
        (dependency) =>
          !selectedStableIds.has(dependency) || !remaining.has(dependency),
      ),
    );

    if (ready.length === 0) {
      throw new Error("Wiki bulk schedule dependency graph contains a cycle.");
    }

    ready.sort((left, right) =>
      compareCandidates(left, right, pillarBeforeSupport),
    );

    for (const candidate of ready) {
      remaining.delete(candidate.stableId);
      output.push(candidate);
    }
  }

  return output;
}

export function planWikiBulkSchedule(input: {
  candidates: WikiBulkScheduleCandidate[];
  settings: WikiScheduleSettings;
  existingJobs: WikiBulkScheduleExistingJob[];
  publishedStableIds: string[];
  previewedAt: string;
}): WikiBulkSchedulePlan {
  const previewedAt = new Date(input.previewedAt);
  if (!Number.isFinite(previewedAt.getTime())) {
    throw new Error("Wiki bulk schedule preview timestamp is invalid.");
  }

  if (
    input.candidates.length < 1 ||
    input.candidates.length > WIKI_BULK_SCHEDULE_MAX_ARTICLES
  ) {
    throw new WikiBulkScheduleError({
      status: 422,
      code: "WIKI_SCHEDULING_ARTICLE_INVALID",
      message: `Select between 1 and ${WIKI_BULK_SCHEDULE_MAX_ARTICLES} Wiki articles.`,
    });
  }

  if (input.settings.publishingPaused) {
    throw new WikiBulkScheduleError({
      status: 409,
      code: "WIKI_AUTO_PUBLISH_PAUSED",
      message: "انتشار خودکار ویکی موقتاً متوقف است.",
    });
  }

  const articleIds = new Set<string>();
  const stableIds = new Set<string>();
  for (const candidate of input.candidates) {
    if (articleIds.has(candidate.articleId)) {
      throw new WikiBulkScheduleError({
        status: 422,
        code: "WIKI_SCHEDULING_ARTICLE_INVALID",
        message: "Wiki bulk schedule contains a duplicate article ID.",
        articleId: candidate.articleId,
      });
    }
    if (stableIds.has(candidate.stableId)) {
      throw new WikiBulkScheduleError({
        status: 422,
        code: "WIKI_SCHEDULING_ARTICLE_INVALID",
        message: "Wiki bulk schedule contains a duplicate stable ID.",
        articleId: candidate.articleId,
      });
    }
    articleIds.add(candidate.articleId);
    stableIds.add(candidate.stableId);
  }

  const publishedStableIds = new Set(input.publishedStableIds);
  const scheduledDependencies = new Map(
    input.existingJobs.map((job) => [job.stableId, job]),
  );
  const externalDependencyRunAt = new Map<string, Date>();

  for (const candidate of input.candidates) {
    for (const dependency of candidate.dependencyStableIds) {
      if (
        dependency === candidate.stableId ||
        stableIds.has(dependency) ||
        publishedStableIds.has(dependency)
      ) {
        continue;
      }

      const scheduled = scheduledDependencies.get(dependency);
      const scheduledAt = scheduled ? new Date(scheduled.runAt) : null;
      if (!scheduledAt || !Number.isFinite(scheduledAt.getTime())) {
        throw new WikiBulkScheduleError({
          status: 422,
          code: "WIKI_SCHEDULING_ARTICLE_INVALID",
          message: `Publish dependency first: ${dependency}`,
          articleId: candidate.articleId,
          dependencyStableId: dependency,
        });
      }
      if (scheduledAt.getTime() <= previewedAt.getTime()) {
        throw new WikiBulkScheduleError({
          status: 422,
          code: "WIKI_SCHEDULING_ARTICLE_INVALID",
          message: `Scheduled dependency is no longer pending: ${dependency}`,
          articleId: candidate.articleId,
          dependencyStableId: dependency,
        });
      }
      externalDependencyRunAt.set(dependency, scheduledAt);
    }
  }

  const ordered = orderCandidates(
    input.candidates.map((candidate) => ({
      ...candidate,
      dependencyStableIds: uniqueSorted(
        candidate.dependencyStableIds.filter(
          (dependency) => dependency !== candidate.stableId,
        ),
      ),
    })),
    input.settings.pillarBeforeSupport,
  );

  const notBefore = ordered.map((candidate) => {
    const dependencyTimes = candidate.dependencyStableIds
      .map((dependency) => externalDependencyRunAt.get(dependency))
      .filter((value): value is Date => Boolean(value));
    if (dependencyTimes.length === 0) return null;
    return new Date(Math.max(...dependencyTimes.map((value) => value.getTime())));
  });

  let slots: Date[];
  try {
    slots = computeWikiScheduleSlots({
      settings: input.settings,
      existingRunAt: input.existingJobs.map((job) => job.runAt),
      notBefore,
      count: ordered.length,
      now: previewedAt,
    });
  } catch (error) {
    if (error instanceof WikiBulkScheduleError) throw error;
    throw new WikiBulkScheduleError({
      status: 422,
      code: "WIKI_SCHEDULING_CAPACITY_EXCEEDED",
      message:
        error instanceof Error
          ? error.message
          : "Schedule settings cannot fit the selected articles.",
    });
  }

  const items = ordered.map((candidate, index) => ({
    articleId: candidate.articleId,
    stableId: candidate.stableId,
    title: candidate.title,
    slug: candidate.slug,
    articleRole: candidate.articleRole,
    publicationPriority: candidate.publicationPriority,
    publishAt: slots[index].toISOString(),
  }));

  const normalizedCandidates = input.candidates
    .map((candidate) => ({
      articleId: candidate.articleId,
      stableId: candidate.stableId,
      contentVersion: candidate.contentVersion,
      draftUpdatedAt: candidate.draftUpdatedAt,
      snapshotFingerprint: candidate.snapshotFingerprint,
      dependencyStableIds: uniqueSorted(candidate.dependencyStableIds),
    }))
    .sort((left, right) => left.articleId.localeCompare(right.articleId, "en"));

  const normalizedJobs = input.existingJobs
    .map((job) => ({ ...job }))
    .sort((left, right) => left.id.localeCompare(right.id, "en"));

  const previewedAtIso = previewedAt.toISOString();
  const expiresAt = new Date(
    previewedAt.getTime() + WIKI_BULK_SCHEDULE_PREVIEW_TTL_MS,
  ).toISOString();
  const planToken = createHash("sha256")
    .update(
      JSON.stringify({
        previewedAt: previewedAtIso,
        settings: input.settings,
        publishedStableIds: uniqueSorted(input.publishedStableIds),
        existingJobs: normalizedJobs,
        candidates: normalizedCandidates,
        items,
      }),
      "utf8",
    )
    .digest("hex");

  return {
    planToken,
    previewedAt: previewedAtIso,
    expiresAt,
    items,
  };
}
