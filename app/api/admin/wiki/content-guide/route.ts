import { readFile } from "node:fs/promises";
import path from "node:path";

import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse } from "@/lib/admin/admin-http";
import {
  listWikiCategories,
  listWikiContentGuideInventory,
  listWikiContentGuideQueue,
} from "@/lib/wiki/wiki-cms-service";
import { buildLiveWikiContentGuide } from "@/lib/wiki/wiki-content-guide";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const [baseGuide, categories, articles, queue] = await Promise.all([
      readFile(path.join(process.cwd(), "public", "halleus-wiki-package-guide-v1.md"), "utf8"),
      listWikiCategories(),
      listWikiContentGuideInventory(),
      listWikiContentGuideQueue(),
    ]);
    const content = buildLiveWikiContentGuide({
      baseGuide,
      categories,
      articles,
      queue,
      generatedAt: new Date(),
    });
    return new Response(content, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": 'attachment; filename="halleus-wiki-content-guide-live.md"',
        "content-type": "text/markdown; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return adminErrorResponse(error, "Wiki content guide generation failed.");
  }
}
