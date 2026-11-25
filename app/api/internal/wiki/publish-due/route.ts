import { ensurePeriodicWikiLinkScanTriggerBestEffort, enqueueWikiLinkScanTriggerBestEffort } from "@/lib/wiki/wiki-link-admin-trigger";
import { processPendingWikiLinkScanTriggers } from "@/lib/wiki/wiki-link-admin-service";
import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import r3Batch03Manifest from "@/content/r3-batch03/release-data-manifest.json";
import r3Batch04Manifest from "@/content/r3-batch04/release-data-manifest.json";
import roadmapV5Batch01 from "@/content/seo/roadmap-v5-wiki-patches-01.json";
import roadmapV5Batch02 from "@/content/seo/roadmap-v5-wiki-patches-02.json";
import roadmapV5Batch03 from "@/content/seo/roadmap-v5-wiki-patches-03.json";
import roadmapV5Batch04 from "@/content/seo/roadmap-v5-wiki-patches-04.json";
import { verifyAppliedArticle } from "@/scripts/roadmap-v5-wiki-edits.mjs";
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

// R3 batch04 was committed directly to the database after release activation.
// Its approved article pages need one authenticated, DB-guarded cache invalidation.
async function revalidateApprovedR3Batch04() {
  const records = r3Batch04Manifest.records;
  if (
    r3Batch04Manifest.schema !== "HALLEUS_R3_BATCH04_MANIFEST_V1" ||
    r3Batch04Manifest.archive_sha256 !== "6557efc1315ba214ce0f70be3b7dbdbb3d88cdab7cd6dc7cae15b75725bc8274" ||
    r3Batch04Manifest.approved_source_commit !== "f13ce25b208fcda5f66e1de1366e7350d9f1d9e3" ||
    r3Batch04Manifest.scope.first !== "W058" ||
    r3Batch04Manifest.scope.last !== "W107" ||
    r3Batch04Manifest.scope.count !== 50 ||
    records.length !== 50 ||
    records.some((record, index) =>
      record.id !== `W${String(index + 58).padStart(3, "0")}` ||
      !Number.isInteger(record.source_version) ||
      record.source_version < 0 ||
      !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(record.slug)
    ) ||
    new Set(records.map((record) => record.slug)).size !== 50
  ) {
    return NextResponse.json(
      { ok: false, reason: "approved-batch04-manifest-invalid" },
      { status: 409, headers: { "cache-control": "private, no-store" } },
    );
  }

  // Refuse cache invalidation unless all 50 approved database updates are committed.
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
    rows.length !== 50 ||
    records.some((record) => {
      const row = byStableId.get(record.slug);
      return !row ||
        String(row.slug) !== record.slug ||
        Number(row.content_version) !== record.source_version + 1;
    })
  ) {
    return NextResponse.json(
      { ok: false, reason: "batch04-database-parity-not-ready" },
      { status: 409, headers: { "cache-control": "private, no-store" } },
    );
  }

  const states = await readWikiPublicRevalidationStates(
    records.map((record) => String(byStableId.get(record.slug)!.id)),
  );
  if (states.some((state, index) =>
    !state || !state.isPublic || state.slug !== records[index].slug
  )) {
    return NextResponse.json(
      { ok: false, reason: "batch04-public-state-mismatch" },
      { status: 409, headers: { "cache-control": "private, no-store" } },
    );
  }

  for (const state of states) {
    if (state) revalidateWikiPublicChange({ before: null, after: state });
  }
  return NextResponse.json(
    { ok: true, kind: "approved-r3-batch04-cache-revalidated", count: states.length },
    { headers: { "cache-control": "private, no-store" } },
  );
}

// One-off cache invalidation for the exact approved roadmap v5 database patch.
async function revalidateApprovedRoadmapV5() {
  const patches = [
    ...roadmapV5Batch01.patches, ...roadmapV5Batch02.patches,
    ...roadmapV5Batch03.patches, ...roadmapV5Batch04.patches,
  ];
  const slugs = patches.map((patch) => patch.slug);
  const pairs = patches.flatMap((patch) =>
    patch.checks.map((check) => patch.slug + "|" + check.destination));
  const notReady = (reason: string) => NextResponse.json(
    { ok: false, reason },
    { status: 409, headers: { "cache-control": "private, no-store" } },
  );
  if (slugs.length !== 52 || new Set(slugs).size !== 52 ||
      slugs.some((slug) => !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(slug)) ||
      pairs.length !== 69 || new Set(pairs).size !== 69) {
    return notReady("roadmap-v5-manifest-invalid");
  }

  const sql = getAdminDatabase();
  const rows = await sql`
    select id::text as id, slug, intro, key_points, sections, body_markdown
    from public.wiki_articles
    where slug = any(${slugs}::text[])
      and status = 'published' and is_indexable = true
      and published_at <= now() and scheduled_for is null and deleted_at is null
  `;
  const bySlug = new Map(rows.map((row) => [String(row.slug), row]));
  if (rows.length !== 52) return notReady("roadmap-v5-database-parity-not-ready");
  for (const patch of patches) {
    const row = bySlug.get(patch.slug);
    if (!row) return notReady("roadmap-v5-database-parity-not-ready");
    try {
      verifyAppliedArticle(row, patch);
    } catch {
      return notReady("roadmap-v5-database-parity-not-ready");
    }
  }
  const states = await readWikiPublicRevalidationStates(
    slugs.map((slug) => String(bySlug.get(slug)!.id)),
  );
  if (states.length !== 52 || states.some((state, index) =>
    !state || !state.isPublic || state.slug !== slugs[index]
  )) return notReady("roadmap-v5-public-state-mismatch");

  for (const state of states) {
    if (state) revalidateWikiPublicChange({ before: null, after: state });
  }
  return NextResponse.json(
    { ok: true, kind: "approved-roadmap-v5-cache-revalidated", count: states.length },
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
    if (request.headers.get("x-halleus-wiki-cache-revalidate") === "r3-batch04") {
      return await revalidateApprovedR3Batch04();
    }
    if (request.headers.get("x-halleus-wiki-cache-revalidate") === "roadmap-v5") {
      return await revalidateApprovedRoadmapV5();
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