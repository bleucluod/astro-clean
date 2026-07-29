import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import {
  asBoolean,
  asNullableString,
  asNumber,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import { recordAdminAuditEvent } from "@/lib/admin/admin-service";
import type {
  WikiArticleAdminSummary,
  WikiArticleSnapshot,
  WikiBulkSchedulePlan,
  WikiContentGuideArticle,
  WikiContentGuideQueueItem,
  WikiRevisionSummary,
  WikiScheduleSettings,
} from "@/lib/wiki/wiki-cms-types";
import {
  readWikiCategoryInput,
  readWikiArticleSnapshot,
  readWikiScheduleSettings,
} from "@/lib/wiki/wiki-cms-validation";
import {
  findWikiInternalArticleIds,
  findWikiPublicationDependencyIds,
} from "@/lib/wiki/wiki-markdown";
import {
  computeWikiScheduleSlots,
  validateWikiScheduleSlot,
} from "@/lib/wiki/wiki-scheduling";
import {
  getWikiPublishJobOperationAvailability,
  isWikiPublishJobStateCurrent,
  WIKI_PUBLISH_JOB_MAX_ATTEMPTS,
  type WikiPublishJobOperation,
  type WikiPublishJobState,
} from "@/lib/wiki/wiki-queue-operations";
import {
  fingerprintWikiBulkScheduleSnapshot,
  planWikiBulkSchedule,
  WikiBulkScheduleError,
  WIKI_BULK_SCHEDULE_PREVIEW_TTL_MS,
  type WikiBulkScheduleCandidate,
  type WikiBulkScheduleExistingJob,
} from "@/lib/wiki/wiki-bulk-scheduling";
import {
  planWikiQueuePositionMove,
  planWikiQueueBulkReorder,
  WIKI_QUEUE_POSITION_PREVIEW_TTL_MS,
  type WikiQueuePositionCandidate,
  type WikiQueueBulkReorderPlan,
  type WikiQueuePositionPlan,
} from "@/lib/wiki/wiki-queue-priority";

function legacyMarkdown(row: Record<string, unknown>) {
  const lines = [asString(row.intro)];
  const keyPoints = Array.isArray(row.key_points) ? row.key_points.map(String) : [];
  if (keyPoints.length) {
    lines.push("## نکات کلیدی", ...keyPoints.map((point) => `- ${point}`));
  }
  const sections = Array.isArray(row.sections) ? row.sections : [];
  for (const raw of sections) {
    const section = asRecord(raw);
    lines.push(`## ${asString(section.title)}`);
    if (Array.isArray(section.paragraphs)) {
      lines.push(...section.paragraphs.map(String));
    }
    if (Array.isArray(section.bullets)) {
      lines.push(...section.bullets.map((bullet) => `- ${String(bullet)}`));
    }
  }
  return lines.filter(Boolean).join("\n\n");
}

function snapshotFromRow(raw: unknown): WikiArticleSnapshot {
  const row = asRecord(raw);
  return readWikiArticleSnapshot({
    stableId: row.stable_id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.short_title,
    seoTitle: row.seo_title,
    metaDescription: row.meta_description ?? row.summary,
    categoryId: row.category_id,
    tags: Array.isArray(row.tags) ? row.tags : [],
    summary: row.summary,
    intro: row.intro,
    readingMinutes: row.reading_minutes,
    publicationPriority: row.publication_priority,
    contentCluster: row.content_cluster ?? row.category_id,
    articleRole: row.article_role,
    relatedArticleIds: Array.isArray(row.related_article_ids) ? row.related_article_ids : [],
    indexable: row.is_indexable,
    bodyMarkdown: row.body_markdown ?? legacyMarkdown(row),
    keyPoints: row.key_points,
    contextLinks: row.context_links,
    sources: row.sources,
    callToAction: row.call_to_action,
    contentVersion: row.content_version,
  });
}

function revisionFromRow(
  raw: unknown,
  currentSnapshot: WikiArticleSnapshot,
): WikiRevisionSummary {
  const row = asRecord(raw);
  const storedSnapshot = asRecord(row.snapshot);
  // Batch 2 parity revisions predate the CMS snapshot contract and therefore
  // have neither stableId nor bodyMarkdown. Their content is identical to the
  // original published row, so use the normalized current snapshot rather
  // than rejecting the whole article detail request.
  const snapshot = typeof storedSnapshot.stableId === "string" &&
    typeof storedSnapshot.bodyMarkdown === "string"
    ? readWikiArticleSnapshot(storedSnapshot)
    : currentSnapshot;
  return {
    revisionNumber: asNumber(row.revision_number),
    status: asString(row.revision_status) as WikiRevisionSummary["status"],
    changeNote: asNullableString(row.change_note),
    createdBy: asNullableString(row.created_by),
    createdAt: asString(row.created_at),
    publishedAt: asNullableString(row.published_at),
    snapshot,
  };
}

async function assertSnapshotReferences(
  snapshot: WikiArticleSnapshot,
  articleId?: string,
  requirePublishedDependencies = false,
) {
  const sql = getAdminDatabase();
  const categories = await sql`
    select id from public.wiki_categories where id = ${snapshot.categoryId} limit 1
  `;
  if (!categories[0]) {
    throw new AdminAccessError(400, "Wiki category does not exist.");
  }
  const slugConflict = await sql`
    select id::text, stable_id
    from public.wiki_articles
    where slug = ${snapshot.slug}
      and (${articleId ?? null}::uuid is null or id <> ${articleId ?? null}::uuid)
      and deleted_at is null
    limit 1
  `;
  if (slugConflict[0]) {
    throw new AdminAccessError(409, "Wiki slug belongs to another article.");
  }
  const redirectConflict = await sql`
    select source_slug
    from public.wiki_redirects
    where source_slug = ${snapshot.slug}
      and is_active = true
      and (${articleId ?? null}::uuid is null or target_article_id <> ${articleId ?? null}::uuid)
    limit 1
  `;
  if (redirectConflict[0]) {
    throw new AdminAccessError(409, "Wiki slug is reserved by an active redirect.");
  }
  const referencedIds = [...new Set([
    ...snapshot.relatedArticleIds,
    ...findWikiInternalArticleIds(snapshot.bodyMarkdown),
  ])].filter((stableId) => stableId !== snapshot.stableId);
  if (referencedIds.length) {
    const rows = await sql`
      select stable_id, status, published_at
      from public.wiki_articles
      where stable_id = any(${referencedIds}::text[])
        and deleted_at is null
    `;
    const found = new Set(rows.map((row) => asString(row.stable_id)));
    const missing = referencedIds.filter((stableId) => !found.has(stableId));
    if (missing.length) {
      throw new AdminAccessError(409, `Missing Wiki article dependencies: ${missing.join(", ")}`);
    }
    if (requirePublishedDependencies) {
      const publicationDependencies = new Set(
        findWikiPublicationDependencyIds(
          snapshot.relatedArticleIds,
          snapshot.stableId,
        ),
      );
      const unpublished = rows
        .filter(
          (row) =>
            publicationDependencies.has(asString(row.stable_id)) &&
            (row.status !== "published" || !row.published_at),
        )
        .map((row) => asString(row.stable_id));
      if (unpublished.length) {
        throw new AdminAccessError(409, `Publish dependencies first: ${unpublished.join(", ")}`);
      }
    }
  }
  if (snapshot.sections.some((section) =>
    section.media?.some((media) => media.src.startsWith("assets/")),
  )) {
    throw new AdminAccessError(409, "Draft contains unresolved package assets.");
  }
}

export async function listAdminWikiArticles(input: {
  search: string;
  status?: string | null;
  limit: number;
}): Promise<WikiArticleAdminSummary[]> {
  const sql = getAdminDatabase();
  const query = input.search ? `%${input.search}%` : null;
  const status = input.status && input.status !== "all" ? input.status : null;
  const rows = await sql`
    select
      article.id::text,
      article.stable_id,
      article.slug,
      article.title,
      article.category_id,
      article.status,
      article.is_indexable,
      article.content_version,
      article.article_role,
      article.content_cluster,
      article.publication_priority,
      article.published_at::text,
      article.scheduled_for::text,
      article.deleted_at::text,
      article.updated_at::text,
      (draft.article_id is not null) as has_draft,
      job.run_at::text as pending_publish_at,
      job.id::text as publish_job_id,
      job.status as publish_job_status,
      job.last_error as publish_job_error,
      job.attempt_count as publish_job_attempt_count,
      job.locked_at::text as publish_job_locked_at,
      job.completed_at::text as publish_job_completed_at,
      job.updated_at::text as publish_job_updated_at
    from public.wiki_articles as article
    left join public.wiki_article_drafts as draft on draft.article_id = article.id
    left join lateral (
       select id, run_at, status, last_error, attempt_count, locked_at,
              completed_at, updated_at
      from halleus_private.wiki_publish_jobs
      where article_id = article.id and status <> 'canceled'
      order by created_at desc
      limit 1
    ) as job on true
    where (
      ${query}::text is null
      or article.title ilike ${query}
      or article.slug ilike ${query}
      or article.stable_id ilike ${query}
    )
      and (${status}::text is null or article.status = ${status})
    order by article.deleted_at nulls first, article.updated_at desc
    limit ${input.limit}
  `;
  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      id: asString(row.id),
      stableId: asString(row.stable_id),
      slug: asString(row.slug),
      title: asString(row.title),
      categoryId: asString(row.category_id),
      status: asString(row.status) as WikiArticleAdminSummary["status"],
      indexable: asBoolean(row.is_indexable),
      contentVersion: asNumber(row.content_version),
      articleRole: asString(row.article_role) as WikiArticleAdminSummary["articleRole"],
      contentCluster: asNullableString(row.content_cluster),
      publicationPriority: asNumber(row.publication_priority),
      publishedAt: asNullableString(row.published_at),
      scheduledFor: asNullableString(row.scheduled_for),
      deletedAt: asNullableString(row.deleted_at),
      hasDraft: asBoolean(row.has_draft),
      pendingPublishAt: asNullableString(row.pending_publish_at),
      publishJobId: asNullableString(row.publish_job_id),
      publishJobStatus: asNullableString(row.publish_job_status),
      publishJobError: asNullableString(row.publish_job_error),
      publishJobAttemptCount: row.publish_job_attempt_count === null ||
          row.publish_job_attempt_count === undefined
        ? null
        : asNumber(row.publish_job_attempt_count),
      publishJobLockedAt: asNullableString(row.publish_job_locked_at),
      publishJobCompletedAt: asNullableString(row.publish_job_completed_at),
      publishJobUpdatedAt: asNullableString(row.publish_job_updated_at),
      updatedAt: asString(row.updated_at),
    };
  });
}

export async function listWikiContentGuideInventory(): Promise<WikiContentGuideArticle[]> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      stable_id,
      slug,
      title,
      category_id,
      status,
      content_version,
      article_role,
      content_cluster,
      publication_priority,
      deleted_at::text
    from public.wiki_articles
    order by stable_id asc
  `;
  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      stableId: asString(row.stable_id),
      slug: asString(row.slug),
      title: asString(row.title),
      categoryId: asString(row.category_id),
      status: asString(row.status) as WikiContentGuideArticle["status"],
      contentVersion: asNumber(row.content_version),
      articleRole: asString(row.article_role) as WikiContentGuideArticle["articleRole"],
      contentCluster: asNullableString(row.content_cluster),
      publicationPriority: asNumber(row.publication_priority),
      deletedAt: asNullableString(row.deleted_at),
    };
  });
}

export async function listWikiContentGuideQueue(): Promise<WikiContentGuideQueueItem[]> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      article.stable_id,
      article.title,
      article.article_role,
      article.content_cluster,
      article.publication_priority,
      job.run_at::text,
      job.status
    from public.wiki_articles as article
    join lateral (
      select run_at, status
      from halleus_private.wiki_publish_jobs
      where article_id = article.id
        and status in ('queued', 'running', 'retry', 'failed')
      order by created_at desc
      limit 1
    ) as job on true
    where article.deleted_at is null
    order by
      case
        when job.status = 'running' then 0
        when job.status in ('queued', 'retry') then 1
        else 2
      end,
      job.run_at asc,
      article.publication_priority desc,
      article.stable_id asc
  `;
  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      stableId: asString(row.stable_id),
      title: asString(row.title),
      articleRole: asString(row.article_role) as WikiContentGuideQueueItem["articleRole"],
      contentCluster: asNullableString(row.content_cluster),
      publicationPriority: asNumber(row.publication_priority),
      runAt: asString(row.run_at),
      jobStatus: asString(row.status) as WikiContentGuideQueueItem["jobStatus"],
    };
  });
}

export async function getAdminWikiArticle(articleId: string) {
  const sql = getAdminDatabase();
  const [articleRows, draftRows, revisionRows, categoryRows] = await Promise.all([
    sql`
      select * from public.wiki_articles where id = ${articleId}::uuid limit 1
    `,
    sql`
      select snapshot, base_revision, autosaved_at::text, updated_at::text
      from public.wiki_article_drafts where article_id = ${articleId}::uuid limit 1
    `,
    sql`
      select revision_number,
             case
               when revision_status = 'scheduled' and exists (
                 select 1 from halleus_private.wiki_publish_jobs as job
                 where job.article_id = revision.article_id
                   and job.revision_number = revision.revision_number
                   and job.status = 'published'
               ) then 'published'
               else revision_status
             end as revision_status,
             snapshot, change_note, created_by::text,
             created_at::text,
             coalesce(
               published_at,
               (select job.completed_at from halleus_private.wiki_publish_jobs as job
                where job.article_id = revision.article_id
                  and job.revision_number = revision.revision_number
                  and job.status = 'published'
                limit 1)
             )::text as published_at
      from public.wiki_article_revisions as revision
      where article_id = ${articleId}::uuid
      order by revision_number desc
      limit 50
    `,
    sql`select id, label, description from public.wiki_categories order by sort_order, id`,
  ]);
  if (!articleRows[0]) {
    throw new AdminAccessError(404, "Wiki article was not found.");
  }
  const currentSnapshot = snapshotFromRow(articleRows[0]);
  const draft = draftRows[0] ? asRecord(draftRows[0]) : null;
  return {
    articleId,
    current: currentSnapshot,
    draft: draft ? readWikiArticleSnapshot(draft.snapshot) : null,
    draftMeta: draft ? {
      baseRevision: asNumber(draft.base_revision),
      autosavedAt: asNullableString(draft.autosaved_at),
      updatedAt: asString(draft.updated_at),
    } : null,
    status: asString(articleRows[0].status),
    deletedAt: asNullableString(articleRows[0].deleted_at),
    revisions: revisionRows.map((row) => revisionFromRow(row, currentSnapshot)),
    categories: categoryRows.map((row) => ({
      id: asString(row.id),
      label: asString(row.label),
      description: asString(row.description),
    })),
  };
}

export async function listWikiCategories() {
  const sql = getAdminDatabase();
  const rows = await sql`select id, label, description from public.wiki_categories order by sort_order, id`;
  return rows.map((row) => ({ id: asString(row.id), label: asString(row.label), description: asString(row.description) }));
}

export async function createAdminWikiCategory(input: {
  actor: VerifiedAdminActor;
  category: unknown;
  reason: string;
}) {
  const category = readWikiCategoryInput(input.category);
  const sql = getAdminDatabase();
  await sql.begin(async (tx) => {
    const existing = await tx`
      select id from public.wiki_categories where id = ${category.id} limit 1
    `;
    if (existing[0]) {
      throw new AdminAccessError(409, "Wiki category ID already exists.");
    }
    await tx`
      insert into public.wiki_categories (id, label, description, sort_order)
      values (
        ${category.id}, ${category.label}, ${category.description},
        (select coalesce(max(sort_order), -1) + 1 from public.wiki_categories)
      )
    `;
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        after_summary, reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role}, 'admin.wiki.category_created',
        'wiki_category', ${category.id}, ${tx.json(category)}, ${input.reason}, true,
        ${input.actor.correlationId}
      )
    `;
  });
  return category;
}

export async function saveAdminWikiDraft(input: {
  actor: VerifiedAdminActor;
  articleId?: string | null;
  snapshot: unknown;
  autosave: boolean;
  reason?: string | null;
}) {
  const snapshot = readWikiArticleSnapshot(input.snapshot);
  await assertSnapshotReferences(snapshot, input.articleId ?? undefined);
  const sql = getAdminDatabase();
  let articleId = input.articleId ?? null;
  await sql.begin(async (tx) => {
    if (!articleId) {
      const stableConflict = await tx`
        select id from public.wiki_articles where stable_id = ${snapshot.stableId} limit 1
      `;
      if (stableConflict[0]) {
        throw new AdminAccessError(409, "stableId already belongs to a Wiki article.");
      }
      const inserted = await tx`
        insert into public.wiki_articles (
          stable_id, slug, category_id, title, short_title, seo_title, meta_description,
          summary, intro, reading_minutes, key_points, sections, context_links, sources,
          call_to_action, related_slugs, status, is_indexable, published_at, scheduled_for,
          sort_order, body_markdown, tags, publication_priority, content_cluster,
          article_role, content_version, related_article_ids
        ) values (
          ${snapshot.stableId}, ${snapshot.slug}, ${snapshot.categoryId}, ${snapshot.title},
          ${snapshot.shortTitle}, ${snapshot.seoTitle}, ${snapshot.metaDescription},
          ${snapshot.summary}, ${snapshot.intro}, ${snapshot.readingMinutes},
          ${tx.json(snapshot.keyPoints)}, ${tx.json(snapshot.sections)},
          ${tx.json(snapshot.contextLinks)}, ${tx.json(snapshot.sources)},
          ${snapshot.callToAction ? tx.json(snapshot.callToAction) : null},
          ${tx.json([])}, 'draft', false, null, null,
          (select coalesce(max(sort_order), -1) + 1 from public.wiki_articles),
          ${snapshot.bodyMarkdown}, ${tx.json(snapshot.tags)}, ${snapshot.publicationPriority},
          ${snapshot.contentCluster}, ${snapshot.articleRole}, ${snapshot.contentVersion},
          ${tx.json(snapshot.relatedArticleIds)}
        ) returning id::text
      `;
      articleId = asString(inserted[0]?.id);
    } else {
      const rows = await tx`
        select stable_id, status, deleted_at
        from public.wiki_articles
        where id = ${articleId}::uuid
        for update
      `;
      if (!rows[0]) {
        throw new AdminAccessError(404, "Wiki article was not found.");
      }
      if (asString(rows[0].stable_id) !== snapshot.stableId) {
        throw new AdminAccessError(409, "A Wiki stableId cannot be changed.");
      }
      if (rows[0].deleted_at) {
        throw new AdminAccessError(409, "Restore the article before editing it.");
      }
      if (rows[0].status === "draft") {
        await tx`
          update public.wiki_articles set
            slug = ${snapshot.slug}, category_id = ${snapshot.categoryId}, title = ${snapshot.title},
            short_title = ${snapshot.shortTitle}, seo_title = ${snapshot.seoTitle},
            meta_description = ${snapshot.metaDescription}, summary = ${snapshot.summary},
            intro = ${snapshot.intro}, reading_minutes = ${snapshot.readingMinutes},
            key_points = ${tx.json(snapshot.keyPoints)}, sections = ${tx.json(snapshot.sections)},
            context_links = ${tx.json(snapshot.contextLinks)}, sources = ${tx.json(snapshot.sources)},
            call_to_action = ${snapshot.callToAction ? tx.json(snapshot.callToAction) : null},
            body_markdown = ${snapshot.bodyMarkdown}, tags = ${tx.json(snapshot.tags)},
            publication_priority = ${snapshot.publicationPriority},
            content_cluster = ${snapshot.contentCluster}, article_role = ${snapshot.articleRole},
            content_version = ${snapshot.contentVersion},
            related_article_ids = ${tx.json(snapshot.relatedArticleIds)}
          where id = ${articleId}::uuid
        `;
      }
    }
    const revisionRows = await tx`
      select coalesce(max(revision_number), 0)::int as revision_number
      from public.wiki_article_revisions
      where article_id = ${articleId}::uuid
    `;
    await tx`
      insert into public.wiki_article_drafts (
        article_id, snapshot, base_revision, updated_by, autosaved_at
      ) values (
        ${articleId}::uuid, ${tx.json(snapshot)}, ${asNumber(revisionRows[0]?.revision_number)},
        ${input.actor.userId}::uuid, ${input.autosave ? new Date() : null}
      )
      on conflict (article_id) do update set
        snapshot = excluded.snapshot,
        base_revision = excluded.base_revision,
        updated_by = excluded.updated_by,
        autosaved_at = excluded.autosaved_at
    `;
    if (!input.autosave) {
      await tx`
        insert into halleus_private.admin_audit_events (
          actor_user_id, actor_role, action, target_type, target_id,
          after_summary, reason, success, request_correlation_id
        ) values (
          ${input.actor.userId}::uuid, ${input.actor.role}, 'admin.wiki.draft_saved',
          'wiki_article', ${articleId},
          ${tx.json({ stableId: snapshot.stableId, slug: snapshot.slug, version: snapshot.contentVersion })},
          ${input.reason ?? 'Wiki draft save'}, true, ${input.actor.correlationId}
        )
      `;
    }
  });
  return { articleId: articleId! };
}

function publishJobStateFromRow(raw: unknown): WikiPublishJobState {
  const row = asRecord(raw);
  return {
    id: asString(row.id),
    status: asString(row.status),
    runAt: asString(row.run_at),
    attemptCount: asNumber(row.attempt_count),
    lastError: asNullableString(row.last_error),
    lockedAt: asNullableString(row.locked_at),
    updatedAt: asString(row.updated_at),
  };
}

async function applyPublishedSnapshot(input: {
  actor: VerifiedAdminActor;
  articleId: string;
  snapshot: WikiArticleSnapshot;
  reason: string;
  rollbackFrom?: number;
}) {
  await assertSnapshotReferences(input.snapshot, input.articleId, true);
  const sql = getAdminDatabase();
  let revisionNumber = 0;
  let previousSlug = "";
  await sql.begin(async (tx) => {
    const runningJobs = await tx`
      select id
      from halleus_private.wiki_publish_jobs
      where article_id = ${input.articleId}::uuid and status = 'running'
      for update
    `;
    if (runningJobs[0]) {
      throw new AdminAccessError(409, "A running Wiki publish job cannot be changed.");
    }
    const articles = await tx`
      select slug from public.wiki_articles where id = ${input.articleId}::uuid for update
    `;
    if (!articles[0]) {
      throw new AdminAccessError(404, "Wiki article was not found.");
    }
    previousSlug = asString(articles[0].slug);
    const revisionRows = await tx`
      select coalesce(max(revision_number), 0)::int + 1 as next_revision
      from public.wiki_article_revisions where article_id = ${input.articleId}::uuid
    `;
    revisionNumber = asNumber(revisionRows[0]?.next_revision);
    const relatedRows = input.snapshot.relatedArticleIds.length
      ? await tx`
          select stable_id, slug from public.wiki_articles
          where stable_id = any(${input.snapshot.relatedArticleIds}::text[]) and deleted_at is null
        `
      : [];
    const slugById = new Map(relatedRows.map((row) => [asString(row.stable_id), asString(row.slug)]));
    const relatedSlugs = input.snapshot.relatedArticleIds
      .map((stableId) => slugById.get(stableId))
      .filter((slug): slug is string => Boolean(slug));

    await tx`
      insert into public.wiki_article_revisions (
        article_id, revision_number, snapshot, change_note, created_by,
        revision_status, published_at, rolled_back_from_revision
      ) values (
        ${input.articleId}::uuid, ${revisionNumber}, ${tx.json(input.snapshot)}, ${input.reason},
        ${input.actor.userId}::uuid, 'published', now(), ${input.rollbackFrom ?? null}
      )
    `;
    await tx`
      update public.wiki_articles set
        slug = ${input.snapshot.slug}, category_id = ${input.snapshot.categoryId},
        title = ${input.snapshot.title}, short_title = ${input.snapshot.shortTitle},
        seo_title = ${input.snapshot.seoTitle}, meta_description = ${input.snapshot.metaDescription},
        summary = ${input.snapshot.summary}, intro = ${input.snapshot.intro},
        reading_minutes = ${input.snapshot.readingMinutes},
        key_points = ${tx.json(input.snapshot.keyPoints)}, sections = ${tx.json(input.snapshot.sections)},
        context_links = ${tx.json(input.snapshot.contextLinks)}, sources = ${tx.json(input.snapshot.sources)},
        call_to_action = ${input.snapshot.callToAction ? tx.json(input.snapshot.callToAction) : null},
        related_slugs = ${tx.json(relatedSlugs)}, status = 'published',
        is_indexable = ${input.snapshot.indexable}, published_at = now(), scheduled_for = null,
        body_markdown = ${input.snapshot.bodyMarkdown}, tags = ${tx.json(input.snapshot.tags)},
        publication_priority = ${input.snapshot.publicationPriority},
        content_cluster = ${input.snapshot.contentCluster}, article_role = ${input.snapshot.articleRole},
        content_version = ${input.snapshot.contentVersion},
        related_article_ids = ${tx.json(input.snapshot.relatedArticleIds)},
        deleted_at = null, deleted_by = null, deleted_from_status = null
      where id = ${input.articleId}::uuid
    `;
    await tx`
      update public.wiki_redirects
      set is_active = false, updated_at = now()
      where source_slug = ${input.snapshot.slug}
        and target_article_id = ${input.articleId}::uuid
    `;
    if (previousSlug && previousSlug !== input.snapshot.slug) {
      await tx`
        insert into public.wiki_redirects (source_slug, target_article_id, created_by)
        values (${previousSlug}, ${input.articleId}::uuid, ${input.actor.userId}::uuid)
        on conflict (source_slug) do update set
          target_article_id = excluded.target_article_id,
          is_active = true,
          updated_at = now()
      `;
    }
    await tx`delete from public.wiki_internal_links where source_article_id = ${input.articleId}::uuid`;
    const inlineIds = [...new Set(findWikiInternalArticleIds(input.snapshot.bodyMarkdown))];
    for (const targetId of inlineIds) {
      await tx`
        insert into public.wiki_internal_links (source_article_id, target_stable_id, link_kind, source_token)
        values (${input.articleId}::uuid, ${targetId}, 'inline', ${`[[article:${targetId}]]`})
      `;
    }
    for (const targetId of input.snapshot.relatedArticleIds) {
      await tx`
        insert into public.wiki_internal_links (source_article_id, target_stable_id, link_kind, source_token)
        values (${input.articleId}::uuid, ${targetId}, 'related', ${targetId})
        on conflict do nothing
      `;
    }
    await tx`delete from public.wiki_article_drafts where article_id = ${input.articleId}::uuid`;
    await tx`
      update halleus_private.wiki_publish_jobs
      set status = 'canceled', completed_at = now()
      where article_id = ${input.articleId}::uuid and status in ('queued', 'retry', 'failed')
    `;
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        before_summary, after_summary, reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role},
        ${input.rollbackFrom ? 'admin.wiki.revision_rolled_back' : 'admin.wiki.article_published'},
        'wiki_article', ${input.articleId}, ${tx.json({ slug: previousSlug })},
        ${tx.json({ slug: input.snapshot.slug, revisionNumber, version: input.snapshot.contentVersion })},
        ${input.reason}, true, ${input.actor.correlationId}
      )
    `;
  });
  return { revisionNumber, slug: input.snapshot.slug, previousSlug };
}

export async function publishAdminWikiDraft(input: {
  actor: VerifiedAdminActor;
  articleId: string;
  reason: string;
  publishAt?: string | null;
}) {
  const sql = getAdminDatabase();
  const draftRows = await sql`
    select snapshot from public.wiki_article_drafts where article_id = ${input.articleId}::uuid limit 1
  `;
  if (!draftRows[0]) {
    throw new AdminAccessError(409, "Save a Wiki draft before publishing.");
  }
  const snapshot = readWikiArticleSnapshot(draftRows[0].snapshot);
  if (!input.publishAt) {
    return { mode: "published" as const, ...(await applyPublishedSnapshot({
      actor: input.actor,
      articleId: input.articleId,
      snapshot,
      reason: input.reason,
    })) };
  }
  await assertSnapshotReferences(snapshot, input.articleId);
  const runAt = new Date(input.publishAt);
  if (!Number.isFinite(runAt.getTime()) || runAt.getTime() <= Date.now()) {
    throw new AdminAccessError(400, "Scheduled publication must be in the future.");
  }
  let revisionNumber = 0;
  await sql.begin(async (tx) => {
    const runningJobs = await tx`
      select id
      from halleus_private.wiki_publish_jobs
      where article_id = ${input.articleId}::uuid and status = 'running'
      for update
    `;
    if (runningJobs[0]) {
      throw new AdminAccessError(409, "A running Wiki publish job cannot be changed.");
    }
    const articleRows = await tx`
      select status from public.wiki_articles where id = ${input.articleId}::uuid for update
    `;
    if (!articleRows[0]) {
      throw new AdminAccessError(404, "Wiki article was not found.");
    }
    const revisionRows = await tx`
      select coalesce(max(revision_number), 0)::int + 1 as next_revision
      from public.wiki_article_revisions where article_id = ${input.articleId}::uuid
    `;
    revisionNumber = asNumber(revisionRows[0]?.next_revision);
    await tx`
      update halleus_private.wiki_publish_jobs set status = 'canceled', completed_at = now()
      where article_id = ${input.articleId}::uuid and status in ('queued', 'retry', 'failed')
    `;
    await tx`
      insert into public.wiki_article_revisions (
        article_id, revision_number, snapshot, change_note, created_by, revision_status
      ) values (
        ${input.articleId}::uuid, ${revisionNumber}, ${tx.json(snapshot)}, ${input.reason},
        ${input.actor.userId}::uuid, 'scheduled'
      )
    `;
    await tx`
      insert into halleus_private.wiki_publish_jobs (
        article_id, revision_number, run_at, created_by
      ) values (${input.articleId}::uuid, ${revisionNumber}, ${runAt}, ${input.actor.userId}::uuid)
    `;
    if (articleRows[0].status !== "published") {
      await tx`
        update public.wiki_articles
        set status = 'scheduled', scheduled_for = ${runAt}, published_at = null, is_indexable = false
        where id = ${input.articleId}::uuid
      `;
    }
    await tx`delete from public.wiki_article_drafts where article_id = ${input.articleId}::uuid`;
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id, after_summary,
        reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role}, 'admin.wiki.article_scheduled',
        'wiki_article', ${input.articleId},
        ${tx.json({ revisionNumber, runAt: runAt.toISOString(), slug: snapshot.slug })},
        ${input.reason}, true, ${input.actor.correlationId}
      )
    `;
  });
  return { mode: "scheduled" as const, revisionNumber, slug: snapshot.slug, publishAt: runAt.toISOString() };
}

export async function publishAdminWikiDrafts(input: {
  actor: VerifiedAdminActor;
  articleIds: string[];
  reason: string;
}) {
  const articleIds = [...new Set(input.articleIds)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  const sql = getAdminDatabase();
  const eligibilityRows = await sql`
    select article.id::text, article.status, article.deleted_at::text,
           draft.article_id is not null as has_draft,
           exists (
             select 1 from halleus_private.wiki_publish_jobs as job
             where job.article_id = article.id
               and job.status in ('queued', 'running', 'retry', 'failed')
           ) as has_open_job
    from public.wiki_articles as article
    left join public.wiki_article_drafts as draft on draft.article_id = article.id
    where article.id = any(${articleIds}::uuid[])
    order by article.id
  `;
  if (eligibilityRows.length !== articleIds.length) {
    throw new AdminAccessError(404, "One or more Wiki articles were not found.");
  }
  if (
    eligibilityRows.some(
      (row) =>
        asString(row.status) !== "published" ||
        Boolean(row.deleted_at) ||
        !asBoolean(row.has_draft) ||
        asBoolean(row.has_open_job),
    )
  ) {
    throw new AdminAccessError(
      409,
      "Bulk publish accepts only published articles with an open draft and no open publish job.",
    );
  }

  const published = [];
  for (const articleId of articleIds) {
    const result = await publishAdminWikiDraft({
      actor: input.actor,
      articleId,
      reason: input.reason,
    });
    if (result.mode !== "published") {
      throw new AdminAccessError(500, "Wiki bulk publish returned an invalid mode.");
    }
    published.push({
      articleId,
      slug: result.slug,
      previousSlug: result.previousSlug,
    });
  }
  return { articleIds, count: published.length, published };
}

export async function unpublishAdminWikiArticle(input: {
  actor: VerifiedAdminActor;
  articleId: string;
  reason: string;
}) {
  const sql = getAdminDatabase();
  await sql.begin(async (tx) => {
    const runningJobs = await tx`
      select id
      from halleus_private.wiki_publish_jobs
      where article_id = ${input.articleId}::uuid and status = 'running'
      for update
    `;
    if (runningJobs[0]) {
      throw new AdminAccessError(409, "A running Wiki publish job cannot be changed.");
    }
    const rows = await tx`
      update public.wiki_articles
      set status = 'archived', is_indexable = false, published_at = null, scheduled_for = null
      where id = ${input.articleId}::uuid and deleted_at is null
      returning slug
    `;
    if (!rows[0]) {
      throw new AdminAccessError(404, "Wiki article was not found.");
    }
    await tx`
      update halleus_private.wiki_publish_jobs set status = 'canceled', completed_at = now()
      where article_id = ${input.articleId}::uuid and status in ('queued', 'retry', 'failed')
    `;
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id, after_summary,
        reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role}, 'admin.wiki.article_unpublished',
        'wiki_article', ${input.articleId}, ${tx.json({ status: 'archived', slug: rows[0].slug })},
        ${input.reason}, true, ${input.actor.correlationId}
      )
    `;
  });
}

export async function setAdminWikiArticleDeleted(input: {
  actor: VerifiedAdminActor;
  articleId: string;
  deleted: boolean;
  reason: string;
}) {
  const sql = getAdminDatabase();
  await sql.begin(async (tx) => {
    const runningJobs = input.deleted
      ? await tx`
          select id
          from halleus_private.wiki_publish_jobs
          where article_id = ${input.articleId}::uuid and status = 'running'
          for update
        `
      : [];
    if (runningJobs[0]) {
      throw new AdminAccessError(409, "A running Wiki publish job cannot be changed.");
    }
    const rows = await tx`
      select status, deleted_at from public.wiki_articles
      where id = ${input.articleId}::uuid for update
    `;
    if (!rows[0]) {
      throw new AdminAccessError(404, "Wiki article was not found.");
    }
    if (input.deleted) {
      await tx`
        update public.wiki_articles set
          deleted_from_status = status, deleted_at = now(), deleted_by = ${input.actor.userId}::uuid,
          status = 'archived', is_indexable = false, published_at = null, scheduled_for = null
        where id = ${input.articleId}::uuid
      `;
      await tx`
        update halleus_private.wiki_publish_jobs set status = 'canceled', completed_at = now()
        where article_id = ${input.articleId}::uuid and status in ('queued', 'retry', 'failed')
      `;
    } else {
      await tx`
        update public.wiki_articles set
          deleted_at = null, deleted_by = null, deleted_from_status = null,
          status = 'draft', is_indexable = false, published_at = null, scheduled_for = null
        where id = ${input.articleId}::uuid
      `;
    }
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id, after_summary,
        reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role},
        ${input.deleted ? 'admin.wiki.article_soft_deleted' : 'admin.wiki.article_restored'},
        'wiki_article', ${input.articleId}, ${tx.json({ deleted: input.deleted })},
        ${input.reason}, true, ${input.actor.correlationId}
      )
    `;
  });
}

export async function softDeleteAdminWikiArticles(input: {
  actor: VerifiedAdminActor;
  articleIds: string[];
  reason: string;
}) {
  const articleIds = [...new Set(input.articleIds)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const runningJobs = await tx`
      select id::text, article_id::text
      from halleus_private.wiki_publish_jobs
      where article_id = any(${articleIds}::uuid[]) and status = 'running'
      for update
    `;
    if (runningJobs.length > 0) {
      throw new AdminAccessError(
        409,
        "One or more selected articles have a running publish job.",
      );
    }
    const rows = await tx`
      select id::text, slug, deleted_at::text
      from public.wiki_articles
      where id = any(${articleIds}::uuid[])
      order by id
      for update
    `;
    if (rows.length !== articleIds.length) {
      throw new AdminAccessError(404, "One or more Wiki articles were not found.");
    }
    if (rows.some((row) => row.deleted_at)) {
      throw new AdminAccessError(409, "One or more Wiki articles are already deleted.");
    }

    await tx`
      update public.wiki_articles set
        deleted_from_status = status,
        deleted_at = now(),
        deleted_by = ${input.actor.userId}::uuid,
        status = 'archived',
        is_indexable = false,
        published_at = null,
        scheduled_for = null
      where id = any(${articleIds}::uuid[])
    `;
    await tx`
      update halleus_private.wiki_publish_jobs
      set status = 'canceled', completed_at = now()
      where article_id = any(${articleIds}::uuid[])
        and status in ('queued', 'retry', 'failed')
    `;
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        after_summary, reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role},
        'admin.wiki.articles_bulk_soft_deleted', 'wiki_article_batch',
        ${articleIds.join(',')},
        ${tx.json({
          articleIds,
          count: articleIds.length,
          slugs: rows.map((row) => asString(row.slug)),
        })},
        ${input.reason}, true, ${input.actor.correlationId}
      )
    `;

    return { articleIds, count: articleIds.length };
  });
}

export async function mutateAdminWikiPublishJob(input: {
  actor: VerifiedAdminActor;
  jobId: string;
  action: WikiPublishJobOperation;
  expectedUpdatedAt: string;
  publishAt?: string | null;
  reason: string;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select job.id::text, job.article_id::text, job.revision_number,
             job.run_at::text, job.status, job.attempt_count, job.last_error,
             job.locked_at::text, job.completed_at::text, job.updated_at::text,
             article.status as article_status, revision.snapshot
      from halleus_private.wiki_publish_jobs as job
      join public.wiki_articles as article on article.id = job.article_id
      join public.wiki_article_revisions as revision
        on revision.article_id = job.article_id
       and revision.revision_number = job.revision_number
      where job.id = ${input.jobId}::uuid
      for update of job, article, revision
    `;
    if (!rows[0]) {
      throw new AdminAccessError(404, "Wiki publish job was not found.");
    }

    const row = asRecord(rows[0]);
    const current = publishJobStateFromRow(row);
    if (input.action === "cancel" && current.status === "canceled") {
      return { action: input.action, idempotent: true, job: current };
    }
    if (!isWikiPublishJobStateCurrent(current.updatedAt, input.expectedUpdatedAt)) {
      throw new AdminAccessError(
        409,
        "Wiki publish job changed after it was loaded. Refresh the queue.",
      );
    }

    const availability = getWikiPublishJobOperationAvailability(current);
    if (availability.locked) {
      throw new AdminAccessError(409, "A running Wiki publish job cannot be changed.");
    }
    if (
      (input.action === "reschedule" && !availability.canReschedule) ||
      (input.action === "cancel" && !availability.canCancel) ||
      (input.action === "retry" && !availability.canRetry)
    ) {
      throw new AdminAccessError(409, "Wiki publish job is not eligible for this action.");
    }

    const beforeSummary = {
      status: current.status,
      runAt: current.runAt,
      attemptCount: current.attemptCount,
      lastError: current.lastError,
      updatedAt: current.updatedAt,
    };
    const articleId = asString(row.article_id);
    const revisionNumber = asNumber(row.revision_number);
    const articleStatus = asString(row.article_status);

    let nextRunAt: Date | null = null;

    if (input.action === "reschedule" || input.action === "retry") {
      const [settingsRows, occupiedRows] = await Promise.all([
        tx`
          select articles_per_week, max_articles_per_day, allowed_weekdays,
                 publish_time::text, timezone, minimum_interval_hours,
                 blackout_dates, pillar_before_support, max_horizon_days,
                 publishing_paused
          from halleus_private.wiki_schedule_settings
          where singleton = true
          for update
        `,
        tx`
          select run_at::text
          from halleus_private.wiki_publish_jobs
          where id <> ${input.jobId}::uuid
            and status in ('queued', 'retry', 'running')
          order by id
          for update
        `,
      ]);
      if (!settingsRows[0]) {
        throw new Error("Wiki schedule settings are missing.");
      }
      const settings = {
        ...scheduleSettingsFromRow(settingsRows[0]),
        publishingPaused: false,
      };
      const existingRunAt = occupiedRows.map((item) => asString(item.run_at));

      if (input.action === "reschedule") {
        if (!input.publishAt) {
          throw new AdminAccessError(400, "publishAt is required for reschedule.");
        }
        try {
          nextRunAt = validateWikiScheduleSlot({
            settings,
            existingRunAt,
            runAt: input.publishAt,
          });
        } catch (error) {
          throw new AdminAccessError(
            409,
            error instanceof Error ? error.message : "Wiki schedule slot is invalid.",
          );
        }
      } else {
        nextRunAt = computeWikiScheduleSlots({
          settings,
          existingRunAt,
          count: 1,
        })[0] ?? null;
      }
    }

    if (input.action === "cancel") {
      const snapshot = readWikiArticleSnapshot(row.snapshot);
      const updated = await tx`
        update halleus_private.wiki_publish_jobs
        set status = 'canceled', completed_at = now(), locked_at = null
        where id = ${input.jobId}::uuid and status in ('queued', 'retry')
        returning id::text, run_at::text, status, attempt_count, last_error,
                  locked_at::text, updated_at::text
      `;
      if (!updated[0]) {
        throw new AdminAccessError(409, "Wiki publish job changed while canceling.");
      }
      await tx`
        update public.wiki_article_revisions
        set revision_status = 'superseded'
        where article_id = ${articleId}::uuid
          and revision_number = ${revisionNumber}
          and revision_status = 'scheduled'
      `;
      await tx`
        insert into public.wiki_article_drafts (
          article_id, snapshot, base_revision, updated_by, autosaved_at
        ) values (
          ${articleId}::uuid, ${tx.json(snapshot)}, ${Math.max(revisionNumber - 1, 0)},
          ${input.actor.userId}::uuid, null
        )
        on conflict (article_id) do update set
          snapshot = excluded.snapshot,
          base_revision = excluded.base_revision,
          updated_by = excluded.updated_by,
          autosaved_at = null
      `;
      if (articleStatus !== "published") {
        await tx`
          update public.wiki_articles
          set status = 'draft', scheduled_for = null, published_at = null,
              is_indexable = false
          where id = ${articleId}::uuid
        `;
      }
      const job = publishJobStateFromRow(updated[0]);
      await tx`
        insert into halleus_private.admin_audit_events (
          actor_user_id, actor_role, action, target_type, target_id,
          before_summary, after_summary, reason, success, request_correlation_id
        ) values (
          ${input.actor.userId}::uuid, ${input.actor.role},
          'admin.wiki.publish_job_canceled', 'wiki_publish_job', ${input.jobId},
          ${tx.json(beforeSummary)},
          ${tx.json({ status: job.status, draftRestored: true })},
          ${input.reason}, true, ${input.actor.correlationId}
        )
      `;
      return { action: input.action, idempotent: false, job };
    }

    if (!nextRunAt) {
      throw new Error("Wiki publish job operation did not resolve a run time.");
    }
    const updated = input.action === "retry"
      ? await tx`
          update halleus_private.wiki_publish_jobs
          set status = 'retry', run_at = ${nextRunAt}, attempt_count = 0,
              completed_at = null, locked_at = null
          where id = ${input.jobId}::uuid and status = 'failed'
          returning id::text, run_at::text, status, attempt_count, last_error,
                    locked_at::text, updated_at::text
        `
      : await tx`
          update halleus_private.wiki_publish_jobs
          set run_at = ${nextRunAt}, completed_at = null, locked_at = null
          where id = ${input.jobId}::uuid and status in ('queued', 'retry')
          returning id::text, run_at::text, status, attempt_count, last_error,
                    locked_at::text, updated_at::text
        `;
    if (!updated[0]) {
      throw new AdminAccessError(409, "Wiki publish job changed during the operation.");
    }
    await tx`
      update public.wiki_article_revisions
      set revision_status = 'scheduled'
      where article_id = ${articleId}::uuid and revision_number = ${revisionNumber}
    `;
    if (articleStatus !== "published") {
      await tx`
        update public.wiki_articles
        set status = 'scheduled', scheduled_for = ${nextRunAt},
            published_at = null, is_indexable = false
        where id = ${articleId}::uuid
      `;
    }

    const job = publishJobStateFromRow(updated[0]);
    const auditAction = input.action === "retry"
      ? "admin.wiki.publish_job_retried"
      : "admin.wiki.publish_job_rescheduled";
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        before_summary, after_summary, reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role}, ${auditAction},
        'wiki_publish_job', ${input.jobId}, ${tx.json(beforeSummary)},
        ${tx.json({
          status: job.status,
          runAt: job.runAt,
          attemptCount: job.attemptCount,
          maxAttempts: WIKI_PUBLISH_JOB_MAX_ATTEMPTS,
        })},
        ${input.reason}, true, ${input.actor.correlationId}
      )
    `;
    return { action: input.action, idempotent: false, job };
  });
}


function queuePositionCandidateFromRow(raw: unknown): WikiQueuePositionCandidate {
  const row = asRecord(raw);
  const snapshot = readWikiArticleSnapshot(row.snapshot);
  const dependencyStableIds = findWikiPublicationDependencyIds(
    snapshot.relatedArticleIds,
    snapshot.stableId,
  );
  const status = asString(row.status);
  if (status !== "queued" && status !== "retry") {
    throw new Error("Wiki position queue candidate has an invalid status.");
  }
  return {
    jobId: asString(row.job_id),
    articleId: asString(row.article_id),
    revisionNumber: asNumber(row.revision_number),
    stableId: snapshot.stableId,
    title: snapshot.title,
    articleRole: snapshot.articleRole,
    contentCluster: snapshot.contentCluster,
    publicationPriority: snapshot.publicationPriority,
    dependencyStableIds,
    currentRunAt: asString(row.run_at),
    status,
    updatedAt: asString(row.updated_at),
  };
}

function queuePositionExternalDependencyIds(
  candidates: WikiQueuePositionCandidate[],
) {
  const candidateIds = new Set(candidates.map((candidate) => candidate.stableId));
  return [...new Set(
    candidates.flatMap((candidate) => candidate.dependencyStableIds),
  )].filter((stableId) => !candidateIds.has(stableId));
}

function assertQueuePositionTarget(input: {
  candidates: WikiQueuePositionCandidate[];
  targetJobId: string;
  targetPosition: number;
  expectedUpdatedAt: string;
}) {
  if (
    !Number.isInteger(input.targetPosition) ||
    input.targetPosition < 1 ||
    input.targetPosition > input.candidates.length
  ) {
    throw new AdminAccessError(
      400,
      `Queue position must be between 1 and ${input.candidates.length}.`,
    );
  }
  const target = input.candidates.find(
    (candidate) => candidate.jobId === input.targetJobId,
  );
  if (!target) {
    throw new AdminAccessError(
      409,
      "Wiki queue job is no longer available for reordering.",
    );
  }
  if (
    !isWikiPublishJobStateCurrent(
      target.updatedAt,
      input.expectedUpdatedAt,
    )
  ) {
    throw new AdminAccessError(
      409,
      "Wiki queue job changed after it was loaded. Refresh the queue.",
    );
  }
}

export async function previewAdminWikiQueuePositionMove(input: {
  targetJobId: string;
  targetPosition: number;
  expectedUpdatedAt: string;
}): Promise<WikiQueuePositionPlan> {
  const sql = getAdminDatabase();
  const [jobRows, settingsRows] = await Promise.all([
    sql`
      select job.id::text as job_id, job.article_id::text,
             job.revision_number, job.run_at::text,
             job.status, job.updated_at::text, revision.snapshot
      from halleus_private.wiki_publish_jobs as job
      join public.wiki_articles as article on article.id = job.article_id
      join public.wiki_article_revisions as revision
        on revision.article_id = job.article_id
       and revision.revision_number = job.revision_number
      where job.status in ('queued', 'retry')
        and article.deleted_at is null
      order by job.run_at, job.id
    `,
    sql`
      select pillar_before_support
      from halleus_private.wiki_schedule_settings
      where singleton = true
    `,
  ]);
  if (!settingsRows[0]) {
    throw new Error("Wiki schedule settings are missing.");
  }
  if (jobRows.length === 0) {
    throw new AdminAccessError(
      409,
      "No queued or retry Wiki jobs can change position.",
    );
  }
  const candidates = jobRows.map(queuePositionCandidateFromRow);
  assertQueuePositionTarget({ candidates, ...input });
  const dependencyIds = queuePositionExternalDependencyIds(candidates);
  const publishedRows = dependencyIds.length > 0
    ? await sql`
        select stable_id
        from public.wiki_articles
        where stable_id = any(${dependencyIds}::text[])
          and status = 'published'
          and published_at is not null
          and deleted_at is null
      `
    : [];

  try {
    return planWikiQueuePositionMove({
      candidates,
      publishedStableIds: publishedRows.map((row) => asString(row.stable_id)),
      pillarBeforeSupport: asBoolean(settingsRows[0].pillar_before_support),
      targetJobId: input.targetJobId,
      targetPosition: input.targetPosition,
      expectedUpdatedAt: input.expectedUpdatedAt,
      previewedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw new AdminAccessError(
      409,
      error instanceof Error
        ? error.message
        : "Wiki queue position could not be planned.",
    );
  }
}

export async function applyAdminWikiQueuePositionMove(input: {
  actor: VerifiedAdminActor;
  targetJobId: string;
  targetPosition: number;
  expectedUpdatedAt: string;
  planToken: string;
  previewedAt: string;
  reason: string;
}): Promise<WikiQueuePositionPlan> {
  const previewedAt = new Date(input.previewedAt);
  if (
    !Number.isFinite(previewedAt.getTime()) ||
    previewedAt.getTime() > Date.now() ||
    Date.now() - previewedAt.getTime() > WIKI_QUEUE_POSITION_PREVIEW_TTL_MS
  ) {
    throw new AdminAccessError(
      409,
      "Wiki queue position preview expired. Generate a fresh preview.",
    );
  }

  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const settingsRows = await tx`
      select pillar_before_support
      from halleus_private.wiki_schedule_settings
      where singleton = true
      for update
    `;
    if (!settingsRows[0]) {
      throw new Error("Wiki schedule settings are missing.");
    }
    const jobRows = await tx`
      select job.id::text as job_id, job.article_id::text,
             job.revision_number, job.run_at::text,
             job.status, job.updated_at::text, revision.snapshot
      from halleus_private.wiki_publish_jobs as job
      join public.wiki_articles as article on article.id = job.article_id
      join public.wiki_article_revisions as revision
        on revision.article_id = job.article_id
       and revision.revision_number = job.revision_number
      where job.status in ('queued', 'retry')
        and article.deleted_at is null
      order by job.run_at, job.id
      for update of job, article, revision
    `;
    if (jobRows.length === 0) {
      throw new AdminAccessError(
        409,
        "No queued or retry Wiki jobs can change position.",
      );
    }
    const candidates = jobRows.map(queuePositionCandidateFromRow);
    assertQueuePositionTarget({
      candidates,
      targetJobId: input.targetJobId,
      targetPosition: input.targetPosition,
      expectedUpdatedAt: input.expectedUpdatedAt,
    });
    const dependencyIds = queuePositionExternalDependencyIds(candidates);
    const publishedRows = dependencyIds.length > 0
      ? await tx`
          select stable_id
          from public.wiki_articles
          where stable_id = any(${dependencyIds}::text[])
            and status = 'published'
            and published_at is not null
            and deleted_at is null
          for share
        `
      : [];

    let plan: WikiQueuePositionPlan;
    try {
      plan = planWikiQueuePositionMove({
        candidates,
        publishedStableIds: publishedRows.map((row) => asString(row.stable_id)),
        pillarBeforeSupport: asBoolean(settingsRows[0].pillar_before_support),
        targetJobId: input.targetJobId,
        targetPosition: input.targetPosition,
        expectedUpdatedAt: input.expectedUpdatedAt,
        previewedAt: previewedAt.toISOString(),
      });
    } catch (error) {
      throw new AdminAccessError(
        409,
        error instanceof Error
          ? error.message
          : "Wiki queue position could not be applied.",
      );
    }
    if (plan.planToken !== input.planToken) {
      throw new AdminAccessError(
        409,
        "Wiki queue changed after preview. Generate a fresh position preview.",
      );
    }

    for (const item of plan.items) {
      await tx`
        update public.wiki_articles
        set scheduled_for = case
          when status = 'published' then scheduled_for
          else ${new Date(item.nextRunAt)}
        end
        where id = ${item.articleId}::uuid
      `;
      const updatedJobs = await tx`
        update halleus_private.wiki_publish_jobs
        set run_at = ${new Date(item.nextRunAt)},
            updated_at = now()
        where id = ${item.jobId}::uuid
          and status in ('queued', 'retry')
        returning article_id::text
      `;
      if (!updatedJobs[0]) {
        throw new AdminAccessError(
          409,
          "A Wiki job changed while applying its queue position.",
        );
      }
    }

    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        after_summary, reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role},
        'admin.wiki.publish_queue_position_changed', 'wiki_publish_queue',
        ${plan.planToken},
        ${tx.json({
          targetJobId: plan.targetJobId,
          requestedPosition: plan.requestedPosition,
          appliedPosition: plan.appliedPosition,
          constrained: plan.constrained,
          movedCount: plan.items.filter((item) => item.moved).length,
          items: plan.items.map((item) => ({
            jobId: item.jobId,
            stableId: item.stableId,
            fromPosition: item.currentPosition,
            toPosition: item.nextPosition,
            fromRunAt: item.currentRunAt,
            toRunAt: item.nextRunAt,
          })),
        })},
        ${input.reason}, true, ${input.actor.correlationId}
      )
    `;
    return plan;
  });
}

export async function previewAdminWikiQueueBulkReorder(input: {
  requestedStableIds: string[];
}): Promise<WikiQueueBulkReorderPlan> {
  const sql = getAdminDatabase();
  const jobRows = await sql`
    select job.id::text as job_id, job.article_id::text, job.revision_number,
           job.run_at::text, job.status, job.updated_at::text, revision.snapshot
    from halleus_private.wiki_publish_jobs as job
    join public.wiki_articles as article on article.id = job.article_id
    join public.wiki_article_revisions as revision
      on revision.article_id = job.article_id and revision.revision_number = job.revision_number
    where job.status in ('queued', 'retry') and article.deleted_at is null
    order by job.run_at, job.id
  `;
  const candidates = jobRows.map(queuePositionCandidateFromRow);
  const dependencyIds = queuePositionExternalDependencyIds(candidates);
  const publishedRows = dependencyIds.length ? await sql`
    select stable_id from public.wiki_articles
    where stable_id = any(${dependencyIds}::text[]) and status = 'published'
      and published_at is not null and deleted_at is null
  ` : [];
  return planWikiQueueBulkReorder({
    candidates,
    publishedStableIds: publishedRows.map((row) => asString(row.stable_id)),
    requestedStableIds: input.requestedStableIds,
    previewedAt: new Date().toISOString(),
  });
}

export async function applyAdminWikiQueueBulkReorder(input: {
  actor: VerifiedAdminActor;
  requestedStableIds: string[];
  planToken: string;
  previewedAt: string;
  reason: string;
}): Promise<WikiQueueBulkReorderPlan> {
  const previewedAt = new Date(input.previewedAt);
  if (!Number.isFinite(previewedAt.getTime()) || previewedAt.getTime() > Date.now() || Date.now() - previewedAt.getTime() > WIKI_QUEUE_POSITION_PREVIEW_TTL_MS) {
    throw new AdminAccessError(409, "Wiki queue bulk reorder preview expired. Generate a fresh preview.");
  }
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const jobRows = await tx`
      select job.id::text as job_id, job.article_id::text, job.revision_number,
             job.run_at::text, job.status, job.updated_at::text, revision.snapshot
      from halleus_private.wiki_publish_jobs as job
      join public.wiki_articles as article on article.id = job.article_id
      join public.wiki_article_revisions as revision
        on revision.article_id = job.article_id and revision.revision_number = job.revision_number
      where job.status in ('queued', 'retry') and article.deleted_at is null
      order by job.run_at, job.id for update of job, article, revision
    `;
    const candidates = jobRows.map(queuePositionCandidateFromRow);
    const dependencyIds = queuePositionExternalDependencyIds(candidates);
    const publishedRows = dependencyIds.length ? await tx`
      select stable_id from public.wiki_articles
      where stable_id = any(${dependencyIds}::text[]) and status = 'published'
        and published_at is not null and deleted_at is null for share
    ` : [];
    const plan = planWikiQueueBulkReorder({ candidates, publishedStableIds: publishedRows.map((row) => asString(row.stable_id)), requestedStableIds: input.requestedStableIds, previewedAt: previewedAt.toISOString() });
    if (plan.planToken !== input.planToken) throw new AdminAccessError(409, "WIKI_SCHEDULING_PLAN_STALE");
    const jobIds = plan.items.map((item) => item.jobId);
    const articleIds = plan.items.map((item) => item.articleId);
    const runAts = plan.items.map((item) => item.nextRunAt);
    const updatedJobs = await tx`
      update halleus_private.wiki_publish_jobs as job
      set run_at = changes.run_at, updated_at = now()
      from unnest(${jobIds}::uuid[], ${runAts}::timestamptz[]) as changes(job_id, run_at)
      where job.id = changes.job_id and job.status in ('queued', 'retry')
      returning job.id::text
    `;
    if (updatedJobs.length !== plan.items.length) {
      throw new AdminAccessError(409, "WIKI_SCHEDULING_PLAN_STALE");
    }
    await tx`
      update public.wiki_articles as article
      set scheduled_for = changes.run_at
      from unnest(${articleIds}::uuid[], ${runAts}::timestamptz[]) as changes(article_id, run_at)
      where article.id = changes.article_id and article.status <> 'published'
    `;
    await tx`
      insert into halleus_private.admin_audit_events (actor_user_id, actor_role, action, target_type, target_id, after_summary, reason, success, request_correlation_id)
      values (${input.actor.userId}::uuid, ${input.actor.role}, 'admin.wiki.publish_queue_bulk_reordered', 'wiki_publish_queue', ${plan.planToken}, ${tx.json({ articleCount: plan.items.length, dependencyAdjustmentCount: plan.dependencyAdjustmentCount })}, ${input.reason}, true, ${input.actor.correlationId})
    `;
    return plan;
  });
}

export async function rollbackAdminWikiRevision(input: {
  actor: VerifiedAdminActor;
  articleId: string;
  revisionNumber: number;
  reason: string;
}) {
  const sql = getAdminDatabase();
  const [revisionRows, articleRows] = await Promise.all([
    sql`
      select snapshot from public.wiki_article_revisions
      where article_id = ${input.articleId}::uuid and revision_number = ${input.revisionNumber}
      limit 1
    `,
    sql`select * from public.wiki_articles where id = ${input.articleId}::uuid limit 1`,
  ]);
  if (!revisionRows[0] || !articleRows[0]) {
    throw new AdminAccessError(404, "Wiki revision was not found.");
  }
  const storedSnapshot = asRecord(revisionRows[0].snapshot);
  const snapshot = typeof storedSnapshot.stableId === "string" &&
    typeof storedSnapshot.bodyMarkdown === "string"
    ? readWikiArticleSnapshot(storedSnapshot)
    : snapshotFromRow(articleRows[0]);
  return applyPublishedSnapshot({
    actor: input.actor,
    articleId: input.articleId,
    snapshot,
    reason: input.reason,
    rollbackFrom: input.revisionNumber,
  });
}


type WikiBulkScheduleCandidateState = {
  candidate: WikiBulkScheduleCandidate;
  snapshot: WikiArticleSnapshot;
  status: string;
};

const BULK_SCHEDULE_BLOCKING_JOB_STATUSES = [
  "queued",
  "running",
  "retry",
  "failed",
] as const;

function scheduleSettingsFromRow(raw: unknown): WikiScheduleSettings {
  const row = asRecord(raw);
  return {
    articlesPerWeek: asNumber(row.articles_per_week),
    maxArticlesPerDay: asNumber(row.max_articles_per_day),
    allowedWeekdays: Array.isArray(row.allowed_weekdays)
      ? row.allowed_weekdays.map(Number)
      : [],
    publishTime: asString(row.publish_time).slice(0, 5),
    timezone: asString(row.timezone),
    minimumIntervalHours: asNumber(row.minimum_interval_hours),
    blackoutDates: Array.isArray(row.blackout_dates)
      ? row.blackout_dates.map(String)
      : [],
    pillarBeforeSupport: asBoolean(row.pillar_before_support),
    maxHorizonDays: asNumber(row.max_horizon_days),
    publishingPaused: asBoolean(row.publishing_paused),
  };
}

function bulkScheduleCandidateFromRow(raw: unknown): WikiBulkScheduleCandidateState {
  const row = asRecord(raw);
  const snapshot = readWikiArticleSnapshot(row.snapshot);
  const dependencyStableIds = findWikiPublicationDependencyIds(
    snapshot.relatedArticleIds,
    snapshot.stableId,
  );

  return {
    snapshot,
    status: asString(row.status),
    candidate: {
      articleId: asString(row.id),
      stableId: snapshot.stableId,
      title: snapshot.title,
      slug: snapshot.slug,
      contentVersion: snapshot.contentVersion,
      publicationPriority: snapshot.publicationPriority,
      contentCluster: snapshot.contentCluster,
      articleRole: snapshot.articleRole,
      draftUpdatedAt: asString(row.draft_updated_at),
      snapshotFingerprint: fingerprintWikiBulkScheduleSnapshot(snapshot),
      dependencyStableIds,
    },
  };
}

function assertBulkScheduleRows(
  articleIds: string[],
  rows: unknown[],
  blockingJobs: unknown[],
) {
  if (rows.length !== articleIds.length) {
    const foundArticleIds = new Set(
      rows.map((raw) => asString(asRecord(raw).id)),
    );
    throw new WikiBulkScheduleError({
      status: 422,
      code: "WIKI_SCHEDULING_ARTICLE_INVALID",
      message: "Every selected Wiki article must exist and have a saved draft.",
      articleId: articleIds.find((articleId) => !foundArticleIds.has(articleId)),
    });
  }

  const blockingArticleIds = new Set(
    blockingJobs.map((raw) => asString(asRecord(raw).article_id)),
  );
  const invalid = rows
    .map((raw) => asRecord(raw))
    .filter(
      (row) =>
        row.deleted_at ||
        !["draft", "published"].includes(asString(row.status)) ||
        blockingArticleIds.has(asString(row.id)),
    )
    .map((row) => asString(row.id));

  if (invalid.length > 0) {
    throw new WikiBulkScheduleError({
      status: 409,
      code: "WIKI_SCHEDULING_ARTICLE_INVALID",
      message: "Selected Wiki articles changed or already have a job that must be managed first.",
      articleId: invalid[0],
    });
  }
}

function existingBulkScheduleJobs(rows: unknown[]): WikiBulkScheduleExistingJob[] {
  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      id: asString(row.id),
      articleId: asString(row.article_id),
      stableId: asString(row.stable_id),
      runAt: asString(row.run_at),
      status: asString(row.status) as WikiBulkScheduleExistingJob["status"],
      updatedAt: asString(row.updated_at),
    };
  });
}

async function publishedDependencyIdsForCandidates(
  candidates: WikiBulkScheduleCandidateState[],
) {
  const sql = getAdminDatabase();
  const dependencyIds = [...new Set(
    candidates.flatMap((candidate) => candidate.candidate.dependencyStableIds),
  )];
  if (dependencyIds.length === 0) return [];

  const rows = await sql`
    select stable_id
    from public.wiki_articles
    where stable_id = any(${dependencyIds}::text[])
      and status = 'published'
      and published_at is not null
      and deleted_at is null
  `;
  return rows.map((row) => asString(row.stable_id));
}

export async function previewAdminWikiBulkSchedule(input: {
  articleIds: string[];
}): Promise<WikiBulkSchedulePlan> {
  const sql = getAdminDatabase();
  const [articleRows, blockingJobs, settings, existingJobs] = await Promise.all([
    sql`
      select article.id::text, article.status, article.deleted_at::text,
             draft.snapshot, draft.updated_at::text as draft_updated_at
      from public.wiki_articles as article
      join public.wiki_article_drafts as draft on draft.article_id = article.id
      where article.id = any(${input.articleIds}::uuid[])
      order by article.id
    `,
    sql`
      select article_id::text, status
      from halleus_private.wiki_publish_jobs
      where article_id = any(${input.articleIds}::uuid[])
        and status = any(${BULK_SCHEDULE_BLOCKING_JOB_STATUSES}::text[])
    `,
    getWikiScheduleSettings(),
    sql`
      select job.id::text, job.article_id::text, article.stable_id,
             job.run_at::text, job.status, job.updated_at::text
      from halleus_private.wiki_publish_jobs as job
      join public.wiki_articles as article on article.id = job.article_id
      where job.status in ('queued', 'retry', 'running')
      order by job.id
    `,
  ]);

  assertBulkScheduleRows(input.articleIds, articleRows, blockingJobs);
  const candidates = articleRows.map(bulkScheduleCandidateFromRow);
  const publishedStableIds = await publishedDependencyIdsForCandidates(candidates);

  return planWikiBulkSchedule({
    candidates: candidates.map((candidate) => candidate.candidate),
    settings,
    existingJobs: existingBulkScheduleJobs(existingJobs),
    publishedStableIds,
    previewedAt: new Date().toISOString(),
  });
}

export async function applyAdminWikiBulkSchedule(input: {
  actor: VerifiedAdminActor;
  articleIds: string[];
  planToken: string;
  previewedAt: string;
  reason: string;
}): Promise<WikiBulkSchedulePlan> {
  const previewedAt = new Date(input.previewedAt);
  if (
    !Number.isFinite(previewedAt.getTime()) ||
    previewedAt.getTime() > Date.now() ||
    Date.now() - previewedAt.getTime() > WIKI_BULK_SCHEDULE_PREVIEW_TTL_MS
  ) {
    throw new WikiBulkScheduleError({
      status: 409,
      code: "WIKI_SCHEDULING_PLAN_EXPIRED",
      message: "Bulk schedule preview expired. Generate a fresh preview.",
    });
  }

  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const settingsRows = await tx`
      select articles_per_week, max_articles_per_day, allowed_weekdays,
             publish_time::text, timezone, minimum_interval_hours,
             blackout_dates, pillar_before_support, max_horizon_days,
             publishing_paused
      from halleus_private.wiki_schedule_settings
      where singleton = true
      for update
    `;
    if (!settingsRows[0]) {
      throw new Error("Wiki schedule settings are missing.");
    }

    const articleRows = await tx`
      select article.id::text, article.status, article.deleted_at::text,
             draft.snapshot, draft.updated_at::text as draft_updated_at
      from public.wiki_articles as article
      join public.wiki_article_drafts as draft on draft.article_id = article.id
      where article.id = any(${input.articleIds}::uuid[])
      order by article.id
      for update of article, draft
    `;
    const blockingJobs = await tx`
      select article_id::text, status
      from halleus_private.wiki_publish_jobs
      where article_id = any(${input.articleIds}::uuid[])
        and status = any(${BULK_SCHEDULE_BLOCKING_JOB_STATUSES}::text[])
      for update
    `;
    const existingJobs = await tx`
      select job.id::text, job.article_id::text, article.stable_id,
             job.run_at::text, job.status, job.updated_at::text
      from halleus_private.wiki_publish_jobs as job
      join public.wiki_articles as article on article.id = job.article_id
      where job.status in ('queued', 'retry', 'running')
      order by job.id
      for update of job, article
    `;

    assertBulkScheduleRows(input.articleIds, articleRows, blockingJobs);
    const candidates = articleRows.map(bulkScheduleCandidateFromRow);
    const candidateStableIds = new Set(
      candidates.map((candidate) => candidate.candidate.stableId),
    );
    const dependencyIds = [...new Set(
      candidates.flatMap((candidate) => candidate.candidate.dependencyStableIds),
    )].filter((stableId) => !candidateStableIds.has(stableId));
    const dependencyRows = dependencyIds.length > 0
      ? await tx`
          select stable_id, status, published_at, deleted_at
          from public.wiki_articles
          where stable_id = any(${dependencyIds}::text[])
          for share
        `
      : [];
    const publishedStableIds = dependencyRows
      .filter(
        (row) =>
          row.status === "published" && row.published_at && !row.deleted_at,
      )
      .map((row) => asString(row.stable_id));

    const plan = planWikiBulkSchedule({
      candidates: candidates.map((candidate) => candidate.candidate),
      settings: scheduleSettingsFromRow(settingsRows[0]),
      existingJobs: existingBulkScheduleJobs(existingJobs),
      publishedStableIds,
      previewedAt: previewedAt.toISOString(),
    });

    if (plan.planToken !== input.planToken) {
      throw new WikiBulkScheduleError({
        status: 409,
        code: "WIKI_SCHEDULING_PLAN_STALE",
        message: "Wiki bulk schedule changed after preview. Generate a fresh preview.",
      });
    }
    if (plan.items.some((item) => Date.parse(item.publishAt) <= Date.now())) {
      throw new AdminAccessError(
        409,
        "A planned Wiki publication time is no longer in the future.",
      );
    }

    const stateByArticleId = new Map(
      candidates.map((candidate) => [candidate.candidate.articleId, candidate]),
    );
    for (const item of plan.items) {
      const state = stateByArticleId.get(item.articleId);
      if (!state) {
        throw new Error("Wiki bulk schedule candidate disappeared.");
      }
      const revisionRows = await tx`
        select coalesce(max(revision_number), 0)::int + 1 as next_revision
        from public.wiki_article_revisions
        where article_id = ${item.articleId}::uuid
      `;
      const revisionNumber = asNumber(revisionRows[0]?.next_revision);
      const runAt = new Date(item.publishAt);

      await tx`
        insert into public.wiki_article_revisions (
          article_id, revision_number, snapshot, change_note, created_by,
          revision_status
        ) values (
          ${item.articleId}::uuid, ${revisionNumber}, ${tx.json(state.snapshot)},
          ${input.reason}, ${input.actor.userId}::uuid, 'scheduled'
        )
      `;
      await tx`
        insert into halleus_private.wiki_publish_jobs (
          article_id, revision_number, run_at, created_by
        ) values (
          ${item.articleId}::uuid, ${revisionNumber}, ${runAt},
          ${input.actor.userId}::uuid
        )
      `;
      if (state.status !== "published") {
        await tx`
          update public.wiki_articles
          set status = 'scheduled', scheduled_for = ${runAt},
              published_at = null, is_indexable = false
          where id = ${item.articleId}::uuid
        `;
      }
      await tx`
        delete from public.wiki_article_drafts
        where article_id = ${item.articleId}::uuid
      `;
    }

    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        after_summary, reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role},
        'admin.wiki.bulk_schedule_applied', 'wiki_schedule_batch',
        ${plan.planToken},
        ${tx.json({
          articleCount: plan.items.length,
          items: plan.items.map((item) => ({
            articleId: item.articleId,
            stableId: item.stableId,
            publishAt: item.publishAt,
          })),
        })},
        ${input.reason}, true, ${input.actor.correlationId}
      )
    `;

    return plan;
  });
}

export async function getWikiScheduleSettings(): Promise<WikiScheduleSettings> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select articles_per_week, max_articles_per_day, allowed_weekdays, publish_time::text, timezone,
           minimum_interval_hours, blackout_dates,
           pillar_before_support, max_horizon_days, publishing_paused
    from halleus_private.wiki_schedule_settings where singleton = true
  `;
  if (!rows[0]) {
    throw new Error("Wiki schedule settings are missing.");
  }
  return scheduleSettingsFromRow(rows[0]);
}

export async function updateWikiScheduleSettings(input: {
  actor: VerifiedAdminActor;
  settings: unknown;
  reason: string;
}) {
  const settings = readWikiScheduleSettings(input.settings);
  const sql = getAdminDatabase();
  await sql.begin(async (tx) => {
    const beforeRows = await tx`
      select to_jsonb(settings) as snapshot
      from halleus_private.wiki_schedule_settings as settings where singleton = true
    `;
    await tx`
      update halleus_private.wiki_schedule_settings set
        articles_per_week = ${settings.articlesPerWeek},
        max_articles_per_day = ${settings.maxArticlesPerDay},
        allowed_weekdays = ${tx.json(settings.allowedWeekdays)},
        publish_time = ${settings.publishTime}::time,
        timezone = ${settings.timezone},
        minimum_interval_hours = ${settings.minimumIntervalHours},
        blackout_dates = ${tx.json(settings.blackoutDates)},
        one_per_day = ${settings.maxArticlesPerDay === 1},
        pillar_before_support = ${settings.pillarBeforeSupport},
        max_horizon_days = ${settings.maxHorizonDays},
        publishing_paused = ${settings.publishingPaused},
        updated_by = ${input.actor.userId}::uuid
      where singleton = true
    `;
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        before_summary, after_summary, reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role}, 'admin.wiki.schedule_settings_updated',
        'wiki_schedule_settings', 'singleton', ${beforeRows[0]?.snapshot ?? null},
        ${tx.json(settings)}, ${input.reason}, true, ${input.actor.correlationId}
      )
    `;
  });
  return settings;
}

export async function auditWikiFailure(input: {
  actor: VerifiedAdminActor | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string;
  error: unknown;
}) {
  await recordAdminAuditEvent({
    actor: input.actor,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    afterSummary: {
      error: input.error instanceof Error ? input.error.message.slice(0, 500) : "Unknown Wiki CMS error",
    },
    reason: input.reason,
    success: false,
  });
}
