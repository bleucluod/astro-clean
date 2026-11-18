import { assertAdminMutationRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse, readObject } from "@/lib/admin/admin-http";
import {
  importSeoGscQueries, readSeoKeywordBank, removeSeoKeyword, saveSeoKeyword,
} from "@/lib/seo/seo-keyword-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const pageKey = new URL(request.url).searchParams.get("pageKey");
    const state = await readSeoKeywordBank(pageKey);
    return noStoreJsonResponse({ ok: true, state });
  } catch (error) {
    return adminErrorResponse(error, "بانک کلیدواژه در دسترس نیست؛ مهاجرت 0044 را بررسی کن.");
  }
}

export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.settings.write");
    const raw = await request.text();
    if (raw.length > 350000) {
      return noStoreJsonResponse({ ok: false, error: "حجم ورودی بیش از حد مجاز است." }, 413);
    }
    let json: unknown;
    try { json = JSON.parse(raw); }
    catch { return noStoreJsonResponse({ ok: false, error: "JSON معتبر نیست." }, 400); }
    const body = readObject(json);
    if (!body) return noStoreJsonResponse({ ok: false, error: "درخواست معتبر نیست." }, 400);
    if (body.action === "save_keyword") {
      await saveSeoKeyword({
        actor, pageKey: body.pageKey, phrase: body.phrase, kind: body.kind,
        originalPhrase: body.originalPhrase,
      });
    } else if (body.action === "remove_keyword") {
      await removeSeoKeyword({ actor, pageKey: body.pageKey, phrase: body.phrase });
    } else if (body.action === "import_gsc") {
      const result = await importSeoGscQueries({
        actor, pageKey: body.pageKey,
        periodStart: body.periodStart, periodEnd: body.periodEnd,
        sourceName: body.sourceName, rows: body.rows,
      });
      return noStoreJsonResponse({ ok: true, result });
    } else {
      return noStoreJsonResponse({ ok: false, error: "عملیات ناشناخته است." }, 400);
    }
    return noStoreJsonResponse({ ok: true });
  } catch (error) {
    return adminErrorResponse(error, "ذخیرهٔ بانک کلیدواژه ناموفق بود.");
  }
}
