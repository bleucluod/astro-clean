import { ensurePeriodicWikiLinkScanTriggerBestEffort, enqueueWikiLinkScanTriggerBestEffort } from "@/lib/wiki/wiki-link-admin-trigger";
import { processPendingWikiLinkScanTriggers } from "@/lib/wiki/wiki-link-admin-service";
import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { submitWikiIndexNowUrlsBestEffort } from "@/lib/wiki/wiki-indexnow";
import { processDueWikiPublishJobs } from "@/lib/wiki/wiki-publisher";
import { revalidateWikiPublicPaths } from "@/lib/wiki/wiki-revalidation";

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

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Publisher authorization failed." },
      { status: 401, headers: { "cache-control": "private, no-store" } },
    );
  }
  try {
    const result = await processDueWikiPublishJobs();
    const publicDiscoverySlugs = [
      ...result.publishedSlugs,
      ...result.activatedInboundSourceSlugs,
    ];
    if (publicDiscoverySlugs.length) {
      revalidateWikiPublicPaths(publicDiscoverySlugs, { cachePolicy: "expire-now" });
    }
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
