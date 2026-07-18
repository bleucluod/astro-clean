import type { WikiArticleAdminSummary } from "@/lib/wiki/wiki-cms-types";

const QUEUE_JOB_STATUSES = new Set(["queued", "running", "retry", "failed"]);
const POSITIONED_JOB_STATUSES = new Set(["queued", "retry"]);

export type WikiPublicationQueueSummary = {
  total: number;
  queued: number;
  running: number;
  retrying: number;
  failed: number;
  nextPublishAt: string | null;
  publishingPaused: boolean;
};

export function getWikiPublicationQueueDate(
  article: WikiArticleAdminSummary,
): string | null {
  return article.pendingPublishAt ?? article.scheduledFor;
}

function queueTimestamp(article: WikiArticleAdminSummary): number {
  const value = getWikiPublicationQueueDate(article);
  if (!value) return Number.POSITIVE_INFINITY;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

export function buildWikiPublicationQueue(
  articles: WikiArticleAdminSummary[],
): WikiArticleAdminSummary[] {
  return articles
    .filter((article) => {
      if (article.deletedAt) return false;

      return Boolean(
        article.status === "scheduled" ||
          getWikiPublicationQueueDate(article) ||
          (article.publishJobStatus &&
            QUEUE_JOB_STATUSES.has(article.publishJobStatus)),
      );
    })
    .slice()
    .sort((left, right) => {
      const leftTimestamp = queueTimestamp(left);
      const rightTimestamp = queueTimestamp(right);
      if (leftTimestamp !== rightTimestamp) {
        return leftTimestamp < rightTimestamp ? -1 : 1;
      }

      const priorityDifference =
        right.publicationPriority - left.publicationPriority;
      return (
        priorityDifference ||
        left.stableId.localeCompare(right.stableId, "en")
      );
    });
}

export function getWikiPublicationQueuePositions(
  queue: WikiArticleAdminSummary[],
) {
  return new Map(
    queue
      .filter((article) =>
        POSITIONED_JOB_STATUSES.has(article.publishJobStatus ?? ""),
      )
      .map((article, index) => [article.id, index + 1]),
  );
}

export function summarizeWikiPublicationQueue(
  queue: WikiArticleAdminSummary[],
  publishingPaused: boolean,
): WikiPublicationQueueSummary {
  const nextPublishAt = queue
    .filter((article) =>
      POSITIONED_JOB_STATUSES.has(article.publishJobStatus ?? ""),
    )
    .map(getWikiPublicationQueueDate)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(left) - Date.parse(right))[0] ?? null;

  return {
    total: queue.length,
    queued: queue.filter((article) => article.publishJobStatus === "queued").length,
    running: queue.filter((article) => article.publishJobStatus === "running").length,
    retrying: queue.filter((article) => article.publishJobStatus === "retry").length,
    failed: queue.filter((article) => article.publishJobStatus === "failed").length,
    nextPublishAt,
    publishingPaused,
  };
}
