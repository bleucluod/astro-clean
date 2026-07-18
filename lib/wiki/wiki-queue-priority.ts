import { createHash } from "node:crypto";
import type { WikiArticleRole } from "@/lib/wiki/wiki-cms-types";

export const WIKI_QUEUE_POSITION_PREVIEW_TTL_MS = 15 * 60 * 1000;

export type WikiQueuePositionCandidate = {
  jobId: string;
  articleId: string;
  revisionNumber: number;
  stableId: string;
  title: string;
  articleRole: WikiArticleRole;
  contentCluster: string;
  publicationPriority: number;
  dependencyStableIds: string[];
  currentRunAt: string;
  status: "queued" | "retry";
  updatedAt: string;
};

export type WikiQueuePositionPlanItem = {
  jobId: string;
  articleId: string;
  revisionNumber: number;
  stableId: string;
  title: string;
  currentPosition: number;
  nextPosition: number;
  currentRunAt: string;
  nextRunAt: string;
  moved: boolean;
};

export type WikiQueuePositionPlan = {
  planToken: string;
  previewedAt: string;
  expiresAt: string;
  targetJobId: string;
  targetUpdatedAt: string;
  requestedPosition: number;
  appliedPosition: number;
  constrained: boolean;
  items: WikiQueuePositionPlanItem[];
};

export type WikiQueueBulkReorderPlanItem = WikiQueuePositionPlanItem & {
  requestedPosition: number;
  dependencyAdjusted: boolean;
  dependencyStableIds: string[];
};

export type WikiQueueBulkReorderPlan = {
  planToken: string;
  previewedAt: string;
  expiresAt: string;
  dependencyAdjustmentCount: number;
  items: WikiQueueBulkReorderPlanItem[];
};

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}

function timestamp(value: string, label: string) {
  const result = Date.parse(value);
  if (!Number.isFinite(result)) {
    throw new Error(`${label} is invalid.`);
  }
  return result;
}

function currentOrder(candidates: WikiQueuePositionCandidate[]) {
  return candidates.slice().sort((left, right) => {
    const timeDifference =
      timestamp(left.currentRunAt, "Wiki queue run time") -
      timestamp(right.currentRunAt, "Wiki queue run time");
    return (
      timeDifference ||
      left.stableId.localeCompare(right.stableId, "en")
    );
  });
}

function validateCandidateSet(
  candidates: WikiQueuePositionCandidate[],
  publishedStableIds: string[],
) {
  if (candidates.length < 1 || candidates.length > 100) {
    throw new Error("Wiki position queue must contain between 1 and 100 jobs.");
  }

  const jobIds = new Set<string>();
  const articleIds = new Set<string>();
  const stableIds = new Set<string>();
  for (const candidate of candidates) {
    if (!["queued", "retry"].includes(candidate.status)) {
      throw new Error("Only queued or retry jobs can change queue position.");
    }
    if (
      jobIds.has(candidate.jobId) ||
      articleIds.has(candidate.articleId) ||
      stableIds.has(candidate.stableId)
    ) {
      throw new Error("Wiki position queue contains duplicate jobs or articles.");
    }
    if (
      !Number.isInteger(candidate.revisionNumber) ||
      candidate.revisionNumber < 1
    ) {
      throw new Error("Wiki position queue revision number is invalid.");
    }
    timestamp(candidate.currentRunAt, "Wiki queue run time");
    jobIds.add(candidate.jobId);
    articleIds.add(candidate.articleId);
    stableIds.add(candidate.stableId);
  }

  const published = new Set(publishedStableIds);
  const missingDependencies = uniqueSorted(
    candidates.flatMap((candidate) =>
      candidate.dependencyStableIds.filter(
        (dependency) =>
          dependency !== candidate.stableId &&
          !stableIds.has(dependency) &&
          !published.has(dependency),
      ),
    ),
  );
  if (missingDependencies.length > 0) {
    throw new Error(
      `Publish dependencies first: ${missingDependencies.join(", ")}`,
    );
  }
}

function normalizeRequestedOrder(input: {
  candidates: WikiQueuePositionCandidate[];
  requestedStableIds: string[];
  pillarBeforeSupport: boolean;
}) {
  const desiredRank = new Map(
    input.requestedStableIds.map((stableId, index) => [stableId, index]),
  );
  const selectedStableIds = new Set(
    input.candidates.map((candidate) => candidate.stableId),
  );
  const remaining = new Map(
    input.candidates.map((candidate) => [candidate.stableId, candidate]),
  );
  const output: WikiQueuePositionCandidate[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((candidate) =>
      candidate.dependencyStableIds.every(
        (dependency) =>
          !selectedStableIds.has(dependency) || !remaining.has(dependency),
      ),
    );
    if (ready.length === 0) {
      throw new Error("Wiki position queue dependency graph contains a cycle.");
    }

    ready.sort((left, right) => {
      if (
        input.pillarBeforeSupport &&
        left.articleRole !== right.articleRole
      ) {
        return left.articleRole === "pillar" ? -1 : 1;
      }
      return (
        (desiredRank.get(left.stableId) ?? Number.MAX_SAFE_INTEGER) -
          (desiredRank.get(right.stableId) ?? Number.MAX_SAFE_INTEGER) ||
        left.stableId.localeCompare(right.stableId, "en")
      );
    });
    const next = ready[0];
    remaining.delete(next.stableId);
    output.push(next);
  }

  return output;
}

export function planWikiQueuePositionMove(input: {
  candidates: WikiQueuePositionCandidate[];
  publishedStableIds: string[];
  pillarBeforeSupport: boolean;
  targetJobId: string;
  targetPosition: number;
  expectedUpdatedAt: string;
  previewedAt: string;
}): WikiQueuePositionPlan {
  const previewedAt = new Date(input.previewedAt);
  if (!Number.isFinite(previewedAt.getTime())) {
    throw new Error("Wiki queue position preview timestamp is invalid.");
  }

  const candidates = input.candidates.map((candidate) => ({
    ...candidate,
    dependencyStableIds: uniqueSorted(
      candidate.dependencyStableIds.filter(
        (dependency) => dependency !== candidate.stableId,
      ),
    ),
  }));
  validateCandidateSet(candidates, input.publishedStableIds);

  if (
    !Number.isInteger(input.targetPosition) ||
    input.targetPosition < 1 ||
    input.targetPosition > candidates.length
  ) {
    throw new Error(
      `Queue position must be between 1 and ${candidates.length}.`,
    );
  }

  const orderedNow = currentOrder(candidates);
  const target = orderedNow.find(
    (candidate) => candidate.jobId === input.targetJobId,
  );
  if (!target) {
    throw new Error("Wiki queue position target was not found.");
  }
  if (
    !input.expectedUpdatedAt ||
    target.updatedAt !== input.expectedUpdatedAt
  ) {
    throw new Error(
      "Wiki queue position target changed after it was loaded.",
    );
  }

  const requested = orderedNow.filter(
    (candidate) => candidate.jobId !== target.jobId,
  );
  requested.splice(input.targetPosition - 1, 0, target);
  const normalized = normalizeRequestedOrder({
    candidates,
    requestedStableIds: requested.map((candidate) => candidate.stableId),
    pillarBeforeSupport: input.pillarBeforeSupport,
  });
  const currentPositionByJob = new Map(
    orderedNow.map((candidate, index) => [candidate.jobId, index + 1]),
  );
  const slots = orderedNow.map((candidate) => candidate.currentRunAt);
  const items = normalized.map((candidate, index) => {
    const currentPosition =
      currentPositionByJob.get(candidate.jobId) ?? index + 1;
    const nextPosition = index + 1;
    return {
      jobId: candidate.jobId,
      articleId: candidate.articleId,
      revisionNumber: candidate.revisionNumber,
      stableId: candidate.stableId,
      title: candidate.title,
      currentPosition,
      nextPosition,
      currentRunAt: candidate.currentRunAt,
      nextRunAt: slots[index],
      moved:
        currentPosition !== nextPosition ||
        candidate.currentRunAt !== slots[index],
    };
  });
  const appliedPosition =
    items.find((item) => item.jobId === target.jobId)?.nextPosition ??
    input.targetPosition;

  const normalizedCandidates = candidates
    .map((candidate) => ({
      jobId: candidate.jobId,
      articleId: candidate.articleId,
      revisionNumber: candidate.revisionNumber,
      stableId: candidate.stableId,
      articleRole: candidate.articleRole,
      contentCluster: candidate.contentCluster,
      publicationPriority: candidate.publicationPriority,
      dependencyStableIds: candidate.dependencyStableIds,
      currentRunAt: candidate.currentRunAt,
      status: candidate.status,
      updatedAt: candidate.updatedAt,
    }))
    .sort((left, right) => left.jobId.localeCompare(right.jobId, "en"));
  const previewedAtIso = previewedAt.toISOString();
  const expiresAt = new Date(
    previewedAt.getTime() + WIKI_QUEUE_POSITION_PREVIEW_TTL_MS,
  ).toISOString();
  const planToken = createHash("sha256")
    .update(
      JSON.stringify({
        previewedAt: previewedAtIso,
        pillarBeforeSupport: input.pillarBeforeSupport,
        publishedStableIds: uniqueSorted(input.publishedStableIds),
        targetJobId: input.targetJobId,
        targetPosition: input.targetPosition,
        expectedUpdatedAt: input.expectedUpdatedAt,
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
    targetJobId: target.jobId,
    targetUpdatedAt: target.updatedAt,
    requestedPosition: input.targetPosition,
    appliedPosition,
    constrained: appliedPosition !== input.targetPosition,
    items,
  };
}

export function planWikiQueueBulkReorder(input: {
  candidates: WikiQueuePositionCandidate[];
  publishedStableIds: string[];
  requestedStableIds: string[];
  previewedAt: string;
}): WikiQueueBulkReorderPlan {
  const previewedAt = new Date(input.previewedAt);
  if (!Number.isFinite(previewedAt.getTime())) {
    throw new Error("Wiki queue bulk reorder preview timestamp is invalid.");
  }
  const candidates = input.candidates.map((candidate) => ({
    ...candidate,
    dependencyStableIds: uniqueSorted(candidate.dependencyStableIds.filter(
      (dependency) => dependency !== candidate.stableId,
    )),
  }));
  validateCandidateSet(candidates, input.publishedStableIds);
  if (input.requestedStableIds.length !== candidates.length) {
    throw new Error("The requested Wiki queue order must include every queued article exactly once.");
  }
  const requestedSet = new Set(input.requestedStableIds);
  if (requestedSet.size !== input.requestedStableIds.length) {
    throw new Error("The requested Wiki queue order contains a duplicate stable ID.");
  }
  const candidateSet = new Set(candidates.map((candidate) => candidate.stableId));
  const unknown = input.requestedStableIds.find((stableId) => !candidateSet.has(stableId));
  if (unknown || candidates.some((candidate) => !requestedSet.has(candidate.stableId))) {
    throw new Error(`The requested Wiki queue order does not match the queue: ${unknown ?? "missing stable ID"}.`);
  }
  const orderedNow = currentOrder(candidates);
  const normalized = normalizeRequestedOrder({
    candidates,
    requestedStableIds: input.requestedStableIds,
    pillarBeforeSupport: false,
  });
  const currentByJob = new Map(orderedNow.map((candidate, index) => [candidate.jobId, index + 1]));
  const requestedByStableId = new Map(input.requestedStableIds.map((stableId, index) => [stableId, index + 1]));
  const slots = orderedNow.map((candidate) => candidate.currentRunAt);
  const items = normalized.map((candidate, index) => {
    const requestedPosition = requestedByStableId.get(candidate.stableId) ?? index + 1;
    return {
      jobId: candidate.jobId,
      articleId: candidate.articleId,
      revisionNumber: candidate.revisionNumber,
      stableId: candidate.stableId,
      title: candidate.title,
      currentPosition: currentByJob.get(candidate.jobId) ?? index + 1,
      nextPosition: index + 1,
      requestedPosition,
      currentRunAt: candidate.currentRunAt,
      nextRunAt: slots[index],
      moved: currentByJob.get(candidate.jobId) !== index + 1 || candidate.currentRunAt !== slots[index],
      dependencyAdjusted: requestedPosition !== index + 1,
      dependencyStableIds: candidate.dependencyStableIds,
    };
  });
  const previewedAtIso = previewedAt.toISOString();
  const expiresAt = new Date(previewedAt.getTime() + WIKI_QUEUE_POSITION_PREVIEW_TTL_MS).toISOString();
  const planToken = createHash("sha256").update(JSON.stringify({
    previewedAt: previewedAtIso,
    requestedStableIds: input.requestedStableIds,
    publishedStableIds: uniqueSorted(input.publishedStableIds),
    candidates: candidates.map((candidate) => ({ ...candidate })).sort((left, right) => left.jobId.localeCompare(right.jobId, "en")),
    items,
  }), "utf8").digest("hex");
  return {
    planToken,
    previewedAt: previewedAtIso,
    expiresAt,
    dependencyAdjustmentCount: items.filter((item) => item.dependencyAdjusted).length,
    items,
  };
}
