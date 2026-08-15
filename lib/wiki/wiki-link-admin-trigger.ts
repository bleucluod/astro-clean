import { getAdminDatabase } from "@/lib/admin/admin-database";

export async function enqueueWikiLinkScanTriggerBestEffort(input: {
  triggerKind: "post_publish" | "periodic";
  articleStableId?: string | null;
}) {
  try {
    const sql = getAdminDatabase();
    await sql`
      insert into halleus_private.wiki_link_scan_triggers (
        trigger_kind, article_stable_id, status, not_before
      ) values (
        ${input.triggerKind},
        ${input.articleStableId ?? null},
        'pending',
        now()
      )
      on conflict (
        trigger_kind,
        (coalesce(article_stable_id, ''))
      ) where status in ('pending','running')
      do nothing
    `;
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
    };
  }
}

export async function ensurePeriodicWikiLinkScanTriggerBestEffort() {
  try {
    const sql = getAdminDatabase();
    const recent = await sql`
      select 1
      from halleus_private.wiki_link_scan_runs
      where status = 'completed'
        and created_at >= now() - interval '24 hours'
      limit 1
    `;
    if (recent[0]) return { ok: true as const, queued: false };
    const queued = await enqueueWikiLinkScanTriggerBestEffort({
      triggerKind: "periodic",
      articleStableId: null,
    });
    return { ...queued, queued: queued.ok };
  } catch (error) {
    return {
      ok: false as const,
      queued: false,
      error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
    };
  }
}
