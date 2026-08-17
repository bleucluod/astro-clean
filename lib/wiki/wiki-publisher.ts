import { asNumber, asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import type { WikiArticleSnapshot } from "@/lib/wiki/wiki-cms-types";
import { readWikiArticleSnapshot } from "@/lib/wiki/wiki-cms-validation";
import {
  findWikiInternalArticleIds,
  findWikiPublicationDependencyIds,
} from "@/lib/wiki/wiki-markdown";

async function publishClaimedJob(jobId: string) {
  const sql = getAdminDatabase();
  let publishedSlug = "";
  await sql.begin(async (tx) => {
    const rows = await tx`
      select job.article_id::text, job.revision_number, revision.snapshot,
             article.slug as previous_slug
      from halleus_private.wiki_publish_jobs as job
      join public.wiki_article_revisions as revision
        on revision.article_id = job.article_id and revision.revision_number = job.revision_number
      join public.wiki_articles as article on article.id = job.article_id
      where job.id = ${jobId}::uuid and job.status = 'running'
      for update of job, article
    `;
    if (!rows[0]) {
      throw new Error("Claimed Wiki publish job is no longer available.");
    }
    const row = asRecord(rows[0]);
    const articleId = asString(row.article_id);
    const revisionNumber = asNumber(row.revision_number);
    const previousSlug = asString(row.previous_slug);
    const snapshot: WikiArticleSnapshot = readWikiArticleSnapshot(row.snapshot);
    publishedSlug = snapshot.slug;

    const references = [...new Set([
      ...snapshot.relatedArticleIds,
      ...findWikiInternalArticleIds(snapshot.bodyMarkdown),
    ])].filter((stableId) => stableId !== snapshot.stableId);
    const publicationDependencies = findWikiPublicationDependencyIds(
      snapshot.relatedArticleIds,
      snapshot.stableId,
    );
    const dependencyRows = references.length
      ? await tx`
          select stable_id, slug, status, published_at
          from public.wiki_articles
          where stable_id = any(${references}::text[]) and deleted_at is null
        `
      : [];
    const dependencyMap = new Map(dependencyRows.map((item) => [asString(item.stable_id), item]));
    const missing = references.filter((stableId) => !dependencyMap.has(stableId));
    if (missing.length) {
      throw new Error(`Scheduled Wiki dependencies are missing: ${missing.join(", ")}`);
    }
    const unpublished = publicationDependencies.filter((stableId) => {
      const dependency = dependencyMap.get(stableId);
      return dependency?.status !== "published" || !dependency.published_at;
    });
    if (unpublished.length) {
      throw new Error(`Scheduled Wiki dependencies are not published yet: ${unpublished.join(", ")}`);
    }
    // HALLEUS_BATCH4_R19_PUBLISH_MIN3_GATE
    // HALLEUS_WIKI_OUTGOING_MIN_RULE_DRIVEN
    // Incoming backlinks keep the existing min3 publication gate. Outgoing contextual
    // links follow the active admin rule, so outgoingMin=0 means no outgoing quota gate.
    if (snapshot.indexable) {
      const activeLinkRuleRows = await tx`
        select config
        from halleus_private.wiki_link_rule_versions
        where is_active = true
        order by version desc
        limit 2
      `;
      if (activeLinkRuleRows.length !== 1) {
        throw new Error(`Scheduled Wiki publication requires exactly one active link rule; found ${activeLinkRuleRows.length}.`);
      }
      const activeLinkRuleConfig = asRecord(activeLinkRuleRows[0].config);
      const outgoingMinimum = asNumber(activeLinkRuleConfig.outgoingMin);
      if (!Number.isInteger(outgoingMinimum) || outgoingMinimum < 0 || outgoingMinimum > 20) {
        throw new Error("Active Wiki outgoingMin rule is invalid.");
      }

      const contextualTargetIds = [...new Set(findWikiInternalArticleIds(snapshot.bodyMarkdown))]
        .filter((stableId) => stableId !== snapshot.stableId);
      const currentPublicTargetRows = contextualTargetIds.length
        ? await tx`
            select stable_id
            from public.wiki_articles
            where stable_id = any(${contextualTargetIds}::text[])
              and status = 'published'
              and is_indexable = true
              and published_at is not null
              and published_at <= now()
              and scheduled_for is null
              and deleted_at is null
          `
        : [];
      const validOutgoingIds = new Set(
        currentPublicTargetRows.map((item) => asString(item.stable_id)).filter(Boolean),
      );
      if (outgoingMinimum > 0 && validOutgoingIds.size < outgoingMinimum) {
        throw new Error(
          `Scheduled Wiki outgoing rule blocked publication: outgoing=${validOutgoingIds.size}; minimum=${outgoingMinimum}; ` +
          `article=${snapshot.stableId}; prepare the configured number of distinct contextual links to current-public articles.`,
        );
      }

      const currentPublicSourceRows = await tx`
        select stable_id, body_markdown
        from public.wiki_articles
        where id <> ${articleId}::uuid
          and status = 'published'
          and is_indexable = true
          and published_at is not null
          and published_at <= now()
          and scheduled_for is null
          and deleted_at is null
      `;
      const validIncomingSourceIds = new Set(
        currentPublicSourceRows
          .filter((item) =>
            findWikiInternalArticleIds(asString(item.body_markdown)).includes(snapshot.stableId)
          )
          .map((item) => asString(item.stable_id))
          .filter(Boolean),
      );
      if (validIncomingSourceIds.size < 3) {
        throw new Error(
          `Scheduled Wiki min3 gate blocked publication: incoming=${validIncomingSourceIds.size}; ` +
          `article=${snapshot.stableId}; prepare contextual backlinks from at least 3 distinct current-public articles.`,
        );
      }
    }

    const relatedSlugs = snapshot.relatedArticleIds
      .map((stableId) => dependencyMap.get(stableId))
      .map((item) => item ? asString(item.slug) : "")
      .filter(Boolean);
    const slugConflict = await tx`
      select id from public.wiki_articles
      where slug = ${snapshot.slug} and id <> ${articleId}::uuid and deleted_at is null
      limit 1
    `;
    if (slugConflict[0]) {
      throw new Error("Scheduled Wiki slug now conflicts with another article.");
    }

    await tx`
      update public.wiki_articles set
        slug = ${snapshot.slug}, category_id = ${snapshot.categoryId}, title = ${snapshot.title},
        short_title = ${snapshot.shortTitle}, seo_title = ${snapshot.seoTitle},
        meta_description = ${snapshot.metaDescription}, summary = ${snapshot.summary},
        intro = ${snapshot.intro}, reading_minutes = ${snapshot.readingMinutes},
        key_points = ${tx.json(snapshot.keyPoints)}, sections = ${tx.json(snapshot.sections)},
        context_links = ${tx.json(snapshot.contextLinks)}, sources = ${tx.json(snapshot.sources)},
        call_to_action = ${snapshot.callToAction ? tx.json(snapshot.callToAction) : null},
        related_slugs = ${tx.json(relatedSlugs)}, status = 'published',
        is_indexable = ${snapshot.indexable}, published_at = now(), scheduled_for = null,
        body_markdown = ${snapshot.bodyMarkdown}, tags = ${tx.json(snapshot.tags)},
        publication_priority = ${snapshot.publicationPriority},
        content_cluster = ${snapshot.contentCluster}, article_role = ${snapshot.articleRole},
        content_version = ${snapshot.contentVersion},
        related_article_ids = ${tx.json(snapshot.relatedArticleIds)},
        deleted_at = null, deleted_by = null, deleted_from_status = null
      where id = ${articleId}::uuid
    `;
    await tx`
      update public.wiki_redirects
      set is_active = false, updated_at = now()
      where source_slug = ${snapshot.slug}
        and target_article_id = ${articleId}::uuid
    `;
    if (previousSlug !== snapshot.slug) {
      await tx`
        insert into public.wiki_redirects (source_slug, target_article_id, created_by)
        values (${previousSlug}, ${articleId}::uuid, null)
        on conflict (source_slug) do update set
          target_article_id = excluded.target_article_id, is_active = true, updated_at = now()
      `;
    }
    await tx`delete from public.wiki_internal_links where source_article_id = ${articleId}::uuid`;
    for (const targetId of [...new Set(findWikiInternalArticleIds(snapshot.bodyMarkdown))]) {
      await tx`
        insert into public.wiki_internal_links (source_article_id, target_stable_id, link_kind, source_token)
        values (${articleId}::uuid, ${targetId}, 'inline', ${`[[article:${targetId}]]`})
      `;
    }
    for (const targetId of snapshot.relatedArticleIds) {
      await tx`
        insert into public.wiki_internal_links (source_article_id, target_stable_id, link_kind, source_token)
        values (${articleId}::uuid, ${targetId}, 'related', ${targetId})
        on conflict do nothing
      `;
    }
    await tx`
      update halleus_private.wiki_publish_jobs
      set status = 'published', completed_at = now(), locked_at = null, last_error = null
      where id = ${jobId}::uuid
    `;
    const health = await tx`
      select 1
      from public.wiki_articles
      where id = ${articleId}::uuid
        and status = 'published'
        and published_at <= now()
        and scheduled_for is null
        and deleted_at is null
      limit 1
    `;
    if (!health[0]) {
      throw new Error("Post-publish database health check failed.");
    }
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        before_summary, after_summary, reason, success, request_correlation_id
      ) values (
        null, 'system', 'system.wiki.scheduled_article_published', 'wiki_article', ${articleId},
        ${tx.json({ slug: previousSlug })},
        ${tx.json({ slug: snapshot.slug, revisionNumber, jobId })},
        'Due Wiki publish job', true, ${`wiki-publisher:${jobId}`}
      )
    `;
  });
  return publishedSlug;
}

async function failClaimedJob(jobId: string, error: unknown) {
  const sql = getAdminDatabase();
  const message = error instanceof Error ? error.message.slice(0, 2000) : "Unknown publisher failure";
  await sql.begin(async (tx) => {
    const rows = await tx`
      update halleus_private.wiki_publish_jobs set
        status = case when attempt_count >= 3 then 'failed' else 'retry' end,
        run_at = case when attempt_count >= 3 then run_at else now() + (attempt_count * interval '5 minutes') end,
        last_error = ${message}, locked_at = null,
        completed_at = case when attempt_count >= 3 then now() else null end
      where id = ${jobId}::uuid
      returning article_id::text, attempt_count, status
    `;
    const row = asRecord(rows[0]);
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        after_summary, reason, success, request_correlation_id
      ) values (
        null, 'system', 'system.wiki.scheduled_publish_failed', 'wiki_publish_job', ${jobId},
        ${tx.json({
          articleId: asString(row.article_id),
          attemptCount: asNumber(row.attempt_count),
          status: asString(row.status),
          error: message,
        })},
        'Bounded Wiki publisher retry', false, ${`wiki-publisher:${jobId}`}
      )
    `;
  });
}

export async function processDueWikiPublishJobs(limit = 10) {
  const sql = getAdminDatabase();
  const settings = await sql`
    select publishing_paused
    from halleus_private.wiki_schedule_settings where singleton = true
  `;
  if (settings[0]?.publishing_paused === true) {
    return { paused: true, publishedSlugs: [], failed: 0 };
  }
  await sql`
    update halleus_private.wiki_publish_jobs
    set status = case when attempt_count >= 3 then 'failed' else 'retry' end,
        locked_at = null,
        run_at = case when attempt_count >= 3 then run_at else now() end,
        completed_at = case when attempt_count >= 3 then now() else null end,
        last_error = 'Recovered a stale publisher lock.'
    where status = 'running' and locked_at < now() - interval '15 minutes'
  `;
  const publishedSlugs: string[] = [];
  let failed = 0;
  for (let index = 0; index < Math.min(Math.max(limit, 1), 25); index += 1) {
    const claimed = await sql.begin(async (tx) => {
      const rows = await tx`
        select id::text
        from halleus_private.wiki_publish_jobs
        where status in ('queued', 'retry')
          and attempt_count < 3
          and run_at <= now()
        order by run_at, created_at
        for update skip locked
        limit 1
      `;
      if (!rows[0]) {
        return null;
      }
      const jobId = asString(rows[0].id);
      const claimedRows = await tx`
        update halleus_private.wiki_publish_jobs
        set status = 'running', locked_at = now(), attempt_count = attempt_count + 1
        where id = ${jobId}::uuid
          and status in ('queued', 'retry')
          and attempt_count < 3
        returning id::text
      `;
      if (!claimedRows[0]) {
        return null;
      }
      return jobId;
    });
    if (!claimed) {
      break;
    }
    try {
      publishedSlugs.push(await publishClaimedJob(claimed));
    } catch (error) {
      failed += 1;
      await failClaimedJob(claimed, error);
    }
  }
  return { paused: false, publishedSlugs, failed };
}
