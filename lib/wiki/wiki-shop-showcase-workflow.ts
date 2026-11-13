import { randomUUID } from "node:crypto";
import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { asNumber, asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import type { WikiArticleSection } from "@/lib/wiki/wiki-content";
import { wikiShowcaseSectionAnchor, resolveWikiShowcaseSection } from "./wiki-showcase-anchor";
import { makeWikiShowcaseZip, type ZipFile } from "./wiki-showcase-zip";
import { wikiShopProductCatalog } from "./wiki-shop-showcase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BATCH = 25;
type Row = Record<string, unknown>;
type StoredArticle = {
  articleId: string; stableId: string; slug: string; title: string;
  categoryId: string; status: string; indexable: boolean;
  updatedAt: string; publishedAt: string | null; scheduledFor: string | null;
  articleVersion: number; intro: string; summary: string; sections: WikiArticleSection[];
};
const isPublic = (a: StoredArticle) => a.status === "published" && a.indexable &&
  Boolean(a.publishedAt) && new Date(a.publishedAt as string).getTime() <= Date.now() &&
  !a.scheduledFor;

function articleFromRow(raw: unknown): StoredArticle {
  const r = asRecord(raw);
  return {
    articleId: asString(r.id), stableId: asString(r.stable_id),
    slug: asString(r.slug), title: asString(r.title), categoryId: asString(r.category_id),
    status: asString(r.status), indexable: r.is_indexable === true,
    updatedAt: asString(r.updated_at),
    publishedAt: r.published_at ? String(r.published_at) : null,
    scheduledFor: r.scheduled_for ? String(r.scheduled_for) : null,
    articleVersion: asNumber(r.content_version),
    intro: asString(r.intro), summary: asString(r.summary),
    sections: Array.isArray(r.sections) ? r.sections as WikiArticleSection[] : [],
  };
}
function requiredIds(value: unknown, max = 100): string[] {
  if (!Array.isArray(value) || !value.length || value.length > max ||
    value.some((v) => typeof v !== "string" || !UUID.test(v)) ||
    new Set(value).size !== value.length) throw new AdminAccessError(400, "Invalid article selection");
  return value;
}
function short(value: unknown, length: number, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > length) {
    throw new AdminAccessError(400, "Invalid " + label);
  }
  return value.trim();
}
async function loadArticles(): Promise<StoredArticle[]> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select id::text, stable_id, slug, title, category_id, status, is_indexable,
           updated_at, published_at, scheduled_for, content_version,
           intro, summary, sections
    from public.wiki_articles where deleted_at is null order by title asc
  `;
  return rows.map(articleFromRow);
}
export function wikiShowcaseStatus(article: StoredArticle, showcase?: Row, productOrderable = false) {
  if (!showcase) return { hasShowcase: false, active: false, needsReview: false,
    blocked: !isPublic(article) ? "مقاله منتشر نشده" : null,
    position: null as number | null, disabled: false };
  const position = resolveWikiShowcaseSection(article.sections, {
    sectionAnchor: showcase.sectionAnchor as string | undefined,
    sectionTitle: asString(showcase.sectionTitle),
  });
  const needsReview = position === null ||
    article.articleVersion !== asNumber(showcase.articleVersion) ||
    article.sections[position]?.title !== asString(showcase.sectionTitle) ||
    position !== asNumber(showcase.afterSectionIndex);
  const blocked = !isPublic(article) ? "مقاله منتشر نشده" :
    !productOrderable ? "فروش محصول بسته است" :
    position === null ? "بخش قبلی پیدا نشد؛ تعیین جایگاه لازم است" : null;
  return { hasShowcase: true, active: showcase.enabled === true && !blocked,
    needsReview, blocked, position, disabled: showcase.enabled !== true };
}
export async function loadWikiShowcaseDashboard() {
  const sql = getAdminDatabase();
  const [articles, showcaseRows, proposalRows, exportedRows] = await Promise.all([
    loadArticles(),
    sql`select id::text, article_id::text, product_id, after_section_index, section_title,
               section_anchor, article_version, title, description, button_label,
               enabled, revision, updated_at from halleus_private.wiki_shop_showcases`,
    sql`select id::text, article_id::text, source_batch_id, product_id,
               article_version, after_section_index, section_anchor, section_title,
               title, description, button_label, skip_reason, status, created_at
        from halleus_private.wiki_shop_showcase_proposals
        where status in ('pending', 'rejected', 'skipped')
        order by created_at desc limit 2000`,
    sql`select article_id::text, max(created_at) as last_exported_at
        from halleus_private.wiki_shop_showcase_exports group by article_id`,
  ]);
  const products = wikiShopProductCatalog();
  const productMap = new Map(products.map((p) => [p.id, p]));
  const showcases = new Map<string, Row[]>();
  for (const row of showcaseRows) {
    const articleId = asString(row.article_id);
    showcases.set(articleId, [...(showcases.get(articleId) ?? []), row]);
  }
  const exported = new Map(exportedRows.map((r) => [asString(r.article_id), String(r.last_exported_at)]));
  const proposals = proposalRows.map((raw) => {
    const p = asRecord(raw);
    return {
      id: asString(p.id), articleId: asString(p.article_id),
      articleVersion: asNumber(p.article_version), productId: asString(p.product_id),
      afterSectionIndex: asNumber(p.after_section_index),
      sectionAnchor: asString(p.section_anchor), sectionTitle: asString(p.section_title),
      title: asString(p.title), description: asString(p.description),
      buttonLabel: asString(p.button_label), status: asString(p.status),
      reason: asString(p.skip_reason), sourceBatchId: asString(p.source_batch_id),
      createdAt: String(p.created_at),
    };
  });
  const pending = new Set(proposals.filter((p) => p.status === "pending").map((p) => p.articleId));
  const reviewed = new Set(proposals.filter((p) => p.status === "rejected").map((p) => p.articleId));
  const skipped = new Set(proposals.filter((p) => p.status === "skipped").map((p) => p.articleId));
  const resultArticles = articles.map((a) => {
    const cards = (showcases.get(a.articleId) ?? []).map((raw) => {
      const showcase = {
        id: asString(raw.id), articleId: a.articleId, productId: asString(raw.product_id),
        afterSectionIndex: asNumber(raw.after_section_index),
        sectionTitle: asString(raw.section_title), sectionAnchor: asString(raw.section_anchor),
        articleVersion: asNumber(raw.article_version), title: asString(raw.title),
        description: asString(raw.description), buttonLabel: asString(raw.button_label),
        enabled: raw.enabled === true, expectedRevision: asNumber(raw.revision),
        updatedAt: String(raw.updated_at),
      };
      return { ...showcase, ...wikiShowcaseStatus(a, showcase,
        Boolean(productMap.get(showcase.productId)?.orderable)) };
    });
    return {
      articleId: a.articleId, stableId: a.stableId, slug: a.slug, title: a.title,
      categoryId: a.categoryId, publicationStatus: a.status, isPublic: isPublic(a),
      updatedAt: a.updatedAt, articleVersion: a.articleVersion,
      sections: a.sections.map((section, index) => ({
        index, title: section.title, anchor: wikiShowcaseSectionAnchor(section),
      })),
      showcases: cards, showcase: cards[0] ?? null,
      hasShowcase: cards.length > 0, active: cards.some((c) => c.active),
      blocked: cards.find((c) => c.blocked)?.blocked ??
        (!isPublic(a) ? "مقاله منتشر نشده" : null),
      needsReview: cards.some((c) => c.needsReview),
      hasPending: pending.has(a.articleId), hasRejected: reviewed.has(a.articleId),
      hasSkipped: skipped.has(a.articleId),
      lastExportedAt: exported.get(a.articleId) ?? null,
    };
  });
  const productCounts = products.map((p) => ({
    productId: p.id,
    active: resultArticles.reduce((n, a) => n + a.showcases.filter((s) =>
      s.productId === p.id && s.active).length, 0),
    configured: resultArticles.reduce((n, a) => n + a.showcases.filter((s) =>
      s.productId === p.id).length, 0),
  }));
  return {
    articles: resultArticles, products, proposals, productCounts,
    counts: {
      total: resultArticles.length, missing: resultArticles.filter((a) => !a.hasShowcase).length,
      has: resultArticles.filter((a) => a.hasShowcase).length,
      active: resultArticles.filter((a) => a.active).length,
      disabled: resultArticles.filter((a) => a.showcases.some((s) => s.disabled)).length,
      pending: proposals.filter((p) => p.status === "pending").length,
      review: resultArticles.filter((a) => a.needsReview).length,
    },
  };
}
export async function loadWikiShowcaseArticle(articleId: string) {
  const ids = requiredIds([articleId], 1);
  const sql = getAdminDatabase();
  const rows = await sql`
    select id::text, stable_id, slug, title, category_id, status, is_indexable,
           updated_at, published_at, scheduled_for, content_version,
           intro, summary, sections
      from public.wiki_articles where id = ${ids[0]}::uuid and deleted_at is null
  `;
  if (!rows[0]) throw new AdminAccessError(404, "Article not found");
  return articleFromRow(rows[0]);
}
/** Estimate the actual selected article payload before downloading any ZIP. */
export async function estimateWikiShowcaseSelectedZip(input: unknown) {
  const body = asRecord(input);
  const ids = requiredIds(body.articleIds, 500);
  const articles = new Map((await loadArticles()).map((a) => [a.articleId, a]));
  let estimatedBytes = 0;
  for (const id of ids) {
    const article = articles.get(id);
    if (!article) throw new AdminAccessError(409, "Article selection changed");
    estimatedBytes += Buffer.byteLength(JSON.stringify({
      title: article.title, intro: article.intro, summary: article.summary,
      sections: article.sections,
    }), "utf8");
  }
  return { articleCount: ids.length, estimatedBytes };
}

export async function buildWikiShowcaseSelectedZip(actor: VerifiedAdminActor, input: unknown) {
  const body = asRecord(input);
  const ids = requiredIds(body.articleIds, MAX_BATCH);
  const chosenProducts = Array.isArray(body.productIds) ? body.productIds : [];
  const products = wikiShopProductCatalog().filter((p) => chosenProducts.includes(p.id));
  if (!products.length || products.length !== chosenProducts.length ||
      new Set(chosenProducts).size !== products.length) throw new AdminAccessError(400, "Select products");
  const requestedMinimums = asRecord(body.productMinimums);
  const productMinimums: Record<string, number> = {};
  for (const product of products) {
    const target = requestedMinimums[product.id] ?? 0;
    if (!Number.isSafeInteger(target) || (target as number) < 0 || (target as number) > 500 ||
        (!product.orderable && (target as number) > 0)) {
      throw new AdminAccessError(400, 'Invalid or unavailable product minimum');
    }
    productMinimums[product.id] = target as number;
  }
  if (Object.keys(requestedMinimums).some((id) => !products.some((p) => p.id === id))) {
    throw new AdminAccessError(400, 'Minimum specified for unselected product');
  }
  const all = await loadArticles();
  const mapped = new Map(all.map((a) => [a.articleId, a]));
  const selected = ids.map((id) => mapped.get(id));
  if (selected.some((a) => !a)) throw new AdminAccessError(409, "Article selection changed");
  const dashboard = await loadWikiShowcaseDashboard();
  const current = dashboard.articles.filter((a) => ids.includes(a.articleId))
    .map((a) => ({ articleId: a.articleId, hasShowcase: a.hasShowcase,
      showcases: a.showcases, pending: a.hasPending, lastExportedAt: a.lastExportedAt }));
  const batchId = randomUUID();
  const date = new Date().toISOString();
  const json = (value: unknown) => JSON.stringify(value, null, 2);
  const files: ZipFile[] = [
    { name: "README_FA.md", data: `# بستهٔ ویترین ویکی هالیوس\n\nشناسه: ${batchId}\n\nفقط مقاله‌ها و محصولات این بسته را بخوان. راهنمای AI_INSTRUCTIONS.md و هدف‌های فعال در targets.json را رعایت کن. در هر مقاله چند ویترین در بخش‌های متفاوت مجاز است، نه چند کارت در یک بخش. اگر هیچ محصولی مرتبط نیست skip بده؛ سهمیه دلیل ایجاد پیشنهاد نامرتبط نیست. فایل proposals.json را در یک ZIP یا به‌تنهایی برگردان. هیچ پیشنهاد AI بدون تأیید مدیر منتشر نمی‌شود.\n` },
    { name: "AI_INSTRUCTIONS.md", data: `# انتخاب ویترین\n\nبرای هر مقاله چند پیشنهاد در بخش‌های متفاوت مجاز است؛ هر بخش حداکثر یک ویترین و هیچ بخش اشغال‌شده‌ای نباید تکرار شود. هدف حداقل ویترین فعال هر محصول و تعداد فعال فعلی و کسری تا هدف در targets.json آمده‌اند؛ برای جبران کسری فقط جایگاه‌های واقعاً مرتبط پیشنهاد بده. اگر هدف قبلاً تأمین شده، پیشنهاد اضافی صرفاً برای سهمیه نساز. محصولی با orderable=false را برای انتشار پیشنهاد نده. متن فارسی کوتاه و اختصاصی، غیرتکراری و انسانی باشد. پس از یک بخش H2 مرتبط در میانهٔ مقاله قرار بده؛ پس از آخرین بخش ممنوع. شناسهٔ مقاله، نسخه، عنوان بخش، sectionAnchor و afterSectionIndex را دقیق از فایل مقاله بردار. پیشنهادها را در proposals.json با schemaVersion=2 و batchId ثبت کن. برای مقالهٔ نامناسب status=skip و reason را بازگردان. هیچ بدنهٔ مقاله را تغییر نده.\n` },
    { name: "manifest.json", data: json({ schemaVersion: 2, batchId, createdAt: date,
      articleIds: ids, productIds: products.map((p) => p.id), productMinimums, count: ids.length }) },
    { name: "products.json", data: json(products) },
    { name: "targets.json", data: json({ minimumActiveByProduct: productMinimums,
      activeAcrossSite: dashboard.productCounts,
      remainingToTarget: Object.fromEntries(products.map((p) => [p.id, Math.max(0,
        productMinimums[p.id] - (dashboard.productCounts.find((c) => c.productId === p.id)?.active ?? 0))])),
      note: "Sitewide minimum active target. Suggest only relevant missing cards; manager approves." }) },
    { name: "current-showcases.json", data: json(current) },
    { name: "proposals.schema.json", data: json({
      type: "object", required: ["schemaVersion", "batchId", "proposals"],
      properties: { schemaVersion: { const: 2 }, batchId: { type: "string" },
        proposals: { type: "array", items: { type: "object",
          required: ["articleId", "articleVersion", "status"],
          properties: {
            articleId: { type: "string" }, articleVersion: { type: "integer" },
            status: { enum: ["propose", "skip"] }, reason: { type: "string" },
            productId: { enum: products.map((p) => p.id) },
            afterSectionIndex: { type: "integer" }, sectionTitle: { type: "string" },
            sectionAnchor: { type: "string" }, title: { type: "string" },
            description: { type: "string" }, buttonLabel: { type: "string" },
          } } } },
    }) },
    { name: "proposals.example.json", data: json({
      schemaVersion: 2, batchId, proposals: [{
        articleId: ids[0], articleVersion: selected[0]?.articleVersion,
        status: "skip", reason: "محصول مرتبطی پیدا نشد",
      }],
    }) },
  ];
  selected.forEach((a) => {
    if (!a) return;
    files.push({ name: "articles/" + a.articleId + ".json", data: json({
      articleId: a.articleId, stableId: a.stableId, slug: a.slug,
      title: a.title, categoryId: a.categoryId, publicationStatus: a.status,
      indexable: a.indexable, articleVersion: a.articleVersion,
      summary: a.summary, intro: a.intro,
      sections: a.sections.map((section, index) => ({
        ...section, index, afterSectionIndex: index,
        sectionAnchor: wikiShowcaseSectionAnchor(section),
        eligible: index < a.sections.length - 1 && (a.sections.length < 4 || index > 0),
      })),
    }) });
  });
  const bytes = makeWikiShowcaseZip(files);
  const sql = getAdminDatabase();
  await sql.begin(async (tx) => {
    for (const articleId of ids) {
      await tx`
        insert into halleus_private.wiki_shop_showcase_exports (batch_id, article_id, product_ids, product_minimums)
        values (${batchId}, ${articleId}::uuid,
          ${JSON.stringify(products.map((p) => p.id))}::jsonb,
           ${JSON.stringify(productMinimums)}::jsonb)
      `;
    }
    await tx`
      insert into halleus_private.admin_audit_events
      (actor_user_id, actor_role, action, target_type, target_id,
       before_summary, after_summary, success, request_correlation_id)
      values (${actor.userId}::uuid, ${actor.role}, 'wiki.showcase.export',
      'wiki_showcase_batch', ${batchId}, null, ${json({ articleCount: ids.length, products: products.map((p) => p.id) })}::jsonb,
      true, ${actor.correlationId ?? randomUUID()})
    `;
  });
  return { bytes, batchId, filename: "halleus-wiki-showcases-" + batchId.slice(0, 8) + ".zip" };
}

export async function importWikiShowcaseProposals(actor: VerifiedAdminActor, raw: unknown) {
  const input = asRecord(raw);
  if (input.schemaVersion !== 2 || typeof input.batchId !== "string" || input.batchId.length > 80 ||
    !Array.isArray(input.proposals) || input.proposals.length > 100 ||
    !input.proposals.length) throw new AdminAccessError(400, "Invalid AI package version");
  const sql = getAdminDatabase();
  const rows = await sql`
    select article_id::text, product_ids from halleus_private.wiki_shop_showcase_exports
      where batch_id = ${input.batchId}
  `;
  const allowedIds = new Set(rows.map((r) => asString(r.article_id)));
  const allowedProducts = new Map(rows.map((r) => [
    asString(r.article_id), Array.isArray(r.product_ids) ? r.product_ids as string[] : [],
  ]));
  if (!allowedIds.size) throw new AdminAccessError(409, "Unknown AI batch");
  const dashboard = await loadWikiShowcaseDashboard();
  const articles = new Map(dashboard.articles.map((a) => [a.articleId, a]));
  const seen = new Set<string>();
  const skipped = new Set<string>();
  const proposed = new Set<string>();
  const valid: Array<Row> = [], errors: Array<{ index: number; error: string }> = [];
  input.proposals.forEach((rawProposal, index) => {
    try {
      const p = asRecord(rawProposal);
      const articleId = short(p.articleId, 36, "articleId");
      if (!UUID.test(articleId) || !allowedIds.has(articleId)) {
        throw new Error("شناسهٔ مقاله خارج از بسته یا تکراری است");
      }

      const article = articles.get(articleId);
      if (!article || article.articleVersion !== p.articleVersion) throw new Error("نسخهٔ مقاله تغییر کرده");
      if (p.status === "skip") {
        if (skipped.has(articleId) || proposed.has(articleId)) {
          throw new Error("Skip cannot coexist with article proposals");
        }
        skipped.add(articleId);
        valid.push({ sourceIndex: index, articleId, articleVersion: p.articleVersion, status: "skipped",
          reason: short(p.reason, 300, "skip reason") });
        return;
      }
      if (p.status !== "propose") throw new Error("وضعیت پیشنهاد نامعتبر است");
      const productId = short(p.productId, 3, "product");
      if (!dashboard.products.some((product) => product.id === productId) ||
          !allowedProducts.get(articleId)?.includes(productId)) {
        throw new Error("محصول خارج از بستهٔ انتخاب‌شده است");
      }
      const indexValue = p.afterSectionIndex;
      const slot = articleId + ":" + String(indexValue);
      if (skipped.has(articleId) || seen.has(slot)) {
        throw new Error("Only one proposal per article section");
      }
      const section = article.sections.find((s) => s.index === indexValue);
      if (!section || !Number.isSafeInteger(indexValue) || indexValue >= article.sections.length - 1 ||
        (article.sections.length >= 4 && indexValue === 0) ||
        section.title !== p.sectionTitle || section.anchor !== p.sectionAnchor) {
        throw new Error("جایگاه مقاله نامعتبر یا قدیمی است");
      }
      if (article.showcases.some((s) => s.afterSectionIndex === indexValue ||
          (s.sectionAnchor && s.sectionAnchor === section.anchor))) {
        throw new Error("This article section already has a showcase");
      }
      seen.add(slot);
      proposed.add(articleId);
      valid.push({
        sourceIndex: index, articleId, articleVersion: p.articleVersion, status: "pending",
        productId, afterSectionIndex: indexValue, sectionAnchor: section.anchor,
        sectionTitle: section.title, title: short(p.title, 160, "title"),
        description: short(p.description, 500, "description"),
        buttonLabel: short(p.buttonLabel, 80, "buttonLabel"),
      });
    } catch (error) {
      errors.push({ index, error: error instanceof Error ? error.message : "پیشنهاد نامعتبر" });
    }
  });
  let accepted = 0;
  if (valid.length) {
    await sql.begin(async (tx) => {
      for (const p of valid) {
        const inserted = await tx`
          insert into halleus_private.wiki_shop_showcase_proposals
          (id, article_id, source_batch_id, product_id, article_version,
           after_section_index, section_anchor, section_title, title, description,
           button_label, status, skip_reason)
          values (${randomUUID()}::uuid, ${p.articleId}::uuid, ${input.batchId},
            ${p.productId ?? null}, ${p.articleVersion}, ${p.afterSectionIndex ?? null},
            ${p.sectionAnchor ?? null}, ${p.sectionTitle ?? null},
            ${p.title ?? null}, ${p.description ?? null},
            ${p.buttonLabel ?? null}, ${p.status}, ${p.reason ?? null})
          on conflict do nothing
          returning id
        `;
        if (inserted.length) accepted += 1;
        else errors.push({ index: asNumber(p.sourceIndex), error: "این مقاله قبلاً از همین بسته وارد شده" });
      }
      await tx`
        insert into halleus_private.admin_audit_events
        (actor_user_id, actor_role, action, target_type, target_id,
         before_summary, after_summary, success, request_correlation_id)
        values (${actor.userId}::uuid, ${actor.role}, 'wiki.showcase.import',
        'wiki_showcase_batch', ${input.batchId}, null,
        ${JSON.stringify({ accepted, rejected: errors.length })}::jsonb,
        true, ${actor.correlationId ?? randomUUID()})
      `;
    });
  }
  return { accepted, errors };
}

export async function rejectWikiShowcaseProposals(actor: VerifiedAdminActor, raw: unknown) {
  const ids = requiredIds(raw);
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const output: string[] = [];
    for (const id of ids) {
      const rows = await tx`
        update halleus_private.wiki_shop_showcase_proposals
          set status = 'rejected', reviewed_by = ${actor.userId}::uuid, updated_at = now()
          where id = ${id}::uuid and status = 'pending'
          returning article_id::text
      `;
      if (!rows[0]) throw new AdminAccessError(409, "Proposal already changed");
      output.push(asString(rows[0].article_id));
    }
    await tx`
      insert into halleus_private.admin_audit_events
      (actor_user_id, actor_role, action, target_type, target_id,
       before_summary, after_summary, success, request_correlation_id)
      values (${actor.userId}::uuid, ${actor.role}, 'wiki.showcase.reject',
        'wiki_showcase_proposal', ${ids.join(",")}, null,
        ${JSON.stringify({ count: ids.length })}::jsonb, true,
        ${actor.correlationId ?? randomUUID()})
    `;
    return output;
  });
}

export async function reopenWikiShowcaseProposals(actor: VerifiedAdminActor, raw: unknown) {
  const ids = requiredIds(raw);
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const output: string[] = [];
    for (const id of ids) {
      const rows = await tx`
        update halleus_private.wiki_shop_showcase_proposals
          set status = 'pending', reviewed_by = ${actor.userId}::uuid, updated_at = now()
          where id = ${id}::uuid and status = 'rejected'
          returning article_id::text
      `;
      if (!rows[0]) throw new AdminAccessError(409, "Rejected proposal already changed");
      output.push(asString(rows[0].article_id));
    }
    await tx`
      insert into halleus_private.admin_audit_events
      (actor_user_id, actor_role, action, target_type, target_id,
       before_summary, after_summary, success, request_correlation_id)
      values (${actor.userId}::uuid, ${actor.role}, 'wiki.showcase.reopen',
        'wiki_showcase_proposal', ${ids.join(",")}, null,
        ${JSON.stringify({ count: ids.length })}::jsonb, true,
        ${actor.correlationId ?? randomUUID()})
    `;
    return output;
  });
}
