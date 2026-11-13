import { randomUUID } from "node:crypto";
import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import { wikiShopProductCatalog } from "@/lib/wiki/wiki-shop-showcase";
import {
  SHOWCASE_SURFACES, SHOWCASE_SURFACE_SLOTS, isShowcaseSurface,
  validateSurfacePlacement, readSurfaceShowcaseDashboard,
  type ShowcaseSurface,
} from "@/lib/shop/shop-showcase-surfaces";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function asArray(raw: unknown): string[] {
  let parsed = raw;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  return Array.isArray(parsed) && parsed.every(s => typeof s === "string")
    ? parsed : [];
}
/** The same AI batch can contain Wiki articles and non-personal public surface templates. */
export async function prepareSurfaceShowcaseAIExport(
  actor: VerifiedAdminActor, batchId: string, productIds: string[],
  selectedSurfaces: string[],
) {
  if (!UUID.test(batchId) || !selectedSurfaces.length ||
      selectedSurfaces.some(s => !isShowcaseSurface(s)) ||
      new Set(selectedSurfaces).size !== selectedSurfaces.length)
    throw new AdminAccessError(400, "انتخاب مقصدهای بستهٔ AI معتبر نیست.");
  if (!productIds.length || productIds.some(id =>
      !wikiShopProductCatalog().some(p => p.id === id)))
    throw new AdminAccessError(400, "محصولات بسته خارج از کاتالوگ هستند.");
  const dashboard = await readSurfaceShowcaseDashboard();
  if (!dashboard.ready) throw new AdminAccessError(409, "ابتدا Migration ویترین‌های چندصفحه‌ای را اجرا کن.");
  const surfaces = selectedSurfaces as ShowcaseSurface[];
  const slots = surfaces.map(surface => ({
    surface, title: surface === "natal" ? "گزارش چارت تولد" :
      surface === "synastry" ? "گزارش سینستری" : "آسمان امروز",
    // Only public template names and generic positions; no user/report/chart data.
    positions: SHOWCASE_SURFACE_SLOTS[surface].map(item => ({
      slot: item.id, label: item.label, approximatePercent: item.percent,
      occupied: dashboard.placements.some(p => p.surface === surface && p.slot === item.id),
      pending: dashboard.proposals.some(p => p.surface === surface && p.slot === item.id),
    })),
    existing: dashboard.placements.filter(p => p.surface === surface),
  }));
  await getAdminDatabase()`insert into halleus_private.shop_showcase_ai_batches
    (id, product_ids, surface_ids, created_by)
    values (${batchId}::uuid, ${JSON.stringify(productIds)}::jsonb,
      ${JSON.stringify(surfaces)}::jsonb, ${actor.userId}::uuid)`;
  return { surfaces, slots };
}

export async function importSurfaceShowcaseAI(
  actor: VerifiedAdminActor, input: unknown,
) {
  const body = asRecord(input);
  if (typeof body.batchId !== "string" || !UUID.test(body.batchId) ||
      !Array.isArray(body.surfaceProposals) || body.surfaceProposals.length > 60)
    throw new AdminAccessError(400, "ساختار پیشنهادهای ویترین صفحات معتبر نیست.");
  const sql = getAdminDatabase();
  const [batch] = await sql`select product_ids, surface_ids
    from halleus_private.shop_showcase_ai_batches
    where id = ${body.batchId}::uuid`;
  if (!batch) throw new AdminAccessError(409, "شناسهٔ بسته با خروجی ادمین تطبیق ندارد.");
  const products = asArray(batch.product_ids);
  const surfaces = asArray(batch.surface_ids);
  const seen = new Set<string>();
  const proposals: Array<{ surface: ShowcaseSurface; slot: string; productId: string;
    title: string; description: string; buttonLabel: string; sourceIndex: number }> = [];
  const errors: Array<{ index: number; error: string }> = [];
  body.surfaceProposals.forEach((raw, index) => {
    try {
      const row = asRecord(raw);
      const item = validateSurfacePlacement({ ...row }, true);
      if (!surfaces.includes(item.surface) || !products.includes(item.productId))
        throw new Error("محصول یا مقصد در بستهٔ اصلی انتخاب نشده است");
      const slotKey = item.surface + ":" + item.slot;
      if (seen.has(slotKey)) throw new Error("تکرار یک جایگاه در بسته");
      seen.add(slotKey);
      proposals.push({ ...item, sourceIndex: index });
    } catch (error) {
      errors.push({ index, error: error instanceof Error ? error.message : "پیشنهاد نامعتبر" });
    }
  });
  const [placements, pending] = await Promise.all([
    sql`select surface, slot from halleus_private.shop_showcase_placements`,
    sql`select surface, slot from halleus_private.shop_showcase_ai_proposals
      where status = 'pending'`,
  ]);
  const occupied = new Set([...placements, ...pending].map(row =>
    asString(row.surface) + ":" + asString(row.slot)));
  const valid = proposals.filter(item => {
    if (!occupied.has(item.surface + ":" + item.slot)) return true;
    errors.push({ index: item.sourceIndex, error: "جایگاه قبلاً اشغال شده یا پیشنهاد در انتظار دارد." });
    return false;
  });
  const accepted = await sql.begin(async tx => {
    let count = 0;
    for (const item of valid) {
      const rows = await tx`insert into halleus_private.shop_showcase_ai_proposals
        (batch_id, surface, slot, product_id, title, description, button_label)
        values (${body.batchId}::uuid, ${item.surface}, ${item.slot},
          ${item.productId}, ${item.title}, ${item.description}, ${item.buttonLabel})
        on conflict (batch_id, surface, slot) do nothing returning id`;
      if (rows[0]) count++;
    }
    if (count) await tx`insert into halleus_private.admin_audit_events
      (actor_user_id, actor_role, action, target_type, target_id, before_summary,
       after_summary, success, request_correlation_id)
      values (${actor.userId}::uuid, ${actor.role}, 'shop.showcase.ai.import',
        'shop_showcase_ai_batch', ${body.batchId}, null,
        ${JSON.stringify({ accepted: count })}::jsonb, true,
        ${actor.correlationId || randomUUID()})`;
    return count;
  });
  return { accepted, errors };
}

export const PUBLIC_SHOWCASE_SURFACES = SHOWCASE_SURFACES;
