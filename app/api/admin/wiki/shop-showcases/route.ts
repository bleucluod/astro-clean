import { revalidatePath } from 'next/cache';
import { assertAdminMutationRequest, requireAdminCapability } from '@/lib/admin/admin-auth';
import { adminErrorResponse, noStoreJsonResponse, readObject } from '@/lib/admin/admin-http';
import {
  exportWikiShopShowcaseGuide,
  listConfiguredWikiShowcases,
  listWikiShopShowcaseArticles,
  previewWikiShopShowcaseProposals,
  saveWikiShopShowcaseBatch,
  wikiShopProductCatalog,
} from '@/lib/wiki/wiki-shop-showcase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, 'wiki.read');
    const mode = new URL(request.url).searchParams.get('mode');
    if (mode === 'export') {
      return noStoreJsonResponse({ ok: true, guide: await exportWikiShopShowcaseGuide() });
    }
    return noStoreJsonResponse({
      ok: true,
      configured: await listConfiguredWikiShowcases(),
      articles: (await listWikiShopShowcaseArticles()).map((a) => ({
        articleId: a.id, articleVersion: a.version, title: a.title, slug: a.slug,
        sections: a.sections.map((s, i) => ({ index: i, title: s.title })),
      })),
      products: wikiShopProductCatalog(),
    });
  } catch (error) {
    return adminErrorResponse(error, 'Wiki shop showcase read failed. Check migration 0036.');
  }
}

export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    await requireAdminCapability(request, 'wiki.publish.write');
    const body = readObject(await request.json());
    if (!body || body.action !== 'preview') {
      return noStoreJsonResponse({ ok: false, error: 'Action preview required' }, 400);
    }
    return noStoreJsonResponse({
      ok: true, reviews: await previewWikiShopShowcaseProposals(body.proposals),
    });
  } catch (error) {
    return adminErrorResponse(error, 'Wiki shop proposals preview failed.');
  }
}

export async function PUT(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, 'wiki.publish.write');
    const body = readObject(await request.json());
    if (!body || body.action !== 'apply') {
      return noStoreJsonResponse({ ok: false, error: 'Action apply required' }, 400);
    }
    const updatedSlugs = await saveWikiShopShowcaseBatch(actor, body.items);
    for (const slug of updatedSlugs) revalidatePath('/wiki/' + slug, 'page');
    return noStoreJsonResponse({ ok: true, updatedCount: updatedSlugs.length });
  } catch (error) {
    return adminErrorResponse(error, 'Wiki shop showcase update failed.');
  }
}
