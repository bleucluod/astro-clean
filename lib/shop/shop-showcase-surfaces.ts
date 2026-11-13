import { randomUUID } from "node:crypto";
import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { asNumber, asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import { wikiShopProductCatalog } from "@/lib/wiki/wiki-shop-showcase";

import {
  SHOWCASE_SURFACE_SLOTS, isShowcaseSurface, isShowcaseSlot,
  type ShowcaseSurface, type SurfaceOffer, type SurfacePlacement, type SurfaceProposal,
} from "@/lib/shop/shop-showcase-contract";
export {
  SHOWCASE_SURFACE_SLOTS, SHOWCASE_SURFACES,
  isShowcaseSurface, isShowcaseSlot,
  type ShowcaseSurface, type SurfaceOffer, type SurfacePlacement, type SurfaceProposal,
} from "@/lib/shop/shop-showcase-contract";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRODUCT_ID = /^[a-z][a-z0-9_-]{1,39}$/;

const inputText = (value: unknown, max: number, name: string) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new AdminAccessError(400, "فیلد نامعتبر: " + name);
  return value.trim();
};
export function validateSurfacePlacement(raw: unknown, shouldEnable = true) {
  const input = asRecord(raw);
  if (!isShowcaseSurface(input.surface) || !isShowcaseSlot(input.surface, input.slot))
    throw new AdminAccessError(400, "مقصد یا موقعیت ویترین معتبر نیست.");
  const productId = inputText(input.productId, 40, "productId");
  const product = wikiShopProductCatalog().find(p => p.id === productId);
  if (!PRODUCT_ID.test(productId) || !product)
    throw new AdminAccessError(400, "محصول خارج از کاتالوگ است.");
  if (shouldEnable && !product.orderable)
    throw new AdminAccessError(409, "فروش این محصول هنوز فعال نیست.");
  return {
    surface: input.surface, slot: input.slot, productId,
    title: inputText(input.title, 160, "title"),
    description: inputText(input.description, 500, "description"),
    buttonLabel: inputText(input.buttonLabel, 80, "buttonLabel"),
  };
}
function asPlacement(raw: unknown): SurfacePlacement {
  const r = asRecord(raw);
  return { id: asString(r.id), surface: r.surface as ShowcaseSurface,
    slot: asString(r.slot), productId: asString(r.product_id),
    title: asString(r.title), description: asString(r.description),
    buttonLabel: asString(r.button_label), enabled: r.enabled === true,
    expectedRevision: asNumber(r.revision) };
}
export async function listPublicSurfaceOffers(surface: ShowcaseSurface): Promise<SurfaceOffer[]> {
  try {
    const rows = await getAdminDatabase()`select id::text, surface, slot, product_id,
      title, description, button_label
      from halleus_private.shop_showcase_placements
      where surface = ${surface} and enabled = true`;
    const products = new Map<string, ReturnType<typeof wikiShopProductCatalog>[number]>();
    for (const product of wikiShopProductCatalog()) {
      if (product.orderable) products.set(product.id, product);
    }
    return rows.flatMap(row => {
      const product = products.get(asString(row.product_id));
      if (!product?.image || !isShowcaseSlot(surface, row.slot)) return [];
      return [{ id: asString(row.id), surface, slot: asString(row.slot),
        productId: product.id, title: asString(row.title),
        description: asString(row.description), buttonLabel: asString(row.button_label),
        url: product.url, image: product.image, imageAlt: product.name }];
    });
  } catch (error) {
    console.warn("SURFACE_SHOWCASE_READ_UNAVAILABLE", asString(asRecord(error).code) || "unknown");
    return []; // Marketing never blocks the report or Sky.
  }
}
export async function readSurfaceShowcaseDashboard() {
  const products = wikiShopProductCatalog();
  try {
    const sql = getAdminDatabase();
    const [placements, proposals, stats] = await Promise.all([
      sql`select id::text, surface, slot, product_id, title, description, button_label,
        enabled, revision from halleus_private.shop_showcase_placements order by surface, slot`,
      sql`select id::text, batch_id::text, surface, slot, product_id, title,
        description, button_label, status from halleus_private.shop_showcase_ai_proposals
        where status = 'pending' order by created_at desc limit 500`,
      sql`select showcase_id::text, sum(impressions)::text as impressions,
        sum(clicks)::text as clicks from halleus_private.shop_showcase_daily_metrics
        where day >= (now() at time zone 'UTC')::date - 29 group by showcase_id`,
    ]);
    return { ready: true, products, slots: SHOWCASE_SURFACE_SLOTS,
      placements: placements.map(asPlacement),
      proposals: proposals.map(raw => {
        const r = asRecord(raw);
        return { id: asString(r.id), batchId: asString(r.batch_id),
          surface: r.surface as ShowcaseSurface, slot: asString(r.slot),
          productId: asString(r.product_id), title: asString(r.title),
          description: asString(r.description), buttonLabel: asString(r.button_label),
          status: asString(r.status) } as SurfaceProposal;
      }),
      metrics: stats.map(r => ({ showcaseId: asString(r.showcase_id),
        impressions: asNumber(r.impressions), clicks: asNumber(r.clicks) })) };
  } catch (error) {
    if (asRecord(error).code !== "42P01" && asRecord(error).code !== "3F000") throw error;
    return { ready: false, products, slots: SHOWCASE_SURFACE_SLOTS,
      placements: [] as SurfacePlacement[], proposals: [] as SurfaceProposal[],
      metrics: [] as Array<{ showcaseId: string; impressions: number; clicks: number }> };
  }
}
export async function saveSurfacePlacement(actor: VerifiedAdminActor, raw: unknown) {
  const input = asRecord(raw);
  const item = validateSurfacePlacement(raw, input.enabled === true);
  const id = input.id == null ? null : inputText(input.id, 36, "id");
  const revision = input.expectedRevision ?? 0;
  if ((id && !UUID.test(id)) || typeof revision !== "number" ||
      !Number.isSafeInteger(revision) || (id ? revision < 1 : revision !== 0))
    throw new AdminAccessError(400, "نسخهٔ ویترین معتبر نیست.");
  const sql = getAdminDatabase();
  return sql.begin(async tx => {
    const rows = id ? await tx`update halleus_private.shop_showcase_placements
      set surface = ${item.surface}, slot = ${item.slot}, product_id = ${item.productId},
        title = ${item.title}, description = ${item.description},
        button_label = ${item.buttonLabel}, enabled = ${input.enabled === true},
        revision = revision + 1, updated_by = ${actor.userId}::uuid, updated_at = now()
      where id = ${id}::uuid and revision = ${revision} returning id::text` :
      await tx`insert into halleus_private.shop_showcase_placements
        (surface, slot, product_id, title, description, button_label, enabled, updated_by)
        values (${item.surface}, ${item.slot}, ${item.productId}, ${item.title},
          ${item.description}, ${item.buttonLabel}, ${input.enabled === true},
          ${actor.userId}::uuid)
        on conflict (surface, slot) do nothing returning id::text`;
    if (!rows[0]) throw new AdminAccessError(409, "جایگاه اشغال شده یا ویترین تغییر کرده؛ تازه‌سازی کن.");
    const savedId = asString(rows[0].id);
    await tx`insert into halleus_private.admin_audit_events
      (actor_user_id, actor_role, action, target_type, target_id,
        before_summary, after_summary, success, request_correlation_id)
      values (${actor.userId}::uuid, ${actor.role}, 'shop.showcase.save',
        'shop_showcase', ${savedId}, null,
        ${JSON.stringify({ surface: item.surface, slot: item.slot,
          productId: item.productId, enabled: input.enabled === true })}::jsonb,
        true, ${actor.correlationId || randomUUID()})`;
    return { id: savedId };
  });
}
export async function reviewSurfaceProposal(actor: VerifiedAdminActor,
  raw: unknown, decision: "publish" | "reject", draft?: unknown) {
  if (typeof raw !== "string" || !UUID.test(raw))
    throw new AdminAccessError(400, "شناسهٔ پیشنهاد نامعتبر است.");
  const sql = getAdminDatabase();
  return sql.begin(async tx => {
    const [p] = await tx`select id::text, surface, slot, product_id, title, description,
      button_label from halleus_private.shop_showcase_ai_proposals
      where id = ${raw}::uuid and status = 'pending' for update`;
    if (!p) throw new AdminAccessError(409, "پیشنهاد قبلاً بررسی شده.");
    if (decision === "publish") {
      const draftInput = asRecord(draft);
      const item = validateSurfacePlacement({
        surface: p.surface, slot: p.slot, productId: p.product_id,
        title: p.title, description: p.description, buttonLabel: p.button_label,
        ...draftInput,
      });
      if (item.surface !== p.surface)
        throw new AdminAccessError(400, "مقصد پیشنهاد قابل تغییر نیست.");
      const saved = await tx`insert into halleus_private.shop_showcase_placements
        (surface, slot, product_id, title, description, button_label, enabled, updated_by)
        values (${item.surface}, ${item.slot}, ${item.productId}, ${item.title},
          ${item.description}, ${item.buttonLabel}, true, ${actor.userId}::uuid)
        on conflict (surface, slot) do nothing returning id`;
      if (!saved[0]) throw new AdminAccessError(409, "جایگاه از قبل ویترین دارد.");
    }
    await tx`update halleus_private.shop_showcase_ai_proposals
      set status = ${decision === "publish" ? "published" : "rejected"},
      reviewed_by = ${actor.userId}::uuid, updated_at = now() where id = ${raw}::uuid`;
    await tx`insert into halleus_private.admin_audit_events
      (actor_user_id, actor_role, action, target_type, target_id,
       before_summary, after_summary, success, request_correlation_id)
      values (${actor.userId}::uuid, ${actor.role}, ${"shop.showcase." + decision},
        'shop_showcase_proposal', ${raw}, null, ${JSON.stringify({ decision })}::jsonb,
        true, ${actor.correlationId || randomUUID()})`;
    return { id: raw, decision };
  });
}
