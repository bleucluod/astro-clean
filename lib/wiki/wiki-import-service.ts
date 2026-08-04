import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { asNumber, asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import type { Sql, TransactionSql } from "postgres";
import type {
  ValidatedWikiPackage,
  WikiArticleSnapshot,
  WikiImportMode,
  WikiImportResult,
  WikiImportPackageSummary,
} from "@/lib/wiki/wiki-cms-types";
import {
  getWikiScheduleSettings,
  publishAdminWikiDraft,
  saveAdminWikiDraft,
} from "@/lib/wiki/wiki-cms-service";
import { storeWikiMedia } from "@/lib/wiki/wiki-media";
import {
  computeWikiScheduleSlots,
  sortWikiArticlesForPublishing,
} from "@/lib/wiki/wiki-scheduling";
import { findWikiPublicationDependencyIds } from "@/lib/wiki/wiki-markdown";
import {
  fingerprintWikiImportSnapshot,
  planWikiImportMerge,
  type WikiImportMergePlan,
} from "@/lib/wiki/wiki-import-merge";
import type { WikiQueueReflowPolicy } from "@/lib/wiki/wiki-cms-types";
import type { WikiQueuePositionCandidate } from "@/lib/wiki/wiki-queue-priority";
import { readWikiArticleSnapshot } from "@/lib/wiki/wiki-cms-validation";

type Candidate = {
  snapshot: WikiArticleSnapshot;
  errors: string[];
  articleId?: string;
};

export async function listWikiImportPackageSummaries(
  limit = 20,
): Promise<WikiImportPackageSummary[]> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      package.id::text as package_id,
      package.package_name,
      package.import_mode,
      package.status as import_status,
      package.article_count,
      package.imported_count,
      package.quarantined_count,
      package.created_at::text,
      package.completed_at::text,
      count(*) filter (where article.status = 'published' and article.deleted_at is null)::integer as current_published,
      count(*) filter (where article.status = 'scheduled' and article.deleted_at is null)::integer as current_scheduled,
      count(*) filter (where article.status = 'draft' and article.deleted_at is null)::integer as current_draft,
      count(*) filter (where article.status = 'archived' and article.deleted_at is null)::integer as current_archived,
      count(*) filter (where item.article_id is null or article.id is null)::integer as current_missing,
      count(*) filter (where article.deleted_at is not null)::integer as current_deleted,
      count(*) filter (where draft.article_id is not null)::integer as open_drafts
    from halleus_private.wiki_import_packages as package
    left join halleus_private.wiki_import_items as item on item.package_id = package.id
    left join public.wiki_articles as article on article.id = item.article_id
    left join public.wiki_article_drafts as draft on draft.article_id = article.id
    group by package.id
    order by package.created_at desc
    limit ${Math.min(Math.max(limit, 1), 50)}
  `;
  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      packageId: asString(row.package_id),
      packageName: asString(row.package_name),
      importMode: asString(row.import_mode) as WikiImportPackageSummary["importMode"],
      importStatus: asString(row.import_status),
      articleCount: asNumber(row.article_count),
      importedCount: asNumber(row.imported_count),
      quarantinedCount: asNumber(row.quarantined_count),
      createdAt: asString(row.created_at),
      completedAt: row.completed_at ? asString(row.completed_at) : null,
      current: {
        published: asNumber(row.current_published),
        scheduled: asNumber(row.current_scheduled),
        draft: asNumber(row.current_draft),
        archived: asNumber(row.current_archived),
        missing: asNumber(row.current_missing),
        deleted: asNumber(row.current_deleted),
        openDrafts: asNumber(row.open_drafts),
      },
    };
  });
}

function replaceAssetReferences(snapshot: WikiArticleSnapshot, urls: Map<string, string>) {
  let bodyMarkdown = snapshot.bodyMarkdown;
  for (const [path, url] of urls) {
    bodyMarkdown = bodyMarkdown
      .replaceAll(`](${path})`, `](${url})`)
      .replaceAll(`](../${path})`, `](${url})`);
  }
  return { ...snapshot, bodyMarkdown };
}

function orderCandidates(candidates: Candidate[], pillarBeforeSupport: boolean) {
  const valid = candidates.filter((candidate) => candidate.errors.length === 0);
  try {
    const ordered = sortWikiArticlesForPublishing(valid.map((item) => item.snapshot), pillarBeforeSupport);
    const byId = new Map(valid.map((item) => [item.snapshot.stableId, item]));
    return ordered.map((snapshot) => byId.get(snapshot.stableId)!);
  } catch {
    const packageIds = new Set(valid.map((candidate) => candidate.snapshot.stableId));
    const remaining = new Map(valid.map((candidate) => [candidate.snapshot.stableId, candidate]));
    const resolved = new Set<string>();
    let progress = true;
    while (progress) {
      progress = false;
      for (const [stableId, candidate] of remaining) {
        const ready = candidate.snapshot.relatedArticleIds.every(
          (target) => !packageIds.has(target) || resolved.has(target),
        );
        if (ready) {
          remaining.delete(stableId);
          resolved.add(stableId);
          progress = true;
        }
      }
    }
    for (const candidate of remaining.values()) {
      candidate.errors.push("Circular Wiki article dependency.");
    }
    return orderCandidates(candidates, pillarBeforeSupport);
  }
}

async function prepareWikiImport(packageData: ValidatedWikiPackage) {
  const sql = getAdminDatabase();
  const duplicate = await sql`
    select id::text from halleus_private.wiki_import_packages
    where package_hash = ${packageData.packageHash}
    limit 1
  `;
  if (duplicate[0]) {
    throw new AdminAccessError(409, "This exact Wiki package was already imported.");
  }
  const [categoryRows, articleRows, settings, existingJobRows] = await Promise.all([
    sql`select id from public.wiki_categories`,
    sql`
      select id::text, stable_id, slug, content_version, deleted_at
      from public.wiki_articles
    `,
    getWikiScheduleSettings(),
    sql`
      select job.id::text as job_id, job.article_id::text, job.revision_number,
             job.run_at::text, job.status, job.updated_at::text, revision.snapshot
      from halleus_private.wiki_publish_jobs as job
      join public.wiki_articles as article on article.id = job.article_id
      join public.wiki_article_revisions as revision
        on revision.article_id = job.article_id and revision.revision_number = job.revision_number
      where job.status in ('queued', 'retry', 'running', 'failed')
        and job.run_at > now() and article.deleted_at is null
      order by job.run_at, job.id
    `,
  ]);
  const categories = new Set(categoryRows.map((row) => asString(row.id)));
  const existingByStableId = new Map(articleRows.map((row) => [asString(row.stable_id), asRecord(row)]));
  const existingBySlug = new Map(articleRows.map((row) => [asString(row.slug), asRecord(row)]));
  const packageIds = new Set(packageData.manifest.articles.map((article) => article.article_id));
  const brokenPackageIds = new Set(packageData.quarantinedArticles.map((item) => item.manifest.article_id));
  const candidates: Candidate[] = packageData.articles.map((item) => ({ snapshot: item.snapshot, errors: [] }));
  for (const candidate of candidates) {
    const { snapshot } = candidate;
    if (!categories.has(snapshot.categoryId)) candidate.errors.push(`Unknown Wiki category: ${snapshot.categoryId}`);
    const existing = existingByStableId.get(snapshot.stableId);
    if (existing?.deleted_at) candidate.errors.push("Restore the existing deleted article before importing a revision.");
    if (existing && snapshot.contentVersion <= asNumber(existing.content_version)) {
      candidate.errors.push("Imported article version is not newer than the stored version.");
    }
    const slugOwner = existingBySlug.get(snapshot.slug);
    if (slugOwner && asString(slugOwner.stable_id) !== snapshot.stableId) {
      candidate.errors.push("Requested slug belongs to a different stable article ID.");
    }
    const missing = snapshot.relatedArticleIds.filter((target) =>
      target !== snapshot.stableId &&
      ((!packageIds.has(target) && !existingByStableId.has(target)) || brokenPackageIds.has(target)),
    );
    if (missing.length) candidate.errors.push(`Missing or quarantined dependencies: ${missing.join(", ")}`);
  }
  const ordered = orderCandidates(candidates, settings.pillarBeforeSupport);
  return {
    sql,
    settings,
    existingByStableId,
    candidates,
    valid: ordered.filter((candidate) => candidate.errors.length === 0),
    existingJobRows,
  };
}

export async function previewWikiQueueMergeImport(input: {
  package: ValidatedWikiPackage;
  policy: WikiQueueReflowPolicy;
  previewedAt?: string;
}): Promise<WikiImportMergePlan> {
  const preparation = await prepareWikiImport(input.package);
  const { sql, settings, valid, candidates, existingJobRows } = preparation;
  const mutable: WikiQueuePositionCandidate[] = existingJobRows
    .filter((row) => ["queued", "retry"].includes(asString(row.status)))
    .map((row) => {
      const snapshot = readWikiArticleSnapshot(row.snapshot);
      const status = asString(row.status);
      return {
        jobId: asString(row.job_id),
        articleId: asString(row.article_id),
        revisionNumber: asNumber(row.revision_number),
        stableId: snapshot.stableId,
        title: snapshot.title,
        articleRole: snapshot.articleRole,
        contentCluster: snapshot.contentCluster,
        publicationPriority: snapshot.publicationPriority,
        dependencyStableIds: findWikiPublicationDependencyIds(snapshot.relatedArticleIds, snapshot.stableId),
        currentRunAt: asString(row.run_at),
        status: status as "queued" | "retry",
        updatedAt: asString(row.updated_at),
      };
    });
  const lockedJobs = existingJobRows
    .filter((row) => ["running", "failed"].includes(asString(row.status)))
    .map((row) => ({
      jobId: asString(row.job_id),
      stableId: readWikiArticleSnapshot(row.snapshot).stableId,
      runAt: asString(row.run_at),
      status: asString(row.status) as "running" | "failed",
    }));
  const dependencyIds = [...new Set([
    ...mutable.flatMap((candidate) => candidate.dependencyStableIds),
    ...valid.flatMap((candidate) => candidate.snapshot.relatedArticleIds),
  ])];
  const publishedRows = dependencyIds.length ? await sql`
    select stable_id from public.wiki_articles
    where stable_id = any(${dependencyIds}::text[]) and status = 'published'
      and published_at is not null and deleted_at is null
  ` : [];
  const capacityRows = await sql`
    select coalesce(last_reflow_daily_capacity, max_articles_per_day)::integer as previous_daily_capacity
    from halleus_private.wiki_schedule_settings where singleton = true
  `;
  return planWikiImportMerge({
    packageHash: input.package.packageHash,
    existingCandidates: mutable,
    newCandidates: valid.map((candidate) => ({
      snapshot: candidate.snapshot,
      snapshotFingerprint: fingerprintWikiImportSnapshot(candidate.snapshot),
    })),
    lockedJobs,
    publishedStableIds: publishedRows.map((row) => asString(row.stable_id)),
    settings,
    previousDailyCapacity: asNumber(capacityRows[0]?.previous_daily_capacity),
    policy: input.policy,
    quarantinedArticleCount: input.package.quarantinedArticles.length +
      candidates.filter((candidate) => candidate.errors.length > 0).length,
    previewedAt: input.previewedAt ?? new Date().toISOString(),
  });
}

export async function importValidatedWikiPackage(input: {
  actor: VerifiedAdminActor;
  package: ValidatedWikiPackage;
  mode: WikiImportMode;
  mergePlan?: WikiImportMergePlan;
}): Promise<WikiImportResult> {
  const preparation = await prepareWikiImport(input.package);
  const { sql, settings, existingByStableId, candidates, valid, existingJobRows } = preparation;
  if (input.mode === "merge_queue" && (!input.mergePlan || input.mergePlan.packageHash !== input.package.packageHash)) {
    throw new AdminAccessError(409, "A current Wiki queue merge preview is required.");
  }
  const mergeSlots = new Map(
    input.mergePlan?.queue.items
      .filter((item) => item.jobId.startsWith("new:"))
      .map((item) => [item.stableId, new Date(item.nextRunAt)]) ?? [],
  );
  const scheduleSlots = input.mode === "auto_schedule"
    ? computeWikiScheduleSlots({
        settings,
        existingRunAt: existingJobRows.map((row) => asString(row.run_at)),
        count: valid.length,
      })
    : input.mode === "merge_queue"
      ? valid.map((candidate) => {
          const slot = mergeSlots.get(candidate.snapshot.stableId);
          if (!slot) throw new AdminAccessError(409, `Merge preview is missing ${candidate.snapshot.stableId}.`);
          return slot;
        })
      : [];

  const assetUrls = new Map<string, string>();
  for (const asset of input.package.assets) {
    const stored = await storeWikiMedia(input.actor, {
      originalName: asset.path.split("/").at(-1) ?? asset.path,
      alt: asset.alt,
      bytes: asset.bytes,
      mimeType: asset.mimeType,
      contentHash: asset.contentHash,
    });
    assetUrls.set(asset.path, stored.url);
  }

  const applyImport = async (database: Sql | TransactionSql): Promise<WikiImportResult> => {
  const packageRows = await database`
    insert into halleus_private.wiki_import_packages (
      package_name, package_hash, schema_version, import_mode, article_count,
      quarantined_count, validation_summary, uploaded_by
    ) values (
      ${input.package.fileName}, ${input.package.packageHash}, 1, ${input.mode},
      ${input.package.manifest.articles.length}, ${input.package.quarantinedArticles.length},
      ${database.json({ parserQuarantines: input.package.quarantinedArticles.length })},
      ${input.actor.userId}::uuid
    ) returning id::text
  `;
  const packageId = asString(packageRows[0]?.id);

  const resultItems: WikiImportResult["items"] = [];
  for (const quarantined of input.package.quarantinedArticles) {
    resultItems.push({
      stableId: quarantined.manifest.article_id,
      status: "quarantined",
      errors: quarantined.errors,
    });
  }
  for (const candidate of candidates.filter((item) => item.errors.length > 0)) {
    resultItems.push({
      stableId: candidate.snapshot.stableId,
      status: "quarantined",
      errors: candidate.errors,
    });
  }

  let importedCount = 0;
  for (let index = 0; index < valid.length; index += 1) {
    const candidate = valid[index];
    try {
      const snapshot = replaceAssetReferences(candidate.snapshot, assetUrls);
      const existing = existingByStableId.get(snapshot.stableId);
      const saved = await saveAdminWikiDraft({
        actor: input.actor,
        articleId: existing ? asString(existing.id) : null,
        snapshot,
        autosave: false,
        reason: `Wiki package import ${packageId}`,
        database: input.mode === "merge_queue" ? database as TransactionSql : undefined,
      });
      candidate.articleId = saved.articleId;
      if (input.mode === "auto_schedule" || input.mode === "merge_queue") {
        await publishAdminWikiDraft({
          actor: input.actor,
          articleId: saved.articleId,
          reason: `Automatic schedule from Wiki package ${packageId}`,
          publishAt: scheduleSlots[index].toISOString(),
          database: input.mode === "merge_queue" ? database as TransactionSql : undefined,
        });
        resultItems.push({
          stableId: snapshot.stableId,
          articleId: saved.articleId,
          status: "scheduled",
          scheduledFor: scheduleSlots[index].toISOString(),
          errors: [],
        });
      } else {
        resultItems.push({
          stableId: snapshot.stableId,
          articleId: saved.articleId,
          status: "drafted",
          errors: [],
        });
      }
      importedCount += 1;
    } catch (error) {
      if (input.mode === "merge_queue") throw error;
      resultItems.push({
        stableId: candidate.snapshot.stableId,
        status: "quarantined",
        errors: [error instanceof Error ? error.message : "Article import failed."],
      });
    }
  }

  for (const item of resultItems) {
    await database`
      insert into halleus_private.wiki_import_items (
        package_id, stable_id, article_id, requested_slug, status, errors, scheduled_for
      ) values (
        ${packageId}::uuid, ${item.stableId}, ${item.articleId ?? null}::uuid,
        ${input.package.manifest.articles.find((article) => article.article_id === item.stableId)?.slug ?? null},
        ${item.status === 'drafted' ? 'drafted' : item.status === 'scheduled' ? 'scheduled' : 'quarantined'},
        ${database.json(item.errors)}, ${item.scheduledFor ? new Date(item.scheduledFor) : null}
      )
    `;
  }
  const quarantinedCount = resultItems.filter((item) => item.status === "quarantined").length;
  if (input.mode === "merge_queue" && importedCount !== valid.length) {
    throw new Error("Wiki queue merge stopped because an article could not be applied.");
  }
  if (input.mode === "merge_queue" && input.mergePlan) {
    const existingItems = input.mergePlan.queue.items.filter((item) => !item.jobId.startsWith("new:"));
    {
      const tx = database;
      const jobIds = existingItems.map((item) => item.jobId);
      const runAts = existingItems.map((item) => item.nextRunAt);
      const updated = await tx`
        update halleus_private.wiki_publish_jobs as job
        set run_at = changes.run_at, updated_at = now()
        from unnest(${jobIds}::uuid[], ${runAts}::timestamptz[]) as changes(job_id, run_at)
        where job.id = changes.job_id and job.status in ('queued', 'retry')
        returning job.id::text, job.article_id::text
      `;
      if (updated.length !== existingItems.length) throw new AdminAccessError(409, "WIKI_SCHEDULING_PLAN_STALE");
      const articleIds = existingItems.map((item) => item.articleId);
      await tx`
        update public.wiki_articles as article set scheduled_for = changes.run_at
        from unnest(${articleIds}::uuid[], ${runAts}::timestamptz[]) as changes(article_id, run_at)
        where article.id = changes.article_id and article.status <> 'published'
      `;
      await tx`
        insert into halleus_private.wiki_queue_schedule_snapshots
          (plan_token, policy, previous_daily_capacity, next_daily_capacity,
           queue_snapshot, created_by, reason)
        values (${input.mergePlan!.planToken}, ${input.mergePlan!.queue.policy},
          ${input.mergePlan!.queue.previousDailyCapacity}, ${input.mergePlan!.queue.nextDailyCapacity},
          ${tx.json(existingItems.map((item) => ({ jobId: item.jobId,
            articleId: item.articleId, stableId: item.stableId, runAt: item.currentRunAt })))},
          ${input.actor.userId}::uuid, 'Wiki package merge with current queue')
      `;
    }
  }
  const status = importedCount === 0
    ? "rejected"
    : quarantinedCount > 0
      ? "partially_imported"
      : "imported";
  {
    const tx = database;
    await tx`
      update halleus_private.wiki_import_packages set
        status = ${status}, imported_count = ${importedCount},
        quarantined_count = ${quarantinedCount}, completed_at = now(),
        validation_summary = ${tx.json({
          importedCount,
          quarantinedCount,
          assetCount: input.package.assets.length,
        })}
      where id = ${packageId}::uuid
    `;
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        after_summary, reason, success, request_correlation_id
      ) values (
        ${input.actor.userId}::uuid, ${input.actor.role}, 'admin.wiki.package_imported',
        'wiki_import_package', ${packageId},
        ${tx.json({ status, importedCount, quarantinedCount, mode: input.mode })},
        'Validated standard Wiki package import', ${importedCount > 0},
        ${input.actor.correlationId}
      )
    `;
  }
  return {
    packageId,
    status,
    articleCount: input.package.manifest.articles.length,
    importedCount,
    quarantinedCount,
    items: resultItems,
  };
  };
  if (input.mode === "merge_queue") {
    return sql.begin((tx) => applyImport(tx));
  }
  return applyImport(sql);
}
