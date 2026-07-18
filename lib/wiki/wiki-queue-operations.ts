import type { WikiArticleAdminSummary } from "@/lib/wiki/wiki-cms-types";

export const WIKI_PUBLISH_JOB_MAX_ATTEMPTS = 3;

export type WikiPublishJobOperation =
  | "reschedule"
  | "cancel"
  | "retry";

export type WikiPublishJobState = {
  id: string;
  status: string;
  runAt: string;
  attemptCount: number;
  lastError: string | null;
  lockedAt: string | null;
  updatedAt: string;
};

export type WikiPublishJobOperationAvailability = {
  locked: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  canRetry: boolean;
  canReorder: boolean;
};

export function getWikiPublishJobOperationAvailability(
  job: Pick<WikiPublishJobState, "status" | "lockedAt">,
): WikiPublishJobOperationAvailability {
  const locked = job.status === "running" || Boolean(job.lockedAt);
  return {
    locked,
    canReschedule: !locked && ["queued", "retry"].includes(job.status),
    canCancel: !locked && ["queued", "retry"].includes(job.status),
    canRetry: !locked && job.status === "failed",
    canReorder: !locked && ["queued", "retry"].includes(job.status),
  };
}

export function isWikiPublishJobStateCurrent(
  actualUpdatedAt: string,
  expectedUpdatedAt: string,
) {
  return Boolean(expectedUpdatedAt) && actualUpdatedAt === expectedUpdatedAt;
}

export function getWikiPublishJobStateFromArticle(
  article: WikiArticleAdminSummary,
): WikiPublishJobState | null {
  if (
    !article.publishJobId ||
    !article.pendingPublishAt ||
    article.publishJobAttemptCount === null ||
    !article.publishJobUpdatedAt
  ) {
    return null;
  }

  return {
    id: article.publishJobId,
    status: article.publishJobStatus ?? "unknown",
    runAt: article.pendingPublishAt,
    attemptCount: article.publishJobAttemptCount,
    lastError: article.publishJobError,
    lockedAt: article.publishJobLockedAt,
    updatedAt: article.publishJobUpdatedAt,
  };
}
