import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { asNumber, asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
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

export async function importValidatedWikiPackage(input: {
  actor: VerifiedAdminActor;
  package: ValidatedWikiPackage;
  mode: WikiImportMode;
}): Promise<WikiImportResult> {
  const sql = getAdminDatabase();
  const duplicate = await sql`
    select id::text from halleus_private.wiki_import_packages
    where package_hash = ${input.package.packageHash}
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
      select run_at::text from halleus_private.wiki_publish_jobs
      where status in ('queued', 'retry', 'running')
    `,
  ]);
  const categories = new Set(categoryRows.map((row) => asString(row.id)));
  const existingByStableId = new Map(articleRows.map((row) => [asString(row.stable_id), asRecord(row)]));
  const existingBySlug = new Map(articleRows.map((row) => [asString(row.slug), asRecord(row)]));
  const packageIds = new Set(input.package.manifest.articles.map((article) => article.article_id));
  const brokenPackageIds = new Set(input.package.quarantinedArticles.map((item) => item.manifest.article_id));
  const candidates: Candidate[] = input.package.articles.map((item) => ({
    snapshot: item.snapshot,
    errors: [],
  }));

  for (const candidate of candidates) {
    const { snapshot } = candidate;
    if (!categories.has(snapshot.categoryId)) {
      candidate.errors.push(`Unknown Wiki category: ${snapshot.categoryId}`);
    }
    const existing = existingByStableId.get(snapshot.stableId);
    if (existing?.deleted_at) {
      candidate.errors.push("Restore the existing deleted article before importing a revision.");
    }
    if (existing && snapshot.contentVersion <= asNumber(existing.content_version)) {
      candidate.errors.push("Imported article version is not newer than the stored version.");
    }
    const slugOwner = existingBySlug.get(snapshot.slug);
    if (slugOwner && asString(slugOwner.stable_id) !== snapshot.stableId) {
      candidate.errors.push("Requested slug belongs to a different stable article ID.");
    }
    const missing = snapshot.relatedArticleIds.filter((target) =>
      target !== snapshot.stableId &&
      (!packageIds.has(target) && !existingByStableId.has(target) || brokenPackageIds.has(target)),
    );
    if (missing.length) {
      candidate.errors.push(`Missing or quarantined dependencies: ${missing.join(", ")}`);
    }
  }

  const ordered = orderCandidates(candidates, settings.pillarBeforeSupport);
  const valid = ordered.filter((candidate) => candidate.errors.length === 0);
  const scheduleSlots = input.mode === "auto_schedule"
    ? computeWikiScheduleSlots({
        settings,
        existingRunAt: existingJobRows.map((row) => asString(row.run_at)),
        count: valid.length,
      })
    : [];

  const packageRows = await sql`
    insert into halleus_private.wiki_import_packages (
      package_name, package_hash, schema_version, import_mode, article_count,
      quarantined_count, validation_summary, uploaded_by
    ) values (
      ${input.package.fileName}, ${input.package.packageHash}, 1, ${input.mode},
      ${input.package.manifest.articles.length}, ${input.package.quarantinedArticles.length},
      ${sql.json({ parserQuarantines: input.package.quarantinedArticles.length })},
      ${input.actor.userId}::uuid
    ) returning id::text
  `;
  const packageId = asString(packageRows[0]?.id);

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
      });
      candidate.articleId = saved.articleId;
      if (input.mode === "auto_schedule") {
        await publishAdminWikiDraft({
          actor: input.actor,
          articleId: saved.articleId,
          reason: `Automatic schedule from Wiki package ${packageId}`,
          publishAt: scheduleSlots[index].toISOString(),
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
      resultItems.push({
        stableId: candidate.snapshot.stableId,
        status: "quarantined",
        errors: [error instanceof Error ? error.message : "Article import failed."],
      });
    }
  }

  for (const item of resultItems) {
    await sql`
      insert into halleus_private.wiki_import_items (
        package_id, stable_id, article_id, requested_slug, status, errors, scheduled_for
      ) values (
        ${packageId}::uuid, ${item.stableId}, ${item.articleId ?? null}::uuid,
        ${input.package.manifest.articles.find((article) => article.article_id === item.stableId)?.slug ?? null},
        ${item.status === 'drafted' ? 'drafted' : item.status === 'scheduled' ? 'scheduled' : 'quarantined'},
        ${sql.json(item.errors)}, ${item.scheduledFor ? new Date(item.scheduledFor) : null}
      )
    `;
  }
  const quarantinedCount = resultItems.filter((item) => item.status === "quarantined").length;
  const status = importedCount === 0
    ? "rejected"
    : quarantinedCount > 0
      ? "partially_imported"
      : "imported";
  await sql.begin(async (tx) => {
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
  });
  return {
    packageId,
    status,
    articleCount: input.package.manifest.articles.length,
    importedCount,
    quarantinedCount,
    items: resultItems,
  };
}
