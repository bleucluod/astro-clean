import { ensurePeriodicWikiLinkScanTriggerBestEffort, enqueueWikiLinkScanTriggerBestEffort } from "@/lib/wiki/wiki-link-admin-trigger";
import { processPendingWikiLinkScanTriggers } from "@/lib/wiki/wiki-link-admin-service";
import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import r3Batch03Manifest from "@/content/r3-batch03/release-data-manifest.json";
import { getAdminDatabase } from "@/lib/admin/admin-database";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { submitWikiIndexNowUrlsBestEffort } from "@/lib/wiki/wiki-indexnow";
import { processDueWikiPublishJobs } from "@/lib/wiki/wiki-publisher";
import {
  readWikiPublicRevalidationState,
  readWikiPublicRevalidationStates,
  revalidateWikiPublicChange,
} from "@/lib/wiki/wiki-revalidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = getHalleusRuntimeEnv().wikiPublisherSecret;
  const supplied = request.headers.get("x-halleus-publisher-secret") ?? "";
  if (!expected || !supplied) {
    return false;
  }
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}


async function revalidateApprovedR3Batch03() {
  const records = r3Batch03Manifest.records;
  if (
    r3Batch03Manifest.schema !== "HALLEUS_R3_BATCH03_MANIFEST_V1" ||
    r3Batch03Manifest.approval_state_head !== "e99986441d2294aa71c131050d2670b85e5af883" ||
    records.length !== 30 ||
    records.some((record, index) =>
      record.id !== `W${String(index + 28).padStart(3, "0")}` ||
      !Number.isInteger(record.source_version) ||
      !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(record.slug)
    ) ||
    new Set(records.map((record) => record.slug)).size !== 30
  ) {
    return NextResponse.json(
      { ok: false, reason: "approved-batch03-manifest-invalid" },
      { status: 409, headers: { "cache-control": "private, no-store" } },
    );
  }

  // The approved transaction must have committed completely before any invalidation.
  const sql = getAdminDatabase();
  const slugs = records.map((record) => record.slug);
  const rows = await sql`
    select id::text as id, stable_id, slug, content_version
    from public.wiki_articles
    where stable_id = any(${slugs}::text[])
      and status = 'published'
      and is_indexable = true
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
  `;
  const byStableId = new Map(rows.map((row) => [String(row.stable_id), row]));
  if (
    rows.length !== 30 ||
    records.some((record) => {
      const row = byStableId.get(record.slug);
      return !row ||
        String(row.slug) !== record.slug ||
        Number(row.content_version) !== record.source_version + 1;
    })
  ) {
    return NextResponse.json(
      { ok: false, reason: "batch03-database-parity-not-ready" },
      { status: 409, headers: { "cache-control": "private, no-store" } },
    );
  }

  const states = await readWikiPublicRevalidationStates(
    records.map((record) => String(byStableId.get(record.slug)!.id)),
  );
  if (states.some((state, index) => !state || !state.isPublic || state.slug !== records[index].slug)) {
    return NextResponse.json(
      { ok: false, reason: "batch03-public-state-mismatch" },
      { status: 409, headers: { "cache-control": "private, no-store" } },
    );
  }

  for (const state of states) {
    if (!state) continue;
    revalidateWikiPublicChange({ before: null, after: state });
  }

  return NextResponse.json(
    { ok: true, kind: "approved-r3-batch03-cache-revalidated", count: states.length },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Publisher authorization failed." },
      { status: 401, headers: { "cache-control": "private, no-store" } },
    );
  }
  try {
    // Explicit one-off after the audited R3 database transaction; never run on timer requests.
    if (request.headers.get("x-halleus-wiki-cache-revalidate") === "r3-batch03") {
      return await revalidateApprovedR3Batch03();
    }
    const result = await processDueWikiPublishJobs();
    for (const change of result.publishedChanges) {
      const after = await readWikiPublicRevalidationState(change.articleId);
      revalidateWikiPublicChange({
        before: change.before,
        after,
        extraArticleSlugs: change.activatedInboundSourceSlugs,
      });
    }

    const publicDiscoverySlugs = [
      ...result.publishedSlugs,
      ...result.activatedInboundSourceSlugs,
    ];
    const discovery = await submitWikiIndexNowUrlsBestEffort(
      [...publicDiscoverySlugs, "/wiki", "/sitemap.xml"],
      "scheduled-wiki-publish",
    );
    // HALLEUS_WIKI_LINK_MAINTENANCE_BEST_EFFORT
    let linkMaintenance: Record<string, unknown>;
    try {
      if (result.publishedSlugs.length) {
        await enqueueWikiLinkScanTriggerBestEffort({
          triggerKind: "post_publish",
          articleStableId: null,
        });
      }
      const periodic = await ensurePeriodicWikiLinkScanTriggerBestEffort();
      const scans = await processPendingWikiLinkScanTriggers(2);
      linkMaintenance = { ok: true, periodic, scans };
    } catch (error) {
      linkMaintenance = {
        ok: false,
        error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
      };
    }
    const ok = result.failed === 0;
    return NextResponse.json(
      { ok, result, discovery, linkMaintenance },
      {
        status: ok ? 200 : 500,
        headers: { "cache-control": "private, no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Wiki publisher run failed." },
      { status: 500, headers: { "cache-control": "private, no-store" } },
    );
  }
}