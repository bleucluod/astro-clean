import { createHash } from "node:crypto";
import type {
  WikiQueueReflowPolicy,
  WikiScheduleSettings,
} from "@/lib/wiki/wiki-cms-types";
import { computeWikiScheduleSlots } from "@/lib/wiki/wiki-scheduling";
import type { WikiQueuePositionCandidate } from "@/lib/wiki/wiki-queue-priority";

export const WIKI_QUEUE_REFLOW_PREVIEW_TTL_MS = 15 * 60 * 1000;

export type WikiQueueLockedJob = {
  jobId: string;
  stableId: string;
  runAt: string;
  status: "running" | "failed";
};

export type WikiQueueReflowPlanItem = {
  jobId: string;
  articleId: string;
  stableId: string;
  title: string;
  currentRunAt: string;
  nextRunAt: string;
  moved: boolean;
};

export type WikiQueueReflowPlan = {
  planToken: string;
  previewedAt: string;
  expiresAt: string;
  policy: WikiQueueReflowPolicy;
  previousDailyCapacity: number;
  nextDailyCapacity: number;
  totalFutureJobs: number;
  firstRunAt: string | null;
  previousLastRunAt: string | null;
  nextLastRunAt: string | null;
  movedCount: number;
  unchangedCount: number;
  lockedJobs: WikiQueueLockedJob[];
  dependencyErrors: string[];
  blackoutConflicts: string[];
  horizonConflicts: string[];
  items: WikiQueueReflowPlanItem[];
};

export type WikiQueueReflowSnapshotItem = {
  jobId: string;
  articleId: string;
  stableId: string;
  runAt: string;
};

export type WikiQueueReflowUndoPlan = {
  planToken: string;
  sourcePlanToken: string;
  previewedAt: string;
  expiresAt: string;
  restorableCount: number;
  skippedCount: number;
  conflicts: string[];
  items: WikiQueueReflowPlanItem[];
};

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function orderCandidates(
  candidates: WikiQueuePositionCandidate[],
  policy: WikiQueueReflowPolicy,
  pillarBeforeSupport: boolean,
) {
  const selected = new Set(candidates.map((candidate) => candidate.stableId));
  const remaining = new Map(candidates.map((candidate) => [candidate.stableId, candidate]));
  const currentRank = new Map(
    candidates
      .slice()
      .sort((left, right) => Date.parse(left.currentRunAt) - Date.parse(right.currentRunAt))
      .map((candidate, index) => [candidate.stableId, index]),
  );
  const clusterUse = new Map<string, number>();
  const output: WikiQueuePositionCandidate[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((candidate) =>
      candidate.dependencyStableIds.every(
        (dependency) => !selected.has(dependency) || !remaining.has(dependency),
      ),
    );
    if (ready.length === 0) {
      throw new Error("Wiki queue dependency graph contains a cycle.");
    }
    ready.sort((left, right) => {
      // HALLEUS_WIKI_PRIORITY_REFLOW_ORDER_R58
      // For the explicit priority policy, semantic publication priority must
      // outrank pillar/support preference. Dependencies remain the hard gate
      // because only ready candidates reach this comparator.
      if (policy === "priority") {
        return right.publicationPriority - left.publicationPriority ||
          (pillarBeforeSupport && left.articleRole !== right.articleRole
            ? left.articleRole === "pillar" ? -1 : 1
            : 0) ||
          (currentRank.get(left.stableId) ?? 0) - (currentRank.get(right.stableId) ?? 0);
      }
      if (pillarBeforeSupport && left.articleRole !== right.articleRole) {
        return left.articleRole === "pillar" ? -1 : 1;
      }
      if (policy === "balanced_clusters") {
        return (clusterUse.get(left.contentCluster) ?? 0) -
            (clusterUse.get(right.contentCluster) ?? 0) ||
          right.publicationPriority - left.publicationPriority ||
          (currentRank.get(left.stableId) ?? 0) - (currentRank.get(right.stableId) ?? 0);
      }
      return (currentRank.get(left.stableId) ?? 0) - (currentRank.get(right.stableId) ?? 0);
    });
    const next = ready[0];
    remaining.delete(next.stableId);
    clusterUse.set(next.contentCluster, (clusterUse.get(next.contentCluster) ?? 0) + 1);
    output.push(next);
  }
  return output;
}

export function planWikiQueueReflow(input: {
  candidates: WikiQueuePositionCandidate[];
  lockedJobs: WikiQueueLockedJob[];
  publishedStableIds: string[];
  settings: WikiScheduleSettings;
  previousDailyCapacity: number;
  policy: WikiQueueReflowPolicy;
  previewedAt: string;
}): WikiQueueReflowPlan {
  const previewedAt = new Date(input.previewedAt);
  if (!Number.isFinite(previewedAt.getTime())) {
    throw new Error("Wiki queue reflow preview timestamp is invalid.");
  }
  if (input.candidates.length === 0) {
    throw new Error("No queued or retry Wiki jobs are available for reflow.");
  }
  const stableIds = new Set(input.candidates.map((candidate) => candidate.stableId));
  const published = new Set(input.publishedStableIds);
  const locked = new Set(input.lockedJobs.map((job) => job.stableId));
  const dependencyErrors = uniqueSorted(input.candidates.flatMap((candidate) =>
    candidate.dependencyStableIds.filter((dependency) =>
      dependency !== candidate.stableId &&
      !stableIds.has(dependency) &&
      !published.has(dependency) &&
      !locked.has(dependency),
    ),
  ));
  if (dependencyErrors.length > 0) {
    return buildConflictPlan(input, previewedAt, dependencyErrors);
  }
  const ordered = orderCandidates(
    input.candidates,
    input.policy,
    input.settings.pillarBeforeSupport,
  );
  let slots: Date[];
  try {
    slots = computeWikiScheduleSlots({
      settings: input.settings,
      existingRunAt: input.lockedJobs.map((job) => job.runAt),
      count: ordered.length,
      now: previewedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wiki queue could not fit the schedule.";
    return buildConflictPlan(input, previewedAt, [], message);
  }
  const items = ordered.map((candidate, index) => ({
    jobId: candidate.jobId,
    articleId: candidate.articleId,
    stableId: candidate.stableId,
    title: candidate.title,
    currentRunAt: candidate.currentRunAt,
    nextRunAt: slots[index].toISOString(),
    moved: candidate.currentRunAt !== slots[index].toISOString(),
  }));
  return finalizePlan(input, previewedAt, items, [], []);
}

function buildConflictPlan(
  input: Parameters<typeof planWikiQueueReflow>[0],
  previewedAt: Date,
  dependencyErrors: string[],
  schedulingError?: string,
) {
  const horizonConflicts = schedulingError ? [schedulingError] : [];
  return finalizePlan(input, previewedAt, [], dependencyErrors, horizonConflicts);
}

function finalizePlan(
  input: Parameters<typeof planWikiQueueReflow>[0],
  previewedAt: Date,
  items: WikiQueueReflowPlanItem[],
  dependencyErrors: string[],
  horizonConflicts: string[],
): WikiQueueReflowPlan {
  const currentTimes = input.candidates.map((candidate) => candidate.currentRunAt).sort();
  const previewedAtIso = previewedAt.toISOString();
  const base = {
    previewedAt: previewedAtIso,
    expiresAt: new Date(previewedAt.getTime() + WIKI_QUEUE_REFLOW_PREVIEW_TTL_MS).toISOString(),
    policy: input.policy,
    previousDailyCapacity: input.previousDailyCapacity,
    nextDailyCapacity: input.settings.maxArticlesPerDay,
    totalFutureJobs: input.candidates.length + input.lockedJobs.length,
    firstRunAt: items[0]?.nextRunAt ?? currentTimes[0] ?? null,
    previousLastRunAt: currentTimes.at(-1) ?? null,
    nextLastRunAt: items.at(-1)?.nextRunAt ?? null,
    movedCount: items.filter((item) => item.moved).length,
    unchangedCount: items.filter((item) => !item.moved).length,
    lockedJobs: input.lockedJobs,
    dependencyErrors,
    blackoutConflicts: [] as string[],
    horizonConflicts,
    items,
  };
  return {
    planToken: createHash("sha256").update(JSON.stringify({
      ...base,
      candidates: input.candidates.map((candidate) => ({
        jobId: candidate.jobId,
        updatedAt: candidate.updatedAt,
        runAt: candidate.currentRunAt,
      })).sort((left, right) => left.jobId.localeCompare(right.jobId, "en")),
    }), "utf8").digest("hex"),
    ...base,
  };
}

export function planWikiQueueReflowUndo(input: {
  sourcePlanToken: string;
  snapshotItems: WikiQueueReflowSnapshotItem[];
  candidates: WikiQueuePositionCandidate[];
  occupiedRunAt: string[];
  previewedAt: string;
}): WikiQueueReflowUndoPlan {
  const previewedAt = new Date(input.previewedAt);
  if (!Number.isFinite(previewedAt.getTime())) {
    throw new Error("Wiki queue undo preview timestamp is invalid.");
  }
  const candidates = new Map(input.candidates.map((candidate) => [candidate.jobId, candidate]));
  const occupied = new Set(input.occupiedRunAt.map((value) => new Date(value).toISOString()));
  const conflicts: string[] = [];
  const items: WikiQueueReflowPlanItem[] = [];
  for (const snapshot of input.snapshotItems) {
    const candidate = candidates.get(snapshot.jobId);
    if (!candidate) continue;
    const restored = new Date(snapshot.runAt);
    if (!Number.isFinite(restored.getTime()) || restored.getTime() <= previewedAt.getTime()) {
      conflicts.push(`${snapshot.stableId}: previous slot is no longer in the future.`);
      continue;
    }
    const restoredIso = restored.toISOString();
    if (occupied.has(restoredIso)) {
      conflicts.push(`${snapshot.stableId}: previous slot is occupied by a locked job.`);
      continue;
    }
    occupied.add(restoredIso);
    items.push({
      jobId: candidate.jobId,
      articleId: candidate.articleId,
      stableId: candidate.stableId,
      title: candidate.title,
      currentRunAt: candidate.currentRunAt,
      nextRunAt: restoredIso,
      moved: candidate.currentRunAt !== restoredIso,
    });
  }
  const previewedAtIso = previewedAt.toISOString();
  const normalized = {
    sourcePlanToken: input.sourcePlanToken,
    previewedAt: previewedAtIso,
    expiresAt: new Date(previewedAt.getTime() + WIKI_QUEUE_REFLOW_PREVIEW_TTL_MS).toISOString(),
    restorableCount: items.length,
    skippedCount: input.snapshotItems.length - items.length,
    conflicts,
    items,
  };
  return {
    planToken: createHash("sha256").update(JSON.stringify({
      ...normalized,
      candidates: input.candidates.map((candidate) => ({
        jobId: candidate.jobId,
        runAt: candidate.currentRunAt,
        updatedAt: candidate.updatedAt,
      })).sort((left, right) => left.jobId.localeCompare(right.jobId, "en")),
    }), "utf8").digest("hex"),
    ...normalized,
  };
}
